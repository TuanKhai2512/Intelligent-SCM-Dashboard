import type { PrismaClient } from '@prisma/client';
import { YESTERDAY } from './app';
import type { Tenant } from './tenant';
import { createAction, createVehicle, daysAgo } from './vehicles';

/**
 * In stock: vios (10d, fresh), seltos (70d, watch, overdue plan),
 * fortuner (95d, aging, no action), cx5 (125d, aging, reduced 20d ago -> stale).
 * Sold: city.
 */
export async function seedScenario(prisma: PrismaClient, t: Tenant) {
  const vios = await createVehicle(prisma, t, { make: 'Toyota', model: 'Vios', year: 2024, ageDays: 10, listPrice: 500_000_000 });
  const seltos = await createVehicle(prisma, t, { make: 'Kia', model: 'Seltos', year: 2024, ageDays: 70, listPrice: 680_000_000 });
  await createAction(prisma, t, seltos.id, { status: 'PRICE_REDUCTION_PLANNED', daysAgo: 3, targetDate: YESTERDAY });
  const fortuner = await createVehicle(prisma, t, { make: 'Toyota', model: 'Fortuner', year: 2023, ageDays: 95, listPrice: 1_100_000_000 });
  const cx5 = await createVehicle(prisma, t, { make: 'Mazda', model: 'CX-5', year: 2022, ageDays: 125, listPrice: 900_000_000 });
  await createAction(prisma, t, cx5.id, { status: 'PRICE_REDUCED', daysAgo: 20, newPrice: 850_000_000 });
  const city = await createVehicle(prisma, t, {
    make: 'Honda', model: 'City', year: 2023, ageDays: 200, listPrice: 520_000_000,
    status: 'SOLD', soldAt: daysAgo(50), salePrice: 510_000_000,
  });
  return { vios, seltos, fortuner, cx5, city };
}
export type Scenario = Awaited<ReturnType<typeof seedScenario>>;
