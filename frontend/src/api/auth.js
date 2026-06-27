import { apiClient } from './client';

/**
 * 인증 관련 API (B-01, B-02)
 */

// Google 로그인 - 구글 발급 id_token을 백엔드로 전송
// POST /api/auth/login/
export async function loginWithGoogle(idToken) {
  return apiClient('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
  // 응답: { access_token, refresh_token, is_new_user }
}

// 내 프로필 조회
// GET /api/users/me/
export async function getMyProfile() {
  return apiClient('/api/users/me/');
}

// 내 프로필 수정
// PATCH /api/users/me/
export async function updateMyProfile({ nickname, profile_image_url }) {
  return apiClient('/api/users/me/', {
    method: 'PATCH',
    body: JSON.stringify({ nickname, profile_image_url }),
  });
}
