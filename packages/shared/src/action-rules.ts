import type { ActionWarning, FieldError } from './api-types';
import type { ActionStatus } from './enums';

export const NOTE_MAX_LENGTH = 1000;
export const BULK_MAX_VEHICLES = 100;
export const NOTE_EDIT_WINDOW_HOURS = 24;

export interface ActionRule {
  targetDate: 'required' | 'optional';
  newPrice: 'required' | 'forbidden';
  bulkAllowed: boolean;
}

export const ACTION_RULES: Record<ActionStatus, ActionRule> = {
  PRICE_REDUCTION_PLANNED: { targetDate: 'required', newPrice: 'forbidden', bulkAllowed: true },
  PRICE_REDUCED: { targetDate: 'optional', newPrice: 'required', bulkAllowed: false },
  MARKETING_PUSH: { targetDate: 'optional', newPrice: 'forbidden', bulkAllowed: true },
  TRANSFER_PLANNED: { targetDate: 'required', newPrice: 'forbidden', bulkAllowed: true },
  SEND_TO_AUCTION: { targetDate: 'optional', newPrice: 'forbidden', bulkAllowed: true },
  RECONDITIONING: { targetDate: 'optional', newPrice: 'forbidden', bulkAllowed: true },
  ON_HOLD: { targetDate: 'required', newPrice: 'forbidden', bulkAllowed: true },
};

export interface ActionInput {
  status: ActionStatus;
  note?: string | null;
  /** YYYY-MM-DD in the dealership timezone */
  targetDate?: string | null;
  newPrice?: number | null;
}

/**
 * Business rules shared by the API and the web form.
 * `today` is the current date (YYYY-MM-DD) in the dealership timezone.
 */
export function validateActionInput(
  input: ActionInput,
  ctx: { today: string; bulk?: boolean },
): FieldError[] {
  const rule = ACTION_RULES[input.status];
  const errors: FieldError[] = [];

  if (ctx.bulk && !rule.bulkAllowed) {
    errors.push({ field: 'status', message: `${input.status} cannot be applied in bulk` });
  }
  if (input.note && input.note.length > NOTE_MAX_LENGTH) {
    errors.push({ field: 'note', message: `note must be at most ${NOTE_MAX_LENGTH} characters` });
  }
  if (!input.targetDate) {
    if (rule.targetDate === 'required') {
      errors.push({ field: 'targetDate', message: `targetDate is required for ${input.status}` });
    }
  } else if (input.targetDate < ctx.today) {
    errors.push({ field: 'targetDate', message: 'targetDate must be today or later' });
  }
  const hasPrice = input.newPrice !== undefined && input.newPrice !== null;
  if (rule.newPrice === 'required') {
    if (!hasPrice) {
      errors.push({ field: 'newPrice', message: `newPrice is required for ${input.status}` });
    } else if ((input.newPrice as number) <= 0) {
      errors.push({ field: 'newPrice', message: 'newPrice must be greater than 0' });
    }
  } else if (hasPrice) {
    errors.push({ field: 'newPrice', message: 'newPrice is only allowed for PRICE_REDUCED' });
  }
  return errors;
}

export function actionWarnings(input: ActionInput, currentPrice: number): ActionWarning[] {
  if (input.status === 'PRICE_REDUCED' && typeof input.newPrice === 'number' && input.newPrice > currentPrice) {
    return ['PRICE_INCREASED'];
  }
  return [];
}
