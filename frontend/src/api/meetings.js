import { apiClient } from './client';

/**
 * 모임 관련 API
 */

// 모임 목록 조회
export async function getMeetings() {
  return apiClient('/meetings');
}

// 모임 상세 조회
export async function getMeeting(meetingId) {
  return apiClient(`/meetings/${meetingId}`);
}

// 모임 생성
export async function createMeeting({ name, purpose, time, location, capacity }) {
  return apiClient('/meetings', {
    method: 'POST',
    body: JSON.stringify({ name, purpose, time, location, capacity }),
  });
}

// 초대 링크 생성
export async function createInviteLink(meetingId) {
  return apiClient(`/meetings/${meetingId}/invite`, {
    method: 'POST',
  });
}

// 초대 링크로 모임 정보 조회
export async function getInviteInfo(token) {
  return apiClient(`/invite/${token}`);
}

// 모임 참여 (희망 시간, 장소 제출)
export async function joinMeeting(token, { time, location }) {
  return apiClient(`/invite/${token}/join`, {
    method: 'POST',
    body: JSON.stringify({ time, location }),
  });
}

// AI 추천 결과 조회
export async function getRecommendations(meetingId) {
  return apiClient(`/meetings/${meetingId}/recommendations`);
}

// 일정 확정
export async function confirmMeeting(meetingId, { scheduledAt }) {
  return apiClient(`/meetings/${meetingId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  });
}
