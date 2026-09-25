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

  it('returns aging and watch vehicles oldest first with a money summary', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles/aging').expect(200);
    expect(res.body.aging.map((v: { id: string }) => v.id)).toEqual([s.cx5.id, s.fortuner.id]);
    expect(res.body.watch.map((v: { id: string }) => v.id)).toEqual([s.seltos.id]);
    expect(res.body.summary).toEqual({
      thresholdDays: 90,
      totalInStock: 4,
      agingCount: 2,
      watchCount: 1,
      agingPct: 50,
      capitalTiedUp: 990_000_000 + 810_000_000,
      holdingCostSoFar: (125 + 95) * 150_000,
    });
    expect(res.body.aging[1].badges.noAction).toBe(true);
    expect(res.body.aging[0].suggestions.map((x: { code: string }) => x.code)).toEqual(['STALE_PLAN', 'AUCTION']);
  });

  it('follows the dealership threshold', async () => {
    await t.prisma.dealership.update({ where: { id: tenant.dealershipId }, data: { agingThresholdDays: 60 } });
    const res = await api(t.app, tenant.token).get('/api/vehicles/aging').expect(200);
    expect(res.body.summary.agingCount).toBe(3);
    expect(res.body.summary.thresholdDays).toBe(60);
  });

  it('returns zeros for an empty dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    const res = await api(t.app, other.token).get('/api/vehicles/aging').expect(200);
    expect(res.body.summary).toMatchObject({ totalInStock: 0, agingCount: 0, agingPct: 0, capitalTiedUp: 0 });
  });
});
