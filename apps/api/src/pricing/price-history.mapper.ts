import type { VehiclePriceHistory } from '@prisma/client';
import type { PriceHistoryView } from '@ims/shared';
import { toNumber, toNumberOrNull } from '../common/money';

export const PRICE_HISTORY_INCLUDE = { changer: { select: { id: true, fullName: true } } } as const;

export function toPriceHistoryView(
  p: VehiclePriceHistory & { changer: { id: string; fullName: string } },
): PriceHistoryView {
  return {
    id: p.id,
    price: toNumber(p.price),
    previousPrice: toNumberOrNull(p.previousPrice),
    reason: p.reason,
    actionId: p.actionId,
    changedAt: p.changedAt.toISOString(),
    changedBy: p.changer,
  };
}
