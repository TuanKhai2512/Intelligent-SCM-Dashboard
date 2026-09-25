import { ACTION_RULES, ACTION_STATUSES, NOTE_MAX_LENGTH, validateActionInput } from '@ims/shared';
import { z } from 'zod';

export const BULK_STATUSES = ACTION_STATUSES.filter((s) => ACTION_RULES[s].bulkAllowed);

const baseSchema = z.object({
  status: z.enum(ACTION_STATUSES),
  note: z.string().max(NOTE_MAX_LENGTH).optional(),
  targetDate: z.string().optional(),
});

export type BulkFormValues = z.input<typeof baseSchema>;

export function bulkFormSchema(today: string) {
  return baseSchema.superRefine((v, c) => {
    const errors = validateActionInput(
      { status: v.status, note: v.note?.trim() || undefined, targetDate: v.targetDate || undefined },
      { today, bulk: true },
    );
    for (const e of errors) c.addIssue({ code: z.ZodIssueCode.custom, path: [e.field], message: e.message });
  });
}
