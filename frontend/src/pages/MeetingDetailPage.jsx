import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, screenStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getMeeting } from '../api/meetings';
import { getMyProfile } from '../api/auth';
import { formatDuration } from '../utils/duration';

const cardStyle = {
  marginTop: 8, backgroundColor: '#fff',
  border: `1px solid ${colors.surfaceContainerHighest}`,
  borderRadius: 14, paddingLeft: 16, paddingRight: 16,
};

const rowBorder = (index, length) =>
  index < length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none';

function LoadError({ message, onBack }) {
  return (
    <main style={{ ...screenStyle, alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px' }}>
      <Icon name="error" size={48} color={colors.outlineVariant} />
      <p role="alert" style={{ fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center' }}>{message}</p>
      <Button variant="outline" label="돌아가기" onClick={onBack} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24 }} />
    </main>
  );
}

function CreatorBadge() {
  return (
    <span style={{
      backgroundColor: colors.primaryFixed,
      padding: '3px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: '500', color: colors.primary,
    }}>
      모임장
    </span>
  );
}

function MemberRow({ member, isMe, borderBottom }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 9, paddingBottom: 9, borderBottom }}>
      {member.profile_image_url ? (
        <img src={member.profile_image_url} alt="" style={{ width: 30, height: 30, borderRadius: 9999, objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: 30, height: 30, borderRadius: 9999,
          backgroundColor: member.is_creator ? colors.primaryFixed : colors.surfaceContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="person" size={18} color={member.is_creator ? colors.primary : colors.secondary} />
        </div>
      )}
      <span style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.onSurface }}>
        {member.nickname}{isMe ? ' (나)' : ''}
      </span>
      {member.is_creator && <CreatorBadge />}
    </li>
  );
}

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast, showToast } = useToast();

  useEffect(() => {
    Promise.all([getMeeting(id), getMyProfile()])
      .then(([m, profile]) => {
        setMeeting(m);
        setMyUserId(profile?.id ?? null);
      })
      .catch((e) => setError(e.message || '모임 정보를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !meeting) return <LoadError message={error || '모임을 찾을 수 없어요.'} onBack={() => navigate(-1)} />;

  const members  = meeting.members ?? [];
  const capacity = meeting.capacity ?? meeting.max_members ?? '?';
  const count    = meeting.participant_count ?? members.length;
  const inviteLink = meeting.invite_link;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast('초대 링크가 복사됐어요!');
    } catch {
      showToast('복사하지 못했어요. 아래 링크를 길게 눌러 복사해주세요.');
    }
  };

  const INFO = [
    ['목적',      meeting.purpose || '-'],
    ['희망 시간', meeting.desired_time || '-'],
    ['소요 시간', formatDuration(meeting.duration_minutes)],
    ['정원',      `${capacity}명`],
    ['희망 장소', meeting.desired_location || '-'],
  ];

  return (
    <main style={screenStyle}>
      <Toast message={toast} />

      <AppBar title="모임 상세" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 18px' }}>

        {/* 히어로 카드 */}
        <section style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 18 }}>
          <h2 style={{ fontSize: 19, fontWeight: '700', color: '#fff' }}>{meeting.name ?? meeting.title}</h2>
          <p style={{ marginTop: 4, fontSize: 12, color: colors.inversePrimary }}>
            {count}명 / {meeting.purpose || '모임'}
            {meeting.my_role === 'CREATOR' ? ' · 내가 만든 모임' : ''}
          </p>
        </section>

        {/* 모임 정보 */}
        <h2 style={{ marginTop: 16, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>모임 정보</h2>
        <dl style={cardStyle}>
          {INFO.map(([label, value], i) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', gap: 12,
              paddingTop: 11, paddingBottom: 11,
              borderBottom: rowBorder(i, INFO.length),
            }}>
              <dt style={{ fontSize: 13, color: colors.outline }}>{label}</dt>
              <dd style={{ fontSize: 13, fontWeight: '500', color: colors.onSurface, textAlign: 'right' }}>{value}</dd>
            </div>
          ))}
        </dl>

        {/* 참여자 */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>참여자</h2>
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>{count}/{capacity}</span>
        </div>
        <ul style={{ ...cardStyle, listStyle: 'none' }}>
          {members.map((m, i) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isMe={m.user_id === myUserId}
              borderBottom={rowBorder(i, members.length)}
            />
          ))}
        </ul>

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

        {inviteLink && (
          <>
            <Button
              variant="secondary"
              height={48} fontSize={14}
              style={{ width: '100%', marginTop: 10 }}
              onClick={handleCopyInvite}
            >
              <Icon name="content_copy" size={19} color={colors.primary} />
              <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>초대 링크 복사</span>
            </Button>
            <p style={{ marginTop: 6, fontSize: 12, color: colors.outline, wordBreak: 'break-all', userSelect: 'all' }}>
              {inviteLink}
            </p>
          </>
        )}

      </div>
    </main>
  );
}
