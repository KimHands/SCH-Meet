import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const SAVED = [
  { icon: 'work', bg: colors.primaryFixed, fg: colors.primary, title: '알바', when: '매주 월 18:00 ~ 23:00' },
  { icon: 'groups', bg: colors.tertiaryFixed, fg: colors.tertiaryContainer, title: '동아리', when: '매주 화 19:00 ~ 21:00' },
];

export default function FixedSchedulePage() {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState([0]); // 월요일 기본 선택
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [savedList, setSavedList] = useState(SAVED);

  const handleAdd = () => {
    if (!title.trim() || !startTime || !endTime) return;
    if (startTime >= endTime) { setTimeError('종료 시간은 시작 시간보다 늦어야 해요.'); return; }
    setTimeError('');
    const days = selectedDays.map((d) => DAYS[d]).join(', ');
    setSavedList((prev) => [...prev, {
      icon: 'event', bg: colors.secondaryContainer, fg: colors.secondary,
      title, when: `매주 ${days} ${startTime} ~ ${endTime}`,
    }]);
    setTitle(''); setStartTime(''); setEndTime(''); setSelectedDays([]);
  };

  const handleDelete = (index) => {
    setSavedList((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (index) => {
    setSelectedDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
    );
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>

        {/* 제목 */}
        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', lineHeight: '30px', letterSpacing: '-0.22px', color: colors.onSurface }}>
          고정 일정을 추가해주세요
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          알바, 동아리, 개인 일정 등<br />매주 반복되는 일정을 등록할 수 있어요.
        </p>

        {/* 일정 추가 카드 */}
        <div style={{
          marginTop: 16,
          backgroundColor: '#fff',
          border: `1px solid ${colors.surfaceContainerHighest}`,
          borderRadius: 16,
          padding: 16,
        }}>
          {/* 카드 타이틀 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="add_circle" size={18} color={colors.primary} />
            <span style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>일정 추가</span>
          </div>

          {/* 일정 제목 입력 */}
          <p style={{ marginTop: 14, fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant }}>일정 제목</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 알바"
            style={{
              marginTop: 6, width: '100%', height: 42,
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: 8, paddingLeft: 12, paddingRight: 12,
              fontSize: 13, color: colors.onSurface,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              outline: 'none', boxSizing: 'border-box',
              backgroundColor: '#fff',
            }}
          />

          {/* 반복 요일 */}
          <p style={{ marginTop: 14, fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant }}>반복 요일</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            {DAYS.map((d, i) => {
              const on = selectedDays.includes(i);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  style={{
                    flex: 1, aspectRatio: '1',
                    borderRadius: 9999,
                    border: `1px solid ${on ? colors.primary : colors.outlineVariant}`,
                    backgroundColor: on ? colors.primary : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: '600', color: on ? colors.onPrimary : colors.secondary }}>
                    {d}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 시작/종료 시간 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {[{ label: '시작 시간', value: startTime, onChange: setStartTime },
              { label: '종료 시간', value: endTime, onChange: setEndTime }].map(({ label, value, onChange }) => (
              <div key={label} style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant }}>{label}</p>
                <input
                  type="time"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  style={{
                    marginTop: 6, width: '100%', height: 42,
                    border: `1px solid ${timeError ? colors.error : colors.outlineVariant}`,
                    borderRadius: 8, paddingLeft: 12, paddingRight: 12,
                    fontSize: 13, color: colors.onSurface,
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    outline: 'none', boxSizing: 'border-box',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            ))}
          </div>
          {timeError && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{timeError}</p>}

          {/* 추가하기 버튼 */}
          <Button variant="secondary" label="추가하기" onClick={handleAdd} height={44} fontSize={13} style={{ width: '100%', marginTop: 14 }} />
        </div>

        {/* 등록된 일정 목록 */}
        <p style={{ marginTop: 16, fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant }}>등록된 일정</p>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {savedList.map((s, index) => (
            <div key={index} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              backgroundColor: '#fff',
              border: `1px solid ${colors.surfaceContainerHighest}`,
              borderRadius: 12,
              paddingTop: 11, paddingBottom: 11,
              paddingLeft: 13, paddingRight: 13,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={18} color={s.fg} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>{s.title}</p>
                <p style={{ fontSize: 11, color: colors.outline, marginTop: 1 }}>{s.when}</p>
              </div>
              <Icon name="edit" size={18} color={colors.outline} />
              <button
                onClick={() => handleDelete(index)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              >
                <Icon name="delete" size={18} color={colors.error} />
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button label="시작하기" onClick={() => navigate('/')} height={52} fontSize={15} style={{ flex: 1.6 }} />
      </div>

    </div>
  );
}