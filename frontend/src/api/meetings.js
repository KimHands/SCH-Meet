import { apiClient } from './client';

/**
 * 모임 관련 API (B-07 ~ B-15)
 */

// 모임 목록 조회
// GET /api/meetings/?status=active|ended
export async function getMeetings(status = 'active') {
  return apiClient(`/api/meetings/?status=${status}`);
}

// 모임 상세 조회
// GET /api/meetings/{id}/
export async function getMeeting(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/`);
}

// 모임 생성
// POST /api/meetings/
export async function createMeeting({ name, purpose, desired_time, desired_location, latitude, longitude, capacity }) {
  return apiClient('/api/meetings/', {
    method: 'POST',
    body: JSON.stringify({ name, purpose, desired_time, desired_location, latitude, longitude, capacity }),
  });
  // 응답: { meeting_id, invite_link, token }
}

// 모임 정보 수정 (모임장 전용)
// PATCH /api/meetings/{id}/
export async function updateMeeting(meetingId, data) {
  return apiClient(`/api/meetings/${meetingId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// 모임 탈퇴 / 삭제
// DELETE /api/meetings/{id}/
export async function leaveMeeting(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/`, {
    method: 'DELETE',
  });
}

// 초대 링크로 모임 정보 선조회 (참여 전)
// GET /api/meetings/invite/{token}/
export async function getInviteInfo(token) {
  return apiClient(`/api/meetings/invite/${token}/`);
  // 응답: { meeting_id, meeting_name, purpose, creator_name, current_participants_count, capacity, existing_members }
}

// 모임 참여 (희망 시간, 장소 제출)
// POST /api/meetings/invite/{token}/join/
export async function joinMeeting(token, { desired_time, desired_location, latitude, longitude }) {
  return apiClient(`/api/meetings/invite/${token}/join/`, {
    method: 'POST',
    body: JSON.stringify({ desired_time, desired_location, latitude, longitude }),
  });
}

// AI 추천 결과 조회
// GET /api/meetings/{id}/recommendations/
export async function getRecommendations(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/recommendations/`);
  // 응답: 추천 시간 목록 + reason_bullets
}

// 일정 확정
// POST /api/meetings/{id}/confirm/
export async function confirmMeeting(meetingId, selectedRecommendationId) {
  return apiClient(`/api/meetings/${meetingId}/confirm/`, {
    method: 'POST',
    body: JSON.stringify({ selected_recommendation_id: selectedRecommendationId }),
  });
}

// 확정된 모임 정보 조회
// GET /api/meetings/{id}/confirmed/
export async function getConfirmedMeeting(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/confirmed/`);
  // 응답: { meeting_id, meeting_name, confirmed_time, confirmed_location, confirmed_members }
}
