import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { getDashboardSummary } from '../api/dashboard';
import { getMeetings } from '../api/meetings';
import { getMyProfile } from '../api/auth';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS = ['09', '12', '15', '18', '21'];
// 캘린더 미니 그리드 - 장식용 고정 이벤트 블록
const EVENTS = [
  { left: '6%',  top: 8,  w: '10%', h: 30, c: colors.primaryFixedDim },
  { left: '34%', top: 20, w: '10%', h: 24, c: colors.primaryFixed },
  { left: '48%', top: 50, w: '10%', h: 34, c: colors.primary },
  { left: '62%', top: 30, w: '10%', h: 26, c: colors.primaryFixedDim },
  { left: '20%', top: 64, w: '10%', h: 30, c: colors.tertiaryFixedDim },
  { left: '76%', top: 74, w: '10%', h: 22, c: colors.primaryFixed },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [summary, setSummary] = useState(null);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    getMyProfile().then((p) => setNickname(p.nickname || p.email?.split('@')[0] || '')).catch(() => {});
    getDashboardSummary().then(setSummary).catch(() => {});
    getMeetings('active').then(setMeetings).catch(() => setMeetings([]));
  }, []);

  const summaryCards = [
    { icon: 'school',       fg: colors.primary,           n: summary ? `${summary.remaining_classes}개` : '-', label: '남은 수업' },
    { icon: 'assignment',   fg: colors.primary,           n: summary ? `${summary.today_tasks}개`       : '-', label: '오늘 일정' },
    { icon: 'groups',       fg: colors.primary,           n: summary ? `${summary.pending_requests}개`  : '-', label: '대기 중' },
    { icon: 'auto_awesome', fg: colors.tertiaryContainer, n: summary ? `${summary.weekly_recommendations_count}개` : '-', label: '이번 주 추천' },
  ];

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 80px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: '700', lineHeight: '26px', color: colors.onSurface }}>
              안녕하세요, {nickname ? `${nickname}님` : ''}👋
            </p>
            <p style={{ marginTop: 5, fontSize: 12, lineHeight: '17px', color: colors.secondary }}>
              모두의 일정을 고려해<br />최적의 만남 시간을 추천해드려요.
            </p>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <Icon name="notifications" size={24} color={colors.onSurfaceVariant} />
          </button>
        </div>

        {/* 오늘의 요약 */}
        <p style={{ marginTop: 14, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>오늘의 요약</p>
        <div style={{ marginTop: 8, display: 'flex', gap: 7 }}>
          {summaryCards.map((s) => (
            <div key={s.label} style={{
              flex: 1,
              backgroundColor: '#fff',
              border: `1px solid ${colors.surfaceContainerHighest}`,
              borderRadius: 12,
              paddingTop: 9, paddingBottom: 9, paddingLeft: 6, paddingRight: 6,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <Icon name={s.icon} size={18} color={s.fg} />
              <span style={{ fontSize: 15, fontWeight: '700', color: colors.onSurface }}>{s.n}</span>
              <span style={{ fontSize: 9, color: colors.outline, textAlign: 'center' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* 이번 주 캘린더 (장식용 미니 그리드) */}
        <p style={{ marginTop: 14, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>이번 주 캘린더</p>
        <div
          onClick={() => navigate('/calendar')}
          style={{
            marginTop: 8, backgroundColor: '#fff',
            border: `1px solid ${colors.surfaceContainerHighest}`,
            borderRadius: 14, paddingLeft: 10, paddingRight: 10, paddingTop: 10, paddingBottom: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 26 }} />
            {DAYS.map((d) => (
              <span key={d} style={{ flex: 1, fontSize: 9, fontWeight: '500', color: colors.outline, textAlign: 'center' }}>{d}</span>
            ))}
          </div>
          <div style={{ display: 'flex', marginTop: 5 }}>
            <div style={{
              width: 26, height: 118,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between',
              paddingTop: 2, paddingBottom: 14,
              alignItems: 'flex-end', paddingRight: 4,
            }}>
              {HOURS.map((h) => (
                <span key={h} style={{ fontSize: 8, fontWeight: '500', color: '#a9abb6' }}>{h}</span>
              ))}
            </div>
            <div style={{ flex: 1, height: 118, borderLeft: `1px solid ${colors.surfaceContainer}`, position: 'relative' }}>
              {EVENTS.map((e, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: e.left, top: e.top,
                  width: e.w, height: e.h,
                  backgroundColor: e.c,
                  borderRadius: 3,
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* 참여 중인 모임 */}
        <p style={{ marginTop: 14, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여 중인 모임</p>
        {meetings.length > 0 ? (
          meetings.slice(0, 3).map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/meetings/${m.id}`)}
              style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 11,
                backgroundColor: '#fff',
                border: `1px solid ${colors.surfaceContainerHighest}`,
                borderRadius: 14, paddingTop: 13, paddingBottom: 13,
                paddingLeft: 14, paddingRight: 14,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                backgroundColor: colors.primaryFixed,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="campaign" size={20} color={colors.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: '600', color: colors.onSurface }}>{m.name ?? m.title}</p>
                <p style={{ fontSize: 11, color: colors.outline, marginTop: 2 }}>
                  {m.participant_count}명 · {m.purpose || '모임'}
                </p>
              </div>
              <Icon name="chevron_right" size={20} color={colors.outline} />
            </div>
          ))
        ) : (
          <div style={{
            marginTop: 8, backgroundColor: '#fff',
            border: `1px solid ${colors.surfaceContainerHighest}`,
            borderRadius: 14,
            paddingTop: 24, paddingBottom: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <Icon name="groups" size={34} color={colors.outlineVariant} />
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여 중인 모임이 없어요</p>
            <p style={{ fontSize: 12, color: colors.outline }}>아래 버튼으로 모임을 만들어보세요</p>
          </div>
        )}

        {/* 모임 만들기 버튼 */}
        <Button onClick={() => navigate('/meetings/new')} height={50} fontSize={15} style={{ width: '100%', marginTop: 14 }}>
          <Icon name="add" size={20} color={colors.onPrimary} />
          <span style={{ fontSize: 15, fontWeight: '600', color: colors.onPrimary }}>모임 만들기</span>
        </Button>

      </div>

      <BottomNav />
    </div>
  );
}
