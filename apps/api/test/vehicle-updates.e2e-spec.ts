import { createTestApp, TEST_NOW, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('Vehicle updates (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  let s: Scenario;
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
    s = await seedScenario(t.prisma, tenant);
  });

  it('PATCH listPrice writes a MANUAL_EDIT price history row', async () => {
    const res = await client().patch(`/api/vehicles/${s.vios.id}`).send({ listPrice: 480_000_000 }).expect(200);
    expect(res.body.listPrice).toBe(480_000_000);
    const last = res.body.priceHistory.at(-1);
    expect(last).toMatchObject({ reason: 'MANUAL_EDIT', price: 480_000_000, previousPrice: 500_000_000 });
    expect(last.changedAt).toBe(TEST_NOW.toISOString());
  });

  it('PATCH descriptive fields does not touch price history', async () => {
    const res = await client().patch(`/api/vehicles/${s.vios.id}`).send({ color: 'White', mileage: 12_000 }).expect(200);
    expect(res.body).toMatchObject({ color: 'White', mileage: 12_000 });
    expect(res.body.priceHistory).toHaveLength(1);
  });

  it('PATCH rejects unknown fields and a price change on a sold car', async () => {
    await client().patch(`/api/vehicles/${s.vios.id}`).send({ vin: 'X' }).expect(400);
    await client().patch(`/api/vehicles/${s.city.id}`).send({ listPrice: 1 }).expect(409);
  });

  it('sells a vehicle, freezing its age', async () => {
    const res = await client().post(`/api/vehicles/${s.fortuner.id}/sell`).send({ salePrice: 1_050_000_000 }).expect(200);
    expect(res.body).toMatchObject({ status: 'SOLD', salePrice: 1_050_000_000, soldAt: TEST_NOW.toISOString(), ageDays: 95, bucket: null });
    await client().post(`/api/vehicles/${s.fortuner.id}/sell`).send({ salePrice: 1 }).expect(409);
  });

  it('wholesales a vehicle', async () => {
    const res = await client().post(`/api/vehicles/${s.cx5.id}/wholesale`).send({ salePrice: 700_000_000 }).expect(200);
    expect(res.body.status).toBe('WHOLESALED');
  });

  it('rejects a soldAt in the future or before stockedAt', async () => {
    const future = new Date(TEST_NOW.getTime() + 86_400_000).toISOString();
    const res = await client().post(`/api/vehicles/${s.vios.id}/sell`).send({ salePrice: 1, soldAt: future }).expect(400);
    expect(res.body.details[0].field).toBe('soldAt');
    await client().post(`/api/vehicles/${s.vios.id}/sell`).send({ salePrice: 1, soldAt: '2020-01-01T00:00:00Z' }).expect(400);
  });

  it('returns 404 for another dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    await api(t.app, other.token).post(`/api/vehicles/${s.vios.id}/sell`).send({ salePrice: 1 }).expect(404);
  });
});
