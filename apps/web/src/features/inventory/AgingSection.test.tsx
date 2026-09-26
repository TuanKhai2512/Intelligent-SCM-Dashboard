import type { AgingReport, VehicleView } from '@ims/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME, SETTINGS, makeVehicle, paginated } from '../../test/fixtures';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { AGING_PAGE_SIZE, AgingSection, agingListQuery } from './AgingSection';

const SUMMARY: AgingReport = {
  summary: { thresholdDays: 90, totalInStock: 150, agingCount: 23, watchCount: 42, agingPct: 15.3, capitalTiedUp: 16_453_200_000, holdingCostSoFar: 504_600_000 },
};

const aging = Array.from({ length: 23 }, (_, i) =>
  makeVehicle({ id: `aging-${i}`, vin: `AGINGVIN${String(i).padStart(9, '0')}`, make: 'Toyota', model: `Model${i}`, ageDays: 200 - i, bucket: 'AGING' }),
);
const watch = Array.from({ length: 12 }, (_, i) =>
  makeVehicle({ id: `watch-${i}`, vin: `WATCHVIN${String(i).padStart(9, '0')}`, make: 'Kia', model: `Watch${i}`, ageDays: 90 - i, bucket: 'WATCH' }),
);
aging[0] = {
  ...aging[0],
  badges: { noAction: true, stale: false, overdue: false },
  suggestions: [{ code: 'NEVER_REDUCED', suggestedStatus: 'PRICE_REDUCTION_PLANNED', reason: '200 days in stock, price never reduced' }],
};

function pageOf(items: VehicleView[], url: URL) {
  const page = Number(url.searchParams.get('page'));
  const size = Number(url.searchParams.get('pageSize'));
  return { ...paginated(items.slice((page - 1) * size, page * size), items.length), page, pageSize: size };
}

function setup(props: { onOpen?: () => void; onToggle?: () => void } = {}) {
  tokenStore.set('tok-1');
  const requests: URLSearchParams[] = [];
  mockApi({
    'GET /api/auth/me': ME,
    'GET /api/dealership/settings': SETTINGS,
    'GET /api/vehicles/aging': SUMMARY,
    'GET /api/vehicles': ({ url }: { url: URL }) => {
      requests.push(url.searchParams);
      return pageOf(url.searchParams.get('bucket') === 'WATCH' ? watch : aging, url);
    },
  });
  renderWithProviders(
    <AgingSection selected={new Set()} onToggle={props.onToggle ?? vi.fn()} onOpen={props.onOpen ?? vi.fn()} />,
  );
  return { requests };
}

describe('agingListQuery', () => {
  it('asks for one bucket, oldest first, 10 per page', () => {
    expect(agingListQuery('AGING', 3)).toBe('bucket=AGING&sort=age%3Adesc&page=3&pageSize=10');
    expect(AGING_PAGE_SIZE).toBe(10);
  });
});

describe('AgingSection', () => {
  it('shows the summary and only the first page of aging vehicles', async () => {
    setup();
    expect(await screen.findByTestId('aging-summary')).toHaveTextContent(
      '23 vehicles over 90 days · 15.3% of stock · capital tied up ₫16.5B · holding cost so far ₫504.6M',
    );
    expect(await screen.findByText('2024 Toyota Model0')).toBeInTheDocument();
    expect(screen.getAllByTestId('aging-row')).toHaveLength(AGING_PAGE_SIZE);
    expect(screen.getByText('1–10 of 23')).toBeInTheDocument();
    expect(screen.getByText('No action')).toBeInTheDocument();
    expect(screen.getByText(/200 days in stock, price never reduced/)).toBeInTheDocument();
  });

  it('pages through aging vehicles on the server', async () => {
    const { requests } = setup();
    await screen.findByText('2024 Toyota Model0');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('2024 Toyota Model10')).toBeInTheDocument();
    expect(screen.queryByText('2024 Toyota Model0')).not.toBeInTheDocument();
    expect(screen.getByText('11–20 of 23')).toBeInTheDocument();
    const last = requests.filter((r) => r.get('bucket') === 'AGING').at(-1)!;
    expect(last.get('page')).toBe('2');
    expect(last.get('pageSize')).toBe('10');
    expect(last.get('sort')).toBe('age:desc');
  });

  it('does not load the watch list until it is expanded, then pages it too', async () => {
    const { requests } = setup();
    await screen.findByText('2024 Toyota Model0');
    expect(requests.some((r) => r.get('bucket') === 'WATCH')).toBe(false);

    const toggle = screen.getByRole('button', { name: /Watch \(61–90 days\): 42/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const watchList = await screen.findByTestId('watch-list');
    expect(await within(watchList).findByText('2024 Kia Watch0')).toBeInTheDocument();
    expect(within(watchList).getAllByTestId('aging-row')).toHaveLength(AGING_PAGE_SIZE);
    expect(within(watchList).getByText('1–10 of 12')).toBeInTheDocument();
    expect(requests.some((r) => r.get('bucket') === 'WATCH')).toBe(true);
  });

  it('opens a vehicle and selects it for bulk actions', async () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    setup({ onOpen, onToggle });
    await userEvent.click(await screen.findByRole('button', { name: /2024 Toyota Model0/ }));
    expect(onOpen).toHaveBeenCalledWith('aging-0');
    await userEvent.click(screen.getByLabelText(`Select ${aging[0].vin}`));
    expect(onToggle).toHaveBeenCalledWith('aging-0');
  });

  it('renders every row on the same fixed column grid so columns line up', async () => {
    setup();
    await screen.findByText('2024 Toyota Model0');
    const rows = screen.getAllByTestId('aging-row');
    const classes = new Set(rows.map((r) => r.className));
    expect(classes.size).toBe(1);
    expect([...classes][0]).toContain('lg:grid-cols-[');
    rows.forEach((r) => expect(r.children).toHaveLength(6));
  });

  it('shows an empty state when nothing is aging', async () => {
    tokenStore.set('tok-1');
    mockApi({
      'GET /api/auth/me': ME,
      'GET /api/dealership/settings': SETTINGS,
      'GET /api/vehicles/aging': { summary: { ...SUMMARY.summary, agingCount: 0 } },
      'GET /api/vehicles': paginated([], 0),
    });
    renderWithProviders(<AgingSection selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByText('No vehicles over the aging threshold.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});
