import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getNotifications, readNotification } from '../api/notifications';

const KIND_ICON = {
  MEETING_JOINED:    { icon: 'group_add',       bg: colors.primaryFixed,  fg: colors.primary },
  MEETING_CONFIRMED: { icon: 'event_available', bg: colors.tertiaryFixed, fg: colors.tertiaryContainer },
  MEETING_CREATED:   { icon: 'groups',          bg: colors.secondaryContainer, fg: colors.secondary },
};
const DEFAULT_ICON = { icon: 'notifications', bg: colors.surfaceContainerLow, fg: colors.outline };

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (n) => {
    if (!n.is_read) {
      try {
        await readNotification(n.id);
        setNotifications((prev) =>
          prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item)
        );
      } catch {
        // 읽음 처리 실패해도 UI는 유지
      }
    }
    // 관련 모임이 있으면 이동
    if (n.meeting_id) navigate(`/meetings/${n.meeting_id}`);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>알림</p>
          {unreadCount > 0 && (
            <span style={{
              backgroundColor: colors.primary, color: '#fff',
              fontSize: 11, fontWeight: '600',
              paddingTop: 3, paddingBottom: 3,
              paddingLeft: 9, paddingRight: 9,
              borderRadius: 99,
            }}>
              {unreadCount}개 읽지 않음
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ marginTop: 80 }}><LoadingSpinner /></div>
        ) : notifications.length === 0 ? (
          <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Icon name="notifications_off" size={48} color={colors.outlineVariant} />
            <p style={{ fontSize: 14, color: colors.outline }}>아직 도착한 알림이 없어요</p>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((n) => {
              const t = KIND_ICON[n.kind] ?? DEFAULT_ICON;
              return (
                <div
                  key={n.id}
                  onClick={() => handleRead(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    backgroundColor: n.is_read ? '#fff' : colors.primaryFixed,
                    border: `1px solid ${n.is_read ? colors.surfaceContainerHighest : colors.primaryFixedDim}`,
                    borderRadius: 14,
                    padding: 14,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {!n.is_read && (
                    <div style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 8, height: 8, borderRadius: 99,
                      backgroundColor: colors.primary,
                    }} />
                  )}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    backgroundColor: t.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={t.icon} size={20} color={t.fg} />
                  </div>
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>{n.title}</p>
                    <p style={{ fontSize: 12, color: colors.secondary, marginTop: 3, lineHeight: '18px' }}>{n.body}</p>
                    <p style={{ fontSize: 11, color: colors.outline, marginTop: 6 }}>{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
