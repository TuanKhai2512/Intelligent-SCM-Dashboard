import { createTestApp, TestApp } from './utils/app';
import { resetDb } from './utils/db';
import { api, createDealership, createManager, PASSWORD } from './utils/tenant';

describe('Auth (e2e)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t.prisma);
    const d = await createDealership(t.prisma);
    await createManager(t.prisma, d.id, 'manager@test.local');
    await createManager(t.prisma, d.id, 'gone@test.local', { active: false });
  });

  it('logs in and returns the current user', async () => {
    const login = await api(t.app).post('/api/auth/login').send({ email: 'manager@test.local', password: PASSWORD }).expect(200);
    expect(typeof login.body.accessToken).toBe('string');

    const me = await api(t.app, login.body.accessToken).get('/api/auth/me').expect(200);
    expect(me.body).toMatchObject({ email: 'manager@test.local', role: 'MANAGER', fullName: 'Test Manager' });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('accepts the email in any case', async () => {
    await api(t.app).post('/api/auth/login').send({ email: 'Manager@Test.Local', password: PASSWORD }).expect(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api(t.app).post('/api/auth/login').send({ email: 'manager@test.local', password: 'nope' }).expect(401);
    expect(res.body).toEqual({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password' });
  });

  it('rejects a deactivated employee', async () => {
    await api(t.app).post('/api/auth/login').send({ email: 'gone@test.local', password: PASSWORD }).expect(401);
  });

  it('returns 400 with field details for an invalid body', async () => {
    const res = await api(t.app).post('/api/auth/login').send({ email: 'not-an-email', extra: 1 }).expect(400);
    expect(res.body.message).toBe('Validation failed');
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'extra']));
  });

  it('protects routes by default', async () => {
    await api(t.app).get('/api/auth/me').expect(401);
    await api(t.app, 'garbage').get('/api/auth/me').expect(401);
  });
});
