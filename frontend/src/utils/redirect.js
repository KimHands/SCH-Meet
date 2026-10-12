/**
 * 로그인 후 돌아갈 경로 저장 — 같은 출처의 상대 경로만 허용 (open redirect 방지)
 */

const STORAGE_KEY = 'postLoginRedirect';
const NOT_SAVED_PATHS = ['/login', '/onboarding-1', '/onboarding-2'];

export function isSafeRedirectPath(path) {
  if (typeof path !== 'string') return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('\\') || /[\u0000-\u001f]/.test(path)) return false;
  return new URL(path, window.location.origin).origin === window.location.origin;
}

export function saveRedirectPath(path) {
  if (!isSafeRedirectPath(path)) return;
  const pathname = path.split(/[?#]/)[0];
  if (NOT_SAVED_PATHS.includes(pathname)) return;
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function consumeRedirectPath() {
  const path = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  return isSafeRedirectPath(path) ? path : null;
}

export function currentPath() {
  const { pathname, search } = window.location;
  return pathname + search;
}
