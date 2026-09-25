import type { VehicleAction } from '@prisma/client';
import type { ActionView, SuggestionCode } from '@ims/shared';
import { toDateOnly } from '../common/dates';
import { toNumberOrNull } from '../common/money';

export const ACTION_INCLUDE = { creator: { select: { id: true, fullName: true } } } as const;

export type ActionWithCreator = VehicleAction & { creator: { id: string; fullName: string } };

export function toActionView(a: ActionWithCreator): ActionView {
  return {
    id: a.id,
    vehicleId: a.vehicleId,
    status: a.status,
    note: a.note,
    targetDate: a.targetDate ? toDateOnly(a.targetDate) : null,
    newPrice: toNumberOrNull(a.newPrice),
    source: a.source,
    suggestionCode: a.suggestionCode as SuggestionCode | null,
    bulkId: a.bulkId,
    editedAt: a.editedAt ? a.editedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.creator,
  };
}
