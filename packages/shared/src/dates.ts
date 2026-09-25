const formatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar date (YYYY-MM-DD) of an instant in an IANA timezone. */
export function dateInTz(instant: Date, timeZone: string): string {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, fmt);
  }
  return fmt.format(instant);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetweenDates(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Days in stock, counted on calendar dates in the dealership timezone. */
export function ageInDays(stockedAt: Date, now: Date, timeZone: string): number {
  return daysBetweenDates(dateInTz(stockedAt, timeZone), dateInTz(now, timeZone));
}
