import { useEffect, useState } from 'react';
import { colors } from '../styles/theme';
import { subscribeSlowRequests } from '../api/slowRequests';

// 요청이 5초 넘게 걸리면 (Render 콜드 스타트) 안내를 띄운다
export default function ServerWakeNotice() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => subscribeSlowRequests(setIsSlow), []);

  return (
    <div role="status" aria-live="polite">
      {isSlow && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 358,
          backgroundColor: colors.inverseSurface, color: colors.inverseOnSurface,
          borderRadius: 12, padding: '10px 14px',
          fontSize: 13, lineHeight: '19px', textAlign: 'center',
          zIndex: 1100,
        }}>
          서버를 깨우는 중이에요 (최대 1분)
          <br />
          잠시만 기다려주세요.
        </div>
      )}
    </div>
  );
}
