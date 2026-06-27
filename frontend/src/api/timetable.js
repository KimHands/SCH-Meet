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
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/timetables/upload-image/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  if (!res.ok) throw new Error('이미지 업로드에 실패했어요.');
  return res.json();
}

// 통합 시간표 조회 (수업 + 고정 일정 병합)
// GET /api/timetables/consolidated/
export async function getConsolidatedTimetable() {
  return apiClient('/api/timetables/consolidated/');
  // 응답: { "MON": [{ start: "09:00", end: "12:00" }], ... }
}
