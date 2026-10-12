import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, screenStyle, iconButtonStyle, pressableStyle } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import Icon from '../components/Icon';
import ErrorBanner from '../components/ErrorBanner';
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
const TIME_LABEL_WIDTH = 24;

const cardBorder = `1px solid ${colors.surfaceContainerHighest}`;

const blockColor = (item) => {
  if (item?.kind === 'fixed_schedule') return colors.tertiaryFixed;
  if (item?.source === 'meeting')      return colors.primary;
  return colors.primaryFixedDim;
};

const displayNameOf = (profile) => profile?.nickname || profile?.email?.split('@')[0] || '';

// 대시보드에 필요한 데이터를 한 번에 불러오고, 일부 실패해도 나머지는 보여준다
function useDashboardData() {
  const [state, setState] = useState({ loading: true, failed: false });
  const [data, setData] = useState({ nickname: '', summary: null, meetings: [], timetable: null });

  const load = useCallback(async () => {
    setState({ loading: true, failed: false });
    const [profile, summary, meetings, timetable] = await Promise.allSettled([
      getMyProfile(), getDashboardSummary(), getMeetings('active'), getConsolidatedTimetable(),
    ]);
    const valueOf = (result, fallback) => (result.status === 'fulfilled' ? result.value ?? fallback : fallback);
    setData({
      nickname: displayNameOf(valueOf(profile, null)),
      summary: valueOf(summary, null),
      meetings: valueOf(meetings, []),
      timetable: valueOf(timetable, null),
    });
    const failed = [profile, summary, meetings, timetable].some((r) => r.status === 'rejected');
    setState({ loading: false, failed });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, ...state, reload: load };
}

function SummaryCards({ summary }) {
  const count = (value) => (summary ? `${value}개` : '-');
  const cards = [
    { icon: 'school',       fg: colors.primary,           n: count(summary?.remaining_classes),            label: '남은 수업' },
    { icon: 'assignment',   fg: colors.primary,           n: count(summary?.today_tasks),                  label: '오늘 일정' },
    { icon: 'groups',       fg: colors.primary,           n: count(summary?.pending_requests),             label: '대기 중' },
    { icon: 'auto_awesome', fg: colors.tertiaryContainer, n: count(summary?.weekly_recommendations_count), label: '이번 주 추천' },
  ];
  return (
    <ul style={{ marginTop: 8, display: 'flex', gap: 7, listStyle: 'none' }}>
      {cards.map((s) => (
        <li key={s.label} style={{
          flex: 1,
          backgroundColor: '#fff',
          border: cardBorder,
          borderRadius: 12,
          paddingTop: 9, paddingBottom: 9, paddingLeft: 4, paddingRight: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Icon name={s.icon} size={18} color={s.fg} />
          <span style={{ fontSize: 15, fontWeight: '700', color: colors.onSurface }}>{s.n}</span>
          <span style={{ fontSize: 11, color: colors.outline, textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

// 이번 주 미니 캘린더 — 블록은 색으로만 표시하고, 자세한 내용은 캘린더 탭에서 본다
function MiniWeekGrid({ timetable, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="이번 주 캘린더 — 눌러서 전체 캘린더 보기"
      style={{
        ...pressableStyle,
        marginTop: 8, backgroundColor: '#fff',
        border: cardBorder,
        borderRadius: 14, padding: '10px 10px 12px',
        display: 'block',
      }}
    >
      <div aria-hidden="true">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: TIME_LABEL_WIDTH }} />
          {DAYS.map((d) => (
            <span key={d} style={{ flex: 1, fontSize: 11, fontWeight: '500', color: colors.outline, textAlign: 'center' }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 4 }}>
          <div style={{ width: TIME_LABEL_WIDTH, flexShrink: 0, position: 'relative', height: MINI_HEIGHT }}>
            {[9, 12, 15, 18, 21].map((h) => (
              <span key={h} style={{
                position: 'absolute',
                top: ((h - MINI_START) / MINI_TOTAL) * MINI_HEIGHT - 7,
                right: 4,
                fontSize: 11, color: colors.outline,
              }}>{h}</span>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', height: MINI_HEIGHT, borderLeft: `1px solid ${colors.surfaceContainer}` }}>
            {DAY_CODES.map((code) => (
              <div key={code} style={{ flex: 1, position: 'relative', borderRight: cardBorder }}>
                {(timetable?.[code] ?? []).map((block, i) => <MiniBlock key={i} block={block} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniBlock({ block }) {
  const mainItem = block.items?.[0];
  if (!mainItem) return null;
  const topPct = ((block.start_minute / 60 - MINI_START) / MINI_TOTAL) * 100;
  const heightPct = (((block.end_minute - block.start_minute) / 60) / MINI_TOTAL) * 100;
  return (
    <div
      title={block.items.map((it) => it.title).join(', ')}
      style={{
        position: 'absolute',
        top: `${topPct}%`,
        height: `${Math.max(heightPct, 4)}%`,
        left: 1, right: 1,
        backgroundColor: blockColor(mainItem),
        borderRadius: 2,
      }}
    />
  );
}

function MeetingCard({ meeting, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        style={{
          ...pressableStyle,
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 11,
          backgroundColor: '#fff',
          border: cardBorder,
          borderRadius: 14, padding: '13px 14px',
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
          <span style={{ display: 'block', fontSize: 14, fontWeight: '600', color: colors.onSurface }}>{meeting.name ?? meeting.title}</span>
          <span style={{ display: 'block', fontSize: 11, color: colors.outline, marginTop: 2 }}>
            {meeting.participant_count}명 · {meeting.purpose || '모임'}
          </span>
        </div>
        <Icon name="chevron_right" size={20} color={colors.outline} />
      </button>
    </li>
  );
}

function EmptyMeetings() {
  return (
    <div style={{
      marginTop: 8, backgroundColor: '#fff',
      border: cardBorder,
      borderRadius: 14,
      paddingTop: 24, paddingBottom: 24,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <Icon name="groups" size={34} color={colors.outlineVariant} />
      <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여 중인 모임이 없어요</p>
      <p style={{ fontSize: 12, color: colors.outline }}>아래 버튼으로 모임을 만들어보세요</p>
    </div>
  );
}

const sectionTitleStyle = { marginTop: 14, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant };

export default function HomePage() {
  const navigate = useNavigate();
  const { nickname, summary, meetings, timetable, loading, failed, reload } = useDashboardData();

  return (
    <div style={screenStyle}>

      <main style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 80px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: '700', lineHeight: '26px', color: colors.onSurface }}>
              안녕하세요{nickname ? `, ${nickname}님` : ''} 👋
            </h1>
            <p style={{ marginTop: 5, fontSize: 12, lineHeight: '17px', color: colors.secondary }}>
              모두의 일정을 고려해<br />최적의 만남 시간을 추천해드려요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label="알림"
            style={iconButtonStyle}
          >
            <Icon name="notifications" size={24} color={colors.onSurfaceVariant} />
          </button>
        </div>

        {failed && (
          <ErrorBanner message="일부 정보를 불러오지 못했어요." onRetry={reload} style={{ marginTop: 12 }} />
        )}

        <h2 style={sectionTitleStyle}>오늘의 요약</h2>
        <SummaryCards summary={summary} />

        <h2 style={sectionTitleStyle}>이번 주 캘린더</h2>
        <MiniWeekGrid timetable={timetable} onOpen={() => navigate('/calendar')} />

        <h2 style={sectionTitleStyle}>참여 중인 모임</h2>
        {loading ? (
          <p role="status" style={{ marginTop: 12, fontSize: 13, color: colors.outline, textAlign: 'center' }}>불러오는 중...</p>
        ) : meetings.length > 0 ? (
          <ul style={{ listStyle: 'none' }}>
            {meetings.slice(0, 3).map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={() => navigate(`/meetings/${m.id}`)} />
            ))}
          </ul>
        ) : (
          <EmptyMeetings />
        )}

        <Button onClick={() => navigate('/meetings/new')} height={50} fontSize={15} style={{ width: '100%', marginTop: 14 }}>
          <Icon name="add" size={20} color={colors.onPrimary} />
          <span style={{ fontSize: 15, fontWeight: '600', color: colors.onPrimary }}>모임 만들기</span>
        </Button>

      </main>

      <BottomNav />
    </div>
  );
}
