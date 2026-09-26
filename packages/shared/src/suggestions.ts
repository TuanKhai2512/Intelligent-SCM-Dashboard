import type { Suggestion } from './api-types';
import type { ActionStatus, VehicleStatus } from './enums';

export interface SuggestionInput {
  status: VehicleStatus;
  ageDays: number;
  thresholdDays: number;
  everReduced: boolean;
  hasAction: boolean;
  stale: boolean;
  latestActionDays: number | null;
  /** Latest action status: a suggestion already acted on is hidden until that action goes stale. */
  latestActionStatus?: ActionStatus | null;
}

export const AUCTION_EXTRA_DAYS = 30;
export const ABOUT_TO_AGE_WINDOW_DAYS = 15;

/** Transparent rule-based suggestions. All matching rules are returned in this order. */
export function suggestionsFor(i: SuggestionInput): Suggestion[] {
  const alreadyActedOn = (s: Suggestion) =>
    !i.stale && s.suggestedStatus !== null && s.suggestedStatus === i.latestActionStatus;
  return matchingRules(i).filter((s) => !alreadyActedOn(s));
}

function matchingRules(i: SuggestionInput): Suggestion[] {
  if (i.status !== 'IN_STOCK') return [];
  const aging = i.ageDays > i.thresholdDays;
  const out: Suggestion[] = [];

  if (aging && !i.everReduced) {
    out.push({
      code: 'NEVER_REDUCED',
      suggestedStatus: 'PRICE_REDUCTION_PLANNED',
      reason: `${i.ageDays} days in stock, price never reduced`,
    });
  }
  if (aging && i.stale) {
    out.push({
      code: 'STALE_PLAN',
      suggestedStatus: null,
      reason: `Last action ${i.latestActionDays} days ago, still unsold`,
    });
  }
  if (i.ageDays > i.thresholdDays + AUCTION_EXTRA_DAYS && i.everReduced) {
    out.push({
      code: 'AUCTION',
      suggestedStatus: 'SEND_TO_AUCTION',
      reason: `${i.ageDays} days, already reduced`,
    });
  }
  if (!aging && i.ageDays >= i.thresholdDays - ABOUT_TO_AGE_WINDOW_DAYS && !i.hasAction) {
    out.push({
      code: 'ABOUT_TO_AGE',
      suggestedStatus: 'MARKETING_PUSH',
      reason: `Turns aging in ${i.thresholdDays - i.ageDays + 1} days`,
    });
  }
  return out;
}
