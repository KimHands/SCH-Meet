import { useState, useEffect } from 'react';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';
import { getConsolidatedTimetable } from '../api/timetable';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08 ~ 22시
const HOUR_HEIGHT = 56; // px per hour
const START_HOUR = 8;   // 08:00 기준

// kind/source에 따른 색상
const blockColor = (item) => {
  if (item.kind === 'fixed_schedule') return colors.tertiaryFixed;
  if (item.source === 'meeting')      return colors.primary;
  return colors.primaryFixedDim; // timetable_class (everytime)
};

const textColor = (item) => {
  if (item.source === 'meeting') return '#fff';
  return colors.onSurface;
};

export default function CalendarPage() {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConsolidatedTimetable()
      .then(setTimetable)
      .catch(() => setTimetable({}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px 0' }}>
        <p style={{ fontSize: 22, fontWeight: '700', color: colors.onSurface }}>캘린더</p>

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

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : (
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
              {DAY_CODES.map((code, di) => {
                const blocks = timetable?.[code] ?? [];
                return (
                  <div key={code} style={{ flex: 1, position: 'relative', borderLeft: `1px solid ${colors.surfaceContainerHighest}` }}>
                    {/* 시간 구분선 */}
                    {HOURS.map((h) => (
                      <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${colors.surfaceContainerLow}` }} />
                    ))}
                    {/* 이벤트 블록 */}
                    {blocks.map((block, i) => {
                      const topPx = (block.start_minute / 60 - START_HOUR) * HOUR_HEIGHT + 1;
                      const heightPx = ((block.end_minute - block.start_minute) / 60) * HOUR_HEIGHT - 2;
                      // 블록 안에 여러 항목이 있을 수 있어서 첫 번째 항목 기준으로 색상 결정
                      const mainItem = block.items?.[0];
                      if (!mainItem) return null;
                      return (
                        <div key={i} style={{
                          position: 'absolute',
                          top: topPx,
                          height: Math.max(heightPx, 14),
                          left: 2, right: 2,
                          backgroundColor: blockColor(mainItem),
                          borderRadius: 4,
                          padding: '3px 4px',
                          overflow: 'hidden',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: '600', color: textColor(mainItem), lineHeight: '12px' }}>
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
      )}

      <BottomNav />
    </div>
  );
}
