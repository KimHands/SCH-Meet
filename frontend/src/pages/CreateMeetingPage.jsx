import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

const PURPOSE_OPTIONS = ['조용한 회의', '스터디', '조별 과제', '친목 모임', '기타'];
const CAPACITY_OPTIONS = ['2명', '3명', '4명', '5명', '6명', '7명', '8명 이상'];

// 드롭다운 컴포넌트
function Dropdown({ label, placeholder, options, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>{label}</p>
      <div
        onClick={() => setOpen(!open)}
        style={{
          height: 48,
          border: `1px solid ${error ? colors.error : open ? colors.primary : colors.outlineVariant}`,
          borderRadius: 8,
          paddingLeft: 14, paddingRight: 14,
          backgroundColor: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, color: value ? colors.onSurface : colors.outline }}>
          {value || placeholder}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={20} color={colors.outline} />
      </div>
      {error && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{error}</p>}

      {open && (
        <div style={{
          position: 'absolute', top: 54, left: 0, right: 0,
          backgroundColor: '#fff',
          border: `1px solid ${colors.outlineVariant}`,
          borderRadius: 8,
          zIndex: 100,
          boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          {options.map((opt, i) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '13px 14px',
                fontSize: 14,
                color: value === opt ? colors.primary : colors.onSurface,
                fontWeight: value === opt ? '600' : '400',
                backgroundColor: value === opt ? colors.primaryFixed : '#fff',
                borderBottom: i < options.length - 1 ? `1px solid ${colors.surfaceContainerLow}` : 'none',
                cursor: 'pointer',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 일반 텍스트 입력 필드
function InputField({ label, placeholder, value, onChange, error }) {
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 48,
          border: `1px solid ${error ? colors.error : colors.outlineVariant}`,
          borderRadius: 8,
          paddingLeft: 14, paddingRight: 14,
          fontSize: 14, color: colors.onSurface,
          fontFamily: "'Be Vietnam Pro', sans-serif",
          outline: 'none', boxSizing: 'border-box',
          backgroundColor: '#fff',
        }}
      />
      {error && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{error}</p>}
    </div>
  );
}

export default function CreateMeetingPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = '모임 이름을 입력해주세요.';
    if (name.length > 20) newErrors.name = '모임 이름은 20자 이내로 입력해주세요.';
    if (!purpose) newErrors.purpose = '모임 목적을 선택해주세요.';
    if (purpose === '기타' && !customPurpose.trim()) newErrors.customPurpose = '목적을 직접 입력해주세요.';
    if (!capacity) newErrors.capacity = '정원을 선택해주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) navigate('/meetings/1');
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      <AppBar title="모임 만들기" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <InputField
          label="모임 이름"
          placeholder="예) 중간발표 준비"
          value={name}
          onChange={setName}
          error={errors.name}
        />

        <div>
          <Dropdown
            label="모임 목적"
            placeholder="목적을 선택하세요"
            options={PURPOSE_OPTIONS}
            value={purpose}
            onChange={(val) => { setPurpose(val); setCustomPurpose(''); }}
            error={errors.purpose}
          />
          {purpose === '기타' && (
            <input
              value={customPurpose}
              onChange={(e) => setCustomPurpose(e.target.value)}
              placeholder="목적을 직접 입력해주세요"
              style={{
                marginTop: 8,
                width: '100%', height: 48,
                border: `1px solid ${errors.customPurpose ? colors.error : colors.outlineVariant}`,
                borderRadius: 8,
                paddingLeft: 14, paddingRight: 14,
                fontSize: 14, color: colors.onSurface,
                fontFamily: "'Be Vietnam Pro', sans-serif",
                outline: 'none', boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            />
          )}
          {errors.customPurpose && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{errors.customPurpose}</p>}
        </div>

        <InputField
          label="희망 시간"
          placeholder="예) 오후 8시, 주중 저녁 등"
          value={time}
          onChange={setTime}
        />

        {/* 희망 장소 */}
        <div>
          <p style={{ fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 7 }}>희망 장소</p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예) 학생회관 1층 회의실, 카페 등"
            style={{
              width: '100%', height: 48,
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: 8,
              paddingLeft: 14, paddingRight: 14,
              fontSize: 14, color: colors.onSurface,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              outline: 'none', boxSizing: 'border-box',
              backgroundColor: '#fff',
            }}
          />
          <Button variant="secondary" height={46} fontSize={13} style={{ width: '100%', marginTop: 8 }}>
            <Icon name="my_location" size={18} color={colors.primary} />
            <span style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>위치 좌표로 선택하기</span>
          </Button>
        </div>

        <Dropdown
          label="정원"
          placeholder="정원을 선택하세요"
          options={CAPACITY_OPTIONS}
          value={capacity}
          onChange={setCapacity}
          error={errors.capacity}
        />

      </div>

      <div style={{ padding: '14px 20px 18px' }}>
        <Button label="초대 링크 생성" onClick={handleSubmit} style={{ width: '100%' }} />
      </div>

    </div>
  );
}
