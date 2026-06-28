import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { getDashboardSummary } from '../api/dashboard';
import { getMeetings } from '../api/meetings';
import { getMyProfile } from '../api/auth';
import { getConsolidatedTimetable } from '../api/timetable';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MINI_START = 8;   // 08시 기준
const MINI_END   = 22;  // 22시 기준
const MINI_TOTAL = MINI_END - MINI_START; // 14시간
const MINI_HEIGHT = 160; // 미니 그리드 전체 높이 (px)

const blockColor = (item) => {
  if (item?.kind === 'fixed_schedule') return colors.tertiaryFixed;
  if (item?.source === 'meeting')      return colors.primary;
  return colors.primaryFixedDim;
};
const blockTextColor = (item) => item?.source === 'meeting' ? '#fff' : colors.onSurface;

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [summary, setSummary] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [timetable, setTimetable] = useState(null);

  useEffect(() => {
    getMyProfile().then((p) => setNickname(p.nickname || p.email?.split('@')[0] || '')).catch(() => {});
    getDashboardSummary().then(setSummary).catch(() => {});
    getMeetings('active').then(setMeetings).catch(() => setMeetings([]));
    getConsolidatedTimetable().then(setTimetable).catch(() => {});
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
            <div style={{ width: 22 }} />
            {DAYS.map((d) => (
              <span key={d} style={{ flex: 1, fontSize: 9, fontWeight: '500', color: colors.outline, textAlign: 'center' }}>{d}</span>
            ))}
          </div>
          <div style={{ display: 'flex', marginTop: 4 }}>
            {/* 시간 레이블 */}
            <div style={{ width: 22, flexShrink: 0, position: 'relative', height: MINI_HEIGHT }}>
              {[9, 12, 15, 18, 20].map((h) => (
                <span key={h} style={{
                  position: 'absolute',
                  top: ((h - MINI_START) / MINI_TOTAL) * MINI_HEIGHT - 5,
                  right: 3,
                  fontSize: 7, color: '#a9abb6',
                }}>{h}</span>
              ))}
            </div>
            {/* 요일별 컬럼 */}
            <div style={{ flex: 1, display: 'flex', height: MINI_HEIGHT, borderLeft: `1px solid ${colors.surfaceContainer}` }}>
              {DAY_CODES.map((code) => {
                const blocks = timetable?.[code] ?? [];
                return (
                  <div key={code} style={{ flex: 1, position: 'relative', borderRight: `1px solid ${colors.surfaceContainerHighest}` }}>
                    {blocks.map((block, i) => {
                      const mainItem = block.items?.[0];
                      if (!mainItem) return null;
                      const topPct = ((block.start_minute / 60 - MINI_START) / MINI_TOTAL) * 100;
                      const heightPct = (((block.end_minute - block.start_minute) / 60) / MINI_TOTAL) * 100;
                      return (
                        <div key={i} style={{
                          position: 'absolute',
                          top: `${topPct}%`,
                          height: `${Math.max(heightPct, 4)}%`,
                          left: 1, right: 1,
                          backgroundColor: blockColor(mainItem),
                          borderRadius: 2,
                          overflow: 'hidden',
                          padding: '1px 2px',
                        }}>
                          <span style={{
                            fontSize: 6,
                            fontWeight: '600',
                            color: blockTextColor(mainItem),
                            lineHeight: '8px',
                            display: 'block',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}>
                            {block.items.map((it) => it.title).join(', ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
