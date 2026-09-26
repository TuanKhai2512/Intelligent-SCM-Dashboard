import { vi } from 'vitest';

export interface MockRequest {
  url: URL;
  init?: RequestInit;
  body: unknown;
}
export interface MockReply {
  status?: number;
  body?: unknown;
}
/** Key: "METHOD /api/path" (no query string). Value: data (200) or a handler returning a reply. */
export type MockRoutes = Record<string, unknown>;

export function reply(body: unknown, status = 200): MockReply & { __reply: true } {
  return { __reply: true, body, status };
}

export function mockApi(routes: MockRoutes) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url.pathname}`;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    if (!(key in routes)) {
      return new Response(JSON.stringify({ statusCode: 404, error: 'Not Found', message: `No mock for ${key}` }), {
        status: 404,
      });
    }
    const route = routes[key];
    const out = typeof route === 'function' ? (route as (r: MockRequest) => unknown)({ url, init, body }) : route;
    const r = out && typeof out === 'object' && '__reply' in out ? (out as MockReply) : { status: 200, body: out };
    return new Response(JSON.stringify(r.body ?? null), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
