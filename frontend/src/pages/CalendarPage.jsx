import { useState } from 'react';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08 ~ 22시

// 더미 일정 데이터 (API 연동 시 교체)
const EVENTS = [
  { day: 0, start: 9,  end: 11, label: '알고리즘',   color: colors.primaryFixedDim },
  { day: 0, start: 18, end: 23, label: '알바',        color: colors.tertiaryFixed },
  { day: 1, start: 13, end: 15, label: '자료구조',    color: colors.primaryFixedDim },
  { day: 1, start: 19, end: 21, label: '동아리',      color: colors.tertiaryFixed },
  { day: 2, start: 9,  end: 11, label: '알고리즘',    color: colors.primaryFixedDim },
  { day: 2, start: 14, end: 15.5, label: '중간발표 준비', color: colors.primary },
  { day: 3, start: 13, end: 15, label: '자료구조',    color: colors.primaryFixedDim },
  { day: 4, start: 11, end: 13, label: '영어회화',    color: colors.primaryFixedDim },
];

const TOTAL_HOURS = 14; // 08 ~ 22 = 14시간
const HOUR_HEIGHT = 56; // px per hour

export default function CalendarPage() {
  const [view, setView] = useState('week'); // 'week' | 'month'

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px 0' }}>
        <p style={{ fontSize: 22, fontWeight: '700', color: colors.onSurface }}>캘린더</p>

        {/* 주간 / 월간 탭 */}
        <div style={{
          marginTop: 12,
          display: 'flex',
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 9999,
          padding: 3,
        }}>
          {['week', 'month'].map((v) => {
            const on = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1, height: 34, borderRadius: 9999,
                  border: 'none', cursor: 'pointer',
                  backgroundColor: on ? '#fff' : 'transparent',
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 13, fontWeight: on ? '600' : '500',
                  color: on ? colors.onSurface : colors.outline,
                  boxShadow: on ? '0px 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {v === 'week' ? '주간' : '월간'}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div style={{ marginTop: 10, marginBottom: 8, display: 'flex', gap: 12 }}>
          {[
            { color: colors.primaryFixedDim, label: '시간표' },
            { color: colors.tertiaryFixed,   label: '고정 일정' },
            { color: colors.primary,         label: '확정 모임' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: l.color }} />
              <span style={{ fontSize: 10, color: colors.outline }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>

        {/* 요일 헤더 */}
        <div style={{
          display: 'flex',
          position: 'sticky', top: 0,
          backgroundColor: colors.surface,
          zIndex: 10,
          borderBottom: `1px solid ${colors.surfaceContainerHighest}`,
          paddingLeft: 40,
        }}>
          {DAYS.map((d) => (
            <div key={d} style={{ flex: 1, textAlign: 'center', paddingTop: 6, paddingBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: '500', color: colors.outline }}>{d}</span>
            </div>
          ))}
        </div>

        {/* 시간 + 이벤트 그리드 */}
        <div style={{ display: 'flex', position: 'relative' }}>

          {/* 시간 레이블 */}
          <div style={{ width: 40, flexShrink: 0 }}>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 2 }}>
                <span style={{ fontSize: 9, color: '#a9abb6' }}>{String(h).padStart(2, '0')}</span>
              </div>
            ))}
          </div>

          {/* 그리드 컬럼 */}
          <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
            {DAYS.map((d, di) => (
              <div key={d} style={{ flex: 1, position: 'relative', borderLeft: `1px solid ${colors.surfaceContainerHighest}` }}>
                {/* 시간 구분선 */}
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${colors.surfaceContainerLow}` }} />
                ))}
                {/* 이벤트 블록 */}
                {EVENTS.filter((e) => e.day === di).map((e, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: (e.start - 8) * HOUR_HEIGHT + 1,
                    height: (e.end - e.start) * HOUR_HEIGHT - 2,
                    left: 2, right: 2,
                    backgroundColor: e.color,
                    borderRadius: 4,
                    padding: '3px 4px',
                    overflow: 'hidden',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: '600', color: e.color === colors.primary ? '#fff' : colors.onSurface }}>
                      {e.label}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}