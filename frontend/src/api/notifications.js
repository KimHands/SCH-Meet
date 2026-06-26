import { apiClient } from './client';

/**
 * 알림 관련 API
 */

// 알림 목록 조회
export async function getNotifications() {
  return apiClient('/notifications');
}

// 알림 읽음 처리
export async function readNotification(notificationId) {
  return apiClient(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}
