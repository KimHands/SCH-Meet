import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { colors } from '../styles/theme';

// Top app bar
// props:
//   title       — 중앙 타이틀 텍스트
//   trailingIcon — 오른쪽 아이콘 이름 (Material Symbols)
//   onTrailing  — 오른쪽 아이콘 클릭 핸들러
//   step        — 숫자 표시 (1~4 온보딩 스텝 인디케이터)
//   onBack      — 뒤로가기 커스텀 핸들러 (기본: navigate(-1))
export default function AppBar({ title, trailingIcon, onTrailing, step, onBack }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
        backgroundColor: colors.surface,
      }}
    >
      {/* 왼쪽: 뒤로가기 */}
      <button
        onClick={handleBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, margin: -4, display: 'flex' }}
      >
        <Icon name="arrow_back" size={24} color={colors.onSurface} />
      </button>

      {/* 중앙: 타이틀 */}
      {title ? (
        <span style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.onSurface }}>
          {title}
        </span>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* 오른쪽: 스텝 인디케이터 or 아이콘 */}
      {step ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {[1, 2, 3, 4].map((n) => {
            const on = n === step;
            return (
              <div
                key={n}
                style={{
                  width: 26, height: 26, borderRadius: 9999,
                  border: on ? 'none' : `1px solid ${colors.outlineVariant}`,
                  backgroundColor: on ? colors.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: '600',
                  color: on ? colors.onPrimary : colors.outline,
                }}>
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      ) : trailingIcon ? (
        <button
          onClick={onTrailing}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, margin: -4, display: 'flex' }}
        >
          <Icon name={trailingIcon} size={22} color={colors.onSurfaceVariant} />
        </button>
      ) : (
        <div style={{ width: 24 }} />
      )}
    </div>
  );
}
