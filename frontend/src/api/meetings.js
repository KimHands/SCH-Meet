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
// 응답에 invite_link(없으면 null), duration_minutes, my_role('CREATOR'|'MEMBER') 포함
export async function getMeeting(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/`);
}

// 모임 생성
// POST /api/meetings/
// duration_minutes: 30~240, 30분 단위 (기본 60)
export async function createMeeting({ name, purpose, desired_time, desired_location, latitude, longitude, capacity, duration_minutes }) {
  return apiClient('/api/meetings/', {
    method: 'POST',
    body: JSON.stringify({ name, purpose, desired_time, desired_location, latitude, longitude, capacity, duration_minutes }),
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
// 정원 초과·이미 확정된 모임이면 409 { detail }
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

// 일정 확정 (모임장 전용 — 아니면 403)
// POST /api/meetings/{id}/confirm/
// 그 사이 시간이 막혔으면 409 { detail } → 화면에서 detail 표시 후 추천 다시 조회
export async function confirmMeeting(meetingId, { recommendationId, day, startTime }) {
  return apiClient(`/api/meetings/${meetingId}/confirm/`, {
    method: 'POST',
    body: JSON.stringify({ selected_recommendation_id: recommendationId, day, start_time: startTime }),
  });
}

// 확정된 모임 정보 조회
// GET /api/meetings/{id}/confirmed/
export async function getConfirmedMeeting(meetingId) {
  return apiClient(`/api/meetings/${meetingId}/confirmed/`);
  // 응답: { meeting_id, meeting_name, confirmed_time, confirmed_location, confirmed_members }
}
