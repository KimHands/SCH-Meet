import { colors } from '../styles/theme';
import Button from './Button';

/**
 * 에러 화면 컴포넌트
 * API 호출 실패 시 사용
 *
 * 사용법:
 * const [error, setError] = useState(null);
 * if (error) return <ErrorScreen onRetry={() => { setError(null); fetchData(); }} />;
 */
export default function ErrorScreen({
  message = '데이터를 불러오지 못했어요.',
  onRetry,
}) {
  return (
    <div style={{
      height: '100vh',
      backgroundColor: colors.surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '0 40px',
    }}>
      {/* 아이콘 */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 9999,
        backgroundColor: colors.errorContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 36, color: colors.error }}>
          wifi_off
        </span>
      </div>

      <p style={{ fontSize: 16, fontWeight: '700', color: colors.onSurface, textAlign: 'center' }}>
        연결에 실패했어요
      </p>
      <p style={{ fontSize: 13, color: colors.secondary, textAlign: 'center', lineHeight: '19px' }}>
        {message}
      </p>

      {onRetry && (
        <Button
          label="다시 시도"
          onClick={onRetry}
          style={{ marginTop: 8, paddingLeft: 32, paddingRight: 32 }}
        />
      )}
    </div>
  );
}
