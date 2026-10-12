import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiError, setAuthFailureHandler } from './client';
import { subscribeSlowRequests } from './slowRequests';
import { token } from '../utils/token';
import { consumeRedirectPath } from '../utils/redirect';

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function authHeaderOf(call) {
  return call[1].headers.Authorization;
}

let fetchMock;
let onAuthFailure;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  onAuthFailure = vi.fn();
  setAuthFailureHandler(onAuthFailure);
  window.history.pushState({}, '', '/invite/abc');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('apiClient — success', () => {
  it('sends the access token and returns parsed JSON', async () => {
    token.save('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await expect(apiClient('/api/x/')).resolves.toEqual({ ok: true });
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer access-1');
  });

  it('returns null for an empty body (204)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiClient('/api/x/', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('does not force JSON Content-Type for FormData bodies', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await apiClient('/api/upload/', { method: 'POST', body: new FormData() });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });

  it('sets JSON Content-Type for string bodies', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await apiClient('/api/x/', { method: 'POST', body: '{}' });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
});

describe('apiClient — error detail parsing', () => {
  it('uses a Korean detail message as-is', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { detail: '이미 확정된 모임이에요.' }));
    const error = await apiClient('/api/x/').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('이미 확정된 모임이에요.');
  });

  it.each([
    [400, '입력값을 확인해주세요.'],
    [403, '권한이 없어요.'],
    [404, '요청한 정보를 찾을 수 없어요.'],
    [429, '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'],
    [500, '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'],
    [503, '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'],
  ])('falls back to a Korean message for status %i when detail is not Korean', async (status, message) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(status, { detail: 'Something went wrong' }));
    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status, message });
  });

  it('handles a non-JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(apiClient('/api/x/')).rejects.toMatchObject({
      status: 502,
      message: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
    });
  });

  it('turns a network failure into a Korean ApiError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiClient('/api/x/')).rejects.toMatchObject({
      status: 0,
      message: '네트워크 연결을 확인해주세요.',
    });
  });
});

describe('apiClient — 401 handling', () => {
  it('refreshes once and retries the original request with the new token', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'token expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { access: 'access-2' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

    await expect(apiClient('/api/users/me/')).resolves.toEqual({ id: 7 });

    const [, refreshCall, retryCall] = fetchMock.mock.calls;
    expect(refreshCall[0]).toMatch(/\/api\/auth\/refresh\/$/);
    expect(JSON.parse(refreshCall[1].body)).toEqual({ refresh: 'refresh-1' });
    expect(authHeaderOf(retryCall)).toBe('Bearer access-2');
    expect(token.get()).toBe('access-2');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('shares a single refresh between concurrent 401 responses', async () => {
    token.save('expired', 'refresh-1');
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith('/api/auth/refresh/')) return jsonResponse(200, { access: 'fresh' });
      if (init.headers.Authorization === 'Bearer fresh') return jsonResponse(200, { url });
      return jsonResponse(401, {});
    });

    const results = await Promise.all([apiClient('/api/a/'), apiClient('/api/b/'), apiClient('/api/c/')]);

    expect(results.map((r) => r.url)).toEqual(['/api/a/', '/api/b/', '/api/c/']);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh/'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('on refresh failure clears tokens, saves the current path and calls the auth-failure handler', async () => {
    token.save('expired', 'bad-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'invalid refresh' }));

    await expect(apiClient('/api/meetings/invite/abc/join/')).rejects.toMatchObject({ status: 401 });

    expect(token.get()).toBeNull();
    expect(token.getRefresh()).toBeNull();
    expect(consumeRedirectPath()).toBe('/invite/abc');
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when refresh fails temporarily (5xx)', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(502, {}));

    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status: 502 });
    expect(token.getRefresh()).toBe('refresh-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('keeps the session when refresh is rate limited (429)', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(429, { detail: '요청이 너무 많아요.' }));

    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status: 429 });
    expect(token.getRefresh()).toBe('refresh-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh request has a network error', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiClient('/api/x/')).rejects.toBeInstanceOf(ApiError);
    expect(token.getRefresh()).toBe('refresh-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('does not store a refreshed token after the session changed in another tab', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockImplementationOnce(async () => {
        token.remove(); // 다른 탭에서 로그아웃
        return jsonResponse(200, { access: 'stale-access' });
      });

    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status: 401 });
    expect(token.get()).toBeNull();
  });

  it('retries only once — a second 401 after refresh ends the session', async () => {
    token.save('expired', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { access: 'access-2' }))
      .mockResolvedValueOnce(jsonResponse(401, {}));

    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('without a refresh token goes straight to login', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await expect(apiClient('/api/x/')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('public requests (auth: false) never refresh or redirect', async () => {
    token.save('stale', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: '구글 인증에 실패했어요.' }));

    await expect(apiClient('/api/auth/login/', { method: 'POST', body: '{}', auth: false }))
      .rejects.toMatchObject({ status: 401, message: '구글 인증에 실패했어요.' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});

describe('slow request notice', () => {
  it('reports a request that is still pending after 5 seconds', async () => {
    vi.useFakeTimers();
    let resolveFetch;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    const listener = vi.fn();
    const unsubscribe = subscribeSlowRequests(listener);

    const request = apiClient('/api/slow/');
    vi.advanceTimersByTime(4999);
    expect(listener).not.toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(1);
    expect(listener).toHaveBeenLastCalledWith(true);

    resolveFetch(jsonResponse(200, {}));
    await request;
    expect(listener).toHaveBeenLastCalledWith(false);
    unsubscribe();
  });
});
