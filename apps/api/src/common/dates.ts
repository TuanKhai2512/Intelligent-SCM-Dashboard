/** A Postgres DATE (parsed as UTC midnight) -> 'YYYY-MM-DD'. */
export const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/** 'YYYY-MM-DD' -> Date at UTC midnight, for writing a Postgres DATE. */
export const fromDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
