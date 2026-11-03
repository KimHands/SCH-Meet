# OCI 서버 배포 구성 — 설계

작성일: 2026-11-03
브랜치: `feature/oci-deploy` (`fix/security-and-ux` 기준, PR #13 위에 쌓음)

## 목표

SCH-Meet의 프론트엔드와 백엔드, DB를 Vercel·Render에서 사용자 OCI 서버로 옮길 수 있도록 코드와 배포 구성을 준비한다. 기능·UI/UX 개선은 이 작업이 끝난 뒤에 한다.

### 완료 기준

- 백엔드 테스트와 프론트 빌드를 통과한다.
- `linux/arm64`용 이미지가 빌드된다.
- 로컬 Compose에서 5장의 스모크 항목을 통과한다.
- 서버에는 `deploy/.env`만 채워 올릴 수 있는 상태가 된다.

### 범위에서 제외

- 실제 배포, Cloudflare 터널 경로 추가, PR 머지, DB 이전
- `render.yaml`, `frontend/vercel.json` 삭제 (전환 완료 후 별도로 지운다)
- 기능·UI/UX 개선, Redis 도입

## 1. 구성

```
Cloudflare 터널 → web(Caddy) ─┬ /api/* → api(gunicorn) → db(Postgres 16)
  sch-meet.kimhands.com       └ 그 외  → 정적 파일         ↑
                                              backup(일일 pg_dump → R2)
```

| 서비스 | 역할 | 네트워크 |
|---|---|---|
| `web` | 정적 파일 서빙, `/api/*` 프록시. 터널 대상 `http://sch-meet-web:8080` | `edge`(별칭 `sch-meet-web`), `backend` |
| `api` | Django + gunicorn, 포트 8000 | `backend` |
| `db` | `postgres:16-alpine`, 볼륨 `pgdata` | `backend` |
| `backup` | 일일 `pg_dump` → R2 | `backend` |

- 호스트 포트는 publish하지 않고, 공개는 터널로만 한다.
- 터널에 연결되는 서비스는 `web` 하나다. `/api/` 외의 Django 경로(관리자 페이지 포함)는 Caddy가 넘기지 않으므로 외부에서 닿지 않는다.
- `api`, `web`은 non-root로 실행한다. 어떤 컨테이너에도 docker 소켓이나 호스트 경로를 마운트하지 않는다. `db`의 데이터는 named volume에만 둔다.
- 업로드 이미지는 디스크에 저장하지 않으므로(`timetables.py`) 백업 대상은 DB뿐이다.

## 2. 새 파일

### `server/Dockerfile` (빌드 컨텍스트 `server/`)

- `python:3.12-slim` 기반, `requirements.txt` 설치, 전용 non-root 사용자로 실행
- 이미지 빌드 중 `collectstatic`을 실행한다. 이때만 쓰는 임시 `DJANGO_SECRET_KEY`를 해당 `RUN` 명령에 한정해 넘기고 이미지 환경변수로 남기지 않는다.
- 구동: `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 1 --threads 4`
- `HEALTHCHECK`: 컨테이너 안에서 Python 표준 라이브러리로 `http://127.0.0.1:8000/api/health/` 호출
- `migrate`는 이미지 시작 명령에 넣지 않는다.

### `frontend/Dockerfile` (빌드 컨텍스트 저장소 루트)

- 1단계: `node:22-alpine`, `npm ci`, `npm run build`. 빌드 인자 `VITE_GOOGLE_CLIENT_ID`를 받는다. `VITE_API_BASE_URL`은 지정하지 않아 같은 도메인 상대 경로로 호출한다(`client.js`의 `?? ''`).
- 2단계: `caddy` 이미지에 `dist/`와 `deploy/web/Caddyfile`을 복사하고 non-root로 실행한다.

### `deploy/web/Caddyfile`

- `admin off`, `auto_https off`, `:8080` 수신. TLS는 Cloudflare 엣지에서 끝난다.
- `servers { trusted_proxies static private_ranges }`: cloudflared가 넘긴 `X-Forwarded-Proto`를 보존한다. 이 설정이 없으면 Caddy가 값을 `http`로 덮어써 Django가 HTTPS 요청을 무한 리다이렉트한다.
- `/api/*`: `reverse_proxy api:8000`. `CF-Connecting-IP` 등 요청 헤더는 그대로 전달된다.
- 그 외: `try_files {path} /index.html` 후 `file_server`
- `frontend/vercel.json`에서 옮길 응답 헤더:
  - `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
  - CSP. `connect-src`는 `'self' https://accounts.google.com/gsi/`로 바꾸고 Render 주소를 뺀다. 나머지 지시어는 그대로 둔다.
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- `index.html`: `Cache-Control: no-cache`
- HSTS: 1년, `includeSubDomains` 없음. Vercel이 자동으로 주던 것을 정적 응답에도 유지한다. `/api/*` 응답에서 Django와 중복되지 않게 정적 경로에만 붙인다.
- `-Server` 헤더 제거, zstd·gzip 압축

### `deploy/compose.yml`

- 프로젝트 이름 `sch-meet`, 로그 `json-file` 10MB × 3개, `restart: unless-stopped`
- 외부 네트워크 `edge`, 내부 네트워크 `backend`
- `api`는 `db`가 healthy일 때 시작하고, `web`은 `api`가 healthy일 때 시작한다.
- 필수 환경변수는 `${VAR:?메시지}`로 비어 있으면 기동을 막는다.

`api` 고정 환경변수:

| 변수 | 값 |
|---|---|
| `DATABASE_URL` | `postgres://schmeet:${POSTGRES_PASSWORD}@db:5432/schmeet` |
| `DATABASE_SSL_REQUIRE` | `False` |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_BEHIND_HTTPS_PROXY` | `True` |
| `DJANGO_ALLOWED_HOSTS` | `${PUBLIC_HOST}` |
| `FRONTEND_BASE_URL` | `https://${PUBLIC_HOST}` |
| `CLIENT_IP_HEADER` | `CF-Connecting-IP` |

### `deploy/.env.example`

`PUBLIC_HOST`(기본값 `sch-meet.kimhands.com`), `POSTGRES_PASSWORD`, `DJANGO_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_CLIENT_ID`, `OCR_SPACE_API_KEY`, `BACKUP_R2_BUCKET`, `BACKUP_R2_ENDPOINT`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`. 값은 서버의 `deploy/.env`(chmod 600)에만 둔다.

### `deploy/backup/`

toeic 레포의 `deploy/backup`(`Dockerfile`, `backup.sh`, `entrypoint.sh`, `restore.sh`)을 가져와 이 앱에 맞춘다. 매일 04:00 KST, 30일 보관, prefix `sch-meet/postgres`.

### `deploy/README.md`

최초 배포, 마이그레이션 실행, 업데이트, Render에서 전환, 롤백, 백업 복원 절차를 적는다. 6장의 전환 항목을 포함한다.

### `.dockerignore`

빌드 컨텍스트가 둘이므로 저장소 루트(`frontend/Dockerfile`용)와 `server/`(`server/Dockerfile`용)에 각각 둔다. 하위 경로까지 적용되도록 `**/` 패턴으로 `node_modules`, `dist`, `.env*`, `*.sqlite3`, `venv`, `.venv`, `__pycache__`, `staticfiles`를 제외한다. 루트 쪽은 `.git`, `docs`도 제외한다.

## 3. 기존 코드 수정

전환 전까지 Render·Vercel도 계속 동작해야 한다. 아래 수정은 기존 환경변수만 있는 환경의 동작을 바꾸지 않는다.

### `server/config/settings.py`

1. **DB SSL:** `ssl_require=True` 고정을 `ssl_require=_env_flag('DATABASE_SSL_REQUIRE', 'True')`로 바꾼다. 기본값이 `True`이므로 Render는 그대로다. `postgres:16-alpine` 기본 구성은 SSL을 쓰지 않으므로 Compose에서만 `False`로 둔다. DB는 내부 네트워크에만 있다.
2. **HTTPS 설정:** `if _env_flag('RENDER'):` 조건을 `if _env_flag('RENDER') or _env_flag('DJANGO_BEHIND_HTTPS_PROXY'):`로 바꾼다.
3. **헬스체크 예외:** 같은 블록에 `SECURE_REDIRECT_EXEMPT = [r'^api/health/$']`를 추가한다.
4. **클라이언트 IP:** `CLIENT_IP_HEADER = os.environ.get('CLIENT_IP_HEADER', '')`를 추가한다. `TRUSTED_PROXY_COUNT`는 그대로 둔다.

### `server/apps/api/endpoints/throttle.py`

`client_ip()`는 `CLIENT_IP_HEADER`가 설정돼 있고 요청에 그 헤더가 있으면 그 값을 쓴다. 설정이 없거나 헤더가 없으면 기존 `X-Forwarded-For`·`REMOTE_ADDR` 처리로 넘어간다. 헤더 이름은 `HTTP_` + 대문자 + 밑줄 형식의 `META` 키로 변환한다.

이 헤더를 믿을 수 있는 이유는 `web`이 터널로만 공개되어 요청이 항상 Cloudflare를 거치기 때문이다. Cloudflare는 클라이언트가 보낸 값을 덮어쓴다.

### 헬스체크 엔드포인트

`GET /api/health/`를 추가한다. 인증 없이 `{"status": "ok"}`와 200을 돌려준다. DB는 확인하지 않는다. DB 장애로 `api` 컨테이너가 재시작을 반복하지 않게 하기 위해서다. 다른 메서드는 기존 `method_not_allowed()`로 응답한다.

## 4. 운영 규칙

- **마이그레이션:** 컨테이너 시작 시 자동 실행하지 않는다. 사람이 `docker compose run --rm api python manage.py migrate`로 실행한다(`~/Ops/domains/web.md` 규칙).
- **gunicorn:** 레이트리밋이 프로세스 메모리 캐시이므로 워커 1개에 스레드 4개로 둔다. 워커를 늘리려면 공유 캐시를 먼저 도입해야 한다.
- **비밀값:** 저장소와 이미지에 넣지 않는다. `VITE_GOOGLE_CLIENT_ID`는 공개 값이라 빌드 인자로 쓴다.

## 5. 검증

### 자동 테스트 (구현 전에 먼저 작성)

- `client_ip()`:
  - `CLIENT_IP_HEADER` 설정 시 그 헤더를 쓰고, `X-Forwarded-For`의 값은 무시한다.
  - 설정돼 있어도 헤더가 없으면 기존 처리로 넘어간다.
  - 설정이 없으면 클라이언트가 보낸 `CF-Connecting-IP`를 무시한다.
- `/api/health/`: GET은 인증 없이 200, POST는 405
- HTTPS 리다이렉트: `SECURE_SSL_REDIRECT=True`에서 `/api/health/`는 리다이렉트되지 않고 다른 경로는 리다이렉트된다.
- 설정 조건(subprocess로 환경변수를 달리해 settings를 읽음):
  - `DJANGO_BEHIND_HTTPS_PROXY=True`이면 보안 설정이 켜진다.
  - `RENDER=true`이면 기존처럼 켜진다.
  - `DATABASE_SSL_REQUIRE` 미설정 시 DB 옵션에 `sslmode=require`가 있고, `False`이면 없다.

### 빌드

- `docker build --platform linux/arm64`로 `server/Dockerfile`과 `frontend/Dockerfile`을 빌드해 ARM 의존성을 확인한다.

### 로컬 Compose 스모크

`edge` 네트워크를 로컬에 만들고 `backup`을 제외한 서비스를 올린 뒤, `web`을 임시 포트로 노출하는 로컬 전용 override로 확인한다. override 파일은 커밋하지 않는다.

- `/`와 `/invite/test` 새로고침이 모두 `index.html`을 돌려준다.
- `/api/health/`가 `X-Forwarded-Proto: https`에서 200을 돌려준다.
- 다른 API 경로가 `X-Forwarded-Proto: https`에서는 리다이렉트되지 않고, `http`에서는 HTTPS로 리다이렉트된다. 무한 리다이렉트 회귀를 막는 핵심 항목이다.
- `CF-Connecting-IP`가 Caddy를 지나 `api`까지 전달된다.
- `/admin/`이 Django로 넘어가지 않는다.
- CSP를 포함한 보안 헤더가 정적 응답에 있다.
- `api`, `web`이 non-root로 실행된다.
- `migrate`가 수동 명령으로 성공하고, 컨테이너 시작만으로는 실행되지 않는다.

### 로컬에서 확인할 수 없는 것 (배포 시 확인)

- 실제 Cloudflare가 넘기는 `X-Forwarded-Proto`, `CF-Connecting-IP`
- Google 로그인, OCR.space 실제 호출
- R2 백업과 복원

### 리뷰

구현 후 `/code-review`를 거치고, 되돌리기 어려운 변경이므로 Codex 리뷰를 받는다(`~/Ops/domains/review.md`).

## 6. 전환 때 처리할 항목 (이번 구현 범위 밖, README에 기록)

순서가 중요한 항목만 적는다. 각 단계는 사용자 승인 후 실행한다.

1. OCR.space 키를 재발급한다. 옛 키는 공개 git 이력에 남아 있다.
2. Render DB의 Postgres 버전을 확인한다. 16보다 높으면 `db`, `backup` 이미지 버전을 올린다.
3. PR #13을 머지하기 전에 Render DB를 백업한다. 마이그레이션 0011은 역방향 복구가 안 된다.
4. Google OAuth 승인된 자바스크립트 원본에 `https://sch-meet.kimhands.com`을 추가한다.
5. 터널에 `sch-meet.kimhands.com → http://sch-meet-web:8080`을 추가한다. 외부 공개이므로 별도 승인을 받는다.
6. 실제 요청 헤더를 확인한다.
7. 쓰기를 멈추고 `pg_dump`로 옮긴 뒤 `migrate`를 실행한다.
8. `sch-meet.vercel.app`을 새 도메인으로 리다이렉트한다. 이미 공유된 초대 링크가 끊기지 않게 하기 위해서다.
9. Render·Vercel은 안정화를 확인할 때까지 지우지 않는다.

공개 전에 ADR 0015(서버의 Hermes 권한과 공개 웹앱 증가에 따른 위험 재검토)를 사용자가 검토한다.

## 7. 아직 사용자가 정하지 않은 것

코드 수정에는 영향이 없고 전환 전에 정하면 된다.

- 기존 Render 데이터를 옮길지 여부
- R2 백업 자격증명 방식 (`sch-meet/postgres` prefix 전용 자격증명 권장)
