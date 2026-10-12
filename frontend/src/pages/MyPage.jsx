import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, screenStyle, iconButtonStyle, pressableStyle } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import ErrorBanner from '../components/ErrorBanner';
import { useToast } from '../hooks/useToast';
import { getMyProfile, updateMyProfile } from '../api/auth';
import { token } from '../utils/token';

const listCardStyle = {
  marginTop: 8, backgroundColor: '#fff',
  border: `1px solid ${colors.surfaceContainerHighest}`,
  borderRadius: 14, paddingLeft: 16, paddingRight: 16,
  listStyle: 'none',
};

function MenuRow({ icon, label, color = colors.onSurface, iconColor = colors.primary, onClick, borderBottom = 'none' }) {
  return (
    <li style={{ borderBottom }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          ...pressableStyle,
          display: 'flex', alignItems: 'center', gap: 13,
          paddingTop: 14, paddingBottom: 14,
        }}
      >
        <Icon name={icon} size={21} color={iconColor} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: '500', color }}>{label}</span>
        <Icon name="chevron_right" size={20} color={colors.outline} />
      </button>
    </li>
  );
}

const INFO_ITEMS = [
  { icon: 'calendar_view_week', label: '시간표 관리',   path: '/upload-timetable' },
  { icon: 'event_repeat',       label: '고정 일정 관리', path: '/add-schedule' },
  { icon: 'notifications',      label: '알림 설정',     path: '/notifications' },
];

export default function MyPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { toast, showToast } = useToast(2000);

  const loadProfile = useCallback(() => {
    setLoadError('');
    getMyProfile()
      .then(setProfile)
      .catch((e) => setLoadError(e.message || '프로필을 불러오지 못했어요.'));
  }, []);

  useEffect(loadProfile, [loadProfile]);

  const handleEditStart = () => {
    setNicknameInput(profile?.nickname || '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmed = nicknameInput.trim();
    if (!trimmed) { showToast('닉네임을 입력해주세요'); return; }
    if (trimmed.length > 30) { showToast('닉네임은 30자 이하로 입력해주세요'); return; }
    setSaving(true);
    try {
      const updated = await updateMyProfile({ nickname: trimmed });
      setProfile(updated);
      setEditing(false);
      showToast('닉네임이 변경되었어요 ✓');
    } catch (e) {
      showToast(e.message || '저장에 실패했어요. 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠어요?')) {
      token.remove();
      navigate('/login');
    }
  };

  const displayName = profile?.nickname || profile?.email?.split('@')[0] || (loadError ? '-' : '불러오는 중...');

  return (
    <div style={screenStyle}>

      <main style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 80px' }}>

        <h1 style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>마이페이지</h1>

        {loadError && <ErrorBanner message={loadError} onRetry={loadProfile} style={{ marginTop: 12 }} />}

        {/* 프로필 카드 */}
        <div style={{
          marginTop: 18,
          backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* 프로필 이미지 */}
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="내 프로필 사진"
                style={{ width: 54, height: 54, borderRadius: 9999, objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 54, height: 54, borderRadius: 9999,
                backgroundColor: colors.secondaryContainer,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="person" size={30} color={colors.secondary} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <input
                  autoFocus
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={30}
                  aria-label="닉네임"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  style={{
                    width: '100%', fontSize: 16, fontWeight: '700',
                    color: colors.onSurface, border: 'none', borderBottom: `2px solid ${colors.primary}`,
                    background: 'transparent', padding: '2px 0',
                  }}
                />
              ) : (
                <p style={{ fontSize: 17, fontWeight: '700', color: colors.onSurface }}>{displayName}</p>
              )}
              <p style={{ fontSize: 13, color: colors.outline, marginTop: 2 }}>
                {profile?.email || ''}
              </p>
            </div>

            {/* 편집 / 저장 버튼 */}
            {editing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label="닉네임 편집 취소"
                  style={iconButtonStyle}
                >
                  <Icon name="close" size={20} color={colors.outline} />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  aria-label="닉네임 저장"
                  style={iconButtonStyle}
                >
                  <Icon name="check" size={20} color={saving ? colors.outline : colors.primary} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEditStart}
                disabled={!profile}
                aria-label="닉네임 편집"
                style={iconButtonStyle}
              >
                <Icon name="edit" size={20} color={colors.outline} />
              </button>
            )}
          </div>
        </div>

        {/* 내 정보 */}
        <h2 style={{ marginTop: 22, fontSize: 12, fontWeight: '600', color: colors.outline }}>내 정보</h2>
        <ul style={listCardStyle}>
          {INFO_ITEMS.map((it, i) => (
            <MenuRow
              key={it.label}
              icon={it.icon}
              label={it.label}
              onClick={() => navigate(it.path)}
              borderBottom={i < INFO_ITEMS.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none'}
            />
          ))}
        </ul>

        {/* 계정 */}
        <h2 style={{ marginTop: 22, fontSize: 12, fontWeight: '600', color: colors.outline }}>계정</h2>
        <ul style={listCardStyle}>
          <MenuRow icon="logout" label="로그아웃" color={colors.error} iconColor={colors.error} onClick={handleLogout} />
        </ul>

      </main>

      <Toast message={toast} position="bottom" />

      <BottomNav />
    </div>
  );
}
