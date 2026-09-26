import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('GET /api/vehicles/:id (e2e)', () => {
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

  it('returns computed fields, actions (newest first) and price history (oldest first)', async () => {
    const res = await api(t.app, tenant.token).get(`/api/vehicles/${s.cx5.id}`).expect(200);
    expect(res.body).toMatchObject({ id: s.cx5.id, ageDays: 125, bucket: 'AGING', listPrice: 850_000_000, everReduced: true });
    expect(res.body.actions).toHaveLength(1);
    expect(res.body.actions[0]).toMatchObject({ status: 'PRICE_REDUCED', newPrice: 850_000_000, source: 'MANUAL', createdBy: { fullName: 'Test Manager' } });
    expect(res.body.priceHistory.map((p: { reason: string; price: number }) => [p.reason, p.price])).toEqual([
      ['INITIAL', 900_000_000],
      ['PRICE_REDUCED_ACTION', 850_000_000],
    ]);
    expect(res.body.priceHistory[1].previousPrice).toBe(900_000_000);
  });

  it('returns suggestions with reasons', async () => {
    const res = await api(t.app, tenant.token).get(`/api/vehicles/${s.cx5.id}/suggestions`).expect(200);
    expect(res.body.map((x: { code: string }) => x.code)).toEqual(['STALE_PLAN', 'AUCTION']);
    const fortuner = await api(t.app, tenant.token).get(`/api/vehicles/${s.fortuner.id}/suggestions`).expect(200);
    expect(fortuner.body).toEqual([
      { code: 'NEVER_REDUCED', suggestedStatus: 'PRICE_REDUCTION_PLANNED', reason: '95 days in stock, price never reduced' },
    ]);
  });

  it('stops suggesting an action once it has been logged', async () => {
    await api(t.app, tenant.token)
      .post(`/api/vehicles/${s.fortuner.id}/actions`)
      .send({ status: 'PRICE_REDUCTION_PLANNED', targetDate: '2026-06-22', suggestionCode: 'NEVER_REDUCED' })
      .expect(201);
    const res = await api(t.app, tenant.token).get(`/api/vehicles/${s.fortuner.id}/suggestions`).expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 for another dealership\'s vehicle and 400 for a non-uuid id', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    await api(t.app, other.token).get(`/api/vehicles/${s.cx5.id}`).expect(404);
    await api(t.app, tenant.token).get('/api/vehicles/not-a-uuid').expect(400);
  });
});
