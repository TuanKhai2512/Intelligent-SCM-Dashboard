import type { Prisma } from '@prisma/client';

/** VND amounts fit safely in a JS number (Decimal(15,2) < 2^53). */
export const toNumber = (d: Prisma.Decimal | number): number => Number(d);
export const toNumberOrNull = (d: Prisma.Decimal | number | null): number | null =>
  d === null ? null : Number(d);
