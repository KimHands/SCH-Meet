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

  useEffect(() => {
    // Google Identity Services 초기화
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
  }, []);

  // 구글 로그인 성공 시 호출되는 콜백
  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const data = await loginWithGoogle(response.credential); // id_token 전달
      token.save(data.access); // localStorage에 토큰 저장

      // 신규 회원 → 시간표 업로드, 기존 회원 → 홈
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

  const handleGoogleLogin = () => {
    if (!window.google) {
      setError('구글 로그인을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.google.accounts.id.prompt(); // 구글 계정 선택 팝업
  };

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
        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
        >
          <img src="/google-logo.svg" alt="Google" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 15, fontWeight: '600', color: colors.onSurface }}>
            {loading ? '로그인 중...' : 'Google로 로그인'}
          </span>
        </Button>

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
