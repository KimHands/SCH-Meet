import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import Icon from '../components/Icon';

const MEETINGS = [
  { icon: 'campaign',   bg: colors.primaryFixed,  fg: colors.primary,          title: '중간발표 준비',    meta: '4명 · 조별 모임', avatars: 4, next: '다음 추천 · 수 14:00' },
  { icon: 'menu_book',  bg: colors.tertiaryFixed, fg: colors.tertiaryContainer, title: '알고리즘 스터디', meta: '3명 · 스터디',    avatars: 3, next: '다음 추천 · 금 11:00' },
];

const AV = [
  { bg: colors.primaryFixedDim,   fg: colors.primary },
  { bg: colors.secondaryFixedDim, fg: colors.onSurfaceVariant },
  { bg: colors.tertiaryFixedDim,  fg: colors.tertiaryContainer },
];

export default function MeetingListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'ended'

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 20px 20px', overflow: 'hidden' }}>

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

        {/* 모임 카드 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
          {MEETINGS.map((m) => (
            <div
              key={m.title}
              onClick={() => navigate('/meetings/1')}
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
                    backgroundColor: m.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={m.icon} size={22} color={m.fg} />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: '600', color: colors.onSurface }}>{m.title}</p>
                    <p style={{ fontSize: 12, color: colors.outline, marginTop: 2 }}>{m.meta}</p>
                  </div>
                </div>
                <Icon name="chevron_right" size={22} color="#a9abb6" />
              </div>

              {/* 카드 하단 */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* 아바타 */}
                <div style={{ display: 'flex' }}>
                  {Array.from({ length: Math.min(m.avatars, 3) }).map((_, i) => (
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
                  {m.avatars > 3 && (
                    <div style={{
                      width: 26, height: 26, borderRadius: 999,
                      border: '2px solid #fff',
                      backgroundColor: colors.surfaceContainer,
                      marginLeft: -8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: '600', color: colors.secondary }}>+{m.avatars - 3}</span>
                    </div>
                  )}
                </div>

                {/* 다음 추천 칩 */}
                <div style={{
                  backgroundColor: colors.primaryFixed,
                  paddingTop: 5, paddingBottom: 5,
                  paddingLeft: 10, paddingRight: 10,
                  borderRadius: 99,
                }}>
                  <span style={{ fontSize: 11, fontWeight: '500', color: colors.primary }}>{m.next}</span>
                </div>
              </div>
            </div>
          ))}
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