import { apiClient } from './client';

/**
 * 대시보드 관련 API (B-16)
 */

// 메인 대시보드 데이터 집계
// GET /api/dashboard/summary/
export async function getDashboardSummary() {
  return apiClient('/api/dashboard/summary/');
  // 응답: { remaining_classes, today_tasks, pending_requests, weekly_recommendations_count }
}
