import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('Reports (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  const get = (path: string) => api(t.app, tenant.token).get(`/api/reports/${path}`).expect(200);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t.prisma);
    tenant = await setupTenant(t);
    await seedScenario(t.prisma, tenant);
  });

  it('overview returns KPIs and needs-attention counts', async () => {
    expect((await get('overview')).body).toEqual({
      totalInStock: 4,
      avgAgeDays: 75,
      agingCount: 2,
      agingPct: 50,
      capitalTiedUp: 1_800_000_000,
      holdingCostSoFar: 33_000_000,
      needsAttention: { noAction: 1, stale: 1, overdue: 1 },
    });
  });

  it('age distribution is zero-filled in bucket order', async () => {
    expect((await get('age-distribution')).body).toEqual([
      { bucket: 'FRESH', count: 1 },
      { bucket: 'NORMAL', count: 0 },
      { bucket: 'WATCH', count: 1 },
      { bucket: 'AGING', count: 2 },
    ]);
  });

  it('aging actions groups aging vehicles by latest action', async () => {
    const body = (await get('aging-actions')).body as { status: string; count: number }[];
    expect(body).toHaveLength(8);
    expect(body[0]).toEqual({ status: 'NONE', count: 1 });
    expect(body.find((x) => x.status === 'PRICE_REDUCED')).toEqual({ status: 'PRICE_REDUCED', count: 1 });
    expect(body.reduce((n, x) => n + x.count, 0)).toBe(2);
  });

  it('returns zeros for an empty dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    const res = await api(t.app, other.token).get('/api/reports/overview').expect(200);
    expect(res.body).toMatchObject({ totalInStock: 0, avgAgeDays: 0, agingPct: 0, capitalTiedUp: 0 });
  });
});
