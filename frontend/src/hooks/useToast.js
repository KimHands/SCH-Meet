import { useState, useRef, useCallback, useEffect } from 'react';

// 일정 시간 뒤 사라지는 토스트 메시지 — 새 메시지가 오면 이전 타이머를 정리한다
export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);

  const clearTimer = () => clearTimeout(timerRef.current);

  const showToast = useCallback((message) => {
    clearTimer();
    setToast(message);
    timerRef.current = setTimeout(() => setToast(''), durationMs);
  }, [durationMs]);

  useEffect(() => clearTimer, []);

  return { toast, showToast };
}
