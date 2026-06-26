/**
 * API 클라이언트 기본 설정
 * 모든 API 호출은 이 함수를 통해 이루어짐
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 토큰을 포함한 기본 fetch 래퍼
 * - 자동으로 Authorization 헤더에 토큰 추가
 * - 401 응답 시 로그인 페이지로 이동
 */
export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 401: 토큰 만료 → 로그인 페이지로
  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '서버 오류가 발생했어요.');
  }

  // 응답 본문이 없는 경우(204 No Content 등) 처리
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
