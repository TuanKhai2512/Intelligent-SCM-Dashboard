import { BULK_MAX_VEHICLES } from '@ims/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME, SETTINGS, makeDetail, makeVehicle, paginated } from '../../test/fixtures';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { InventoryPage } from './InventoryPage';

const vios = makeVehicle({ id: 'veh-vios', make: 'Toyota', model: 'Vios' });

const AGING = {
  summary: { thresholdDays: 90, totalInStock: 1, agingCount: 0, watchCount: 0, agingPct: 0, capitalTiedUp: 0, holdingCostSoFar: 0 },
  aging: [],
  watch: [],
};

function setup(route: string) {
  tokenStore.set('tok-1');
  const seen: URLSearchParams[] = [];
  mockApi({
    'GET /api/auth/me': ME,
    'GET /api/dealership/settings': SETTINGS,
    'GET /api/vehicles': ({ url }: { url: URL }) => {
      seen.push(url.searchParams);
      return paginated([vios], 1);
    },
    'GET /api/vehicles/filters': { makes: [{ make: 'Toyota', models: ['Vios'] }], year: { min: 2024, max: 2024 }, price: { min: 1, max: 2 } },
    'GET /api/vehicles/aging': AGING,
    'GET /api/vehicles/veh-vios': makeDetail({ ...vios, actions: [], priceHistory: [] }),
  });
  return { seen, ...renderWithProviders(<InventoryPage />, { route }) };
}

describe('InventoryPage', () => {
  it('loads the list with filters from the URL', async () => {
    const { seen } = setup('/inventory?make=Toyota&bucket=FRESH');
    expect(await screen.findByText(vios.vin)).toBeInTheDocument();
    const q = seen.at(-1)!;
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
    tokenStore.set('tok-1');
    const aged = makeVehicle({ id: 'veh-aging', make: 'Honda', model: 'Civic', vin: 'VINAGING', ageDays: 120 });
    mockApi({
      'GET /api/auth/me': ME,
      'GET /api/dealership/settings': SETTINGS,
      'GET /api/vehicles': paginated([vios], 1),
      'GET /api/vehicles/filters': { makes: [], year: { min: 2024, max: 2024 }, price: { min: 0, max: 0 } },
      'GET /api/vehicles/aging': { ...AGING, summary: { ...AGING.summary, agingCount: 1 }, aging: [aged] },
      'GET /api/vehicles/veh-aging': makeDetail({ ...aged, actions: [], priceHistory: [] }),
    });
    const { location } = renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await userEvent.click(await screen.findByText(/Honda Civic/));
    expect(await screen.findByText('Log an action')).toBeInTheDocument();
    expect(new URLSearchParams(location().search).get('vehicle')).toBe('veh-aging');
  });

  it(`caps bulk selection at ${BULK_MAX_VEHICLES} vehicles`, async () => {
    tokenStore.set('tok-1');
    const many = Array.from({ length: BULK_MAX_VEHICLES + 1 }, (_, i) =>
      makeVehicle({ id: `veh-${i}`, vin: `VIN${String(i).padStart(6, '0')}` }),
    );
    mockApi({
      'GET /api/auth/me': ME,
      'GET /api/dealership/settings': SETTINGS,
      'GET /api/vehicles': paginated(many, many.length),
      'GET /api/vehicles/filters': { makes: [], year: { min: 2024, max: 2024 }, price: { min: 0, max: 0 } },
      'GET /api/vehicles/aging': AGING,
    });
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText(many[0].vin);
    await userEvent.click(screen.getByLabelText('Select all on this page'));
    expect(
      screen.getByRole('button', { name: `Log action for ${BULK_MAX_VEHICLES} vehicles` }),
    ).toBeEnabled();
  });
});
