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

// 시간표 이미지 업로드 (OCR)
// POST /api/timetables/upload-image/
export async function uploadTimetableImage(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  return apiClient('/api/timetables/upload-image/', {
    method: 'POST',
    body: formData,
  });
}

// 통합 시간표 조회 (수업 + 고정 일정 병합)
// GET /api/timetables/consolidated/
export async function getConsolidatedTimetable() {
  return apiClient('/api/timetables/consolidated/');
  // 응답: { "MON": [{ start: "09:00", end: "12:00" }], ... }
}

// 이미지 OCR 파싱 결과 확정 저장
// POST /api/timetables/image/confirm/
export async function confirmTimetableImage(classes) {
  return apiClient('/api/timetables/image/confirm/', {
    method: 'POST',
    body: JSON.stringify({ classes }),
  });
  // 응답: { status: "success", parsed_classes_count: 5 }
}
