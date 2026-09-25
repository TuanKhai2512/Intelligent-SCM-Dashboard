import request from 'supertest';
import { createTestApp, TestApp } from './utils/app';

describe('Health and error shape (e2e)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });

  it('GET /api/health reports the database is up', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('unknown routes use the standard error shape', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
    expect(typeof res.body.message).toBe('string');
  });
});
