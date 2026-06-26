import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function TimetableUploadPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlOk, setUrlOk] = useState(false);

  const handleUrlCheck = () => {
    if (!url.trim()) { setUrlError('URL을 입력해주세요.'); setUrlOk(false); return; }
    // 에브리타임 시간표 URL 형식 체크
    const isValid = url.startsWith('https://everytime.kr/') || url.startsWith('http://everytime.kr/');
    if (!isValid) { setUrlError('에브리타임 시간표 URL 형식이 아닙니다.'); setUrlOk(false); return; }
    setUrlError('');
    setUrlOk(true);
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 상단 앱바 */}
      <AppBar  />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>

        {/* 제목 */}
        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', lineHeight: '30px', letterSpacing: '-0.22px', color: colors.onSurface }}>
          에브리타임 시간표를<br />업로드해주세요
        </h1>
        <p style={{ marginTop: 10, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          캡처한 시간표 이미지를 업로드하면<br />AI로 자동 등록됩니다.
        </p>

        {/* 이미지 업로드 라벨 */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="image" size={18} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>이미지 업로드</span>
        </div>

        {/* 드롭존 */}
        <div style={{
          marginTop: 10,
          border: `1.5px dashed ${colors.outlineVariant}`,
          borderRadius: 16,
          backgroundColor: '#fff',
          paddingTop: 22, paddingBottom: 22,
          paddingLeft: 16, paddingRight: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name="cloud_upload" size={34} color={colors.outline} />
          <p style={{ textAlign: 'center', fontSize: 13, lineHeight: '18px', color: colors.secondary }}>
            이미지를 드래그하거나<br />파일을 선택해주세요
          </p>
          <Button variant="secondary" label="파일 선택" height={38} fontSize={13} style={{ paddingLeft: 20, paddingRight: 20 }} />
          <span style={{ fontSize: 11, color: colors.outline }}>JPG, PNG, HEIC 파일 (최대 30MB)</span>
        </div>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
          <span style={{ fontSize: 12, fontWeight: '500', color: colors.outline }}>또는</span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceContainerHighest }} />
        </div>

        {/* URL 입력 라벨 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="link" size={18} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>에브리타임 시간표 URL 복사</span>
        </div>
        <p style={{ marginTop: 7, marginBottom: 10, fontSize: 12, lineHeight: '17px', color: colors.secondary }}>
          에브리타임 앱에서 시간표를 공유하고<br />생성된 URL을 붙여넣어 주세요.
        </p>

        {/* URL 입력창 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlOk(false); setUrlError(''); }}
            placeholder="URL을 붙여넣어 주세요"
            style={{
              flex: 1, height: 44,
              border: `1px solid ${urlError ? colors.error : urlOk ? colors.primary : colors.outlineVariant}`,
              borderRadius: 8,
              backgroundColor: '#fff',
              paddingLeft: 13, paddingRight: 13,
              fontSize: 13,
              color: colors.onSurface,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              outline: 'none',
            }}
          />
          <Button label="확인" onClick={handleUrlCheck} height={44} fontSize={12} style={{ paddingLeft: 14, paddingRight: 14 }} />
        </div>
        {urlError && <p style={{ marginTop: 4, fontSize: 12, color: colors.error }}>{urlError}</p>}
        {urlOk && <p style={{ marginTop: 4, fontSize: 12, color: colors.primary }}>✓ URL이 확인되었습니다.</p>}

        {/* TIP 박스 */}
        <div style={{
          marginTop: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 12,
          paddingTop: 11, paddingBottom: 11,
          paddingLeft: 14, paddingRight: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="tips_and_updates" size={16} color={colors.tertiaryContainer} />
            <span style={{ fontSize: 12, fontWeight: '500', color: colors.secondary }}>TIP</span>
          </div>
          <Button variant="outline" label="URL 찾는 방법" height={32} fontSize={12} style={{ paddingLeft: 14, paddingRight: 14 }} />
        </div>

      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button label="다음" onClick={() => navigate('/add-schedule')} height={52} fontSize={15} style={{ flex: 1.6 }} />
      </div>

    </div>
  );
}