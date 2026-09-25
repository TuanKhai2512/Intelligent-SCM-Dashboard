import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { Scenario, seedScenario } from './utils/scenario';
import { api, setupTenant, Tenant } from './utils/tenant';

describe('GET /api/vehicles/export.csv (e2e)', () => {
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

  it('exports every row matching the filters, ignoring pagination', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles/export.csv?make=Toyota&pageSize=1').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="inventory-\d{4}-\d{2}-\d{2}\.csv"/);
    const lines = res.text.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'VIN,Make,Model,Year,Trim,Color,Mileage,List price,Purchase cost,Status,Stocked at,Age (days),Bucket,Holding cost,Latest action,Latest action date,Latest action note',
    );
    expect(lines[1]).toContain(s.fortuner.vin);
    expect(lines[1]).toContain(',95,AGING,');
  });

  it('includes the latest action label and date', async () => {
    const res = await api(t.app, tenant.token).get('/api/vehicles/export.csv?actionStatus=PRICE_REDUCED').expect(200);
    expect(res.text).toContain('Price Reduced,2026-05-26');
  });
});
