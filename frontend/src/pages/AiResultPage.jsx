import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

const RANK1_REASONS = [
  { icon: 'check_circle', color: colors.success,  text: '4명 모두 가능' },
  { icon: 'check_circle', color: colors.success,  text: '이동 시간이 짧은 시간대' },
  { icon: 'check_circle', color: colors.success,  text: '집중력이 좋은 시간대' },
];

const RANK2_REASONS = [
  { icon: 'check_circle', color: colors.success,   text: '4명 모두 가능' },
  { icon: 'error',        color: colors.warning,   text: '한 명이 13시 수업으로 다소 촉박', sub: true },
];

export default function AiResultPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar title="추천 결과" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 18px' }}>

        {/* AI 분석 안내 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="auto_awesome" size={20} color={colors.tertiaryContainer} />
          <span style={{ fontSize: 13, color: colors.secondary }}>AI가 4명의 일정을 분석했어요</span>
        </div>

        {/* 1순위 카드 */}
        <div style={{
          marginTop: 14,
          backgroundColor: '#fff',
          border: `2px solid ${colors.primary}`,
          borderRadius: 18,
          padding: 18,
          boxShadow: '0px 6px 18px rgba(0,25,69,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              backgroundColor: colors.primary,
              paddingTop: 5, paddingBottom: 5,
              paddingLeft: 12, paddingRight: 12,
              borderRadius: 99,
            }}>
              <span style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>1순위</span>
            </div>
            <Icon name="workspace_premium" size={22} color={colors.primary} />
          </div>

          <p style={{ marginTop: 14, fontSize: 22, fontWeight: '700', color: colors.primary }}>
            수요일 14:00 ~ 15:30
          </p>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RANK1_REASONS.map((r) => (
              <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={r.icon} size={17} color={r.color} />
                <span style={{ fontSize: 13, color: colors.onSurface }}>{r.text}</span>
              </div>
            ))}
          </div>

          <Button
            label="이 시간으로 확정"
            onClick={() => navigate('/confirmed')}
            height={48} fontSize={14}
            style={{ width: '100%', marginTop: 16 }}
          />
        </div>

        {/* 2순위 카드 */}
        <div style={{
          marginTop: 14,
          backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 18,
          padding: 18,
        }}>
          <div style={{
            alignSelf: 'flex-start',
            display: 'inline-block',
            backgroundColor: colors.surfaceContainerHigh,
            paddingTop: 5, paddingBottom: 5,
            paddingLeft: 12, paddingRight: 12,
            borderRadius: 99,
          }}>
            <span style={{ fontSize: 12, fontWeight: '700', color: colors.secondary }}>2순위</span>
          </div>

          <p style={{ marginTop: 14, fontSize: 20, fontWeight: '700', color: colors.onSurface }}>
            금요일 11:00 ~ 12:30
          </p>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RANK2_REASONS.map((r) => (
              <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={r.icon} size={17} color={r.color} />
                <span style={{ fontSize: 13, color: r.sub ? colors.secondary : colors.onSurface }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
