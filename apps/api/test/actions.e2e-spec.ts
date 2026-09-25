import { PricingService } from '../src/pricing/pricing.service';
import { createTestApp, TEST_NOW, TestApp, TODAY, TOMORROW, YESTERDAY } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('Vehicle actions (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  let s: Scenario;
  const post = (vehicleId: string, body: object) =>
    api(t.app, tenant.token).post(`/api/vehicles/${vehicleId}/actions`).send(body);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t.prisma);
    tenant = await setupTenant(t);
    s = await seedScenario(t.prisma, tenant);
  });

  it('logs an action and clears the No action badge', async () => {
    const res = await post(s.fortuner.id, { status: 'MARKETING_PUSH', note: 'Featured listing' }).expect(201);
    expect(res.body.warnings).toEqual([]);
    expect(res.body.action).toMatchObject({
      vehicleId: s.fortuner.id, status: 'MARKETING_PUSH', note: 'Featured listing', source: 'MANUAL',
      createdAt: TEST_NOW.toISOString(), createdBy: { id: tenant.managerId },
    });
    const list = await api(t.app, tenant.token).get('/api/vehicles?actionStatus=NONE&bucket=AGING').expect(200);
    expect(list.body.total).toBe(0);
  });

  it('records the source when applied from a suggestion', async () => {
    const res = await post(s.fortuner.id, { status: 'PRICE_REDUCTION_PLANNED', targetDate: TOMORROW, suggestionCode: 'NEVER_REDUCED' }).expect(201);
    expect(res.body.action).toMatchObject({ source: 'SUGGESTION', suggestionCode: 'NEVER_REDUCED', targetDate: TOMORROW });
  });

  it('enforces per-status field rules', async () => {
    const noDate = await post(s.fortuner.id, { status: 'PRICE_REDUCTION_PLANNED' }).expect(400);
    expect(noDate.body.details).toEqual([{ field: 'targetDate', message: 'targetDate is required for PRICE_REDUCTION_PLANNED' }]);
    await post(s.fortuner.id, { status: 'ON_HOLD', targetDate: YESTERDAY }).expect(400);
    await post(s.fortuner.id, { status: 'ON_HOLD', targetDate: TODAY }).expect(201);
    await post(s.fortuner.id, { status: 'PRICE_REDUCED' }).expect(400);
    await post(s.fortuner.id, { status: 'MARKETING_PUSH', newPrice: 1 }).expect(400);
    await post(s.fortuner.id, { status: 'MARKETING_PUSH', note: 'x'.repeat(1001) }).expect(400);
    await post(s.fortuner.id, { status: 'NOT_A_STATUS' }).expect(400);
    await post(s.fortuner.id, { status: 'MARKETING_PUSH', createdBy: 'x' }).expect(400);
    await post(s.fortuner.id, { status: 'ON_HOLD', targetDate: '15/06/2026' }).expect(400);
  });

  it('Price Reduced updates the list price and writes linked price history', async () => {
    const res = await post(s.fortuner.id, { status: 'PRICE_REDUCED', newPrice: 1_000_000_000 }).expect(201);
    const detail = await api(t.app, tenant.token).get(`/api/vehicles/${s.fortuner.id}`).expect(200);
    expect(detail.body.listPrice).toBe(1_000_000_000);
    expect(detail.body.everReduced).toBe(true);
    expect(detail.body.priceHistory.at(-1)).toMatchObject({
      reason: 'PRICE_REDUCED_ACTION', price: 1_000_000_000, previousPrice: 1_100_000_000, actionId: res.body.action.id,
    });
  });

  it('rejects a Price Reduced at the same price with 409 and warns on a higher price', async () => {
    await post(s.fortuner.id, { status: 'PRICE_REDUCED', newPrice: 1_100_000_000 }).expect(409);
    const up = await post(s.fortuner.id, { status: 'PRICE_REDUCED', newPrice: 1_200_000_000 }).expect(201);
    expect(up.body.warnings).toEqual(['PRICE_INCREASED']);
  });

  it('only allows actions on in-stock vehicles of the caller\'s dealership', async () => {
    await post(s.city.id, { status: 'MARKETING_PUSH' }).expect(409);
    const other = await setupTenant(t, { email: 'other@test.local' });
    await api(t.app, other.token).post(`/api/vehicles/${s.fortuner.id}/actions`).send({ status: 'MARKETING_PUSH' }).expect(404);
  });

  it('lists the action history newest first', async () => {
    await post(s.cx5.id, { status: 'MARKETING_PUSH' }).expect(201);
    const res = await api(t.app, tenant.token).get(`/api/vehicles/${s.cx5.id}/actions`).expect(200);
    expect(res.body.map((a: { status: string }) => a.status)).toEqual(['MARKETING_PUSH', 'PRICE_REDUCED']);
  });
});

describe('Price Reduced atomicity (e2e)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({
      configure: (b) =>
        b.overrideProvider(PricingService).useValue({
          changeListPrice: async () => {
            throw new Error('simulated failure');
          },
        }),
    });
  });
  afterAll(async () => {
    await t.app.close();
  });

  it('writes nothing when the price update fails', async () => {
    await resetDb(t.prisma);
    const tenant = await setupTenant(t);
    const s = await seedScenario(t.prisma, tenant);
    await api(t.app, tenant.token).post(`/api/vehicles/${s.fortuner.id}/actions`).send({ status: 'PRICE_REDUCED', newPrice: 1 }).expect(500);
    expect(await t.prisma.vehicleAction.count({ where: { vehicleId: s.fortuner.id } })).toBe(0);
    const v = await t.prisma.vehicle.findUniqueOrThrow({ where: { id: s.fortuner.id } });
    expect(Number(v.listPrice)).toBe(1_100_000_000);
  });
});
