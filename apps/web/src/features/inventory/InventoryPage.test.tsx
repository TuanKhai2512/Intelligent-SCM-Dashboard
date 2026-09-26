import { BULK_MAX_VEHICLES, type VehicleView } from '@ims/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME, SETTINGS, makeDetail, makeVehicle, paginated } from '../../test/fixtures';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { AGING_PAGE_SIZE } from './AgingSection';
import { InventoryPage } from './InventoryPage';

const vios = makeVehicle({ id: 'veh-vios', make: 'Toyota', model: 'Vios' });

const SUMMARY = {
  summary: { thresholdDays: 90, totalInStock: 1, agingCount: 0, watchCount: 0, agingPct: 0, capitalTiedUp: 0, holdingCostSoFar: 0 },
};
const FILTERS = { makes: [{ make: 'Toyota', models: ['Vios'] }], year: { min: 2024, max: 2024 }, price: { min: 1, max: 2 } };

/** Requests made by the aging section (not the inventory table). */
const isAgingSectionQuery = (sp: URLSearchParams) =>
  sp.get('pageSize') === String(AGING_PAGE_SIZE) && ['AGING', 'WATCH'].includes(sp.get('bucket') ?? '');

function setup(route: string, opts: { table?: VehicleView[]; aging?: VehicleView[] } = {}) {
  tokenStore.set('tok-1');
  const table = opts.table ?? [vios];
  const agingItems = opts.aging ?? [];
  const tableRequests: URLSearchParams[] = [];
  mockApi({
    'GET /api/auth/me': ME,
    'GET /api/dealership/settings': SETTINGS,
    'GET /api/vehicles': ({ url }: { url: URL }) => {
      if (isAgingSectionQuery(url.searchParams)) {
        const sp = url.searchParams;
        if (sp.get('bucket') !== 'AGING') return paginated([], 0);
        const page = Number(sp.get('page'));
        const size = Number(sp.get('pageSize'));
        return paginated(agingItems.slice((page - 1) * size, page * size), agingItems.length);
      }
      tableRequests.push(url.searchParams);
      return paginated(table, table.length);
    },
    'GET /api/vehicles/filters': FILTERS,
    'GET /api/vehicles/aging': { summary: { ...SUMMARY.summary, agingCount: agingItems.length } },
    'GET /api/vehicles/veh-vios': makeDetail({ ...vios, actions: [], priceHistory: [] }),
    'GET /api/vehicles/veh-aging': makeDetail({ ...(agingItems[0] ?? vios), actions: [], priceHistory: [] }),
  });
  return { tableRequests, ...renderWithProviders(<InventoryPage />, { route }) };
}

describe('InventoryPage', () => {
  it('loads the list with filters from the URL', async () => {
    const { tableRequests } = setup('/inventory?make=Toyota&bucket=FRESH');
    expect(await screen.findByText(vios.vin)).toBeInTheDocument();
    const q = tableRequests.at(-1)!;
    expect(q.getAll('make')).toEqual(['Toyota']);
    expect(q.getAll('bucket')).toEqual(['FRESH']);
    expect(q.get('sort')).toBe('age:desc');
    expect(q.get('page')).toBe('1');
  });

  it('writes sort changes to the URL', async () => {
    const { location } = setup('/inventory');
    await screen.findByText(vios.vin);
    await userEvent.click(screen.getByRole('button', { name: /List price/ }));
    expect(new URLSearchParams(location().search).get('sort')).toBe('listPrice:desc');
  });

  it('opens the vehicle drawer from a row and keeps it in the URL', async () => {
    const { location } = setup('/inventory');
    await userEvent.click(await screen.findByText('Toyota Vios'));
    expect(await screen.findByText('Log an action')).toBeInTheDocument();
    expect(new URLSearchParams(location().search).get('vehicle')).toBe('veh-vios');
  });

  it('enables the bulk button when vehicles are selected', async () => {
    setup('/inventory');
    await screen.findByText(vios.vin);
    expect(screen.getByRole('button', { name: 'Log action for 0 vehicles' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText(`Select ${vios.vin}`));
    expect(screen.getByRole('button', { name: 'Log action for 1 vehicle' })).toBeEnabled();
  });

  it('opens the vehicle drawer from the aging section and keeps it in the URL', async () => {
    const aged = makeVehicle({ id: 'veh-aging', make: 'Honda', model: 'Civic', vin: 'VINAGING', ageDays: 120, bucket: 'AGING' });
    const { location } = setup('/inventory', { aging: [aged] });
    await userEvent.click(await screen.findByText(/Honda Civic/));
    expect(await screen.findByText('Log an action')).toBeInTheDocument();
    expect(new URLSearchParams(location().search).get('vehicle')).toBe('veh-aging');
  });

  it('keeps aging bulk selection while paging away and back', async () => {
    const aged = Array.from({ length: AGING_PAGE_SIZE + 2 }, (_, i) =>
      makeVehicle({ id: `veh-aging-${i}`, vin: `AGINGVIN${String(i).padStart(6, '0')}`, make: 'Honda', model: `Civic${i}`, ageDays: 200 - i, bucket: 'AGING' }),
    );
    setup('/inventory', { aging: aged });
    await screen.findByText(aged[0].vin);
    await userEvent.click(screen.getByLabelText(`Select ${aged[0].vin}`));
    expect(screen.getByRole('button', { name: 'Log action for 1 vehicle' })).toBeEnabled();

    const agingCard = screen.getByRole('heading', { name: /Aging stock/ }).closest('section')!;
    await userEvent.click(within(agingCard).getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(aged[10].vin)).toBeInTheDocument();
    expect(screen.queryByText(aged[0].vin)).not.toBeInTheDocument();

    await userEvent.click(within(agingCard).getByRole('button', { name: 'Previous' }));
    expect(await screen.findByText(aged[0].vin)).toBeInTheDocument();
    expect(screen.getByLabelText(`Select ${aged[0].vin}`)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Log action for 1 vehicle' })).toBeEnabled();
  });

  it(`caps bulk selection at ${BULK_MAX_VEHICLES} vehicles`, async () => {
    const many = Array.from({ length: BULK_MAX_VEHICLES + 1 }, (_, i) =>
      makeVehicle({ id: `veh-${i}`, vin: `VIN${String(i).padStart(6, '0')}` }),
    );
    setup('/inventory', { table: many });
    await screen.findByText(many[0].vin);
    await userEvent.click(screen.getByLabelText('Select all on this page'));
    expect(screen.getByRole('button', { name: `Log action for ${BULK_MAX_VEHICLES} vehicles` })).toBeEnabled();
  });
});
