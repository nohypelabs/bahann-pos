import { authFetch } from '@/lib/trpc/authFetch';

// jsdom has no Response; authFetch only uses status, ok, json(), text() and clone().
interface FakeResponse { status: number; ok: boolean; json(): Promise<unknown>; text(): Promise<string>; clone(): FakeResponse }
function json(status: number, body: unknown = {}): FakeResponse {
  const text = JSON.stringify(body);
  const res: FakeResponse = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => JSON.parse(text),
    text: async () => text,
    clone: () => json(status, body),
  };
  return res;
}

describe('authFetch', () => {
  let fetchMock: jest.Mock;
  let accessValid: boolean;
  let refreshOk: boolean;

  beforeEach(() => {
    accessValid = false;
    refreshOk = true;
    fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('auth.refresh')) {
        // Yield so concurrent callers overlap with the in-flight refresh.
        await new Promise((r) => setTimeout(r, 5));
        if (refreshOk) accessValid = true;
        return refreshOk ? json(200, { result: { data: { json: { success: true } } } }) : json(401, { error: {} });
      }
      return accessValid ? json(200, [{ result: { data: { json: 'ok' } } }]) : json(401, [{ error: { json: { data: { code: 'UNAUTHORIZED' } } } }]);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const refreshCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('auth.refresh')).length;

  it('passes successful responses through without refreshing', async () => {
    accessValid = true;
    const res = await authFetch('/api/trpc/dashboard.getStats');
    expect(res.status).toBe(200);
    expect(refreshCalls()).toBe(0);
  });

  it('refreshes an expired session once and replays the request', async () => {
    const res = await authFetch('/api/trpc/auth.resendVerification', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(refreshCalls()).toBe(1);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('resendVerification'))).toHaveLength(2);
  });

  it('shares one refresh across concurrent requests, since refresh tokens rotate', async () => {
    const results = await Promise.all([
      authFetch('/api/trpc/a.one'),
      authFetch('/api/trpc/b.two'),
      authFetch('/api/trpc/c.three'),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls()).toBe(1);
  });

  it('detects UNAUTHORIZED inside a mixed (207) batch response', async () => {
    fetchMock.mockImplementationOnce(async () => json(207, [{ result: {} }, { error: { json: { data: { code: 'UNAUTHORIZED' } } } }]));
    const res = await authFetch('/api/trpc/public.x,private.y');
    expect(refreshCalls()).toBe(1);
    expect(res.status).toBe(200);
  });

  it('does not try to refresh the auth endpoints themselves', async () => {
    const res = await authFetch('/api/trpc/auth.login', { method: 'POST' });
    expect(res.status).toBe(401);
    expect(refreshCalls()).toBe(0);
  });

  it('returns the 401 when the refresh fails instead of looping', async () => {
    refreshOk = false;
    const res = await authFetch('/api/trpc/dashboard.getStats');
    expect(res.status).toBe(401);
    expect(refreshCalls()).toBe(1);
  });
});
