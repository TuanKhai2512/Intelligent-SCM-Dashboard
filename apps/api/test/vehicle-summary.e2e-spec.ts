import { ageInDays, bucketFor } from '@ims/shared';
import { VehicleSummaryRepository } from '../src/vehicles/vehicle-summary.repository';
import { createTestApp, TEST_NOW, TestApp, TOMORROW, TODAY, YESTERDAY } from './utils/app';
import { resetDb } from './utils/db';
import { setupTenant, Tenant } from './utils/tenant';
import { createAction, createVehicle, daysAgo } from './utils/vehicles';

describe('vehicleSummary SQL (e2e)', () => {
  let t: TestApp;
  let repo: VehicleSummaryRepository;
  let tenant: Tenant;

  beforeAll(async () => {
    t = await createTestApp();
    repo = t.app.get(VehicleSummaryRepository);
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t.prisma);
    tenant = await setupTenant(t);
  });

  it('agrees with shared ageInDays/bucketFor at every bucket edge', async () => {
    for (const age of [0, 30, 31, 60, 61, 90, 91, 200]) {
      await createVehicle(t.prisma, tenant, { ageDays: age });
    }
    const { rows } = await repo.search(tenant.dealershipId, {});
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      expect(r.age_days).toBe(ageInDays(r.stocked_at, TEST_NOW, 'Asia/Saigon'));
      expect(r.bucket).toBe(bucketFor(r.age_days, 90));
    }
    expect(rows.map((r) => r.bucket)).toEqual(['AGING', 'AGING', 'WATCH', 'WATCH', 'NORMAL', 'NORMAL', 'FRESH', 'FRESH']);
  });

  it('follows a custom threshold', async () => {
    await t.prisma.dealership.update({ where: { id: tenant.dealershipId }, data: { agingThresholdDays: 60 } });
    await createVehicle(t.prisma, tenant, { ageDays: 61 });
    await createVehicle(t.prisma, tenant, { ageDays: 31 });
    const { rows } = await repo.search(tenant.dealershipId, {});
    expect(rows.map((r) => r.bucket)).toEqual(['AGING', 'WATCH']);
  });

  it('counts age on local dates (00:30 local today is 0 days old)', async () => {
    const v = await createVehicle(t.prisma, tenant, { stockedAt: new Date('2026-06-14T17:30:00Z') });
    const row = await repo.findOne(tenant.dealershipId, v.id);
    expect(row!.age_days).toBe(0);
  });

  it('computes holding cost and freezes age for sold vehicles', async () => {
    const inStock = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    const sold = await createVehicle(t.prisma, tenant, { ageDays: 200, status: 'SOLD', soldAt: daysAgo(50) });
    expect(Number((await repo.findOne(tenant.dealershipId, inStock.id))!.holding_cost)).toBe(100 * 150_000);
    const soldRow = (await repo.findOne(tenant.dealershipId, sold.id))!;
    expect(soldRow.age_days).toBe(150);
    expect(soldRow.bucket).toBeNull();
  });

  it('computes badges: no action, stale at 15 not 14 days, overdue only when the target date is past', async () => {
    const none = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    const fresh14 = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    await createAction(t.prisma, tenant, fresh14.id, { status: 'MARKETING_PUSH', daysAgo: 14 });
    const stale15 = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    await createAction(t.prisma, tenant, stale15.id, { status: 'MARKETING_PUSH', daysAgo: 15 });
    const overdue = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    await createAction(t.prisma, tenant, overdue.id, { status: 'ON_HOLD', daysAgo: 3, targetDate: YESTERDAY });
    const dueToday = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    await createAction(t.prisma, tenant, dueToday.id, { status: 'ON_HOLD', daysAgo: 3, targetDate: TODAY });
    const later = await createVehicle(t.prisma, tenant, { ageDays: 100 });
    await createAction(t.prisma, tenant, later.id, { status: 'ON_HOLD', daysAgo: 3, targetDate: TOMORROW });

    const get = async (id: string) => (await repo.findOne(tenant.dealershipId, id))!;
    expect((await get(none.id)).badge_no_action).toBe(true);
    expect((await get(fresh14.id)).badge_no_action).toBe(false);
    expect((await get(fresh14.id)).badge_stale).toBe(false);
    expect((await get(stale15.id)).badge_stale).toBe(true);
    expect((await get(stale15.id)).latest_action_days).toBe(15);
    expect((await get(overdue.id)).badge_overdue).toBe(true);
    expect((await get(dueToday.id)).badge_overdue).toBe(false);
    expect((await get(later.id)).badge_overdue).toBe(false);
  });

  it('uses the newest action as the latest action and tracks price reductions', async () => {
    const v = await createVehicle(t.prisma, tenant, { ageDays: 100, listPrice: 900_000_000 });
    await createAction(t.prisma, tenant, v.id, { status: 'PRICE_REDUCED', daysAgo: 10, newPrice: 850_000_000 });
    await createAction(t.prisma, tenant, v.id, { status: 'MARKETING_PUSH', daysAgo: 2 });
    const row = (await repo.findOne(tenant.dealershipId, v.id))!;
    expect(row.latest_action_status).toBe('MARKETING_PUSH');
    expect(row.ever_reduced).toBe(true);
    expect(Number(row.list_price)).toBe(850_000_000);
  });

  it('never returns another dealership\'s vehicles', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    const v = await createVehicle(t.prisma, other, {});
    expect(await repo.findOne(tenant.dealershipId, v.id)).toBeNull();
  });
});
