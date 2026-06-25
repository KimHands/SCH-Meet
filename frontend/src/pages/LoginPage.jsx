import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function LoginPage() {
  const navigate = useNavigate();

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
          onClick={() => navigate('/upload-timetable')}
          style={{ width: '100%' }}
        >
          <img src="/google-logo.svg" alt="Google" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 15, fontWeight: '600', color: colors.onSurface }}>
            Google로 로그인
          </span>
        </Button>

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