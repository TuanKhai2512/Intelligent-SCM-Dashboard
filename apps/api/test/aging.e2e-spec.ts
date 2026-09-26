import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('GET /api/vehicles/aging (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  let s: Scenario;

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

  it('returns only the money summary, not vehicle lists', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles/aging').expect(200);
    expect(res.body).toEqual({
      summary: {
        thresholdDays: 90,
        totalInStock: 4,
        agingCount: 2,
        watchCount: 1,
        agingPct: 50,
        capitalTiedUp: 990_000_000 + 810_000_000,
        holdingCostSoFar: (125 + 95) * 150_000,
      },
    });
  });

  it('serves the aging list page by page from the inventory endpoint, oldest first', async () => {
    const page1 = await api(t.app, tenant.token)
      .get('/api/vehicles?bucket=AGING&sort=age:desc&page=1&pageSize=1')
      .expect(200);
    expect(page1.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(page1.body.items.map((v: { id: string }) => v.id)).toEqual([s.cx5.id]);
    expect(page1.body.items[0].suggestions.map((x: { code: string }) => x.code)).toEqual(['STALE_PLAN', 'AUCTION']);

    const page2 = await api(t.app, tenant.token)
      .get('/api/vehicles?bucket=AGING&sort=age:desc&page=2&pageSize=1')
      .expect(200);
    expect(page2.body.items.map((v: { id: string }) => v.id)).toEqual([s.fortuner.id]);
    expect(page2.body.items[0].badges.noAction).toBe(true);

    const watch = await api(t.app, tenant.token).get('/api/vehicles?bucket=WATCH&sort=age:desc').expect(200);
    expect(watch.body.items.map((v: { id: string }) => v.id)).toEqual([s.seltos.id]);
  });

  it('follows the dealership threshold', async () => {
    await t.prisma.dealership.update({ where: { id: tenant.dealershipId }, data: { agingThresholdDays: 60 } });
    const res = await api(t.app, tenant.token).get('/api/vehicles/aging').expect(200);
    expect(res.body.summary).toMatchObject({ thresholdDays: 60, agingCount: 3, watchCount: 0 });
  });

  it('returns zeros for an empty dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    const res = await api(t.app, other.token).get('/api/vehicles/aging').expect(200);
    expect(res.body.summary).toEqual({
      thresholdDays: 90,
      totalInStock: 0,
      agingCount: 0,
      watchCount: 0,
      agingPct: 0,
      capitalTiedUp: 0,
      holdingCostSoFar: 0,
    });
  });
});
