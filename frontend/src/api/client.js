/**
 * API 클라이언트 — 모든 API 호출은 이 함수를 통한다.
 * - Authorization 헤더 자동 첨부
 * - 401 → refresh 토큰으로 한 번 갱신 후 원 요청 재시도 (동시 요청은 갱신 1회 공유)
 * - 갱신 실패 → 토큰 삭제, 현재 경로 저장 후 로그인 화면으로
 * - 에러 응답 { detail } → 한국어 메시지를 가진 ApiError
 */

import { token } from '../utils/token';
import { saveRedirectPath, currentPath } from '../utils/redirect';
import { ApiError, toApiError, networkError } from './errors';
import { trackSlowRequest } from './slowRequests';

export { ApiError };

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const REFRESH_ENDPOINT = '/api/auth/refresh/';

let handleAuthFailure = () => window.location.assign('/login');
let refreshPromise = null;

// 라우터가 준비되면 전체 새로고침 대신 SPA 이동을 쓰도록 교체한다
export function setAuthFailureHandler(handler) {
  handleAuthFailure = handler;
}

export async function apiClient(endpoint, { auth = true, ...options } = {}) {
  const res = await trackSlowRequest(() =>
    auth ? sendWithRefresh(endpoint, options) : send(endpoint, options, null)
  );

  if (res.status === 401 && auth) endSession();
  if (!res.ok) throw toApiError(res.status, await readJson(res));
  return readJson(res);
}

async function sendWithRefresh(endpoint, options) {
  const usedToken = token.get();
  const res = await send(endpoint, options, usedToken);
  if (res.status !== 401) return res;

  const refreshed = await ensureFreshToken(usedToken);
  return refreshed ? send(endpoint, options, token.get()) : res;
}

async function send(endpoint, options, accessToken) {
  try {
    return await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(options, accessToken),
    });
  } catch {
    throw networkError();
  }
}

function buildHeaders({ body, headers }, accessToken) {
  const isJsonBody = body !== undefined && !(body instanceof FormData);
  return {
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...headers,
  };
}

// 다른 요청이 이미 토큰을 갱신했다면 바로 재시도, 아니면 진행 중인 갱신을 공유한다
function ensureFreshToken(usedToken) {
  const currentToken = token.get();
  if (currentToken && currentToken !== usedToken) return Promise.resolve(true);
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// true: 새 토큰 확보 / false: 세션 만료(로그인 필요) / 일시 장애(5xx·429·네트워크)는 ApiError를 던져 세션을 유지한다
async function requestNewAccessToken() {
  const refresh = token.getRefresh();
  if (!refresh) return false;

  const res = await send(REFRESH_ENDPOINT, { method: 'POST', body: JSON.stringify({ refresh }) }, null);
  if (res.status === 400 || res.status === 401) return false;
  if (!res.ok) throw toApiError(res.status, await readJson(res));

  const data = await readJson(res);
  if (token.getRefresh() !== refresh) return Boolean(token.get()); // 그사이 다른 탭에서 로그아웃·계정 전환
  if (!data?.access) return false;
  token.save(data.access, data.refresh);
  return true;
}

function endSession() {
  token.remove();
  saveRedirectPath(currentPath());
  handleAuthFailure();
}

async function readJson(res) {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (res.ok) throw new ApiError('서버 응답을 해석하지 못했어요.', res.status);
    return null;
  }
}
