import { describe, expect, it } from 'vitest';
import { actionFormSchema, toActionBody } from './action-form';

const schema = actionFormSchema({ today: '2026-06-15', currentPrice: 500_000_000 });
const errorsOf = (v: object) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('actionFormSchema', () => {
  it('accepts a Marketing Push with only a status', () => {
    expect(errorsOf({ status: 'MARKETING_PUSH', note: '', targetDate: '' })).toEqual({});
  });

  it('requires a target date for a planned price reduction', () => {
    expect(errorsOf({ status: 'PRICE_REDUCTION_PLANNED', targetDate: '' })).toEqual({
      targetDate: 'targetDate is required for PRICE_REDUCTION_PLANNED',
    });
  });

  it('rejects a target date in the past', () => {
    expect(errorsOf({ status: 'ON_HOLD', targetDate: '2026-06-14' })).toEqual({ targetDate: 'targetDate must be today or later' });
  });

  it('requires a different, positive new price for Price Reduced', () => {
    expect(errorsOf({ status: 'PRICE_REDUCED' })).toHaveProperty('newPrice');
    expect(errorsOf({ status: 'PRICE_REDUCED', newPrice: 500_000_000 })).toEqual({
      newPrice: 'New price must differ from the current list price',
    });
    expect(errorsOf({ status: 'PRICE_REDUCED', newPrice: 450_000_000 })).toEqual({});
  });

  it('ignores a leftover price when the status is not Price Reduced', () => {
    expect(errorsOf({ status: 'MARKETING_PUSH', newPrice: 450_000_000 })).toEqual({});
  });
});

describe('toActionBody', () => {
  it('strips empty fields and keeps newPrice only for Price Reduced', () => {
    expect(toActionBody({ status: 'MARKETING_PUSH', note: '', targetDate: '', newPrice: 1 })).toEqual({ status: 'MARKETING_PUSH' });
    expect(toActionBody({ status: 'PRICE_REDUCED', note: ' cut ', newPrice: 450_000_000, suggestionCode: 'NEVER_REDUCED' })).toEqual({
      status: 'PRICE_REDUCED', note: 'cut', newPrice: 450_000_000, suggestionCode: 'NEVER_REDUCED',
    });
  });
});
