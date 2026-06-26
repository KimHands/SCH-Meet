import { apiClient } from './client';

/**
 * 인증 관련 API
 */

// Google OAuth 로그인 (백엔드에서 받은 code로 토큰 교환)
export async function loginWithGoogle(code) {
  return apiClient('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// 로그아웃
export async function logout() {
  await apiClient('/auth/logout', { method: 'POST' });
  localStorage.removeItem('accessToken');
}

// 내 정보 조회
export async function getMyProfile() {
  return apiClient('/users/me');
}
