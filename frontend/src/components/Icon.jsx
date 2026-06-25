// Material Symbols Outlined 아이콘 컴포넌트
export default function Icon({ name, size = 24, color = 'inherit', style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color,
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
