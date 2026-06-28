import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import { confirmTimetableImage } from '../api/timetable';

const DAY_OPTIONS = [
  { code: 'MON', label: '월' }, { code: 'TUE', label: '화' },
  { code: 'WED', label: '수' }, { code: 'THU', label: '목' },
  { code: 'FRI', label: '금' }, { code: 'SAT', label: '토' },
  { code: 'SUN', label: '일' },
];

const EMPTY_ROW = { name: '', day: 'MON', start_time: '09:00', end_time: '10:00', place: '', professor: '' };

export default function TimetablePreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.parsedClasses || [];
  const warnings = location.state?.warnings || [];

  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);

  const handleConfirm = async () => {
    setError('');
    for (const row of rows) {
      if (!row.name.trim()) { setError('과목명을 모두 입력해주세요.'); return; }
      if (row.end_time <= row.start_time) { setError('종료 시간이 시작보다 빨라요.'); return; }
    }
    setSaving(true);
    try {
      const data = await confirmTimetableImage(rows);
      navigate('/add-schedule', {
        state: { toast: `시간표 ${data.parsed_classes_count}개 수업이 등록되었습니다.` },
      });
    } catch (e) {
      setError(e.message || '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: `1px solid ${colors.outlineVariant}`, borderRadius: 8,
    padding: '8px 10px', fontSize: 13, color: colors.onSurface,
    fontFamily: "'Be Vietnam Pro', sans-serif", outline: 'none', backgroundColor: '#fff',
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>
      <AppBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>
          인식 결과를 확인해주세요
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          잘못 인식된 과목은 수정하거나 삭제할 수 있어요.
        </p>

        {warnings.length > 0 && (
          <div style={{
            marginTop: 12, backgroundColor: colors.surfaceContainerLow,
            borderRadius: 12, padding: '10px 14px',
          }}>
            {warnings.map((w, i) => (
              <p key={i} style={{ fontSize: 12, lineHeight: '17px', color: colors.warning }}>• {w}</p>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row, index) => (
            <div key={index} style={{
              border: `1px solid ${colors.outlineVariant}`, borderRadius: 12,
              padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="과목명"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  style={{ border: 'none', background: 'none', color: colors.error, fontSize: 13, cursor: 'pointer' }}
                >삭제</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={row.day}
                  onChange={(e) => updateRow(index, 'day', e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {DAY_OPTIONS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
                <input
                  type="time"
                  value={row.start_time}
                  onChange={(e) => updateRow(index, 'start_time', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="time"
                  value={row.end_time}
                  onChange={(e) => updateRow(index, 'end_time', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          style={{
            marginTop: 12, width: '100%', border: `1.5px dashed ${colors.outlineVariant}`,
            borderRadius: 12, padding: '12px', backgroundColor: 'transparent',
            color: colors.primary, fontSize: 13, fontWeight: '600', cursor: 'pointer',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >+ 수업 추가</button>

        {error && <p style={{ marginTop: 10, fontSize: 12, color: colors.error }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button
          label={saving ? '저장 중...' : '확정'}
          onClick={handleConfirm}
          disabled={saving}
          height={52} fontSize={15} style={{ flex: 1.6 }}
        />
      </div>
    </div>
  );
}
