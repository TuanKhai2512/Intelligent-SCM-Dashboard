import { suggestionsFor, SuggestionInput } from './suggestions';

const base: SuggestionInput = {
  status: 'IN_STOCK',
  ageDays: 10,
  thresholdDays: 90,
  everReduced: false,
  hasAction: false,
  stale: false,
  latestActionDays: null,
};
const codes = (i: Partial<SuggestionInput>) => suggestionsFor({ ...base, ...i }).map((s) => s.code);

describe('suggestionsFor', () => {
  it('gives a fresh vehicle no suggestions', () => {
    expect(codes({})).toEqual([]);
  });

  it('NEVER_REDUCED: aging and never reduced', () => {
    const [s] = suggestionsFor({ ...base, ageDays: 95 });
    expect(s).toEqual({
      code: 'NEVER_REDUCED',
      suggestedStatus: 'PRICE_REDUCTION_PLANNED',
      reason: '95 days in stock, price never reduced',
    });
    expect(codes({ ageDays: 90 })).not.toContain('NEVER_REDUCED');
  });

  it('STALE_PLAN: aging with a stale latest action', () => {
    const s = suggestionsFor({ ...base, ageDays: 100, everReduced: true, hasAction: true, stale: true, latestActionDays: 18 });
    expect(s).toContainEqual({ code: 'STALE_PLAN', suggestedStatus: null, reason: 'Last action 18 days ago, still unsold' });
  });

  it('AUCTION: over threshold + 30 and already reduced', () => {
    expect(codes({ ageDays: 121, everReduced: true, hasAction: true })).toEqual(['AUCTION']);
    expect(codes({ ageDays: 120, everReduced: true, hasAction: true })).toEqual([]);
    expect(codes({ ageDays: 130, everReduced: false })).toEqual(['NEVER_REDUCED']);
  });

  it('ABOUT_TO_AGE: 15 days before the threshold with no action', () => {
    const [s] = suggestionsFor({ ...base, ageDays: 79 });
    expect(s).toEqual({ code: 'ABOUT_TO_AGE', suggestedStatus: 'MARKETING_PUSH', reason: 'Turns aging in 12 days' });
    expect(codes({ ageDays: 74 })).toEqual([]);
    expect(codes({ ageDays: 80, hasAction: true })).toEqual([]);
  });

  it('follows a custom threshold', () => {
    expect(codes({ ageDays: 61, thresholdDays: 60 })).toEqual(['NEVER_REDUCED']);
  });

  it('gives sold vehicles no suggestions', () => {
    expect(codes({ status: 'SOLD', ageDays: 150 })).toEqual([]);
  });
});
