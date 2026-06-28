import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { getRecommendations, confirmMeeting } from '../api/meetings';

const DAY_LABEL = { MON: '월요일', TUE: '화요일', WED: '수요일', THU: '목요일', FRI: '금요일', SAT: '토요일', SUN: '일요일' };

export default function AiResultPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRecommendations(id)
      .then(setData)
      .catch(() => setError('추천 결과를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async (recommendationId) => {
    setConfirmingId(recommendationId);
    try {
      await confirmMeeting(id, recommendationId);
      navigate(`/meetings/${id}/confirmed`);
    } catch (e) {
      setError(e.message || '확정 중 오류가 발생했어요.');
      setConfirmingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  // 추천 불가 상태
  if (!data?.can_recommend) {
    const reason = data?.reason === 'LACK_OF_PARTICIPANTS'
      ? '참여자가 2명 이상이어야 추천이 가능해요.'
      : '모든 참여자의 공통 가능 시간대가 없어요.';
    return (
      <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>
        <AppBar title="추천 결과" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px' }}>
          <Icon name="event_busy" size={52} color={colors.outlineVariant} />
          <p style={{ fontSize: 16, fontWeight: '600', color: colors.onSurfaceVariant, textAlign: 'center' }}>추천 가능한 시간이 없어요</p>
          <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', lineHeight: '19px' }}>{reason}</p>
          <Button variant="outline" label="돌아가기" onClick={() => navigate(-1)} height={44} fontSize={14} style={{ paddingLeft: 24, paddingRight: 24 }} />
        </div>
      </div>
    );
  }

  const recommendations = data.recommendations ?? [];

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <AppBar title="추천 결과" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 18px' }}>

        {/* AI 분석 안내 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="auto_awesome" size={20} color={colors.tertiaryContainer} />
          <span style={{ fontSize: 13, color: colors.secondary }}>
            AI가 {data.participant_count}명의 일정을 분석했어요
          </span>
        </div>

        {error && (
          <p style={{ marginTop: 8, fontSize: 12, color: colors.error }}>{error}</p>
        )}

        {recommendations.map((rec, index) => {
          const isFirst = index === 0;
          const dayLabel = DAY_LABEL[rec.day] ?? rec.day_label ?? rec.day;
          const isConfirming = confirmingId === rec.recommendation_id;

          return (
            <div
              key={rec.recommendation_id}
              style={{
                marginTop: 14,
                backgroundColor: '#fff',
                border: `${isFirst ? 2 : 1}px solid ${isFirst ? colors.primary : colors.surfaceContainerHighest}`,
                borderRadius: 18,
                padding: 18,
                boxShadow: isFirst ? '0px 6px 18px rgba(0,25,69,0.10)' : 'none',
              }}
            >
              {/* 순위 배지 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  backgroundColor: isFirst ? colors.primary : colors.surfaceContainerHigh,
                  paddingTop: 5, paddingBottom: 5,
                  paddingLeft: 12, paddingRight: 12,
                  borderRadius: 99,
                }}>
                  <span style={{ fontSize: 12, fontWeight: '700', color: isFirst ? '#fff' : colors.secondary }}>
                    {rec.rank}순위
                  </span>
                </div>
                {isFirst && <Icon name="workspace_premium" size={22} color={colors.primary} />}
              </div>

              {/* 시간 */}
              <p style={{ marginTop: 14, fontSize: isFirst ? 22 : 20, fontWeight: '700', color: isFirst ? colors.primary : colors.onSurface }}>
                {dayLabel} {rec.start_time} ~ {rec.end_time}
              </p>
              <p style={{ marginTop: 2, fontSize: 12, color: colors.outline }}>{rec.duration_minutes}분</p>

              {/* 이유 */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(rec.reason_bullets ?? []).map((reason, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="check_circle" size={17} color={colors.success ?? colors.primary} />
                    <span style={{ fontSize: 13, color: colors.onSurface }}>{reason}</span>
                  </div>
                ))}
              </div>

              {/* 확정 버튼 (모임장만 — 1순위에만 표시하거나 전부 표시 가능, 여기선 전부 표시) */}
              <Button
                label={isConfirming ? '확정 중...' : '이 시간으로 확정'}
                onClick={() => handleConfirm(rec.recommendation_id)}
                height={48} fontSize={14}
                style={{ width: '100%', marginTop: 16, opacity: isConfirming ? 0.6 : 1 }}
              />
            </div>
          );
        })}

      </div>
    </div>
  );
}
