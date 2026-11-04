import { useState } from 'react';
import { colors, iconButtonStyle } from '../styles/theme';
import { DAY_MAP } from '../api/schedule';
import ErrorBanner from './ErrorBanner';
import Icon from './Icon';

const dayLabel = (dayCode) => Object.keys(DAY_MAP).find((label) => DAY_MAP[label] === dayCode) ?? dayCode;

const describeClass = ({ day, start_time, end_time, place }) => {
  const when = `${dayLabel(day)} ${start_time} ~ ${end_time}`;
  return place ? `${when} · ${place}` : when;
};

function ClassRow({ item, deleting, onDelete }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 11,
      backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`,
      borderRadius: 12, paddingTop: 10, paddingBottom: 10, paddingLeft: 13, paddingRight: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>{item.name}</p>
        <p style={{ fontSize: 11, color: colors.outline, marginTop: 1 }}>{describeClass(item)}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`${item.name} ${dayLabel(item.day)}요일 ${item.start_time} 시간 삭제`}
        style={{ ...iconButtonStyle, padding: 6, opacity: deleting ? 0.5 : 1 }}
      >
        <Icon name="delete" size={18} color={colors.error} />
      </button>
    </li>
  );
}

export default function RegisteredClasses({ classes, loading, loadError, onRetry, onRemoveOne, onRemoveAll, onError }) {
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const handleRemoveOne = async (item) => {
    if (!window.confirm(`'${item.name}' ${dayLabel(item.day)} ${item.start_time} ~ ${item.end_time} 시간을 삭제할까요?`)) return;
    setDeletingId(item.id);
    try {
      await onRemoveOne(item.id);
    } catch (e) {
      onError(e.message || '수업 삭제 중 오류가 발생했어요.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveAll = async () => {
    if (!window.confirm(`등록된 수업 시간 ${classes.length}개를 모두 삭제할까요?`)) return;
    setDeletingAll(true);
    try {
      await onRemoveAll();
    } catch (e) {
      onError(e.message || '수업 삭제 중 오류가 발생했어요.');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <section aria-labelledby="registered-classes-title" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id="registered-classes-title" style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>
          등록된 수업 시간{classes.length > 0 ? ` ${classes.length}개` : ''}
        </h2>
        {classes.length > 0 && (
          <button
            type="button"
            onClick={handleRemoveAll}
            disabled={deletingAll}
            style={{ fontSize: 12, fontWeight: '500', color: colors.error, padding: '4px 6px', opacity: deletingAll ? 0.5 : 1 }}
          >
            {deletingAll ? '삭제 중...' : '전체 삭제'}
          </button>
        )}
      </div>

      {loadError && <ErrorBanner message={loadError} onRetry={onRetry} style={{ marginTop: 8 }} />}
      {loading && <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', marginTop: 12 }}>불러오는 중...</p>}
      {!loading && !loadError && classes.length === 0 && (
        <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', marginTop: 12 }}>
          아직 등록된 수업이 없어요
        </p>
      )}

      <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
        {classes.map((item) => (
          <ClassRow
            key={item.id}
            item={item}
            deleting={deletingAll || deletingId === item.id}
            onDelete={() => handleRemoveOne(item)}
          />
        ))}
      </ul>
    </section>
  );
}
