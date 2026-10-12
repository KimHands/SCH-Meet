// Material Symbols Outlined 아이콘 — 장식용이므로 스크린리더에서 숨긴다.
// 아이콘만 있는 버튼은 버튼 쪽에 aria-label 을 단다.
export default function Icon({ name, size = 24, color = 'inherit', style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
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
