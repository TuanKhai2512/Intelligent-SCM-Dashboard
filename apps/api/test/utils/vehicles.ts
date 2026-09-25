import type { PrismaClient } from '@prisma/client';
import type { ActionStatus, VehicleStatus } from '@ims/shared';
import { TEST_NOW } from './app';
import type { Tenant } from './tenant';

const DAY = 86_400_000;
export const daysAgo = (days: number, from: Date = TEST_NOW) => new Date(from.getTime() - days * DAY);

export interface VehicleOverrides {
  ageDays?: number;
  stockedAt?: Date;
  make?: string;
  model?: string;
  year?: number;
  listPrice?: number;
  purchaseCost?: number;
  status?: VehicleStatus;
  soldAt?: Date;
  salePrice?: number;
  vin?: string;
}

let vinSeq = 0;

/** Creates a vehicle plus its INITIAL price history row. */
export async function createVehicle(prisma: PrismaClient, t: Tenant, o: VehicleOverrides = {}) {
  const listPrice = o.listPrice ?? 500_000_000;
  const stockedAt = o.stockedAt ?? daysAgo(o.ageDays ?? 10);
  const vehicle = await prisma.vehicle.create({
    data: {
      dealershipId: t.dealershipId,
      vin: o.vin ?? `TESTVIN${String(++vinSeq).padStart(10, '0')}`,
      make: o.make ?? 'Toyota',
      model: o.model ?? 'Vios',
      year: o.year ?? 2024,
      mileage: 10_000,
      purchaseCost: o.purchaseCost ?? Math.round(listPrice * 0.9),
      listPrice,
      status: o.status ?? 'IN_STOCK',
      stockedAt,
      soldAt: o.soldAt ?? null,
      salePrice: o.salePrice ?? null,
    },
  });
  await prisma.vehiclePriceHistory.create({
    data: { vehicleId: vehicle.id, price: listPrice, reason: 'INITIAL', changedBy: t.managerId, changedAt: stockedAt },
  });
  return vehicle;
}

/** Inserts an action directly (bypassing API rules) so tests can backdate it. */
export async function createAction(
  prisma: PrismaClient,
  t: Tenant,
  vehicleId: string,
  a: { status: ActionStatus; daysAgo: number; targetDate?: string; newPrice?: number; note?: string },
) {
  const createdAt = daysAgo(a.daysAgo);
  const action = await prisma.vehicleAction.create({
    data: {
      vehicleId,
      status: a.status,
      note: a.note ?? null,
      targetDate: a.targetDate ? new Date(`${a.targetDate}T00:00:00Z`) : null,
      newPrice: a.newPrice ?? null,
      createdBy: t.managerId,
      createdAt,
    },
  });
  if (a.status === 'PRICE_REDUCED' && a.newPrice !== undefined) {
    const v = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    await prisma.vehiclePriceHistory.create({
      data: {
        vehicleId,
        price: a.newPrice,
        previousPrice: v.listPrice,
        reason: 'PRICE_REDUCED_ACTION',
        actionId: action.id,
        changedBy: t.managerId,
        changedAt: createdAt,
      },
    });
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { listPrice: a.newPrice } });
  }
  return action;
}
