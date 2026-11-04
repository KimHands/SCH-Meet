// SCH-Meet 디자인 토큰 — DESIGN.md 기반
// Material Design 3, Deep Blue primary

export const colors = {
  // Surface
  surface: '#faf8ff',
  surfaceDim: '#dad9e0',
  surfaceBright: '#faf8ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f3f9',
  surfaceContainer: '#eeedf4',
  surfaceContainerHigh: '#e8e7ee',
  surfaceContainerHighest: '#e3e2e8',

  // On Surface
  onSurface: '#1a1b20',
  onSurfaceVariant: '#444651',
  inverseSurface: '#2f3035',
  inverseOnSurface: '#f1f0f7',

  // Outline
  outline: '#62656f',        // 보조 텍스트 겸용 — 흰/연회색 배경 대비 4.5:1 이상
  outlineVariant: '#c4c6d2',

  // Primary
  surfaceTint: '#3d5ca2',
  primary: '#00245d',
  onPrimary: '#ffffff',
  primaryContainer: '#153a7e',
  onPrimaryContainer: '#89a7f2',
  inversePrimary: '#b0c6ff',

  // Primary Fixed
  primaryFixed: '#d9e2ff',
  primaryFixedDim: '#b0c6ff',
  onPrimaryFixed: '#001945',
  onPrimaryFixedVariant: '#224488',

  // Secondary
  secondary: '#585f69',
  onSecondary: '#ffffff',
  secondaryContainer: '#dce3ef',
  onSecondaryContainer: '#5e656f',

  // Secondary Fixed
  secondaryFixed: '#dce3ef',
  secondaryFixedDim: '#c0c7d2',
  onSecondaryFixed: '#151c25',
  onSecondaryFixedVariant: '#404751',

  // Tertiary
  tertiary: '#441c00',
  onTertiary: '#ffffff',
  tertiaryContainer: '#662d00',
  onTertiaryContainer: '#e89460',

  // Tertiary Fixed
  tertiaryFixed: '#ffdbc8',
  tertiaryFixedDim: '#ffb68b',
  onTertiaryFixed: '#321300',
  onTertiaryFixedVariant: '#723608',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Background
  background: '#faf8ff',
  onBackground: '#1a1b20',
  surfaceVariant: '#e3e2e8',

  // Semantic helpers
  success: '#1f8a5b',
  warning: '#7a5c00',        // surfaceContainerLow 배경 대비 5.6:1
  divider: '#f4f3f9',
};

export const typography = {
  headlineLg: { fontSize: '24px', fontWeight: '700', lineHeight: '32px', letterSpacing: '-0.01em' },
  headlineMd: { fontSize: '20px', fontWeight: '600', lineHeight: '28px', letterSpacing: '-0.005em' },
  titleLg:    { fontSize: '17px', fontWeight: '600', lineHeight: '24px' },
  bodyLg:     { fontSize: '16px', fontWeight: '400', lineHeight: '24px' },
  bodyMd:     { fontSize: '14px', fontWeight: '400', lineHeight: '20px' },
  bodySm:     { fontSize: '13px', fontWeight: '400', lineHeight: '19px' },
  labelLg:    { fontSize: '14px', fontWeight: '600', lineHeight: '18px' },
  labelMd:    { fontSize: '12px', fontWeight: '600', lineHeight: '16px' },
  labelSm:    { fontSize: '12px', fontWeight: '500', lineHeight: '16px' },
};

export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  xxl:  '24px',
  full: '9999px',
};

export const spacing = {
  xs:     '8px',
  md:     '16px',
  lg:     '24px',
  gutter: '20px',
  margin: '16px',
};

export const elevation = {
  level1: '0px 1px 4px rgba(0,0,0,0.05)',
  level2: '0px 6px 12px rgba(0,25,69,0.10)',
};

// 전체 화면 페이지 컨테이너 — --app-height 는 index.css 에서 100dvh(미지원 시 100vh)
export const screenStyle = {
  height: 'var(--app-height)',
  backgroundColor: colors.surface,
  display: 'flex',
  flexDirection: 'column',
};

// 텍스트 입력 공통 스타일
export const inputStyle = (hasError = false) => ({
  width: '100%',
  height: 48,
  border: `1px solid ${hasError ? colors.error : colors.outlineVariant}`,
  borderRadius: 8,
  paddingLeft: 14,
  paddingRight: 14,
  fontSize: 14,
  color: colors.onSurface,
  boxSizing: 'border-box',
  backgroundColor: '#fff',
});

export const fieldLabelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: '600',
  color: colors.onSurfaceVariant,
  marginBottom: 7,
};

// 아이콘만 있는 버튼 공통 리셋
export const iconButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
};

// 카드/행 전체가 눌리는 버튼 리셋 (div onClick 대체)
export const pressableStyle = {
  width: '100%',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
};
