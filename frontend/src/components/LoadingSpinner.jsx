import { colors, screenStyle } from '../styles/theme';

/**
 * 로딩 스피너
 * - 기본: 전체 화면 (페이지 로딩)
 * - fullScreen={false}: 목록 영역 등 부분 로딩
 */
export default function LoadingSpinner({ message = '불러오는 중...', fullScreen = true }) {
  const containerStyle = fullScreen ? { ...screenStyle, justifyContent: 'center' } : { padding: '40px 0' };
  return (
    <div
      role="status"
      style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `3px solid ${colors.surfaceContainerHighest}`,
        borderTopColor: colors.primary,
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: colors.secondary }}>{message}</p>
    </div>
  );
}
