// 모임 소요 시간 (분) — 백엔드 허용 범위: 30~240, 30분 단위
export const DEFAULT_DURATION_MINUTES = 60;
export const DURATION_OPTIONS = [30, 60, 90, 120, 180];

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
