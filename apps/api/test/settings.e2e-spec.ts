import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { api, setupTenant, Tenant } from './utils/tenant';
import { createVehicle } from './utils/vehicles';

describe('Dealership settings (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  const client = () => api(t.app, tenant.token);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t.prisma);
    tenant = await setupTenant(t);
  });

  it('reads the settings', async () => {
    const res = await client().get('/api/dealership/settings').expect(200);
    expect(res.body).toMatchObject({
      name: 'Test Motors', timezone: 'Asia/Saigon', currency: 'VND',
      agingThresholdDays: 90, staleActionDays: 14, dailyHoldingCost: 150_000,
    });
  });

  it('updates the threshold, which moves vehicles into aging', async () => {
    await createVehicle(t.prisma, tenant, { ageDays: 65 });
    const res = await client().patch('/api/dealership/settings').send({ agingThresholdDays: 60, dailyHoldingCost: 200_000 }).expect(200);
    expect(res.body).toMatchObject({ agingThresholdDays: 60, dailyHoldingCost: 200_000 });
    const list = await client().get('/api/vehicles?bucket=AGING').expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].holdingCost).toBe(65 * 200_000);
  });

  it('validates ranges and timezone', async () => {
    const res = await client().patch('/api/dealership/settings').send({ agingThresholdDays: 30, staleActionDays: 0, timezone: 'Mars/Base' }).expect(400);
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['agingThresholdDays', 'staleActionDays', 'timezone']),
    );
  });
});
