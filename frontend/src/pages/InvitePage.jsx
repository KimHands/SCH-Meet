import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInviteInfo, joinMeeting } from '../api/meetings';

export default function InvitePage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');

  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 초대 토큰으로 모임 정보 불러오기
  useEffect(() => {
    if (!token) return;
    getInviteInfo(token)
      .then(setMeetingInfo)
      .catch(() => setInfoError('유효하지 않은 초대 링크예요.'))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleSubmit = async () => {
    const newErrors = {};
    if (!time.trim()) newErrors.time = '희망 시간을 입력해주세요.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await joinMeeting(token, {
        desired_time: time.trim(),
        desired_location: location.trim(),
      });
      // 참여 완료 후 해당 모임 상세 페이지로 이동
      navigate(`/meetings/${meetingInfo.meeting_id}`);
    } catch (e) {
      setErrors({ submit: e.message || '참여 중 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInfo) return <LoadingSpinner />;

  if (infoError || !meetingInfo) {
    return (
      <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Icon name="link_off" size={48} color={colors.outlineVariant} />
        <p style={{ fontSize: 15, fontWeight: '600', color: colors.onSurfaceVariant }}>초대 링크가 유효하지 않아요</p>
        <p style={{ fontSize: 13, color: colors.outline }}>링크가 만료되었거나 잘못된 주소예요.</p>
        <Button variant="outline" label="홈으로" onClick={() => navigate('/')} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24, marginTop: 4 }} />
      </div>
    );
  }

  const isFull = meetingInfo.current_participants_count >= meetingInfo.capacity;

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <AppBar title="모임 참여" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* 모임 배너 */}
        <div style={{ backgroundColor: colors.primaryFixed, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="groups" size={20} color={colors.primary} />
            <span style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{meetingInfo.meeting_name}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {meetingInfo.purpose && (
              <p style={{ fontSize: 12, color: colors.onPrimaryFixedVariant }}>목적: {meetingInfo.purpose}</p>
            )}
            <p style={{ fontSize: 12, color: colors.onPrimaryFixedVariant }}>
              개설자: {meetingInfo.creator_name} · {meetingInfo.current_participants_count}/{meetingInfo.capacity}명
            </p>
          </div>
          {isFull && (
            <div style={{ marginTop: 10, backgroundColor: colors.errorContainer, borderRadius: 8, padding: '6px 10px' }}>
              <p style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>정원이 가득 찼어요</p>
            </div>
          )}
        </div>

        {/* 현재 참여자 */}
        {meetingInfo.existing_members?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 8 }}>현재 참여자</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {meetingInfo.existing_members.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`, borderRadius: 99, paddingLeft: 10, paddingRight: 12, paddingTop: 5, paddingBottom: 5 }}>
                  {m.profile_image_url ? (
                    <img src={m.profile_image_url} alt={m.nickname} style={{ width: 20, height: 20, borderRadius: 9999, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: colors.surfaceContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="person" size={13} color={colors.secondary} />
                    </div>
                  )}
                  <span style={{ fontSize: 12, color: colors.onSurface }}>{m.nickname}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 참여 폼 */}
        {!isFull && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
              모임에 참여하기 전에<br />희망 시간과 장소를 알려주세요.
            </p>

            {/* 희망 시간 */}
            <div>
              <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>
                희망 시간 <span style={{ color: colors.error }}>*</span>
              </p>
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
            </div>

            {errors.submit && (
              <p style={{ fontSize: 12, color: colors.error }}>{errors.submit}</p>
            )}
          </div>
        )}

      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '14px 20px 18px' }}>
        {isFull ? (
          <Button variant="outline" label="홈으로 돌아가기" onClick={() => navigate('/')} style={{ width: '100%' }} />
        ) : (
          <Button
            label={submitting ? '참여 중...' : '참여하기'}
            onClick={handleSubmit}
            style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
          />
        )}
      </div>

    </div>
  );
}
