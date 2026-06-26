import { apiClient } from './client';

/**
 * 시간표 관련 API
 */

// 시간표 이미지 업로드
export async function uploadTimetableImage(imageFile) {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/timetable/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('이미지 업로드에 실패했어요.');
  return res.json();
}

// 에브리타임 URL로 시간표 등록
export async function uploadTimetableUrl(url) {
  return apiClient('/timetable/url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// 내 시간표 조회
export async function getMyTimetable() {
  return apiClient('/timetable');
}
