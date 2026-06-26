import { colors } from '../styles/theme';

/**
 * 전체 화면 로딩 스피너
 * API 호출 중에 사용
 *
 * 사용법:
 * const [loading, setLoading] = useState(false);
 * if (loading) return <LoadingSpinner />;
 */
export default function LoadingSpinner({ message = '불러오는 중...' }) {
  return (
    <div style={{
      height: '100vh',
      backgroundColor: colors.surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      {/* 스피너 원 */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `3px solid ${colors.surfaceContainerHighest}`,
        borderTopColor: colors.primary,
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: colors.secondary }}>{message}</p>

      {/* 스피너 애니메이션 keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
