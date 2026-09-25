import { actionWarnings, validateActionInput } from './action-rules';

const today = '2026-06-15';
const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe('validateActionInput', () => {
  it('accepts a Marketing Push with only a status', () => {
    expect(validateActionInput({ status: 'MARKETING_PUSH' }, { today })).toEqual([]);
  });

  it.each(['PRICE_REDUCTION_PLANNED', 'TRANSFER_PLANNED', 'ON_HOLD'] as const)(
    'requires targetDate for %s',
    (status) => {
      expect(fields(validateActionInput({ status }, { today }))).toEqual(['targetDate']);
      expect(validateActionInput({ status, targetDate: today }, { today })).toEqual([]);
    },
  );

  it('rejects a targetDate in the past', () => {
    const errors = validateActionInput({ status: 'ON_HOLD', targetDate: '2026-06-14' }, { today });
    expect(errors).toEqual([{ field: 'targetDate', message: 'targetDate must be today or later' }]);
  });

  it('requires a positive newPrice for PRICE_REDUCED', () => {
    expect(fields(validateActionInput({ status: 'PRICE_REDUCED' }, { today }))).toEqual(['newPrice']);
    expect(fields(validateActionInput({ status: 'PRICE_REDUCED', newPrice: 0 }, { today }))).toEqual([
      'newPrice',
    ]);
    expect(validateActionInput({ status: 'PRICE_REDUCED', newPrice: 450_000_000 }, { today })).toEqual(
      [],
    );
  });

  it('forbids newPrice on other statuses', () => {
    const errors = validateActionInput({ status: 'MARKETING_PUSH', newPrice: 1 }, { today });
    expect(fields(errors)).toEqual(['newPrice']);
  });

  it('rejects notes over 1000 characters', () => {
    const errors = validateActionInput({ status: 'MARKETING_PUSH', note: 'x'.repeat(1001) }, { today });
    expect(fields(errors)).toEqual(['note']);
  });

  it('rejects PRICE_REDUCED in bulk', () => {
    const errors = validateActionInput({ status: 'PRICE_REDUCED', newPrice: 1 }, { today, bulk: true });
    expect(fields(errors)).toContain('status');
  });

  it('allows PRICE_REDUCTION_PLANNED in bulk', () => {
    expect(
      validateActionInput({ status: 'PRICE_REDUCTION_PLANNED', targetDate: today }, { today, bulk: true }),
    ).toEqual([]);
  });
});

describe('actionWarnings', () => {
  it('warns when a Price Reduced action raises the price', () => {
    expect(actionWarnings({ status: 'PRICE_REDUCED', newPrice: 600 }, 500)).toEqual(['PRICE_INCREASED']);
    expect(actionWarnings({ status: 'PRICE_REDUCED', newPrice: 400 }, 500)).toEqual([]);
    expect(actionWarnings({ status: 'MARKETING_PUSH' }, 500)).toEqual([]);
  });
});
