import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getConfirmedMeeting } from '../api/meetings';
import { getMyProfile } from '../api/auth';

const DAY_LABEL = { MON: '월요일', TUE: '화요일', WED: '수요일', THU: '목요일', FRI: '금요일', SAT: '토요일', SUN: '일요일' };

export default function ConfirmedPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [confirmed, setConfirmed] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getConfirmedMeeting(id), getMyProfile()])
      .then(([data, profile]) => {
        setConfirmed(data);
        setMyUserId(profile.id);
      })
      .catch(() => setError('확정 정보를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (error || !confirmed) {
    return (
      <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Icon name="error_outline" size={48} color={colors.outlineVariant} />
        <p style={{ fontSize: 15, color: colors.onSurfaceVariant }}>{error || '정보를 불러올 수 없어요.'}</p>
        <Button variant="outline" label="돌아가기" onClick={() => navigate(-1)} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24 }} />
      </div>
    );
  }

  const ct = confirmed.confirmed_time;
  const dayLabel = ct ? (DAY_LABEL[ct.day] ?? ct.day) : null;
  const timeText = ct ? `${dayLabel} ${ct.start_time} ~ ${ct.end_time}` : '시간 미정';
  const members = confirmed.confirmed_members ?? [];

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 16px' }}>

        {/* 체크 영역 */}
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
          <p style={{ marginTop: 6, fontSize: 13, color: colors.outline }}>{confirmed.meeting_name}</p>
        </div>

        {/* 확정 시간 카드 */}
        <div style={{
          marginTop: 26, backgroundColor: colors.primary,
          borderRadius: 18, padding: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.inversePrimary }}>확정 시간</span>
          <p style={{ marginTop: 6, fontSize: 22, fontWeight: '700', color: '#fff' }}>{timeText}</p>
          {confirmed.confirmed_location && (
            <p style={{ marginTop: 6, fontSize: 13, color: colors.inversePrimary }}>📍 {confirmed.confirmed_location}</p>
          )}
        </div>

        {/* 참여자 */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여자</span>
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>{members.length}명</span>
        </div>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          {members.map((m, i) => {
            const isCreator = m.role === 'CREATOR';
            const isMe = m.user_id === myUserId;
            return (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                paddingTop: 10, paddingBottom: 10,
                borderBottom: i < members.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
              }}>
                {m.profile_image_url ? (
                  <img src={m.profile_image_url} alt={m.nickname} style={{ width: 30, height: 30, borderRadius: 9999, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 30, height: 30, borderRadius: 9999,
                    backgroundColor: isCreator ? colors.primaryFixed : colors.surfaceContainer,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="person" size={18} color={isCreator ? colors.primary : colors.secondary} />
                  </div>
                )}
                <span style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.onSurface }}>
                  {m.nickname}{isMe ? ' (나)' : ''}
                </span>
                {isCreator && (
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
            );
          })}
        </div>

      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button label="모임 상세로 이동" onClick={() => navigate(`/meetings/${id}`)} style={{ width: '100%' }} />
        <Button variant="outline" label="홈으로" onClick={() => navigate('/')} style={{ width: '100%' }} />
      </div>

    </div>
  );
}
