import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Icon from '../components/Icon';
import { getMyProfile, updateMyProfile } from '../api/auth';
import { token } from '../utils/token';

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
  const [toast, setToast] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleEditStart = () => {
    setNicknameInput(profile?.nickname || '');
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { showToast('닉네임을 입력해주세요'); return; }
    if (trimmed.length > 30) { showToast('닉네임은 30자 이하로 입력해주세요'); return; }
    setSaving(true);
    try {
      const updated = await updateMyProfile({ nickname: trimmed });
      setProfile(updated);
      setEditing(false);
      showToast('닉네임이 변경되었어요 ✓');
    } catch {
      showToast('저장에 실패했어요. 다시 시도해주세요');
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

  const displayName = profile?.nickname || profile?.email?.split('@')[0] || 'OOO';

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 80px' }}>

        <p style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>마이페이지</p>

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
                alt="프로필"
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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  style={{
                    width: '100%', fontSize: 16, fontWeight: '700',
                    color: colors.onSurface, border: 'none', borderBottom: `2px solid ${colors.primary}`,
                    outline: 'none', background: 'transparent', padding: '2px 0',
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
                  onClick={() => setEditing(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <Icon name="close" size={20} color={colors.outline} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <Icon name="check" size={20} color={saving ? colors.outline : colors.primary} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditStart}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <Icon name="edit" size={20} color={colors.outline} />
              </button>
            )}
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

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
          padding: '10px 20px', borderRadius: 20,
          fontSize: 13, fontWeight: '500', whiteSpace: 'nowrap',
          zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
