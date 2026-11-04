#!/bin/sh
# 사용: notify.sh <메시지>. TELEGRAM_* 설정이 없으면 아무것도 하지 않는다
# 오류 출력에 봇 토큰이 포함된 주소가 찍히지 않도록 curl 출력은 버린다
[ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || exit 0
curl -sS --max-time 10 -o /dev/null \
  --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
  --data-urlencode "text=$1" \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" >/dev/null 2>&1 \
  || echo "Telegram 알림 전송 실패"
