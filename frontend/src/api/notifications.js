import { apiClient } from './client';

/**
 * 알림 관련 API (B-17)
 */

// 알림 목록 조회
// GET /api/notifications/
export async function getNotifications() {
  return apiClient('/api/notifications/');
}

// 알림 읽음 처리
// POST /api/notifications/read/{id}/
export async function readNotification(notificationId) {
  return apiClient(`/api/notifications/read/${notificationId}/`, {
    method: 'POST',
  });
}
