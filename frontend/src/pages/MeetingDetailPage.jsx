import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

const INFO = [
  ['목적',    '조용한 회의'],
  ['희망 시간', '주중 오후'],
  ['정원',    '4명'],
  ['희망 장소', '학생회관 1층 회의실'],
];

const MEMBERS = [
  { name: '김소정 (나)', host: true },
  { name: '김동진' },
  { name: '박준석' },
  { name: '이서연' },
];

export default function MeetingDetailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar title="모임 상세" trailingIcon="settings" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 18px' }}>

        {/* 히어로 카드 */}
        <div style={{
          backgroundColor: colors.primary,
          borderRadius: 16,
          padding: 18,
        }}>
          <p style={{ fontSize: 19, fontWeight: '700', color: '#fff' }}>중간발표 준비</p>
          <p style={{ marginTop: 4, fontSize: 12, color: colors.inversePrimary }}>4명 / 조별 모임</p>
          <button
            onClick={() => navigate('/meetings/new')}
            style={{
              marginTop: 14,
              paddingLeft: 16, paddingRight: 16,
              height: 36,
              backgroundColor: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 9999,
              fontSize: 12, fontWeight: '600', color: '#fff',
              cursor: 'pointer',
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}
          >
            모임 정보 수정
          </button>
        </div>

        {/* 모임 정보 */}
        <p style={{ marginTop: 16, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>모임 정보</p>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          {INFO.map(([k, v], i) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 11, paddingBottom: 11,
              borderBottom: i < INFO.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
            }}>
              <span style={{ fontSize: 13, color: colors.outline }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: '500', color: colors.onSurface }}>{v}</span>
            </div>
          ))}
        </div>

        {/* 참여자 */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여자</p>
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
              paddingTop: 9, paddingBottom: 9,
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

        {/* 멤버 초대 버튼 */}
        <Button
          variant="secondary"
          height={48} fontSize={14}
          style={{ width: '100%', marginTop: 16 }}
          onClick={() => navigate('/recommendations')}
        >
          <Icon name="auto_awesome" size={19} color={colors.primary} />
          <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>AI 추천 결과 보기</span>
        </Button>

        <Button
          variant="secondary"
          height={48} fontSize={14}
          style={{ width: '100%', marginTop: 10 }}
        >
          <Icon name="person_add" size={19} color={colors.primary} />
          <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>멤버 초대</span>
        </Button>

      </div>
    </div>
  );
}