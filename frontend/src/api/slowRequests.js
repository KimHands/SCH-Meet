/**
 * 오래 걸리는 요청 추적 — Render 무료 플랜 콜드 스타트(최대 ~1분) 안내용
 */

const SLOW_THRESHOLD_MS = 5000;

const listeners = new Set();
let slowCount = 0;

function notify() {
  const isSlow = slowCount > 0;
  listeners.forEach((listener) => listener(isSlow));
}

export function subscribeSlowRequests(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function trackSlowRequest(request) {
  let markedSlow = false;
  const timer = setTimeout(() => {
    markedSlow = true;
    slowCount += 1;
    notify();
  }, SLOW_THRESHOLD_MS);

  try {
    return await request();
  } finally {
    clearTimeout(timer);
    if (markedSlow) {
      slowCount -= 1;
      notify();
    }
  }
}
