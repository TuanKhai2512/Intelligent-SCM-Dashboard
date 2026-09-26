import { z } from 'zod';

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const num = () => z.number({ invalid_type_error: 'Enter a number' });

/** Same ranges as the API's UpdateSettingsDto. */
export const settingsSchema = z.object({
  agingThresholdDays: num().int().min(60).max(365),
  staleActionDays: num().int().min(1).max(90),
  dailyHoldingCost: num().min(0),
  timezone: z.string().trim().refine(isValidTimeZone, 'Unknown timezone (use an IANA name like Asia/Saigon)'),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
