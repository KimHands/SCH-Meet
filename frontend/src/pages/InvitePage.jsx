import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function InvitePage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar title="모임 참여 설정" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* 모임 배너 */}
        <div style={{
          backgroundColor: colors.primaryFixed,
          borderRadius: 14,
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="campaign" size={20} color={colors.primary} />
            <span style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>중간발표 준비</span>
          </div>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: colors.onPrimaryFixedVariant }}>
            모임에 참여 중입니다.<br />희망 시간과 장소를 선택해주세요.
          </p>
        </div>

        {/* 입력 폼 */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 희망 시간 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>희망 시간</p>
            <div style={{
              height: 48,
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: 8,
              paddingLeft: 14, paddingRight: 14,
              backgroundColor: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, color: colors.outline }}>시간대를 선택하세요</span>
              <Icon name="expand_more" size={20} color={colors.outline} />
            </div>
          </div>

          {/* 희망 장소 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>희망 장소</p>
            <div style={{
              height: 48,
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: 8,
              paddingLeft: 14, paddingRight: 14,
              backgroundColor: '#fff',
              display: 'flex', alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, color: colors.outline }}>예) 학생회관 1층 회의실, 카페 등</span>
            </div>
            <Button variant="secondary" height={46} fontSize={13} style={{ width: '100%', marginTop: 8 }}>
              <Icon name="my_location" size={18} color={colors.primary} />
              <span style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>위치 좌표로 선택하기</span>
            </Button>
          </div>

        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '14px 20px 18px' }}>
        <Button
          label="제출하기"
          onClick={() => navigate('/recommendations')}
          style={{ width: '100%' }}
        />
      </div>

    </div>
  );
}