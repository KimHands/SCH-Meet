import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, screenStyle, inputStyle, iconButtonStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import ErrorBanner from '../components/ErrorBanner';
import { useToast } from '../hooks/useToast';
import { getSchedules, addSchedule, deleteSchedule, DAY_MAP } from '../api/schedule';
import { consumeRedirectPath } from '../utils/redirect';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const smallLabelStyle = { display: 'block', fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant };
const smallInputStyle = (hasError) => ({ ...inputStyle(hasError), marginTop: 6, height: 42, paddingLeft: 12, paddingRight: 12, fontSize: 13 });

// 백엔드 응답 → 화면에 표시할 형식으로 변환
const formatSchedule = (s) => {
  const dayLabels = (s.repeat_days || [])
    .map((d) => Object.keys(DAY_MAP).find((k) => DAY_MAP[k] === d) || d)
    .join(', ');
  return {
    id: s.id,
    title: s.title,
    when: `매주 ${dayLabels} ${s.start_time} ~ ${s.end_time}`,
  };
};

function validateSchedule({ title, selectedDays, startTime, endTime }) {
  if (!title.trim()) return '일정 제목을 입력해주세요.';
  if (selectedDays.length === 0) return '반복 요일을 하나 이상 선택해주세요.';
  if (!startTime || !endTime) return '시작 시간과 종료 시간을 모두 입력해주세요.';
  if (startTime >= endTime) return '종료 시간은 시작 시간보다 늦어야 해요.';
  return '';
}

// 이전 화면에서 navigate state 로 넘긴 토스트를 한 번만 표시
function useToastFromNavigation(showToast) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const message = location.state?.toast;
    if (!message) return;
    showToast(message);
    navigate('.', { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function DayPicker({ selectedDays, onToggle }) {
  return (
    <div role="group" aria-labelledby="repeat-days-label" style={{ marginTop: 8, display: 'flex', gap: 6 }}>
      {DAYS.map((d, i) => {
        const on = selectedDays.includes(i);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onToggle(i)}
            aria-pressed={on}
            aria-label={`${d}요일`}
            style={{
              flex: 1, aspectRatio: '1', borderRadius: 9999,
              border: `1px solid ${on ? colors.primary : colors.outlineVariant}`,
              backgroundColor: on ? colors.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: '600', color: on ? colors.onPrimary : colors.secondary,
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function ScheduleItem({ schedule, deleting, onDelete }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 11,
      backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`,
      borderRadius: 12, paddingTop: 11, paddingBottom: 11, paddingLeft: 13, paddingRight: 13,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryFixed, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="event" size={18} color={colors.primary} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>{schedule.title}</p>
        <p style={{ fontSize: 11, color: colors.outline, marginTop: 1 }}>{schedule.when}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`${schedule.title} 일정 삭제`}
        style={{ ...iconButtonStyle, padding: 6, opacity: deleting ? 0.5 : 1 }}
      >
        <Icon name="delete" size={18} color={colors.error} />
      </button>
    </li>
  );
}

export default function FixedSchedulePage() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [selectedDays, setSelectedDays] = useState([]);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formError, setFormError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useToastFromNavigation(showToast);

  const loadSchedules = useCallback(() => {
    setListLoading(true);
    setListError('');
    getSchedules()
      .then((data) => setSavedList((data ?? []).map(formatSchedule)))
      .catch((e) => setListError(e.message || '등록된 일정을 불러오지 못했어요.'))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(loadSchedules, [loadSchedules]);

  const toggleDay = (index) => {
    setSelectedDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
    );
  };

  const resetForm = () => {
    setTitle(''); setStartTime(''); setEndTime(''); setSelectedDays([]);
  };

  const handleAdd = async () => {
    const validationError = validateSchedule({ title, selectedDays, startTime, endTime });
    setFormError(validationError);
    if (validationError) return;

    setAddLoading(true);
    try {
      const newSchedule = await addSchedule({
        title: title.trim(),
        repeat_days: [...selectedDays].sort().map((i) => DAY_MAP[DAYS[i]]),
        start_time: startTime,
        end_time: endTime,
      });
      setSavedList((prev) => [formatSchedule(newSchedule), ...prev]);
      resetForm();
      showToast('일정이 추가되었어요.');
    } catch (e) {
      setFormError(e.message || '일정 추가 중 오류가 발생했습니다.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (schedule) => {
    if (!window.confirm(`'${schedule.title}' 일정을 삭제할까요?`)) return;
    setDeletingId(schedule.id);
    try {
      await deleteSchedule(schedule.id);
      setSavedList((prev) => prev.filter((item) => item.id !== schedule.id));
      showToast('일정이 삭제되었어요.');
    } catch (e) {
      showToast(e.message || '일정 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStart = () => navigate(consumeRedirectPath() ?? '/home');

  const timeFields = [
    { id: 'schedule-start', label: '시작 시간', value: startTime, onChange: setStartTime },
    { id: 'schedule-end',   label: '종료 시간', value: endTime,   onChange: setEndTime },
  ];

  return (
    <main style={screenStyle}>
      <Toast message={toast} />

      <AppBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>

        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', lineHeight: '30px', letterSpacing: '-0.22px', color: colors.onSurface }}>
          고정 일정을 추가해주세요
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          알바, 동아리, 개인 일정 등<br />매주 반복되는 일정을 등록할 수 있어요.
        </p>

        {/* 일정 추가 카드 */}
        <section aria-labelledby="add-schedule-title" style={{ marginTop: 16, backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="add_circle" size={18} color={colors.primary} />
            <h2 id="add-schedule-title" style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>일정 추가</h2>
          </div>

          <label htmlFor="schedule-title" style={{ ...smallLabelStyle, marginTop: 14 }}>일정 제목</label>
          <input
            id="schedule-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 알바"
            style={smallInputStyle(false)}
          />

          <p id="repeat-days-label" style={{ ...smallLabelStyle, marginTop: 14 }}>반복 요일</p>
          <DayPicker selectedDays={selectedDays} onToggle={toggleDay} />

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {timeFields.map(({ id, label, value, onChange }) => (
              <div key={id} style={{ flex: 1 }}>
                <label htmlFor={id} style={smallLabelStyle}>{label}</label>
                <input id={id} type="time" value={value} onChange={(e) => onChange(e.target.value)} style={smallInputStyle(false)} />
              </div>
            ))}
          </div>
          {formError && <p role="alert" style={{ marginTop: 8, fontSize: 12, color: colors.error }}>{formError}</p>}

          <Button
            variant="secondary"
            label={addLoading ? '추가 중...' : '추가하기'}
            onClick={handleAdd}
            disabled={addLoading}
            height={44} fontSize={13}
            style={{ width: '100%', marginTop: 14 }}
          />
        </section>

        {/* 등록된 일정 목록 */}
        <h2 style={{ marginTop: 16, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>등록된 일정</h2>
        {listError && <ErrorBanner message={listError} onRetry={loadSchedules} style={{ marginTop: 8 }} />}
        {listLoading && <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', marginTop: 12 }}>불러오는 중...</p>}
        {!listLoading && !listError && savedList.length === 0 && (
          <p style={{ fontSize: 13, color: colors.outline, textAlign: 'center', marginTop: 12 }}>
            등록된 고정 일정이 없어요
          </p>
        )}
        <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
          {savedList.map((s) => (
            <ScheduleItem
              key={s.id}
              schedule={s}
              deleting={deletingId === s.id}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </ul>

      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button label="시작하기" onClick={handleStart} height={52} fontSize={15} style={{ flex: 1.6 }} />
      </div>

    </main>
  );
}
