import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME, SETTINGS } from '../../test/fixtures';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { OverviewPage } from './OverviewPage';

describe('OverviewPage', () => {
  it('shows KPIs and links each alert to a filtered inventory view', async () => {
    tokenStore.set('tok-1');
    mockApi({
      'GET /api/auth/me': ME,
      'GET /api/dealership/settings': SETTINGS,
      'GET /api/reports/overview': {
        totalInStock: 150, avgAgeDays: 61.3, agingCount: 23, agingPct: 15.3,
        capitalTiedUp: 16_453_200_000, holdingCostSoFar: 504_600_000,
        needsAttention: { noAction: 4, stale: 5, overdue: 6 },
      },
      'GET /api/reports/age-distribution': [
        { bucket: 'FRESH', count: 45 }, { bucket: 'NORMAL', count: 40 }, { bucket: 'WATCH', count: 42 }, { bucket: 'AGING', count: 23 },
      ],
      'GET /api/reports/aging-actions': [{ status: 'NONE', count: 4 }, { status: 'PRICE_REDUCED', count: 19 }],
    });
    renderWithProviders(<OverviewPage />, { route: '/overview' });

    expect(await screen.findByText('150')).toBeInTheDocument();
    expect(screen.getByText('61.3 days')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('15.3% of stock')).toBeInTheDocument();
    expect(screen.getByText('₫16.5B')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aging vehicles with no action\s*4/ })).toHaveAttribute('href', '/inventory?badge=NO_ACTION');
    expect(screen.getByRole('link', { name: /Stale actions\s*5/ })).toHaveAttribute('href', '/inventory?badge=STALE');
    expect(screen.getByRole('link', { name: /Overdue plans\s*6/ })).toHaveAttribute('href', '/inventory?badge=OVERDUE');
  });
});
