import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeVehicle } from '../../test/fixtures';
import { InventoryTable } from './InventoryTable';

const rows = [
  makeVehicle({ make: 'Toyota', model: 'Fortuner', ageDays: 95, bucket: 'AGING', badges: { noAction: true, stale: false, overdue: false } }),
  makeVehicle({ make: 'Kia', model: 'Seltos', ageDays: 70, bucket: 'WATCH' }),
];

function setup(overrides: Partial<Parameters<typeof InventoryTable>[0]> = {}) {
  const props = {
    rows,
    sort: 'age:desc',
    onSortChange: vi.fn(),
    selected: new Set<string>(),
    onToggle: vi.fn(),
    onToggleAll: vi.fn(),
    onOpen: vi.fn(),
    currency: 'VND',
    timezone: 'Asia/Saigon',
    ...overrides,
  };
  render(<InventoryTable {...props} />);
  return props;
}

describe('InventoryTable', () => {
  it('renders vehicles with bucket and badges', () => {
    setup();
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('Toyota Fortuner')).toBeInTheDocument();
    expect(within(first).getByText('Aging')).toBeInTheDocument();
    expect(within(first).getByText('No action')).toBeInTheDocument();
    expect(within(first).getByText('₫500,000,000')).toBeInTheDocument();
  });

  it('toggles sort direction when the active column header is clicked', async () => {
    const props = setup();
    expect(screen.getByRole('columnheader', { name: /Age/ })).toHaveAttribute('aria-sort', 'descending');
    await userEvent.click(screen.getByRole('button', { name: /Age/ }));
    expect(props.onSortChange).toHaveBeenCalledWith('age:asc');
    await userEvent.click(screen.getByRole('button', { name: /List price/ }));
    expect(props.onSortChange).toHaveBeenCalledWith('listPrice:desc');
  });

  it('opens a row and selects without opening', async () => {
    const props = setup();
    await userEvent.click(screen.getByText('Kia Seltos'));
    expect(props.onOpen).toHaveBeenCalledWith(rows[1].id);
    await userEvent.click(screen.getByLabelText(`Select ${rows[0].vin}`));
    expect(props.onToggle).toHaveBeenCalledWith(rows[0].id);
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state', () => {
    setup({ rows: [] });
    expect(screen.getByText('No vehicles match these filters.')).toBeInTheDocument();
  });
});
