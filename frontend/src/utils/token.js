/**
 * 로그인 토큰 관리 유틸 — 토큰 저장소 접근은 반드시 이 모듈을 통한다.
 */

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const token = {
  // refresh 를 생략하면 기존 refresh 토큰을 유지한다 (액세스 토큰 갱신 시)
  save(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },

  get() {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },

  exists() {
    return !!localStorage.getItem(ACCESS_KEY);
  },

  remove() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
