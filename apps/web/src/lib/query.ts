import type { QueryClient } from '@tanstack/react-query';

export const POLL_MS = 30_000;

export const qk = {
  me: ['me'] as const,
  settings: ['settings'] as const,
  filters: ['filters'] as const,
  vehicles: (query: string) => ['vehicles', query] as const,
  vehicle: (id: string) => ['vehicle', id] as const,
  aging: ['aging'] as const,
  overview: ['reports', 'overview'] as const,
  ageDistribution: ['reports', 'age-distribution'] as const,
  agingActions: ['reports', 'aging-actions'] as const,
};

/** Everything that can change after an action, price change or sale. */
export async function invalidateInventory(qc: QueryClient): Promise<void> {
  await Promise.all(
    [['vehicles'], ['vehicle'], ['aging'], ['reports'], ['filters']].map((queryKey) =>
      qc.invalidateQueries({ queryKey }),
    ),
  );
}
