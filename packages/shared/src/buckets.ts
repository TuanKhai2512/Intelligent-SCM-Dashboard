export const BUCKETS = ['FRESH', 'NORMAL', 'WATCH', 'AGING'] as const;
export type Bucket = (typeof BUCKETS)[number];

export const FRESH_MAX_DAYS = 30;
export const WATCH_WINDOW_DAYS = 30;

/** Must stay identical to the CASE expression in apps/api/src/vehicles/vehicle-summary.sql.ts. */
export function bucketFor(ageDays: number, thresholdDays: number): Bucket {
  if (ageDays <= FRESH_MAX_DAYS) return 'FRESH';
  if (ageDays > thresholdDays) return 'AGING';
  if (ageDays > thresholdDays - WATCH_WINDOW_DAYS) return 'WATCH';
  return 'NORMAL';
}
