import {
  ACTION_RULES,
  ACTION_STATUSES,
  NOTE_MAX_LENGTH,
  SUGGESTION_CODES,
  validateActionInput,
  type ActionInput,
} from '@ims/shared';
import { z } from 'zod';
import type { CreateActionBody } from '../../lib/endpoints';

const baseSchema = z.object({
  status: z.enum(ACTION_STATUSES),
  note: z.string().max(NOTE_MAX_LENGTH).optional(),
  targetDate: z.string().optional(),
  // Empty or invalid number input becomes undefined; the shared rules report "required".
  newPrice: z.number().optional().catch(undefined),
  suggestionCode: z.enum(SUGGESTION_CODES).optional(),
});

export type ActionFormValues = z.input<typeof baseSchema>;

function toActionInput(v: ActionFormValues): ActionInput {
  return {
    status: v.status,
    note: v.note?.trim() || undefined,
    targetDate: v.targetDate || undefined,
    // `.catch(undefined)` gives zod an `unknown` input; the form always writes a number or undefined.
    newPrice: ACTION_RULES[v.status].newPrice === 'required' ? (v.newPrice as number | undefined) : undefined,
  };
}

/** Same rules as the API (validateActionInput from @ims/shared), plus the same-price check. */
export function actionFormSchema(ctx: { today: string; currentPrice: number }) {
  return baseSchema.superRefine((v, c) => {
    for (const e of validateActionInput(toActionInput(v), { today: ctx.today })) {
      c.addIssue({ code: z.ZodIssueCode.custom, path: [e.field], message: e.message });
    }
    if (ACTION_RULES[v.status].newPrice === 'required' && v.newPrice === ctx.currentPrice) {
      c.addIssue({ code: z.ZodIssueCode.custom, path: ['newPrice'], message: 'New price must differ from the current list price' });
    }
  });
}

export function toActionBody(v: ActionFormValues): CreateActionBody {
  const input = toActionInput(v);
  return {
    status: input.status,
    ...(input.note ? { note: input.note } : {}),
    ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    ...(input.newPrice !== undefined && input.newPrice !== null ? { newPrice: input.newPrice } : {}),
    ...(v.suggestionCode ? { suggestionCode: v.suggestionCode } : {}),
  };
}
