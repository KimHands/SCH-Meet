import { useState } from 'react';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Icon from '../components/Icon';

const DUMMY_NOTIFICATIONS = [
  { id: 1, type: 'invite',   title: '새 모임 초대',     body: '박준석님이 "알고리즘 스터디" 모임에 초대했어요.', time: '방금 전',   read: false },
  { id: 2, type: 'confirm',  title: '일정 확정 완료',   body: '"중간발표 준비" 모임 일정이 수요일 14:00으로 확정됐어요.', time: '1시간 전', read: false },
  { id: 3, type: 'invite',   title: '새 모임 초대',     body: '이서연님이 "기말 공부" 모임에 초대했어요.', time: '어제',     read: true },
  { id: 4, type: 'confirm',  title: '일정 확정 완료',   body: '"팀 프로젝트" 모임 일정이 금요일 11:00으로 확정됐어요.', time: '3일 전',  read: true },
];

const TYPE_ICON = {
  invite:  { icon: 'group_add',       bg: colors.primaryFixed,  fg: colors.primary },
  confirm: { icon: 'event_available', bg: colors.tertiaryFixed, fg: colors.tertiaryContainer },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const handleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 80px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>알림</p>
          {unreadCount > 0 && (
            <span style={{
              backgroundColor: colors.primary,
              color: '#fff',
              fontSize: 11, fontWeight: '600',
              paddingTop: 3, paddingBottom: 3,
              paddingLeft: 9, paddingRight: 9,
              borderRadius: 99,
            }}>
              {unreadCount}개 읽지 않음
            </span>
          )}
        </div>

        {/* 알림 목록 */}
        {notifications.length === 0 ? (
          <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Icon name="notifications_off" size={48} color={colors.outlineVariant} />
            <p style={{ fontSize: 14, color: colors.outline }}>아직 도착한 알림이 없습니다.</p>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((n) => {
              const t = TYPE_ICON[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => handleRead(n.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    backgroundColor: n.read ? '#fff' : colors.primaryFixed,
                    border: `1px solid ${n.read ? colors.surfaceContainerHighest : colors.primaryFixedDim}`,
                    borderRadius: 14,
                    padding: 14,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* 읽지 않음 표시 */}
                  {!n.read && (
                    <div style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 8, height: 8, borderRadius: 99,
                      backgroundColor: colors.primary,
                    }} />
                  )}

                  {/* 아이콘 */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    backgroundColor: t.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={t.icon} size={20} color={t.fg} />
                  </div>

                  {/* 텍스트 */}
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>{n.title}</p>
                    <p style={{ fontSize: 12, color: colors.secondary, marginTop: 3, lineHeight: '18px' }}>{n.body}</p>
                    <p style={{ fontSize: 11, color: colors.outline, marginTop: 6 }}>{n.time}</p>
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