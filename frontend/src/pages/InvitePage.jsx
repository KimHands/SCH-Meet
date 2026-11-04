import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { colors, screenStyle, inputStyle, fieldLabelStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInviteInfo, joinMeeting } from '../api/meetings';
import { token } from '../utils/token';
import { saveRedirectPath } from '../utils/redirect';

function InvalidInvite({ message, onHome }) {
  return (
    <main style={{ ...screenStyle, alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px' }}>
      <Icon name="link_off" size={48} color={colors.outlineVariant} />
      <h1 style={{ fontSize: 15, fontWeight: '600', color: colors.onSurfaceVariant }}>초대 링크를 열 수 없어요</h1>
      <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center' }}>{message}</p>
      <Button variant="outline" label="홈으로" onClick={onHome} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24, marginTop: 4 }} />
    </main>
  );
}

function MemberChips({ members }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 8 }}>현재 참여자</h2>
      <ul style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none' }}>
        {members.map((m, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`, borderRadius: 99, paddingLeft: 10, paddingRight: 12, paddingTop: 5, paddingBottom: 5 }}>
            {m.profile_image_url ? (
              <img src={m.profile_image_url} alt="" style={{ width: 20, height: 20, borderRadius: 9999, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: colors.surfaceContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="person" size={13} color={colors.secondary} />
              </div>
            )}
            <span style={{ fontSize: 12, color: colors.onSurface }}>{m.nickname}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: inviteToken } = useParams();
  const isLoggedIn = token.exists();

  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');

  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 초대 토큰으로 모임 정보 불러오기
  useEffect(() => {
    if (!inviteToken) return;
    getInviteInfo(inviteToken)
      .then(setMeetingInfo)
      .catch((e) => setInfoError(e.status === 404 ? '링크가 만료되었거나 잘못된 주소예요.' : e.message))
      .finally(() => setLoadingInfo(false));
  }, [inviteToken]);

  const goToLogin = () => {
    saveRedirectPath(location.pathname);
    navigate('/login');
  };

  const validate = () => {
    const newErrors = time.trim() ? {} : { time: '희망 시간을 입력해주세요.' };
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) { goToLogin(); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await joinMeeting(inviteToken, {
        desired_time: time.trim(),
        desired_location: place.trim(),
      });
      navigate(`/meetings/${meetingInfo.meeting_id}`);
    } catch (e) {
      setErrors({ submit: e.message });
      setSubmitting(false);
    }
  };

  if (loadingInfo) return <LoadingSpinner />;
  if (infoError || !meetingInfo) {
    return <InvalidInvite message={infoError || '모임 정보를 찾을 수 없어요.'} onHome={() => navigate('/')} />;
  }

  const isFull = meetingInfo.current_participants_count >= meetingInfo.capacity;

  return (
    <main style={screenStyle}>

      <AppBar title="모임 참여" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* 모임 배너 */}
        <section style={{ backgroundColor: colors.primaryFixed, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="groups" size={20} color={colors.primary} />
            <h2 style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{meetingInfo.meeting_name}</h2>
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
              <p style={{ fontSize: 12, color: colors.onErrorContainer, fontWeight: '500' }}>정원이 가득 찼어요</p>
            </div>
          )}
        </section>

        {meetingInfo.existing_members?.length > 0 && <MemberChips members={meetingInfo.existing_members} />}

        {/* 참여 폼 */}
        {!isFull && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
              {isLoggedIn
                ? <>모임에 참여하기 전에<br />희망 시간과 장소를 알려주세요.</>
                : <>로그인하면 이 모임에 참여할 수 있어요.<br />로그인 후 이 화면으로 다시 돌아와요.</>}
            </p>

            {isLoggedIn && (
              <>
                <div>
                  <label htmlFor="invite-time" style={fieldLabelStyle}>
                    희망 시간 <span aria-hidden="true" style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    id="invite-time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="예) 오후 8시, 주중 저녁 등"
                    required
                    aria-invalid={!!errors.time}
                    aria-describedby={errors.time ? 'invite-time-error' : undefined}
                    style={inputStyle(!!errors.time)}
                  />
                  {errors.time && <p id="invite-time-error" style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{errors.time}</p>}
                </div>

                <div>
                  <label htmlFor="invite-place" style={fieldLabelStyle}>희망 장소</label>
                  <input
                    id="invite-place"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="예) 학생회관 1층 회의실, 카페 등"
                    style={inputStyle()}
                  />
                </div>
              </>
            )}

            {errors.submit && (
              <p role="alert" style={{ fontSize: 12, color: colors.error }}>{errors.submit}</p>
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
            label={submitting ? '참여 중...' : isLoggedIn ? '참여하기' : '로그인하고 참여하기'}
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%' }}
          />
        )}
      </div>

    </main>
  );
}
