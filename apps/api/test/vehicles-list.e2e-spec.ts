import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';
import { createVehicle } from './utils/vehicles';

describe('GET /api/vehicles (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  let s: Scenario;
  const vins = (body: { items: { vin: string }[] }) => body.items.map((i) => i.vin);

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

  const get = (qs = '') => api(t.app, tenant.token).get(`/api/vehicles${qs}`).expect(200);

  it('lists in-stock vehicles, oldest first, with computed fields', async () => {
    const res = await get();
    expect(res.body).toMatchObject({ total: 4, page: 1, pageSize: 25 });
    expect(vins(res.body)).toEqual([s.cx5.vin, s.fortuner.vin, s.seltos.vin, s.vios.vin]);
    const fortuner = res.body.items[1];
    expect(fortuner).toMatchObject({
      make: 'Toyota', model: 'Fortuner', ageDays: 95, bucket: 'AGING', listPrice: 1_100_000_000,
      holdingCost: 95 * 150_000, latestAction: null,
      badges: { noAction: true, stale: false, overdue: false },
    });
    expect(fortuner.suggestions[0].code).toBe('NEVER_REDUCED');
  });

  it('filters by make and model', async () => {
    expect(vins((await get('?make=Toyota')).body)).toEqual([s.fortuner.vin, s.vios.vin]);
    expect(vins((await get('?make=Toyota&model=Vios')).body)).toEqual([s.vios.vin]);
    expect(vins((await get('?make=Toyota&make=Kia')).body)).toHaveLength(3);
  });

  it('filters by age range and bucket', async () => {
    expect(vins((await get('?ageMin=60&ageMax=100')).body)).toEqual([s.fortuner.vin, s.seltos.vin]);
    expect(vins((await get('?bucket=AGING')).body)).toEqual([s.cx5.vin, s.fortuner.vin]);
  });

  it('filters by latest action, including "No action"', async () => {
    expect(vins((await get('?actionStatus=NONE')).body)).toEqual([s.fortuner.vin, s.vios.vin]);
    expect(vins((await get('?actionStatus=NONE&bucket=AGING')).body)).toEqual([s.fortuner.vin]);
    expect(vins((await get('?actionStatus=PRICE_REDUCED')).body)).toEqual([s.cx5.vin]);
  });

  it('filters by year, price, status and search', async () => {
    expect(vins((await get('?yearMin=2024')).body)).toEqual([s.seltos.vin, s.vios.vin]);
    expect(vins((await get('?priceMax=700000000')).body)).toEqual([s.seltos.vin, s.vios.vin]);
    expect(vins((await get('?status=SOLD')).body)).toEqual([s.city.vin]);
    expect(vins((await get('?q=fort')).body)).toEqual([s.fortuner.vin]);
    expect(vins((await get('?q=toyota%20vios')).body)).toEqual([s.vios.vin]);
  });

  it('paginates with correct totals', async () => {
    const res = await get('?pageSize=2&page=2');
    expect(res.body).toMatchObject({ total: 4, page: 2, pageSize: 2 });
    expect(vins(res.body)).toEqual([s.seltos.vin, s.vios.vin]);
  });

  it('sorts by whitelisted fields', async () => {
    expect(vins((await get('?sort=listPrice:asc')).body)[0]).toBe(s.vios.vin);
  });

  it('rejects invalid query params with 400 details', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles?pageSize=101&bucket=OLD&sort=vin:up').expect(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['pageSize', 'bucket', 'sort']));
  });

  it('requires a token', async () => {
    await api(t.app).get('/api/vehicles').expect(401);
  });

  it('scopes results to the caller\'s dealership', async () => {
    const other = await setupTenant(t, { email: 'other@test.local' });
    await createVehicle(t.prisma, other, { make: 'VinFast', model: 'VF 5' });
    const res = await api(t.app, other.token).get('/api/vehicles').expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].make).toBe('VinFast');
  });

  it('GET /api/vehicles/filters returns makes with their models and ranges', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles/filters').expect(200);
    expect(res.body.makes).toEqual([
      { make: 'Honda', models: ['City'] },
      { make: 'Kia', models: ['Seltos'] },
      { make: 'Mazda', models: ['CX-5'] },
      { make: 'Toyota', models: ['Fortuner', 'Vios'] },
    ]);
    expect(res.body.year).toEqual({ min: 2022, max: 2024 });
    expect(res.body.price).toEqual({ min: 500_000_000, max: 1_100_000_000 });
  });
});
