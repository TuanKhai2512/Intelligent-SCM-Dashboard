import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatMoney, formatMoneyCompact, formatNumber } from './format';

describe('format', () => {
  it('formats VND without decimals', () => {
    expect(formatMoney(5_200_000_000)).toBe('₫5,200,000,000');
    expect(formatMoney(1234.56, 'USD')).toBe('$1,235');
  });

  it('formats compact money for KPI cards', () => {
    expect(formatMoneyCompact(5_200_000_000)).toBe('₫5.2B');
    expect(formatMoneyCompact(150_000)).toBe('₫150K');
  });

  it('formats numbers with separators', () => {
    expect(formatNumber(80000)).toBe('80,000');
  });

  it('formats a timestamp as the local date in the dealership timezone', () => {
    expect(formatDate('2026-06-14T17:30:00.000Z', 'Asia/Saigon')).toBe('2026-06-15');
  });

  it('adds days to a YYYY-MM-DD date across month ends', () => {
    expect(addDays('2026-06-28', 7)).toBe('2026-07-05');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
