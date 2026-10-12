import { colors } from '../styles/theme';
import Icon from './Icon';

// 화면 일부의 불러오기 실패 안내 + 다시 시도
export default function ErrorBanner({ message, onRetry, style = {} }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        backgroundColor: colors.errorContainer,
        borderRadius: 12, padding: '10px 12px',
        ...style,
      }}
    >
      <Icon name="error" size={18} color={colors.onErrorContainer} />
      <span style={{ flex: 1, fontSize: 13, color: colors.onErrorContainer }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{ fontSize: 13, fontWeight: '600', color: colors.onErrorContainer, padding: '4px 6px' }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
