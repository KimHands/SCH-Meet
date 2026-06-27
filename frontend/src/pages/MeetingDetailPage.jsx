import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMeeting } from '../api/meetings';
import { getMyProfile } from '../api/auth';

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState('');

  useEffect(() => {
    Promise.all([getMeeting(id), getMyProfile()])
      .then(([m, profile]) => {
        setMeeting(m);
        setMyUserId(profile.id);
      })
      .catch(() => setError('모임 정보를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (error || !meeting) {
    return (
      <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Icon name="error_outline" size={48} color={colors.outlineVariant} />
        <p style={{ fontSize: 15, color: colors.onSurfaceVariant }}>{error || '모임을 찾을 수 없어요.'}</p>
        <Button variant="outline" label="돌아가기" onClick={() => navigate(-1)} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24 }} />
      </div>
    );
  }

  const members   = meeting.members ?? [];
  const capacity  = meeting.capacity ?? meeting.max_members ?? '?';
  const count     = meeting.participant_count ?? members.length;
  const amCreator = members.some((m) => m.user_id === myUserId && m.is_creator);

  const handleCopyInvite = () => {
    const link = localStorage.getItem(`invite_link_${id}`);
    if (!link) {
      setCopyToast('초대 링크를 찾을 수 없어요. 모임을 다시 생성해보세요.');
      setTimeout(() => setCopyToast(''), 3000);
      return;
    }
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopyToast('초대 링크가 복사됐어요!');
        setTimeout(() => setCopyToast(''), 3000);
      })
      .catch(() => {
        setCopyToast('복사 실패. 직접 링크를 선택해주세요.');
        setTimeout(() => setCopyToast(''), 3000);
      });
  };

  const INFO = [
    ['목적',    meeting.purpose       || '-'],
    ['희망 시간', meeting.desired_time  || '-'],
    ['정원',    `${capacity}명`],
    ['희망 장소', meeting.desired_location || '-'],
  ];

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {copyToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: colors.onSurface, color: '#fff',
          padding: '10px 18px', borderRadius: 99,
          fontSize: 13, fontWeight: '500',
          zIndex: 999, whiteSpace: 'nowrap',
        }}>
          {copyToast}
        </div>
      )}

      <AppBar title="모임 상세" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 18px' }}>

        {/* 히어로 카드 */}
        <div style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 18 }}>
          <p style={{ fontSize: 19, fontWeight: '700', color: '#fff' }}>{meeting.name ?? meeting.title}</p>
          <p style={{ marginTop: 4, fontSize: 12, color: colors.inversePrimary }}>
            {count}명 / {meeting.purpose || '모임'}
          </p>
          {amCreator && (
            <button
              onClick={() => navigate(`/meetings/${id}/edit`)}
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
          )}
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
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>{count}/{capacity}</span>
        </div>
        <div style={{
          marginTop: 8, backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 14, paddingLeft: 16, paddingRight: 16,
        }}>
          {members.map((m, i) => {
            const isMe = m.user_id === myUserId;
            return (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                paddingTop: 9, paddingBottom: 9,
                borderBottom: i < members.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
              }}>
                {m.profile_image_url ? (
                  <img src={m.profile_image_url} alt={m.nickname} style={{ width: 30, height: 30, borderRadius: 9999, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 30, height: 30, borderRadius: 9999,
                    backgroundColor: m.is_creator ? colors.primaryFixed : colors.surfaceContainer,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="person" size={18} color={m.is_creator ? colors.primary : colors.secondary} />
                  </div>
                )}
                <span style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.onSurface }}>
                  {m.nickname}{isMe ? ' (나)' : ''}
                </span>
                {m.is_creator && (
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

        {/* 버튼 */}
        <Button
          variant="secondary"
          height={48} fontSize={14}
          style={{ width: '100%', marginTop: 16 }}
          onClick={() => navigate(`/meetings/${id}/ai-result`)}
        >
          <Icon name="auto_awesome" size={19} color={colors.primary} />
          <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>AI 추천 결과 보기</span>
        </Button>

        <Button
          variant="secondary"
          height={48} fontSize={14}
          style={{ width: '100%', marginTop: 10 }}
          onClick={handleCopyInvite}
        >
          <Icon name="content_copy" size={19} color={colors.primary} />
          <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>초대 링크 복사</span>
        </Button>

      </div>
    </div>
  );
}
