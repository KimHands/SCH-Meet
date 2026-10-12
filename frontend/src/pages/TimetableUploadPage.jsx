import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, screenStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { uploadTimetableUrl, uploadTimetableImage } from '../api/timetable';

const MAX_IMAGE_BYTES = 1024 * 1024;
const URL_HINT = '올바른 에브리타임 공유 URL 주소를 입력해 주세요.';

function useCloseOnEscape(onClose) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
}

function UrlGuideModal({ onClose }) {
  useCloseOnEscape(onClose);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="url-guide-title" style={{
        width: '100%', maxWidth: 480,
        backgroundColor: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px 36px',
        boxSizing: 'border-box',
      }} onClick={e => e.stopPropagation()}>

        {/* 핸들 */}
        <div style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: colors.outlineVariant, margin: '0 auto 20px' }} />

        <h2 id="url-guide-title" style={{ fontSize: 17, fontWeight: '700', color: colors.onSurface, marginBottom: 20 }}>
          에브리타임 URL 찾는 방법
        </h2>

        {/* Step 1 */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 99,
            backgroundColor: colors.primary, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>1</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: '600', color: colors.onSurface, marginBottom: 3 }}>
              시간표 탭 진입
            </p>
            <p style={{ fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
              에브리타임 앱 하단의 <b>시간표</b> 탭을 누른 뒤,{' '}
              우측 상단 <b>톱니바퀴 버튼</b>을 클릭하세요.
            </p>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ width: 2, height: 16, backgroundColor: colors.outlineVariant, marginLeft: 13, marginBottom: 20 }} />

        {/* Step 2 */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 99,
            backgroundColor: colors.primary, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>2</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: '600', color: colors.onSurface, marginBottom: 3 }}>
              URL 복사
            </p>
            <p style={{ fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
              메뉴에서 <b>URL 복사</b>를 탭하면 공유 링크가{' '}
              클립보드에 복사됩니다. 복사한 URL을 위 입력창에 붙여넣어 주세요.
            </p>
          </div>
        </div>

        <Button label="확인" onClick={onClose} style={{ width: '100%' }} height={50} fontSize={15} />
      </div>
    </div>
  );
}

export default function TimetableUploadPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlOk, setUrlOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { toast, showToast } = useToast();

  const fileInputRef = useRef(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';            // 같은 파일 재선택 허용
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      showToast('이미지는 1MB 이하만 가능합니다.');
      return;
    }
    setImageLoading(true);
    try {
      const data = await uploadTimetableImage(file);
      navigate('/upload-timetable/preview', {
        state: { parsedClasses: data.parsed_classes, warnings: data.warnings },
      });
    } catch (err) {
      showToast(err.message || '이미지 인식에 실패했어요.');
    } finally {
      setImageLoading(false);
    }
  };

  // 확인 버튼: URL 형식 체크 후 바로 API 호출
  const handleUrlCheck = async () => {
    if (loading) return;
    if (!url.trim()) { setUrlError('URL을 입력해주세요.'); setUrlOk(false); return; }

    setLoading(true);
    setUrlError('');
    try {
      const data = await uploadTimetableUrl(url.trim());
      setUrlOk(true);
      showToast(`✓ 시간표 ${data.parsed_classes_count}개 수업이 등록되었습니다.`);
    } catch (e) {
      const hasServerDetail = e.detail && e.message === e.detail;
      setUrlError(e.status === 400 && !hasServerDetail ? URL_HINT : e.message);
      setUrlOk(false);
    } finally {
      setLoading(false);
    }
  };

  // 다음 버튼: URL 업로드 안 했어도 넘어갈 수 있음 — 안내 토스트는 다음 화면에서 표시
  const handleNext = () => {
    const state = urlOk ? undefined : { toast: '시간표를 등록하지 않고 넘어갑니다.' };
    navigate('/add-schedule', { state });
  };

  const closeGuide = useCallback(() => setShowGuide(false), []);

  return (
    <main style={screenStyle}>
      {showGuide && <UrlGuideModal onClose={closeGuide} />}

      <Toast message={toast} />

      <AppBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>

        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', lineHeight: '30px', letterSpacing: '-0.22px', color: colors.onSurface }}>
          에브리타임 시간표를<br />업로드해주세요
        </h1>
        <p style={{ marginTop: 10, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          에브리타임 URL을 입력하면<br />자동으로 시간표가 등록됩니다.
        </p>

        {/* 이미지 업로드 */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="image" size={18} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>이미지 업로드</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/heic"
          onChange={handleImagePick}
          tabIndex={-1}
          aria-hidden="true"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageLoading}
          style={{
            marginTop: 10, width: '100%',
            border: `1.5px dashed ${colors.outlineVariant}`,
            borderRadius: 16,
            backgroundColor: colors.surfaceContainerLow,
            paddingTop: 22, paddingBottom: 22, paddingLeft: 16, paddingRight: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: imageLoading ? 'default' : 'pointer',
            opacity: imageLoading ? 0.6 : 1,
          }}
        >
          <Icon name="cloud_upload" size={34} color={colors.primary} />
          <p style={{ textAlign: 'center', fontSize: 13, lineHeight: '18px', color: colors.onSurfaceVariant }}>
            {imageLoading ? '이미지를 인식하는 중...' : '에타 시간표 캡쳐를 올려주세요'}
          </p>
          <span style={{ fontSize: 11, color: colors.outline }}>JPG, PNG, HEIC 파일 (최대 1MB)</span>
        </button>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>또는</span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
        </div>

        {/* URL 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="link" size={18} color={colors.primary} />
          <label htmlFor="everytime-url" style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>에브리타임 시간표 URL 복사</label>
        </div>
        <p style={{ marginTop: 7, marginBottom: 10, fontSize: 12, lineHeight: '17px', color: colors.secondary }}>
          에브리타임 앱에서 시간표를 공유하고<br />생성된 URL을 붙여넣어 주세요.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="everytime-url"
            type="url"
            inputMode="url"
            value={url}
            aria-invalid={!!urlError}
            aria-describedby={urlError ? 'everytime-url-error' : undefined}
            onChange={(e) => { setUrl(e.target.value); setUrlOk(false); setUrlError(''); }}
            placeholder="URL을 붙여넣어 주세요"
            style={{
              flex: 1, height: 44,
              border: `1px solid ${urlError ? colors.error : urlOk ? colors.primary : colors.outlineVariant}`,
              borderRadius: 8, backgroundColor: '#fff',
              paddingLeft: 13, paddingRight: 13,
              fontSize: 13, color: colors.onSurface,
              minWidth: 0,
            }}
          />
          <Button
            label={loading ? '확인 중...' : '확인'}
            onClick={handleUrlCheck}
            disabled={loading}
            height={44} fontSize={12}
            style={{ paddingLeft: 14, paddingRight: 14 }}
          />
        </div>
        {urlError && <p id="everytime-url-error" role="alert" style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{urlError}</p>}
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
          <Button variant="outline" label="URL 찾는 방법" height={32} fontSize={12} style={{ paddingLeft: 14, paddingRight: 14 }} onClick={() => setShowGuide(true)} />
        </div>

      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button label="다음" onClick={handleNext} height={52} fontSize={15} style={{ flex: 1.6 }} />
      </div>

    </main>
  );
}
