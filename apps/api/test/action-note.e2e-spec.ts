import { createTestApp, TEST_NOW, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, createManager, login, setupTenant, Tenant } from './utils/tenant';

const HOUR = 3_600_000;

describe('PATCH /api/actions/:id/note (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  let s: Scenario;
  let actionId: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    t.clock.set(TEST_NOW);
    await resetDb(t.prisma);
    tenant = await setupTenant(t);
    s = await seedScenario(t.prisma, tenant);
    const res = await api(t.app, tenant.token).post(`/api/vehicles/${s.fortuner.id}/actions`).send({ status: 'MARKETING_PUSH', note: 'first' }).expect(201);
    actionId = res.body.action.id;
  });

  const patch = (token: string, body: object) => api(t.app, token).patch(`/api/actions/${actionId}/note`).send(body);

  it('lets the author edit within 24 hours and sets editedAt', async () => {
    t.clock.set(new Date(TEST_NOW.getTime() + 24 * HOUR));
    const res = await patch(tenant.token, { note: 'second' }).expect(200);
    expect(res.body).toMatchObject({ note: 'second', editedAt: new Date(TEST_NOW.getTime() + 24 * HOUR).toISOString() });
  });

  it('rejects edits after 24 hours', async () => {
    t.clock.set(new Date(TEST_NOW.getTime() + 24 * HOUR + 60_000));
    const res = await patch(tenant.token, { note: 'late' }).expect(403);
    expect(res.body.message).toBe('Notes can only be edited within 24 hours');
  });

  it('rejects edits by another manager', async () => {
    await createManager(t.prisma, tenant.dealershipId, 'colleague@test.local');
    const token = await login(t.app, 'colleague@test.local');
    await patch(token, { note: 'mine now' }).expect(403);
  });

  it('never allows changing status or price', async () => {
    await patch(tenant.token, { note: 'x', status: 'ON_HOLD' }).expect(400);
  });

  it('returns 404 for another dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    await patch(other.token, { note: 'x' }).expect(404);
  });
});
