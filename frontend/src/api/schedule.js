import { apiClient } from './client';

/**
 * 고정 일정 관련 API (B-05)
 */

// 고정 일정 목록 조회
// GET /api/schedules/fixed/
export async function getSchedules() {
  return apiClient('/api/schedules/fixed/');
}

// 고정 일정 추가
// POST /api/schedules/fixed/
// repeat_days 형식: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
export async function addSchedule({ title, repeat_days, start_time, end_time }) {
  return apiClient('/api/schedules/fixed/', {
    method: 'POST',
    body: JSON.stringify({ title, repeat_days, start_time, end_time }),
  });
  // 응답: 201 Created, 등록된 레코드 반환
}

// 고정 일정 삭제
// DELETE /api/schedules/fixed/{id}/
export async function deleteSchedule(scheduleId) {
  return apiClient(`/api/schedules/fixed/${scheduleId}/`, {
    method: 'DELETE',
  });
  // 응답: 204 No Content
}

// 요일 한글 → 영문 변환 헬퍼
// "월" → "MON" 형태로 변환 (API 요청 시 사용)
export const DAY_MAP = {
  '월': 'MON', '화': 'TUE', '수': 'WED',
  '목': 'THU', '금': 'FRI', '토': 'SAT', '일': 'SUN',
};
