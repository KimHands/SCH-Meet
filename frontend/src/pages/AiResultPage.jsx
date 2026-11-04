import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, screenStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getRecommendations, getMeeting, confirmMeeting } from '../api/meetings';
import { formatDuration } from '../utils/duration';

const DAY_LABEL = { MON: '월요일', TUE: '화요일', WED: '수요일', THU: '목요일', FRI: '금요일', SAT: '토요일', SUN: '일요일' };

const NO_RECOMMENDATION_REASON = {
  LACK_OF_PARTICIPANTS: '참여자가 2명 이상이어야 추천이 가능해요.',
};

function EmptyState({ icon, title, message, onBack }) {
  return (
    <main style={screenStyle}>
      <AppBar title="추천 결과" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px' }}>
        <Icon name={icon} size={52} color={colors.outlineVariant} />
        <h2 style={{ fontSize: 16, fontWeight: '600', color: colors.onSurfaceVariant, textAlign: 'center' }}>{title}</h2>
        <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', lineHeight: '19px' }}>{message}</p>
        <Button variant="outline" label="돌아가기" onClick={onBack} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24 }} />
      </div>
    </main>
  );
}

function RecommendationCard({ rec, isFirst, canConfirm, isConfirming, disabled, onConfirm }) {
  const dayLabel = DAY_LABEL[rec.day] ?? rec.day_label ?? rec.day;
  return (
    <li style={{
      marginTop: 14,
      backgroundColor: '#fff',
      border: `${isFirst ? 2 : 1}px solid ${isFirst ? colors.primary : colors.surfaceContainerHighest}`,
      borderRadius: 18,
      padding: 18,
      boxShadow: isFirst ? '0px 6px 18px rgba(0,25,69,0.10)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          backgroundColor: isFirst ? colors.primary : colors.surfaceContainerHigh,
          padding: '5px 12px', borderRadius: 99,
          fontSize: 12, fontWeight: '700', color: isFirst ? '#fff' : colors.secondary,
        }}>
          {rec.rank}순위
        </span>
        {isFirst && <Icon name="workspace_premium" size={22} color={colors.primary} />}
      </div>

      <h3 style={{ marginTop: 14, fontSize: isFirst ? 22 : 20, fontWeight: '700', color: isFirst ? colors.primary : colors.onSurface }}>
        {dayLabel} {rec.start_time} ~ {rec.end_time}
      </h3>
      <p style={{ marginTop: 2, fontSize: 12, color: colors.outline }}>{formatDuration(rec.duration_minutes)}</p>

      <ul style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
        {(rec.reason_bullets ?? []).map((reason, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check_circle" size={17} color={colors.success} />
            <span style={{ fontSize: 13, color: colors.onSurface }}>{reason}</span>
          </li>
        ))}
      </ul>

      {canConfirm && (
        <Button
          label={isConfirming ? '확정 중...' : '이 시간으로 확정'}
          onClick={() => onConfirm(rec)}
          disabled={disabled}
          height={48} fontSize={14}
          style={{ width: '100%', marginTop: 16 }}
        />
      )}
    </li>
  );
}

export default function AiResultPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmError, setConfirmError] = useState('');

  const loadRecommendations = useCallback(() =>
    getRecommendations(id).then(setData), [id]);

  useEffect(() => {
    Promise.all([loadRecommendations(), getMeeting(id)])
      .then(([, meeting]) => setIsCreator(meeting?.my_role === 'CREATOR'))
      .catch((e) => setLoadError(e.message || '추천 결과를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [id, loadRecommendations]);

  const handleConfirm = async (rec) => {
    setConfirmingId(rec.recommendation_id);
    setConfirmError('');
    try {
      await confirmMeeting(id, {
        recommendationId: rec.recommendation_id,
        day: rec.day,
        startTime: rec.start_time,
      });
      navigate(`/meetings/${id}/confirmed`);
    } catch (e) {
      setConfirmError(e.message);
      setConfirmingId(null);
      // 그 사이 시간이 막혔다면 최신 추천으로 갱신
      if (e.status === 409) loadRecommendations().catch(() => {});
    }
  };

  const goBack = () => navigate(-1);

  if (loading) return <LoadingSpinner />;
  if (loadError) {
    return <EmptyState icon="error" title="추천 결과를 불러오지 못했어요" message={loadError} onBack={goBack} />;
  }
  if (!data?.can_recommend) {
    const reason = NO_RECOMMENDATION_REASON[data?.reason] ?? '모든 참여자의 공통 가능 시간대가 없어요.';
    return <EmptyState icon="event_busy" title="추천 가능한 시간이 없어요" message={reason} onBack={goBack} />;
  }

  const recommendations = data.recommendations ?? [];

  return (
    <main style={screenStyle}>

      <AppBar title="추천 결과" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 18px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="auto_awesome" size={20} color={colors.tertiaryContainer} />
          <span style={{ fontSize: 13, color: colors.secondary }}>
            AI가 {data.participant_count}명의 일정을 분석했어요
          </span>
        </div>

        {!isCreator && (
          <p style={{ marginTop: 8, fontSize: 12, color: colors.outline }}>
            일정 확정은 모임장만 할 수 있어요.
          </p>
        )}

        {confirmError && (
          <p role="alert" style={{ marginTop: 8, fontSize: 12, color: colors.error }}>{confirmError}</p>
        )}

        <ol style={{ listStyle: 'none' }}>
          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.recommendation_id}
              rec={rec}
              isFirst={index === 0}
              canConfirm={isCreator}
              isConfirming={confirmingId === rec.recommendation_id}
              disabled={confirmingId !== null}
              onConfirm={handleConfirm}
            />
          ))}
        </ol>

      </div>
    </main>
  );
}
