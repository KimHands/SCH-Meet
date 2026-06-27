import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMeetings } from '../api/meetings';

const AV = [
  { bg: colors.primaryFixedDim,   fg: colors.primary },
  { bg: colors.secondaryFixedDim, fg: colors.onSurfaceVariant },
  { bg: colors.tertiaryFixedDim,  fg: colors.tertiaryContainer },
];

// 목적(purpose)별 아이콘/색상
const purposeIcon = (purpose = '') => {
  const p = purpose.toLowerCase();
  if (p.includes('발표') || p.includes('프로젝트')) return { icon: 'campaign',  bg: colors.primaryFixed,  fg: colors.primary };
  if (p.includes('스터디') || p.includes('공부'))    return { icon: 'menu_book', bg: colors.tertiaryFixed, fg: colors.tertiaryContainer };
  return { icon: 'groups', bg: colors.secondaryContainer, fg: colors.secondary };
};

export default function MeetingListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMeetings(activeTab)
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const emptyIcon  = activeTab === 'active' ? 'groups'      : 'event_busy';
  const emptyTitle = activeTab === 'active' ? '참여 중인 모임이 없어요' : '종료된 모임이 없어요';
  const emptySub   = activeTab === 'active' ? '아래 버튼을 눌러 첫 모임을 만들어보세요' : '모임이 종료되면 여기에 표시돼요';

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 20px 80px', overflow: 'hidden' }}>

        {/* 제목 */}
        <p style={{ marginTop: 4, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>모임</p>

        {/* 탭 */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button
            variant={activeTab === 'active' ? 'primary' : 'outline'}
            label="참여 중"
            height={42} fontSize={14}
            onClick={() => setActiveTab('active')}
            style={{ flex: 1 }}
          />
          <Button
            variant={activeTab === 'ended' ? 'primary' : 'outline'}
            label="종료된 모임"
            height={42} fontSize={14}
            onClick={() => setActiveTab('ended')}
            style={{ flex: 1 }}
          />
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <LoadingSpinner />
            </div>
          ) : meetings.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Icon name={emptyIcon} size={48} color={colors.outlineVariant} />
              <p style={{ marginTop: 14, fontSize: 15, fontWeight: '600', color: colors.onSurfaceVariant }}>{emptyTitle}</p>
              <p style={{ marginTop: 6, fontSize: 13, color: colors.outline, textAlign: 'center', lineHeight: '19px' }}>{emptySub}</p>
            </div>
          ) : (
            meetings.map((m) => {
              const { icon, bg, fg } = purposeIcon(m.purpose);
              const count = m.participant_count ?? m.participants_count ?? 0;
              return (
                <div
                  key={m.id ?? m.meeting_id}
                  onClick={() => navigate(`/meetings/${m.id ?? m.meeting_id}`)}
                  style={{
                    backgroundColor: '#fff',
                    border: `1px solid ${colors.surfaceContainerHighest}`,
                    borderRadius: 16,
                    padding: 16,
                    cursor: 'pointer',
                  }}
                >
                  {/* 카드 상단 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        backgroundColor: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={icon} size={22} color={fg} />
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: '600', color: colors.onSurface }}>{m.name ?? m.title}</p>
                        <p style={{ fontSize: 12, color: colors.outline, marginTop: 2 }}>
                          {count}명 · {m.purpose || '모임'}
                        </p>
                      </div>
                    </div>
                    <Icon name="chevron_right" size={22} color="#a9abb6" />
                  </div>

                  {/* 카드 하단 */}
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* 아바타 */}
                    <div style={{ display: 'flex' }}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div key={i} style={{
                          width: 26, height: 26, borderRadius: 999,
                          border: '2px solid #fff',
                          backgroundColor: AV[i].bg,
                          marginLeft: i === 0 ? 0 : -8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name="person" size={15} color={AV[i].fg} />
                        </div>
                      ))}
                      {count > 3 && (
                        <div style={{
                          width: 26, height: 26, borderRadius: 999,
                          border: '2px solid #fff',
                          backgroundColor: colors.surfaceContainer,
                          marginLeft: -8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: '600', color: colors.secondary }}>+{count - 3}</span>
                        </div>
                      )}
                    </div>

                    {/* 상태 칩 */}
                    <div style={{
                      backgroundColor: m.status === 'ended' ? colors.surfaceContainerLow : colors.primaryFixed,
                      paddingTop: 5, paddingBottom: 5,
                      paddingLeft: 10, paddingRight: 10,
                      borderRadius: 99,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: '500', color: m.status === 'ended' ? colors.outline : colors.primary }}>
                        {m.status === 'ended' ? '종료됨' : (m.desired_time ? `희망 · ${m.desired_time}` : '일정 조율 중')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 모임 만들기 버튼 */}
        <Button onClick={() => navigate('/meetings/new')} height={54} fontSize={16} style={{ width: '100%', marginTop: 4 }}>
          <Icon name="add" size={21} color={colors.onPrimary} />
          <span style={{ fontSize: 16, fontWeight: '600', color: colors.onPrimary }}>모임 만들기</span>
        </Button>

      </div>

      <BottomNav />
    </div>
  );
}
