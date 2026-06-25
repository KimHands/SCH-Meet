import { colors } from '../styles/theme';

// variant: 'primary' | 'secondary' | 'outline'
export default function Button({
  label,
  onClick,
  variant = 'primary',
  style = {},
  children,
  height = 54,
  fontSize = 16,
  type = 'button',
  disabled = false,
}) {
  const v = VARIANTS[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        height,
        borderRadius: 9999,
        border: v.border ? `1px solid ${v.border}` : 'none',
        backgroundColor: v.bg,
        color: v.color,
        fontSize,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
      {label && <span>{label}</span>}
    </button>
  );
}

const VARIANTS = {
  primary:   { bg: colors.primary,                color: colors.onPrimary,       border: null },
  secondary: { bg: colors.surfaceContainer,       color: colors.primary,         border: null },
  outline:   { bg: colors.surfaceContainerLowest, color: colors.onSurfaceVariant, border: colors.outlineVariant },
};
