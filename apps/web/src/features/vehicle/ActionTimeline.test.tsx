import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { makeAction } from '../../test/fixtures';
import { ActionTimeline, canEditNote } from './ActionTimeline';

const NOW = new Date('2026-06-15T05:00:00.000Z');
const HOUR = 3_600_000;

describe('canEditNote', () => {
  const mine = makeAction({ createdAt: new Date(NOW.getTime() - 23 * HOUR).toISOString() });
  it('allows the author within 24 hours', () => {
    expect(canEditNote(mine, 'mgr-1', NOW)).toBe(true);
    expect(canEditNote(mine, 'mgr-1', new Date(NOW.getTime() + HOUR))).toBe(true);
  });
  it('blocks after 24 hours, for other managers and when signed out', () => {
    expect(canEditNote(mine, 'mgr-1', new Date(NOW.getTime() + 2 * HOUR))).toBe(false);
    expect(canEditNote(mine, 'mgr-2', NOW)).toBe(false);
    expect(canEditNote(mine, undefined, NOW)).toBe(false);
  });
});

describe('ActionTimeline', () => {
  it('lists actions with details and offers note edit only when allowed', () => {
    const actions = [
      makeAction({ status: 'PRICE_REDUCED', newPrice: 450_000_000, note: 'Cut 10%', createdAt: NOW.toISOString() }),
      makeAction({ status: 'ON_HOLD', targetDate: '2026-06-20', source: 'SUGGESTION', createdAt: '2026-06-01T05:00:00.000Z' }),
    ];
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ActionTimeline actions={actions} meId="mgr-1" timezone="Asia/Saigon" currency="VND" now={NOW} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Price Reduced')).toBeInTheDocument();
    expect(screen.getByText('→ ₫450,000,000')).toBeInTheDocument();
    expect(screen.getByText('Target 2026-06-20')).toBeInTheDocument();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit note' })).toHaveLength(1);
  });
});
