import { randomUUID } from 'node:crypto';
import { createTestApp, TestApp, TOMORROW } from './utils/app';
import { resetDb } from './utils/db';
import { api, setupTenant, Tenant } from './utils/tenant';
import { createVehicle } from './utils/vehicles';

describe('POST /api/actions/bulk (e2e)', () => {
  let t: TestApp;
  let tenant: Tenant;
  const bulk = (body: object) => api(t.app, tenant.token).post('/api/actions/bulk').send(body);
  const makeIds = async (n: number) => {
    const ids: string[] = [];
    for (let i = 0; i < n; i++) ids.push((await createVehicle(t.prisma, tenant, { ageDays: 95 })).id);
    return ids;
  };

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

  it('applies the same action to 100 vehicles with one bulkId', async () => {
    const vehicleIds = await makeIds(100);
    const res = await bulk({ vehicleIds, status: 'PRICE_REDUCTION_PLANNED', targetDate: TOMORROW, note: 'Q3 clearance' }).expect(201);
    expect(res.body).toEqual({ bulkId: expect.any(String), count: 100 });
    const rows = await t.prisma.vehicleAction.findMany({ where: { bulkId: res.body.bulkId } });
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map((r) => r.note))).toEqual(new Set(['Q3 clearance']));
  });

  it('rejects 101 vehicles, duplicates, an empty list and Price Reduced', async () => {
    const ids = await makeIds(2);
    const tooMany = await bulk({ vehicleIds: Array.from({ length: 101 }, () => randomUUID()), status: 'MARKETING_PUSH' }).expect(400);
    expect(tooMany.body.details.map((d: { field: string }) => d.field)).toContain('vehicleIds');
    await bulk({ vehicleIds: [ids[0], ids[0]], status: 'MARKETING_PUSH' }).expect(400);
    await bulk({ vehicleIds: [], status: 'MARKETING_PUSH' }).expect(400);
    const pr = await bulk({ vehicleIds: ids, status: 'PRICE_REDUCED' }).expect(400);
    expect(pr.body.details.map((d: { field: string }) => d.field)).toContain('status');
    await bulk({ vehicleIds: ids, status: 'PRICE_REDUCED', newPrice: 1 }).expect(400);
  });

  it('writes nothing when one vehicle is not in stock', async () => {
    const ids = await makeIds(3);
    const sold = await createVehicle(t.prisma, tenant, { ageDays: 100, status: 'SOLD', soldAt: new Date() });
    await bulk({ vehicleIds: [...ids, sold.id], status: 'MARKETING_PUSH' }).expect(409);
    expect(await t.prisma.vehicleAction.count()).toBe(0);
  });

  it('writes nothing when one vehicle belongs to another dealership', async () => {
    const ids = await makeIds(2);
    const other = await setupTenant(t, { email: 'other@test.local' });
    const foreign = await createVehicle(t.prisma, other, {});
    const res = await bulk({ vehicleIds: [...ids, foreign.id], status: 'MARKETING_PUSH' }).expect(404);
    expect(res.body.details).toEqual([{ field: 'vehicleIds', message: `Vehicle ${foreign.id} not found` }]);
    expect(await t.prisma.vehicleAction.count()).toBe(0);
  });
});
