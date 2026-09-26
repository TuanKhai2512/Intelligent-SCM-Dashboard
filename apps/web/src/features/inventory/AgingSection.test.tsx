import type { AgingReport } from '@ims/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeVehicle } from '../../test/fixtures';
import { AgingSectionView } from './AgingSection';

const fortuner = makeVehicle({
  make: 'Toyota', model: 'Fortuner', ageDays: 95, bucket: 'AGING',
  badges: { noAction: true, stale: false, overdue: false },
  suggestions: [{ code: 'NEVER_REDUCED', suggestedStatus: 'PRICE_REDUCTION_PLANNED', reason: '95 days in stock, price never reduced' }],
});
const seltos = makeVehicle({ make: 'Kia', model: 'Seltos', ageDays: 70, bucket: 'WATCH' });

const report: AgingReport = {
  summary: { thresholdDays: 90, totalInStock: 4, agingCount: 1, watchCount: 1, agingPct: 25, capitalTiedUp: 990_000_000, holdingCostSoFar: 14_250_000 },
  aging: [fortuner],
  watch: [seltos],
};

describe('AgingSectionView', () => {
  it('summarises aging stock in money terms', () => {
    render(<AgingSectionView report={report} currency="VND" selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByTestId('aging-summary')).toHaveTextContent(
      '1 vehicles over 90 days · 25% of stock · capital tied up ₫990M · holding cost so far ₫14.3M',
    );
    expect(screen.getByText('No action')).toBeInTheDocument();
    expect(screen.getByText(/95 days in stock, price never reduced/)).toBeInTheDocument();
    expect(screen.getByText('Watch (61–90 days): 1')).toBeInTheDocument();
  });

  it('opens a vehicle and selects for bulk actions', async () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    render(<AgingSectionView report={report} currency="VND" selected={new Set()} onToggle={onToggle} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /2024 Toyota Fortuner/ }));
    expect(onOpen).toHaveBeenCalledWith(fortuner.id);
    await userEvent.click(screen.getAllByLabelText(`Select ${fortuner.vin}`)[0]);
    expect(onToggle).toHaveBeenCalledWith(fortuner.id);
  });

  it('celebrates an empty aging list', () => {
    render(<AgingSectionView report={{ ...report, aging: [], summary: { ...report.summary, agingCount: 0 } }} currency="VND"
      selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('No vehicles over the aging threshold.')).toBeInTheDocument();
  });
});

describe('AgingSectionView layout', () => {
  it('renders every row on the same fixed column grid so columns line up', () => {
    render(<AgingSectionView report={report} currency="VND" selected={new Set()} onToggle={vi.fn()} onOpen={vi.fn()} />);
    const rows = screen.getAllByTestId('aging-row');
    expect(rows.length).toBeGreaterThan(1);
    const classes = new Set(rows.map((r) => r.className));
    expect(classes.size).toBe(1);
    expect([...classes][0]).toContain('lg:grid-cols-[');
    rows.forEach((r) => expect(r.children).toHaveLength(6));
  });
});
