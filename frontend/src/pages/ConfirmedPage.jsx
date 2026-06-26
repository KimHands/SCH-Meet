import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from '../components/Button';
import Icon from '../components/Icon';

const MEMBERS = [
  { name: '김소정 (나)', host: true },
  { name: '김동진' },
  { name: '박준석' },
  { name: '이서연' },
];

export default function ConfirmedPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 16px' }}>

        {/* 체크 애니메이션 영역 */}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 84, height: 84, borderRadius: 9999,
            backgroundColor: colors.primaryFixed,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={48} color={colors.primary} />
          </div>
          <p style={{ marginTop: 20, fontSize: 22, fontWeight: '700', textAlign: 'center', color: colors.onSurface }}>
            일정이 확정되었어요!
          </p>
        </div>

        {/* 확정 시간 카드 */}
        <div style={{
          marginTop: 26,
          backgroundColor: colors.primary,
          borderRadius: 18,
          padding: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.inversePrimary }}>확정 시간</span>
          <p style={{ marginTop: 6, fontSize: 22, fontWeight: '700', color: '#fff' }}>수요일 14:00 ~ 15:30</p>
        </div>

        {/* 참여자 */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여자</span>
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>4/4</span>
        </div>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          {MEMBERS.map((m, i) => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              paddingTop: 10, paddingBottom: 10,
              borderBottom: i < MEMBERS.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9999,
                backgroundColor: m.host ? colors.primaryFixed : colors.surfaceContainer,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="person" size={18} color={m.host ? colors.primary : colors.secondary} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.onSurface }}>{m.name}</span>
              {m.host && (
                <div style={{
                  backgroundColor: colors.primaryFixed,
                  paddingTop: 3, paddingBottom: 3,
                  paddingLeft: 9, paddingRight: 9,
                  borderRadius: 99,
                }}>
                  <span style={{ fontSize: 10, fontWeight: '500', color: colors.primary }}>모임장</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button
          label="모임 상세로 이동"
          onClick={() => navigate('/meetings/1')}
          style={{ width: '100%' }}
        />
        <Button
          variant="outline"
          label="홈으로"
          onClick={() => navigate('/')}
          style={{ width: '100%' }}
        />
      </div>

    </div>
  );
}