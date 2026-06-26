/**
 * 로그인 토큰 관리 유틸
 * localStorage에 accessToken 저장/조회/삭제
 */

export const token = {
  // 토큰 저장 (로그인 성공 시 호출)
  save(accessToken) {
    localStorage.setItem('accessToken', accessToken);
  },

  // 토큰 조회
  get() {
    return localStorage.getItem('accessToken');
  },

  // 로그인 여부 확인
  exists() {
    return !!localStorage.getItem('accessToken');
  },

  // 토큰 삭제 (로그아웃 시 호출)
  remove() {
    localStorage.removeItem('accessToken');
  },
};
