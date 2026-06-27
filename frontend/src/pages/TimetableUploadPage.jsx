import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { uploadTimetableUrl } from '../api/timetable';

export default function TimetableUploadPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlOk, setUrlOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 확인 버튼: URL 형식 체크 후 바로 API 호출
  const handleUrlCheck = async () => {
    if (!url.trim()) { setUrlError('URL을 입력해주세요.'); setUrlOk(false); return; }

    setLoading(true);
    setUrlError('');
    try {
      const data = await uploadTimetableUrl(url.trim());
      setUrlOk(true);
      showToast(`✓ 시간표 ${data.parsed_classes_count}개 수업이 등록되었습니다.`);
    } catch (e) {
      setUrlError(e.message || '올바른 에브리타임 공유 URL 주소를 입력해 주세요.');
      setUrlOk(false);
    } finally {
      setLoading(false);
    }
  };

  // 다음 버튼: URL 업로드 안 했어도 넘어갈 수 있음
  const handleNext = () => {
    if (!urlOk) {
      showToast('시간표를 등록하지 않고 넘어갑니다.');
    }
    navigate('/add-schedule');
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 토스트 메시지 */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: colors.onSurface, color: '#fff',
          padding: '10px 18px', borderRadius: 99,
          fontSize: 13, fontWeight: '500',
          zIndex: 999, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <AppBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>

        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', lineHeight: '30px', letterSpacing: '-0.22px', color: colors.onSurface }}>
          에브리타임 시간표를<br />업로드해주세요
        </h1>
        <p style={{ marginTop: 10, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          에브리타임 URL을 입력하면<br />자동으로 시간표가 등록됩니다.
        </p>

        {/* 이미지 업로드 (미구현 안내) */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="image" size={18} color={colors.outline} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.outline }}>이미지 업로드</span>
          <span style={{ fontSize: 11, color: colors.outline, backgroundColor: colors.surfaceContainerLow, borderRadius: 99, paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}>준비중</span>
        </div>
        <div style={{
          marginTop: 10,
          border: `1.5px dashed ${colors.surfaceContainerHighest}`,
          borderRadius: 16,
          backgroundColor: colors.surfaceContainerLow,
          paddingTop: 22, paddingBottom: 22,
          paddingLeft: 16, paddingRight: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: 0.5,
        }}>
          <Icon name="cloud_upload" size={34} color={colors.outline} />
          <p style={{ textAlign: 'center', fontSize: 13, lineHeight: '18px', color: colors.outline }}>
            이미지 업로드는 준비 중입니다
          </p>
          <span style={{ fontSize: 11, color: colors.outline }}>JPG, PNG, HEIC 파일 (최대 30MB)</span>
        </div>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>또는</span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
        </div>

        {/* URL 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="link" size={18} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>에브리타임 시간표 URL 복사</span>
        </div>
        <p style={{ marginTop: 7, marginBottom: 10, fontSize: 12, lineHeight: '17px', color: colors.secondary }}>
          에브리타임 앱에서 시간표를 공유하고<br />생성된 URL을 붙여넣어 주세요.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlOk(false); setUrlError(''); }}
            placeholder="URL을 붙여넣어 주세요"
            style={{
              flex: 1, height: 44,
              border: `1px solid ${urlError ? colors.error : urlOk ? colors.primary : colors.outlineVariant}`,
              borderRadius: 8, backgroundColor: '#fff',
              paddingLeft: 13, paddingRight: 13,
              fontSize: 13, color: colors.onSurface,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              outline: 'none',
            }}
          />
          <Button
            label={loading ? '확인 중...' : '확인'}
            onClick={handleUrlCheck}
            height={44} fontSize={12}
            style={{ paddingLeft: 14, paddingRight: 14, opacity: loading ? 0.6 : 1 }}
          />
        </div>
        {urlError && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{urlError}</p>}
        {urlOk && <p style={{ marginTop: 4, fontSize: 12, color: colors.primary }}>✓ 시간표가 등록되었습니다.</p>}

        {/* TIP 박스 */}
        <div style={{
          marginTop: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
          paddingTop: 11, paddingBottom: 11, paddingLeft: 14, paddingRight: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="tips_and_updates" size={16} color={colors.tertiaryContainer} />
            <span style={{ fontSize: 12, fontWeight: '500', color: colors.secondary }}>TIP</span>
          </div>
          <Button variant="outline" label="URL 찾는 방법" height={32} fontSize={12} style={{ paddingLeft: 14, paddingRight: 14 }} />
        </div>

      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button label="다음" onClick={handleNext} height={52} fontSize={15} style={{ flex: 1.6 }} />
      </div>

    </div>
  );
}
