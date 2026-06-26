import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function InvitePage() {
  const navigate = useNavigate();
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const newErrors = {};
    if (!time.trim()) newErrors.time = '희망 시간을 입력해주세요.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) navigate('/recommendations');
  };

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
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>희망 시간 <span style={{ color: colors.error }}>*</span></p>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="예) 오후 8시, 주중 저녁 등"
              style={{
                width: '100%', height: 48,
                border: `1px solid ${errors.time ? colors.error : colors.outlineVariant}`,
                borderRadius: 8,
                paddingLeft: 14, paddingRight: 14,
                fontSize: 14, color: colors.onSurface,
                fontFamily: "'Be Vietnam Pro', sans-serif",
                outline: 'none', boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            />
            {errors.time && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{errors.time}</p>}
          </div>

          {/* 희망 장소 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>희망 장소</p>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예) 학생회관 1층 회의실, 카페 등"
              style={{
                width: '100%', height: 48,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: 8,
                paddingLeft: 14, paddingRight: 14,
                fontSize: 14, color: colors.onSurface,
                fontFamily: "'Be Vietnam Pro', sans-serif",
                outline: 'none', boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            />
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
          onClick={handleSubmit}
          style={{ width: '100%' }}
        />
      </div>

    </div>
  );
}