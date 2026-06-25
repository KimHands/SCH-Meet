import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

// 재사용 가능한 입력 필드 컴포넌트
function Field({ label, placeholder, dropdown = false, children }) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>
        {label}
      </p>
      <div style={{
        height: 48,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: 8,
        paddingLeft: 14, paddingRight: 14,
        backgroundColor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 14, color: colors.outline }}>{placeholder}</span>
        {dropdown && <Icon name="expand_more" size={20} color={colors.outline} />}
      </div>
      {children}
    </div>
  );
}

export default function CreateMeetingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar title="모임 만들기" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Field label="모임 이름" placeholder="예) 중간발표 준비" />
        <Field label="모임 목적" placeholder="목적을 선택하세요" dropdown />
        <Field label="희망 시간" placeholder="시간대를 선택하세요" dropdown />

        <Field label="희망 장소" placeholder="예) 학생회관 1층 회의실, 카페 등">
          <Button variant="secondary" height={46} fontSize={13} style={{ width: '100%', marginTop: 8 }}>
            <Icon name="my_location" size={18} color={colors.primary} />
            <span style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>위치 좌표로 선택하기</span>
          </Button>
        </Field>

        <Field label="정원" placeholder="예) 4명" dropdown />

      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '14px 20px 18px' }}>
        <Button
          label="초대 링크 생성"
          onClick={() => navigate('/meetings/1')}
          style={{ width: '100%' }}
        />
      </div>

    </div>
  );
}