import { FixedClock } from '../src/common/clock';
import { runSeed } from '../src/seed/seed';
import { createTestApp, TEST_NOW } from './utils/app';
import { api, login } from './utils/tenant';

const DAY = 86_400_000;

async function distributionAt(now: Date) {
  const t = await createTestApp({ clock: new FixedClock(now) });
  try {
    await runSeed(t.prisma, { now, reset: true });
    const token = await login(t.app, 'manager@demo.local');
    const client = api(t.app, token);
    const dist = (await client.get('/api/reports/age-distribution').expect(200)).body;
    const overview = (await client.get('/api/reports/overview').expect(200)).body;
    return { dist, overview };
  } finally {
    await t.app.close();
  }
}

describe('seed (e2e)', () => {
  it('produces the same age distribution on any run day, with every bucket and alert populated', async () => {
    const a = await distributionAt(TEST_NOW);
    const b = await distributionAt(new Date(TEST_NOW.getTime() + 100 * DAY));

    expect(a.dist).toEqual(b.dist);
    expect(a.overview).toEqual(b.overview);
    for (const { count } of a.dist) expect(count).toBeGreaterThan(0);
    expect(a.overview.totalInStock).toBe(150);
    expect(a.overview.agingPct).toBeGreaterThanOrEqual(12);
    expect(a.overview.agingPct).toBeLessThanOrEqual(18);
    expect(a.overview.needsAttention.noAction).toBeGreaterThan(0);
    expect(a.overview.needsAttention.stale).toBeGreaterThan(0);
    expect(a.overview.needsAttention.overdue).toBeGreaterThan(0);
  });

  it('skips when data already exists and reset is not requested', async () => {
    const t = await createTestApp();
    try {
      await runSeed(t.prisma, { now: TEST_NOW, reset: true });
      expect(await runSeed(t.prisma, { now: TEST_NOW })).toEqual({ skipped: true, vehicles: 0 });
    } finally {
      await t.app.close();
    }
  });
});
