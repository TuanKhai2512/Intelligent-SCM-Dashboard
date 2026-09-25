import { ageInDays, dateInTz, daysBetweenDates } from './dates';

const TZ = 'Asia/Saigon'; // UTC+7, no DST

describe('dateInTz', () => {
  it('returns the local calendar date', () => {
    expect(dateInTz(new Date('2026-06-14T16:30:00Z'), TZ)).toBe('2026-06-14'); // 23:30 local
    expect(dateInTz(new Date('2026-06-14T17:00:00Z'), TZ)).toBe('2026-06-15'); // 00:00 local
  });
});

describe('daysBetweenDates', () => {
  it('counts calendar days across month ends', () => {
    expect(daysBetweenDates('2026-02-27', '2026-03-01')).toBe(2);
    expect(daysBetweenDates('2026-06-15', '2026-06-15')).toBe(0);
  });
});

describe('ageInDays', () => {
  it('uses local dates, not UTC dates', () => {
    // stocked 00:30 local on the 15th, now 12:00 local on the 15th -> 0 days
    // (UTC dates would be 14th and 15th -> 1 day, which is wrong)
    expect(ageInDays(new Date('2026-06-14T17:30:00Z'), new Date('2026-06-15T05:00:00Z'), TZ)).toBe(0);
  });

  it('counts a car stocked at 23:30 local as 1 day old just after midnight', () => {
    expect(ageInDays(new Date('2026-06-14T16:30:00Z'), new Date('2026-06-14T17:30:00Z'), TZ)).toBe(1);
  });
});
