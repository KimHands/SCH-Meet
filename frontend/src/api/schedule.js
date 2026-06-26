import { apiClient } from './client';

/**
 * 고정 일정 관련 API
 */

// 고정 일정 목록 조회
export async function getSchedules() {
  return apiClient('/schedules');
}

// 고정 일정 추가
export async function addSchedule({ title, days, startTime, endTime }) {
  return apiClient('/schedules', {
    method: 'POST',
    body: JSON.stringify({ title, days, startTime, endTime }),
  });
}

// 고정 일정 삭제
export async function deleteSchedule(scheduleId) {
  return apiClient(`/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
}
