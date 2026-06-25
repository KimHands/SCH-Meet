import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from '../components/Button';
import Icon from '../components/Icon';

const MESSAGES = [
  { name: '김소정', text: '이번 주 공강 언제야?' },
  { name: '이민수', text: '화요일 오후는 어때?' },
  { name: '박지훈', text: '나는 수요일만 돼!' },
];

const FEATURES = [
  { icon: 'upload_file',  bg: colors.primaryFixed,  fg: colors.primary,          title: '에타 시간표 업로드',   sub: '공강 시간 자동 계산' },
  { icon: 'event_repeat', bg: colors.primaryFixed,  fg: colors.primary,          title: '고정 일정 추가',       sub: '알바, 동아리 등 반복 일정 관리' },
  { icon: 'auto_awesome', bg: colors.tertiaryFixed, fg: colors.tertiaryContainer, title: 'AI 최적의 시간 추천', sub: '모두가 가능한 시간대 바로 찾기' },
];

function Slide1({ onNext, onSkip }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 24px 0' }}>
      <div style={{ textAlign: 'right' }}>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: '500', color: '#747782', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          건너뛰기
        </button>
      </div>

      <h1 style={{ marginTop: 26, fontSize: 25, fontWeight: '700', lineHeight: '33px', letterSpacing: '-0.25px', color: colors.onSurface }}>
        시간 조율<br />아직도 힘드신가요?
      </h1>

      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        {MESSAGES.map((m) => (
          <div key={m.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: '600', color: colors.secondary, paddingLeft: 46 }}>{m.name}</span>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.secondaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="person" size={20} color={colors.secondary} />
              </div>
              <div style={{ backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`, borderRadius: '4px 16px 16px 16px', paddingTop: 11, paddingBottom: 11, paddingLeft: 15, paddingRight: 15 }}>
                <span style={{ fontSize: 14, color: colors.onSurface }}>{m.text}</span>
              </div>
            </div>
          </div>
        ))}

        {/* 타이핑 표시 */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36 }} />
          <div style={{ backgroundColor: colors.surfaceContainer, borderRadius: 16, paddingTop: 13, paddingBottom: 13, paddingLeft: 16, paddingRight: 16, display: 'flex', gap: 4 }}>
            {['#a9abb6', '#c4c6d2', '#dad9e0'].map((c, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: c }} />
            ))}
          </div>
        </div>

        <p style={{ marginTop: 10, fontSize: 13, lineHeight: '20px', color: colors.secondary }}>
          단톡방에서 "다들 언제 비어?"를 묻고<br />엑셀로 시간표를 비교하는 번거로움!
        </p>
      </div>
    </div>
  );
}

function Slide2({ onStart, onSkip }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 24px 0' }}>
      <div style={{ textAlign: 'right' }}>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: '500', color: '#747782', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          건너뛰기
        </button>
      </div>

      <h1 style={{ marginTop: 22, fontSize: 24, fontWeight: '700', lineHeight: '32px', letterSpacing: '-0.24px', color: colors.onSurface }}>
        에타 시간표 업로드 +<br />고정 일정 추가
      </h1>

      {/* 히어로 */}
      <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ width: 74, height: 96, borderRadius: 14, backgroundColor: '#fff', border: `1px solid ${colors.outlineVariant}`, display: 'flex', flexWrap: 'wrap', gap: 3, padding: 10, boxSizing: 'border-box' }}>
          {[0,1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} style={{ width: 14, height: 20, borderRadius: 2, backgroundColor: [1,5,6].includes(i) ? colors.primaryFixedDim : colors.surfaceContainerHigh }} />
          ))}
        </div>
        <Icon name="arrow_forward" size={28} color={colors.outline} />
        <div style={{ width: 74, height: 96, borderRadius: 14, backgroundColor: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="event_available" size={42} color={colors.inversePrimary} />
        </div>
      </div>

      <p style={{ marginTop: 18, textAlign: 'center', fontSize: 14, lineHeight: '21px', color: colors.onSurfaceVariant }}>
        MeetTime이 AI로 공강 시간을 분석해<br />최적의 만남 시간을 추천해드려요!
      </p>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: '#fff', border: `1px solid ${colors.surfaceContainerHighest}`, borderRadius: 16, paddingTop: 14, paddingBottom: 14, paddingLeft: 16, paddingRight: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={f.icon} size={22} color={f.fg} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: '600', color: colors.onSurface }}>{f.title}</p>
              <p style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(1);

  const goLogin = () => navigate('/login');

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>

      {/* 슬라이드 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {slide === 1
          ? <Slide1 onNext={() => setSlide(2)} onSkip={goLogin} />
          : <Slide2 onStart={goLogin} onSkip={goLogin} />
        }
      </div>

      {/* 하단 페이지 인디케이터 + 버튼 */}
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        {/* 페이지 점 */}
        <div style={{ display: 'flex', gap: 7 }}>
          {[1, 2].map((n) => {
            const on = slide === n;
            return (
              <div key={n} style={{ width: on ? 22 : 7, height: 7, borderRadius: 99, backgroundColor: on ? colors.primary : colors.outlineVariant, transition: 'width 0.2s' }} />
            );
          })}
        </div>

        {slide === 1
          ? <Button label="다음" onClick={() => setSlide(2)} style={{ width: '100%' }} />
          : <Button label="시작하기" onClick={goLogin} style={{ width: '100%' }} />
        }
      </div>

    </div>
  );
}