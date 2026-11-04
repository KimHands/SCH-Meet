# sch-meet 웹 — OCI 서버(ARM64) 용. 빌드 컨텍스트는 저장소 루트
#   VITE_API_BASE_URL은 지정하지 않는다. 같은 도메인 상대 경로로 API를 호출한다
FROM node:22-alpine AS build
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM caddy:2-alpine
COPY deploy/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
  && adduser -D -u 1000 app \
  && chown -R app:app /data /config /srv
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
