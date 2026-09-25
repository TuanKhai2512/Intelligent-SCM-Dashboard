import { dateInTz } from '@ims/shared';

const cache = new Map<string, Intl.NumberFormat>();
function nf(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', options);
    cache.set(key, f);
  }
  return f;
}

export function formatMoney(value: number, currency = 'VND'): string {
  return nf(`m:${currency}`, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function formatMoneyCompact(value: number, currency = 'VND'): string {
  return nf(`c:${currency}`, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(n: number): string {
  return nf('n', {}).format(n);
}

/** ISO timestamp -> YYYY-MM-DD in the dealership timezone. */
export function formatDate(iso: string, timeZone: string): string {
  return dateInTz(new Date(iso), timeZone);
}

/** YYYY-MM-DD + n calendar days -> YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
