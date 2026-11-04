import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, screenStyle, inputStyle, fieldLabelStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { createMeeting } from '../api/meetings';
import { DEFAULT_DURATION_MINUTES, DURATION_OPTIONS, formatDuration } from '../utils/duration';

const PURPOSE_OPTIONS = ['조용한 회의', '스터디', '조별 과제', '친목 모임', '기타'];
const CAPACITY_OPTIONS = ['2명', '3명', '4명', '5명', '6명', '7명', '8명 이상'];
const DURATION_SELECT_OPTIONS = DURATION_OPTIONS.map((minutes) => ({
  value: String(minutes),
  label: formatDuration(minutes),
}));

const toOptions = (labels) => labels.map((label) => ({ value: label, label }));

function FieldError({ id, message }) {
  if (!message) return null;
  return <p id={id} style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{message}</p>;
}

// 네이티브 select — 키보드·스크린리더 기본 지원
function SelectField({ label, placeholder, options, value, onChange, error }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} style={fieldLabelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          style={{
            ...inputStyle(!!error),
            appearance: 'none',
            paddingRight: 40,
            color: value ? colors.onSurface : colors.outline,
            cursor: 'pointer',
          }}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Icon
          name="expand_more"
          size={20}
          color={colors.outline}
          style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none' }}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, error, ariaLabel }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      {label && <label htmlFor={id} style={fieldLabelStyle}>{label}</label>}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        style={inputStyle(!!error)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function validateForm({ name, purpose, customPurpose, capacity }) {
  const errors = {};
  if (!name.trim()) errors.name = '모임 이름을 입력해주세요.';
  if (name.length > 20) errors.name = '모임 이름은 20자 이내로 입력해주세요.';
  if (!purpose) errors.purpose = '모임 목적을 선택해주세요.';
  if (purpose === '기타' && !customPurpose.trim()) errors.customPurpose = '목적을 직접 입력해주세요.';
  if (!capacity) errors.capacity = '정원을 선택해주세요.';
  return errors;
}

export default function CreateMeetingPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [capacity, setCapacity] = useState('');
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const newErrors = validateForm({ name, purpose, customPurpose, capacity });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const result = await createMeeting({
        name: name.trim(),
        purpose: purpose === '기타' ? customPurpose.trim() : purpose,
        desired_time: time.trim(),
        desired_location: place.trim(),
        capacity: parseInt(capacity.replace(/[^0-9]/g, ''), 10), // "8명 이상" → 8
        duration_minutes: Number(duration),
      });
      navigate(`/meetings/${result.meeting_id}`);
    } catch (e) {
      setErrors({ submit: e.message });
      setLoading(false);
    }
  };

  return (
    <main style={screenStyle}>

      <AppBar title="모임 만들기" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <InputField
          label="모임 이름"
          placeholder="예) 중간발표 준비"
          value={name}
          onChange={setName}
          error={errors.name}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SelectField
            label="모임 목적"
            placeholder="목적을 선택하세요"
            options={toOptions(PURPOSE_OPTIONS)}
            value={purpose}
            onChange={(val) => { setPurpose(val); setCustomPurpose(''); }}
            error={errors.purpose}
          />
          {purpose === '기타' && (
            <InputField
              ariaLabel="모임 목적 직접 입력"
              placeholder="목적을 직접 입력해주세요"
              value={customPurpose}
              onChange={setCustomPurpose}
              error={errors.customPurpose}
            />
          )}
        </div>

        <SelectField
          label="모임 소요 시간"
          options={DURATION_SELECT_OPTIONS}
          value={duration}
          onChange={setDuration}
        />

        <InputField
          label="희망 시간"
          placeholder="예) 오후 8시, 주중 저녁 등"
          value={time}
          onChange={setTime}
        />

        <InputField
          label="희망 장소"
          placeholder="예) 학생회관 1층 회의실, 카페 등"
          value={place}
          onChange={setPlace}
        />

        <SelectField
          label="정원"
          placeholder="정원을 선택하세요"
          options={toOptions(CAPACITY_OPTIONS)}
          value={capacity}
          onChange={setCapacity}
          error={errors.capacity}
        />

      </div>

      <div style={{ padding: '14px 20px 18px' }}>
        {errors.submit && (
          <p role="alert" style={{ marginBottom: 8, fontSize: 12, color: colors.error, textAlign: 'center' }}>{errors.submit}</p>
        )}
        <Button
          label={loading ? '생성 중...' : '초대 링크 생성'}
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%' }}
        />
      </div>

    </main>
  );
}
