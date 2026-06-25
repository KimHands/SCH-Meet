import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Icon from '../components/Icon';

const INFO_ITEMS = [
  { icon: 'calendar_view_week', label: '시간표 관리',   path: '/upload-timetable' },
  { icon: 'event_repeat',       label: '고정 일정 관리', path: '/add-schedule' },
  { icon: 'notifications',      label: '알림 설정',     path: '/notifications' },
];

export default function MyPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠어요?')) {
      navigate('/login');
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 80px' }}>

        <p style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>마이페이지</p>

        {/* 프로필 카드 */}
        <div style={{
          marginTop: 18, display: 'flex', flexDirection: 'row',
          alignItems: 'center', gap: 14,
          backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 16, padding: 16,
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 9999,
            backgroundColor: colors.secondaryContainer,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="person" size={30} color={colors.secondary} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: '700', color: colors.onSurface }}>OOO</p>
            <p style={{ fontSize: 13, color: colors.outline, marginTop: 2 }}>sojung@example.com</p>
          </div>
        </div>

        {/* 내 정보 */}
        <p style={{ marginTop: 22, fontSize: 12, fontWeight: '600', color: colors.outline }}>내 정보</p>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          {INFO_ITEMS.map((it, i) => (
            <div
              key={it.label}
              onClick={() => navigate(it.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 13,
                paddingTop: 14, paddingBottom: 14,
                borderBottom: i < INFO_ITEMS.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
                cursor: 'pointer',
              }}
            >
              <Icon name={it.icon} size={21} color={colors.primary} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.onSurface }}>{it.label}</span>
              <Icon name="chevron_right" size={20} color="#a9abb6" />
            </div>
          ))}
        </div>

        {/* 계정 */}
        <p style={{ marginTop: 22, fontSize: 12, fontWeight: '600', color: colors.outline }}>계정</p>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          <div
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 13,
              paddingTop: 14, paddingBottom: 14,
              cursor: 'pointer',
            }}
          >
            <Icon name="logout" size={21} color={colors.error} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.error }}>로그아웃</span>
            <Icon name="chevron_right" size={20} color="#a9abb6" />
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}