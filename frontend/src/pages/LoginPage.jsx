import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { loginWithGoogle } from '../api/auth';
import { token } from '../utils/token';

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const data = await loginWithGoogle(response.credential);
      token.save(data.access);
      if (data.is_new_user) {
        navigate('/upload-timetable');
      } else {
        navigate('/');
      }
    } catch (e) {
      setError('구글 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      // 버튼을 구글이 직접 렌더링 — FedCM 팝업 방식보다 안정적
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: 334, text: 'signin_with', shape: 'pill' }
      );
    };

    if (window.google) {
      initGoogle();
    } else {
      // 스크립트 로드 완료 후 초기화
      const script = document.querySelector('script[src*="gsi/client"]');
      if (script) script.addEventListener('load', initGoogle);
    }
  }, []);

  return (
    <div style={{
      height: '100vh',
      backgroundColor: colors.surface,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingLeft: 28,
      paddingRight: 28,
      paddingBottom: 30,
    }}>

      {/* 중앙 로고 영역 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name="groups" size={44} color={colors.inversePrimary} />
        </div>

        <span style={{
          marginTop: 22,
          fontSize: 32,
          fontWeight: '700',
          letterSpacing: '-0.6px',
          color: colors.primary,
        }}>
          MeetTime
        </span>

        <span style={{
          marginTop: 18,
          textAlign: 'center',
          fontSize: 15,
          lineHeight: '23px',
          color: colors.onSurfaceVariant,
        }}>
          모두의 일정을 고려한<br />최적의 만남 시간
        </span>
      </div>

      {/* 하단 버튼 영역 */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
      }}>
        {/* 구글이 직접 렌더링하는 버튼 */}
        <div id="google-btn" style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />
        {loading && (
          <p style={{ fontSize: 13, color: colors.secondary }}>로그인 중...</p>
        )}

        {/* 에러 메시지 */}
        {error && (
          <p style={{ fontSize: 13, color: colors.error, textAlign: 'center' }}>{error}</p>
        )}

        <span style={{
          textAlign: 'center',
          fontSize: 12,
          lineHeight: '18px',
          color: colors.outline,
        }}>
          로그인하면 서비스 이용약관 및<br />개인정보처리방침에 동의하게 됩니다.
        </span>
      </div>

    </div>
  );
}
