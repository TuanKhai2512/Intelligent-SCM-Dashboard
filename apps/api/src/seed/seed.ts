import { Prisma, PrismaClient } from '@prisma/client';
import { dateInTz } from '@ims/shared';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { fromDateOnly } from '../common/dates';
import { CATALOG, COLORS } from './catalog';
import { createRng } from './random';

const DAY = 86_400_000;
const TZ = 'Asia/Saigon';
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

export const DEMO_EMAIL = 'manager@demo.local';
export const DEMO_PASSWORD = 'Password123!';

interface SeedOptions {
  now: Date;
  reset?: boolean;
}

/**
 * Deterministic demo data. Every date is "now minus N days", so the age
 * distribution is the same whichever day the seed runs.
 */
export async function runSeed(prisma: PrismaClient, { now, reset = false }: SeedOptions) {
  if (reset) {
    await prisma.$executeRawUnsafe(
      'TRUNCATE vehicle_actions, vehicle_price_history, vehicles, employees, dealerships CASCADE',
    );
  } else if ((await prisma.vehicle.count()) > 0) {
    return { skipped: true, vehicles: 0 };
  }

  const rng = createRng(20260925);
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const localDate = (offsetDays: number) => fromDateOnly(dateInTz(new Date(now.getTime() + offsetDays * DAY), TZ));

  const dealershipId = randomUUID();
  const managerId = randomUUID();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const vehicles: Prisma.VehicleCreateManyInput[] = [];
  const prices: Prisma.VehiclePriceHistoryCreateManyInput[] = [];
  const actions: Prisma.VehicleActionCreateManyInput[] = [];
  const vins = new Set<string>();

  const newVin = () => {
    let vin = '';
    do {
      vin = Array.from({ length: 17 }, () => rng.pick(VIN_CHARS.split(''))).join('');
    } while (vins.has(vin));
    vins.add(vin);
    return vin;
  };

  const addVehicle = (stockedDaysAgo: number, closed?: { status: 'SOLD' | 'WHOLESALED'; soldDaysAgo: number }) => {
    const m = rng.pick(CATALOG);
    const listPrice = rng.int(m.minPriceM, m.maxPriceM) * 1_000_000;
    const id = randomUUID();
    const stockedAt = ago(stockedDaysAgo);
    vehicles.push({
      id,
      dealershipId,
      vin: newVin(),
      make: m.make,
      model: m.model,
      year: rng.int(2021, 2025),
      color: rng.pick(COLORS),
      mileage: rng.int(5, 80) * 1000,
      purchaseCost: Math.round((listPrice * rng.float(0.85, 0.92)) / 100_000) * 100_000,
      listPrice,
      status: closed?.status ?? 'IN_STOCK',
      stockedAt,
      soldAt: closed ? ago(closed.soldDaysAgo) : null,
      salePrice: closed ? Math.round((listPrice * rng.float(0.93, 1)) / 1_000_000) * 1_000_000 : null,
    });
    prices.push({ vehicleId: id, price: listPrice, reason: 'INITIAL', changedBy: managerId, changedAt: stockedAt });
    return { id, listPrice };
  };

  let currentPrice = new Map<string, number>();
  const reduce = (v: { id: string }, daysAgo: number) => {
    const before = currentPrice.get(v.id)!;
    const after = Math.round((before * (1 - rng.float(0.03, 0.07))) / 1_000_000) * 1_000_000;
    const actionId = randomUUID();
    actions.push({ id: actionId, vehicleId: v.id, status: 'PRICE_REDUCED', newPrice: after, note: 'Price adjusted to move stock', createdBy: managerId, createdAt: ago(daysAgo) });
    prices.push({ vehicleId: v.id, price: after, previousPrice: before, reason: 'PRICE_REDUCED_ACTION', actionId, changedBy: managerId, changedAt: ago(daysAgo) });
    currentPrice.set(v.id, after);
  };
  const act = (v: { id: string }, a: Omit<Prisma.VehicleActionCreateManyInput, 'vehicleId' | 'createdBy'>) =>
    actions.push({ vehicleId: v.id, createdBy: managerId, ...a });

  // 150 in stock: 45 fresh, 40 normal, 42 watch, 23 aging (about 15%)
  const inStock = [
    ...Array.from({ length: 45 }, () => addVehicle(rng.int(1, 30))),
    ...Array.from({ length: 40 }, () => addVehicle(rng.int(31, 60))),
    ...Array.from({ length: 42 }, () => ({ ...addVehicle(rng.int(61, 90)), watch: true })),
    ...Array.from({ length: 23 }, () => ({ ...addVehicle(rng.int(91, 200)), aging: true })),
  ];
  currentPrice = new Map(inStock.map((v) => [v.id, v.listPrice]));

  // Actions on aging cars, in a fixed pattern so every badge and suggestion appears
  inStock.filter((v) => 'aging' in v).forEach((v, i) => {
    switch (i % 6) {
      case 0: // no action -> "No action" badge, NEVER_REDUCED suggestion
        break;
      case 1: // reduced long ago, then a marketing push 25 days ago -> stale
        reduce(v, 45);
        act(v, { status: 'MARKETING_PUSH', note: 'Featured on website', createdAt: ago(25) });
        break;
      case 2: // plan with a target date in the past -> overdue
        act(v, { status: 'PRICE_REDUCTION_PLANNED', targetDate: localDate(-2), note: 'Cut 5% after weekend', createdAt: ago(6) });
        break;
      case 3: // recent reduction
        reduce(v, 10);
        break;
      case 4: // accepted a suggestion
        act(v, { status: 'PRICE_REDUCTION_PLANNED', targetDate: localDate(7), source: 'SUGGESTION', suggestionCode: 'NEVER_REDUCED', createdAt: ago(3) });
        break;
      case 5: // reduced, now on hold for a reserved customer
        reduce(v, 40);
        act(v, { status: 'ON_HOLD', targetDate: localDate(10), note: 'Customer deposit pending', createdAt: ago(5) });
        break;
    }
  });

  // One bulk marketing push on six watch cars
  const bulkId = randomUUID();
  inStock.filter((v) => 'watch' in v).slice(0, 6).forEach((v) =>
    act(v, { status: 'MARKETING_PUSH', note: 'Weekend sales event', bulkId, createdAt: ago(4) }),
  );

  // 60 closed vehicles for history: 55 sold, 5 wholesaled
  for (let i = 0; i < 60; i++) {
    const stocked = rng.int(40, 400);
    const held = rng.int(5, Math.min(150, stocked - 1));
    addVehicle(stocked, { status: i < 55 ? 'SOLD' : 'WHOLESALED', soldDaysAgo: stocked - held });
  }

  // Final list prices after reductions
  for (const v of vehicles) {
    const p = currentPrice.get(v.id!);
    if (p !== undefined) v.listPrice = p;
  }

  await prisma.$transaction([
    prisma.dealership.create({
      data: { id: dealershipId, name: 'Saigon Auto Center', timezone: TZ, currency: 'VND', dailyHoldingCost: 150_000 },
    }),
    prisma.employee.create({
      data: { id: managerId, dealershipId, fullName: 'Minh Tran', email: DEMO_EMAIL, passwordHash, role: 'MANAGER' },
    }),
    prisma.vehicle.createMany({ data: vehicles }),
    prisma.vehicleAction.createMany({ data: actions }),
    prisma.vehiclePriceHistory.createMany({ data: prices }),
  ]);
  return { skipped: false, vehicles: vehicles.length };
}
