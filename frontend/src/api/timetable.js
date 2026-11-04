import { apiClient } from './client';

/**
 * 시간표 관련 API (B-03, B-04, B-06)
 */

// 에브리타임 URL로 시간표 등록
// POST /api/timetables/upload-url/
export async function uploadTimetableUrl(url) {
  return apiClient('/api/timetables/upload-url/', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  // 응답: { status: "success", parsed_classes_count: 5 }
}

// 등록된 수업 목록 (확정 모임 제외)
// GET /api/timetables/classes/
export async function getTimetableClasses() {
  return apiClient('/api/timetables/classes/');
}

// 등록된 수업 하나 삭제
// DELETE /api/timetables/classes/{id}/
export async function deleteTimetableClass(classId) {
  return apiClient(`/api/timetables/classes/${classId}/`, { method: 'DELETE' });
}

// 등록된 수업 전체 삭제
// DELETE /api/timetables/classes/
export async function deleteAllTimetableClasses() {
  return apiClient('/api/timetables/classes/', { method: 'DELETE' });
}

// 통합 시간표 조회 (수업 + 고정 일정 병합)
// GET /api/timetables/consolidated/
export async function getConsolidatedTimetable() {
  return apiClient('/api/timetables/consolidated/');
  // 응답: { "MON": [{ start: "09:00", end: "12:00" }], ... }
}
