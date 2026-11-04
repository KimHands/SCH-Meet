# OCI 서버 배포 구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SCH-Meet의 프론트·백엔드·DB를 OCI 서버의 Compose 스택으로 띄울 수 있게 코드와 배포 구성을 준비한다.

**Architecture:** Cloudflare 터널 뒤의 Caddy(`web`)가 정적 파일을 서빙하고 `/api/*`를 gunicorn(`api`)으로 넘긴다. `api`, `db`, `backup`은 내부 네트워크에만 둔다. 기존 Render·Vercel 동작은 바꾸지 않는다.

**Tech Stack:** Django 6.0 / gunicorn / Postgres 16 / Vite(Node 22) / Caddy 2 / Docker Compose / rclone + R2

**Spec:** `docs/superpowers/specs/2026-11-03-oci-deploy-design.md`

## Global Constraints

- 브랜치: `feature/oci-deploy`. 머지, 실제 배포, 터널 추가, DB 이전은 하지 않는다.
- 공개 호스트 기본값 `sch-meet.kimhands.com`, 터널 대상 별칭·포트 `sch-meet-web:8080`, `api` 포트 8000
- DB 사용자·이름 `schmeet`, 이미지 `postgres:16-alpine`
- gunicorn `--workers 1 --threads 4`
- 컨테이너 시작 시 `migrate`를 실행하지 않는다.
- `api`, `web`은 non-root. docker 소켓·호스트 경로 마운트와 호스트 포트 publish 금지
- 비밀값은 저장소·이미지·채팅에 넣지 않는다.
- 새 환경변수의 기본값은 기존 Render 동작을 유지해야 한다.
- 테스트 명령 공통: `cd server && DJANGO_SECRET_KEY=test .venv/bin/python manage.py test <라벨>`
- 커밋 메시지는 `git add` 후 `gitmsg`로 초안을 만들고, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## Review Focus

1. 배포 후 옛 화면이 사라진 `/assets/*` 파일을 요청 → `index.html`이 영구 캐시되면 안 되고 404여야 한다. (Task 5)
2. `api`가 내려간 상태 → 화면은 계속 열리고 `/api/*`만 502여야 한다. (Task 6)
3. `CF-Connecting-IP`가 빈 값으로 온 요청 → 빈 문자열을 IP로 쓰지 않고 기존 처리로 넘어가야 한다. (Task 1)
4. 필수 환경변수가 빠진 `.env` → 빈 비밀번호로 기동하지 말고 Compose가 바로 실패해야 한다. (Task 6)
5. 1MB가 넘는 업로드 → 프록시 오류가 아니라 Django의 JSON 응답을 받아야 한다. (Task 6)

---

### Task 1: 클라이언트 IP 헤더 지원

**Files:**
- Modify: `server/config/settings.py` (`TRUSTED_PROXY_COUNT` 정의 옆)
- Modify: `server/apps/api/endpoints/throttle.py:15-22`
- Test: `server/apps/api/tests/test_auth_security.py` (`ClientIpTest`)

**Interfaces:**
- Produces: `settings.CLIENT_IP_HEADER: str` (기본값 `''`, 환경변수 `CLIENT_IP_HEADER`). `client_ip(request)`의 시그니처는 그대로다.

- [ ] **Step 1: 실패하는 테스트 작성** — `ClientIpTest`에 추가. 요청은 기존처럼 `mock.Mock(META=...)`로 만든다.

```python
@override_settings(CLIENT_IP_HEADER='CF-Connecting-IP', TRUSTED_PROXY_COUNT=1)
def test_configured_header_wins_over_forwarded_for(self):
    request = mock.Mock(META={'HTTP_CF_CONNECTING_IP': '203.0.113.9', 'HTTP_X_FORWARDED_FOR': '6.6.6.6', 'REMOTE_ADDR': '10.0.0.1'})
    self.assertEqual(client_ip(request), '203.0.113.9')

@override_settings(CLIENT_IP_HEADER='CF-Connecting-IP', TRUSTED_PROXY_COUNT=0)
def test_missing_or_blank_header_falls_back(self):
    self.assertEqual(client_ip(mock.Mock(META={'REMOTE_ADDR': '10.0.0.1'})), '10.0.0.1')
    self.assertEqual(client_ip(mock.Mock(META={'HTTP_CF_CONNECTING_IP': '  ', 'REMOTE_ADDR': '10.0.0.1'})), '10.0.0.1')

@override_settings(CLIENT_IP_HEADER='', TRUSTED_PROXY_COUNT=0)
def test_header_ignored_when_not_configured(self):
    request = mock.Mock(META={'HTTP_CF_CONNECTING_IP': '6.6.6.6', 'REMOTE_ADDR': '10.0.0.1'})
    self.assertEqual(client_ip(request), '10.0.0.1')
```

- [ ] **Step 2: 실패 확인** — `api.tests.test_auth_security.ClientIpTest` 실행. `test_configured_header_wins_over_forwarded_for`만 FAIL이어야 한다. 나머지 두 테스트는 기존 동작을 고정하는 회귀 테스트라 지금도 PASS다.

- [ ] **Step 3: 구현** — `throttle.py`에 `_client_ip_from_header(request) -> str`을 추가한다. 헤더 이름을 `'HTTP_' + name.upper().replace('-', '_')`로 바꿔 읽고 공백을 제거해 돌려주며, 미설정이면 `''`를 돌려준다. `client_ip()`는 이 값이 있으면 먼저 반환한다. `settings.py`에 `CLIENT_IP_HEADER`를 추가한다.

- [ ] **Step 4: 통과 확인** — 같은 명령으로 전부 PASS

- [ ] **Step 5: 커밋**

---

### Task 2: 헬스체크 엔드포인트

**Files:**
- Create: `server/apps/api/endpoints/health.py`
- Modify: `server/apps/api/endpoints/__init__.py`, `server/apps/api/views.py`, `server/apps/api/urls.py`
- Test: `server/apps/api/tests/test_deploy.py` (새 파일)

**Interfaces:**
- Produces: `health_check(request) -> JsonResponse`, URL 이름 `health`, 경로 `/api/health/`

- [ ] **Step 1: 실패하는 테스트 작성** — `HealthCheckTest(TestCase)`

```python
def test_get_returns_ok_without_auth(self):
    res = self.client.get('/api/health/')
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.json(), {'status': 'ok'})

def test_post_not_allowed(self):
    self.assertEqual(self.client.post('/api/health/').status_code, 405)

@override_settings(SECURE_SSL_REDIRECT=True, SECURE_REDIRECT_EXEMPT=[r'^api/health/$'])
def test_only_health_is_exempt_from_https_redirect(self):
    self.assertEqual(self.client.get('/api/health/').status_code, 200)
    self.assertEqual(self.client.get('/api/users/me/').status_code, 301)
```

- [ ] **Step 2: 실패 확인** — `api.tests.test_deploy` 실행, 404로 FAIL

- [ ] **Step 3: 구현** — GET이 아니면 기존 `method_not_allowed()`를 돌려준다. DB는 조회하지 않는다. `endpoints/__init__.py`와 `views.py`의 export 목록에 추가하고 `urls.py`에 `path('health/', views.health_check, name='health')`를 등록한다. 기존 뷰가 쓰는 데코레이터가 있으면 같은 패턴을 따른다.

- [ ] **Step 4: 통과 확인** — 같은 명령으로 PASS

- [ ] **Step 5: 커밋**

---

### Task 3: 보안·DB 설정을 Render에서 분리

**Files:**
- Modify: `server/config/settings.py:123-125`, `server/config/settings.py:209`
- Test: `server/apps/api/tests/test_deploy.py`

**Interfaces:**
- Produces: 환경변수 `DJANGO_BEHIND_HTTPS_PROXY`(기본 꺼짐), `DATABASE_SSL_REQUIRE`(기본 `True`)

- [ ] **Step 1: 실패하는 테스트 작성** — settings는 import 시점에 환경변수를 읽으므로 subprocess로 확인한다. 헬퍼 `_load_settings(**env) -> dict`는 `RENDER`, `DJANGO_BEHIND_HTTPS_PROXY`, `DATABASE_SSL_REQUIRE`를 지운 환경에 `DJANGO_SECRET_KEY`, `DATABASE_URL=postgres://u:p@db:5432/x`, `**env`를 넣고, `server/`를 cwd로 `sys.executable -c`를 실행해 JSON을 받는다. 출력 항목은 `SECURE_SSL_REDIRECT`, `SECURE_PROXY_SSL_HEADER`, `SECURE_REDIRECT_EXEMPT`, `TRUSTED_PROXY_COUNT`, `DATABASES['default'].get('OPTIONS', {})`다.

```python
def test_behind_https_proxy_enables_security(self):
    loaded = _load_settings(DJANGO_BEHIND_HTTPS_PROXY='True')
    self.assertTrue(loaded['SECURE_SSL_REDIRECT'])
    self.assertEqual(loaded['SECURE_REDIRECT_EXEMPT'], [r'^api/health/$'])

def test_render_still_enables_security(self):
    loaded = _load_settings(RENDER='true')
    self.assertTrue(loaded['SECURE_SSL_REDIRECT'])
    self.assertEqual(loaded['TRUSTED_PROXY_COUNT'], 1)

def test_security_off_by_default(self):
    self.assertFalse(_load_settings()['SECURE_SSL_REDIRECT'])

def test_database_ssl_required_by_default(self):
    self.assertEqual(_load_settings()['DB_OPTIONS'].get('sslmode'), 'require')

def test_database_ssl_can_be_disabled(self):
    self.assertNotIn('sslmode', _load_settings(DATABASE_SSL_REQUIRE='False')['DB_OPTIONS'])
```

- [ ] **Step 2: 실패 확인** — `api.tests.test_deploy` 실행. `RENDER`와 기본값 관련 테스트는 PASS, 나머지 신규 동작은 FAIL이어야 한다.

- [ ] **Step 3: 구현** — 스펙 3장의 1~3번을 그대로 적용한다. `_env_flag`는 해당 위치보다 앞에 정의돼 있어 그대로 쓴다.

- [ ] **Step 4: 전체 테스트** — `api` 전체 실행, 전부 PASS. `python manage.py makemigrations --check --dry-run`도 통과

- [ ] **Step 5: 커밋**

---

### Task 4: 백엔드 이미지

**Files:**
- Create: `server/Dockerfile`, `server/.dockerignore`

**Interfaces:**
- Consumes: Task 2의 `/api/health/`
- Produces: `0.0.0.0:8000`을 수신하는 이미지. 작업 디렉터리 `/app`, `python manage.py <명령>` 실행 가능

- [ ] **Step 1: 작성** — 스펙 2장대로 작성한다. `RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --no-input`처럼 임시 키를 해당 명령에만 넘긴다. 사용자는 `useradd`로 만든 `app`(UID 1000)이다. `.dockerignore`는 스펙 2장의 패턴을 쓴다.

- [ ] **Step 2: 빌드** — `docker build --platform linux/arm64 -t sch-meet-api:test server` 성공 (ARM 의존성 확인)

- [ ] **Step 3: 이미지 확인**

```bash
docker run --rm sch-meet-api:test id -u                       # 1000
docker inspect sch-meet-api:test --format '{{.Config.Env}}'   # DJANGO_SECRET_KEY 없음
docker run --rm sch-meet-api:test sh -c 'test -f .env; echo $?; ls staticfiles | head -1'   # 1, 그리고 admin 등 정적 폴더
```

- [ ] **Step 4: 기동 확인** — `DJANGO_SECRET_KEY`와 `DJANGO_BEHIND_HTTPS_PROXY=True`를 넣어 실행한다. 컨테이너가 `healthy`가 되는지 `docker inspect --format '{{.State.Health.Status}}'`로 확인한다. 헬스체크가 리다이렉트에 막히지 않았다는 뜻이다. 확인 후 컨테이너를 지운다.

- [ ] **Step 5: 커밋**

---

### Task 5: 프론트 이미지와 Caddy 설정

**Files:**
- Create: `deploy/web/Caddyfile`, `frontend/Dockerfile`, `.dockerignore`

**Interfaces:**
- Produces: `:8080`을 수신하는 이미지. 업스트림 이름 `api:8000`. 빌드 인자 `VITE_GOOGLE_CLIENT_ID`

- [ ] **Step 1: Caddyfile 작성** — 라우팅 순서가 결과를 좌우하므로 아래 구조를 지킨다. `(static_headers)`의 값은 `frontend/vercel.json`에서 옮기되 CSP의 `connect-src`만 `'self' https://accounts.google.com/gsi/`로 바꾸고, HSTS `max-age=31536000`을 추가한다.

```caddyfile
{
	admin off
	auto_https off
	servers {
		trusted_proxies static private_ranges
	}
}

(static_headers) {
	header { # vercel.json의 보안 헤더, CSP, HSTS
	}
}

:8080 {
	encode zstd gzip
	header -Server

	handle /api/* {
		reverse_proxy api:8000
	}

	handle /assets/* {
		import static_headers
		root * /srv
		header Cache-Control "public, max-age=31536000, immutable"
		file_server
	}

	handle {
		import static_headers
		root * /srv
		try_files {path} /index.html
		header Cache-Control "no-cache"
		file_server
	}
}
```

`/assets/*`에는 `try_files`를 두지 않는다. 사라진 파일에 `index.html`이 영구 캐시되는 것을 막기 위해서다(Review Focus 1). `handle`이 경로로 갈리므로 스펙의 `index.html` no-cache는 SPA 경로 전체에 적용된다.

- [ ] **Step 2: Dockerfile 작성** — 스펙 2장의 2단계 빌드. 2단계는 `caddy:2-alpine`에 `app` 사용자(UID 1000)를 만들어 `/data`, `/config`, `/srv`를 소유하게 한다. 빌드 중 `caddy validate --config /etc/caddy/Caddyfile`을 실행한다. 저장소 루트 `.dockerignore`도 작성한다.

- [ ] **Step 3: 빌드** — `docker build --platform linux/arm64 -f frontend/Dockerfile --build-arg VITE_GOOGLE_CLIENT_ID=smoke -t sch-meet-web:test .` 성공

- [ ] **Step 4: 단독 동작 확인** — `docker run --rm -d --name sch-meet-web-test -p 127.0.0.1:18081:8080 sch-meet-web:test` 후 확인한다. `api`가 없으므로 `/api/*`는 502가 정상이다.

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:18081/invite/test              # 200
curl -s localhost:18081/invite/test | grep -c 'id="root"'                         # 1
curl -s -o /dev/null -w '%{http_code}\n' localhost:18081/assets/nonexistent.js    # 404
curl -sI localhost:18081/ | grep -iE 'content-security-policy|strict-transport|x-frame-options|cache-control'   # 4줄, no-cache
curl -sI localhost:18081/ | grep -ic '^server:'                                   # 0
curl -s -o /dev/null -w '%{http_code}\n' localhost:18081/api/health/              # 502
docker exec sch-meet-web-test id -u                                               # 1000
```

`dist/assets`의 실제 파일 하나는 `immutable` 헤더로 200을 돌려줘야 한다. 확인 후 컨테이너를 멈춘다.

- [ ] **Step 5: 커밋**

---

### Task 6: Compose 스택과 백업

**Files:**
- Create: `deploy/compose.yml`, `deploy/.env.example`, `deploy/backup/Dockerfile`, `deploy/backup/backup.sh`, `deploy/backup/entrypoint.sh`, `deploy/backup/restore.sh`

**Interfaces:**
- Consumes: Task 4, 5의 이미지와 `/api/health/`
- Produces: 스택 이름 `sch-meet`, 서비스 `web`, `api`, `db`, `backup`

- [ ] **Step 1: compose와 env 예시 작성** — 스펙 2장의 표와 toeic `deploy/compose.yml`의 형식을 따른다. `build.context`는 `api`가 `../server`, `web`이 `..`(`dockerfile: frontend/Dockerfile`), `backup`이 `..`다. `web`의 `edge` 별칭은 `sch-meet-web`, `api`는 `backend`에만 연결한다. `api`에 `DJANGO_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OCR_SPACE_API_KEY`를 `.env`에서 넘긴다. `depends_on`의 조건은 스펙대로 `service_healthy`다.

- [ ] **Step 2: 백업 파일 작성** — toeic의 `deploy/backup/`을 복사해 prefix 기본값을 `sch-meet/postgres`로, 파일 패턴을 `sch-meet-*.dump`로, 안내 문구를 이 앱 기준으로 바꾼다. 다른 로직은 바꾸지 않는다.

- [ ] **Step 3: 필수값 누락 확인** — 빈 env 파일로 `docker compose -f deploy/compose.yml --env-file <빈 파일> config`를 실행하면 `POSTGRES_PASSWORD` 필요 메시지로 실패해야 한다.

- [ ] **Step 4: 스모크 환경 준비** — 세션 스크래치 폴더에 더미 env(`PUBLIC_HOST=localhost`, 임의 비밀번호와 키, 더미 `BACKUP_*`)와 override(`web`에 `127.0.0.1:18080:8080` publish)를 만든다. 두 파일은 커밋하지 않는다. `docker network create edge`(없을 때만) 후 아래를 실행한다. 이후 `compose`는 같은 `-f`, `--env-file` 인자를 붙인 명령을 뜻한다.

```bash
docker compose -f deploy/compose.yml -f <override> --env-file <env> build
docker compose -f deploy/compose.yml -f <override> --env-file <env> up -d db api web
```

- [ ] **Step 5: 마이그레이션 수동 실행 확인** — `compose run --rm api python manage.py showmigrations api`가 모두 `[ ]`이고, `compose run --rm api python manage.py migrate` 후 `[X]`여야 한다.

- [ ] **Step 6: 스모크 실행**

```bash
H='-H X-Forwarded-Proto:https'
curl -s -o /dev/null -w '%{http_code}\n' localhost:18080/invite/test                       # 200
curl -s -o /dev/null -w '%{http_code}\n' $H localhost:18080/api/health/                    # 200
curl -s -o /dev/null -w '%{http_code}\n' $H localhost:18080/api/users/me/                  # 401 (무한 리다이렉트 회귀 검사)
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:18080/api/users/me/     # 301 https://...
curl -s localhost:18080/admin/ | grep -c 'id="root"'                                       # 1 (Django로 가지 않음)
curl -s -o /dev/null -w '%{http_code}\n' $H -H 'Host: evil.example' localhost:18080/api/health/   # 400
head -c 2097152 /dev/zero > <스크래치>/big.bin
curl -s -w ' %{http_code}\n' $H -F file=@<스크래치>/big.bin localhost:18080/api/timetables/upload-image/   # Django JSON + 401 (Review Focus 5)
compose exec api id -u                                                                     # 1000
compose exec web id -u                                                                     # 1000
```

`CF-Connecting-IP` 전달은 레이트리밋 동작으로 확인한다. `/api/auth/refresh/`(분당 30회, `client_ip` 기준)에 `X-Forwarded-Proto: https`를 붙여 POST한다. 요청마다 다른 `CF-Connecting-IP`로 31회 보내면 429가 없어야 하고, 같은 값으로 31회 보내면 마지막 요청이 429여야 한다.

- [ ] **Step 7: 장애 동작 확인** — `compose stop api` 후 `/`는 200, `/api/health/`는 502여야 한다(Review Focus 2). `compose start api`로 되돌린다.

- [ ] **Step 8: 백업 이미지 확인** — `compose build backup`이 성공하고 `compose run --rm --no-deps --entrypoint sh backup -c 'pg_dump --version; rclone version | head -1'`이 Postgres 16과 rclone 버전을 출력한다. 실제 R2 업로드는 배포 시 확인한다.

- [ ] **Step 9: 정리와 커밋** — `compose down -v`로 스모크 스택과 볼륨을 지운다. 이 스모크 전용 볼륨 외의 다른 Docker 자원은 건드리지 않는다. `edge` 네트워크는 이 작업에서 새로 만든 경우에만 지운다. 커밋한다.

---

### Task 7: 문서와 최종 검증

**Files:**
- Create: `deploy/README.md`
- Modify: `docs/deploy/DEPLOY.md` (맨 위에 OCI 안내 한 줄), `server/.env.example`(새 환경변수 3개 설명)

**Interfaces:**
- Consumes: Task 6의 스택 이름과 명령

- [ ] **Step 1: README 작성** — 스펙 2장과 6장의 내용을 절차로 적는다. 최초 배포, 마이그레이션, 업데이트, 전환, 롤백, 백업 복원을 포함한다. 전환 항목에 `frontend/index.html`의 `og:url`과 루트 `README.md`의 서비스 주소 갱신을 더한다. 모든 명령은 Task 6에서 실제로 쓴 형태와 같아야 한다.

- [ ] **Step 2: 전체 확인** — `api` 전체 테스트, `cd frontend && npm test && npm run build`, `git status`에 `.env`나 스크래치 파일이 없는지 확인

- [ ] **Step 3: 커밋**

- [ ] **Step 4: 리뷰** — `/code-review`를 실행한 뒤 Codex 리뷰를 받는다(`~/Ops/domains/review.md` 절차). 지적 사항을 검증해 반영한다.

- [ ] **Step 5: 사용자 보고** — 결과와 로컬에서 확인하지 못한 항목(실제 Cloudflare 헤더, Google 로그인, OCR, R2)을 보고한다. 푸시와 PR 생성은 사용자 확인 후 진행한다.
