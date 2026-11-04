import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { colors } from '../styles/theme';

const TABS = [
  { key: 'home',         path: '/home',          icon: 'home',           label: '홈' },
  { key: 'meetings',     path: '/meetings',      icon: 'groups',         label: '모임' },
  { key: 'calendar',     path: '/calendar',      icon: 'calendar_month', label: '캘린더' },
  { key: 'notifications',path: '/notifications', icon: 'notifications',  label: '알림' },
  { key: 'mypage',       path: '/mypage',        icon: 'person',         label: '마이' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav
      aria-label="주요 메뉴"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 390,
        height: 62,
        borderTop: `1px solid ${colors.surfaceContainerHighest}`,
        backgroundColor: colors.surfaceContainerLowest,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 4,
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const on = isActive(tab.path);
        const color = on ? colors.primary : colors.outline;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 12px',
            }}
          >
            <Icon name={tab.icon} size={22} color={color} />
            <span style={{ fontSize: 11, fontWeight: on ? '600' : '500', color }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
