# 배포 가이드 — Vercel(프론트) + Render(백엔드)

프론트엔드(Vite)는 **Vercel**, 백엔드(Django)+DB는 **Render**에 배포한다.
순서: ① Render 백엔드 → ② Vercel 프론트 → ③ 양쪽 도메인으로 환경변수/OAuth 마무리.

---

## ① 백엔드 (Render)

1. **Render 대시보드** → New → **Blueprint** → 이 GitHub 저장소 선택.
   루트의 [`render.yaml`](../../render.yaml)이 **웹서비스 + 무료 Postgres**를 자동 구성한다.
2. 배포 시 아래 환경변수를 **대시보드에서 직접 입력**(render.yaml에 `sync: false`로 표시됨):
   | 키 | 예시 값 |
   |----|---------|
   | `GOOGLE_CLIENT_ID` | 구글 OAuth 클라이언트 ID |
   | `GOOGLE_CLIENT_SECRET` | 구글 OAuth 시크릿 |
   | `OCR_SPACE_API_KEY` | `K82796185288957` |
   | `DJANGO_ALLOWED_HOSTS` | (배포 후 채움) `schmeet-api.onrender.com` |
   | `FRONTEND_ORIGINS` | (Vercel 배포 후) `https://sch-meet.vercel.app` |
   | `FRONTEND_BASE_URL` | (Vercel 배포 후) `https://sch-meet.vercel.app` |
   - `DJANGO_SECRET_KEY`는 Render가 자동 생성(`generateValue`), `DATABASE_URL`은 Postgres에서 자동 주입, `DJANGO_DEBUG=False` 고정.
3. 첫 배포 완료 후 발급된 도메인(예: `https://schmeet-api.onrender.com`)을 확인하고,
   `DJANGO_ALLOWED_HOSTS`에 그 호스트명을 넣어 재배포(또는 `RENDER_EXTERNAL_HOSTNAME` 자동 인식됨).
   - 빌드: [`server/build.sh`](../../server/build.sh) = `pip install` → `collectstatic` → `migrate`
   - 구동: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

---

## ② 프론트엔드 (Vercel)

1. **Vercel** → Add New → Project → 이 저장소 import.
2. **Root Directory = `frontend`** 로 설정(중요). 프레임워크는 Vite 자동 감지.
   [`frontend/vercel.json`](../../frontend/vercel.json)이 SPA 라우팅 rewrite를 처리한다.
3. **Environment Variables** 등록:
   | 키 | 값 |
   |----|----|
   | `VITE_API_BASE_URL` | `https://schmeet-api.onrender.com` (Render 백엔드 도메인, 끝에 `/` 없이) |
   | `VITE_GOOGLE_CLIENT_ID` | 구글 OAuth 클라이언트 ID |
4. Deploy → 발급 도메인(예: `https://sch-meet.vercel.app`) 확인.

> CLI로 할 경우: `cd frontend && vercel login && vercel --prod` (환경변수는 `vercel env add`).

---

## ③ 연동 마무리

1. **Render 환경변수 갱신**: `FRONTEND_ORIGINS`, `FRONTEND_BASE_URL`에 Vercel 도메인 입력 후 재배포
   (CORS/CSRF 허용 + 초대 링크 도메인).
2. **Google Cloud Console** → OAuth 클라이언트:
   - **승인된 자바스크립트 원본**: `https://sch-meet.vercel.app`
   - (서버 플로우 사용 시) **승인된 리디렉션 URI**도 동일 도메인 등록
3. 동작 확인: Vercel 사이트 접속 → 구글 로그인 → 시간표 등록 → 모임 생성/추천.

---

## 주의
- 백엔드 `DJANGO_SECRET_KEY`는 한 번 정해지면 바꾸지 말 것(바꾸면 기존 JWT 전부 무효 → 재로그인).
- Render 무료 Postgres는 보존기간 제한이 있으니 운영 전 유료 플랜/백업 고려.
- Render 무료 웹서비스는 유휴 시 절전(cold start)으로 첫 응답이 느릴 수 있음.
- `OCR_SPACE_API_KEY`, `GOOGLE_CLIENT_SECRET` 등 실제 비밀값은 **대시보드에만** 입력(코드/`.env` 커밋 금지).
