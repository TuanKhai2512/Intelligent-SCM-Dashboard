import { describe, expect, it, vi } from 'vitest';
import { mockApi, reply } from '../test/mock-api';
import { ApiError, apiFetch, setUnauthorizedHandler, tokenStore } from './api';

describe('apiFetch', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStore.set('tok-1');
    const fetchMock = mockApi({ 'POST /api/things': ({ body }: { body: unknown }) => ({ echo: body }) });
    const res = await apiFetch<{ echo: unknown }>('/things', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(res).toEqual({ echo: { a: 1 } });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer tok-1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with field details on 400', async () => {
    mockApi({
      'GET /api/bad': reply(
        { statusCode: 400, error: 'Bad Request', message: 'Validation failed', details: [{ field: 'x', message: 'nope' }] },
        400,
      ),
    });
    const err = await apiFetch('/bad').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'Validation failed', details: [{ field: 'x', message: 'nope' }] });
  });

  it('clears the token and notifies on 401 when signed in', async () => {
    tokenStore.set('expired');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockApi({ 'GET /api/me': reply({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' }, 401) });
    await expect(apiFetch('/me')).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.get()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not treat a failed login (no token) as a session expiry', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockApi({ 'POST /api/auth/login': reply({ statusCode: 401, message: 'Invalid email or password' }, 401) });
    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
