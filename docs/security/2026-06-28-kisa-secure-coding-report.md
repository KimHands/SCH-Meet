# KISA 시큐어코딩 진단 보고서 — SCH-Meet

- 일자: 2026-06-28
- 대상: Django 6.0 백엔드(`server/`) + React 18 프론트(`frontend/`)
- 기준: KISA 시큐어코딩 가이드 (7개 카테고리, 46개 항목 / 49 CWE)
- 방식: 정적 코드 분석 (읽기 전용)
- 범위 주석: 시간표 이미지 OCR 기능(PR #7) 포함 시점 진단. P3(파일 업로드) 등 일부 항목은
  PR #7 머지 후의 `timetables.py` 기준.
- 본 브랜치(`fix/security-hardening`)에서 조치한 항목: V1·V2·V3 (취약 3건)

## 종합 요약

| 판정 | 개수 | 비고 |
|------|:----:|------|
| 취약 | 3 | DEBUG·시크릿·토큰 print |
| 부분이행 | 5 | 에러 노출, CSRF, 파일 content-type, 광범위 except, XML |
| 양호 | 다수 | 인젝션/SSRF/암호/인가 전반 양호 |
| 해당없음 | 다수 | 미사용 기능 |

전반적으로 **인젝션·SSRF·인가 설계는 견고**합니다. 위험은 대부분 **개발용 설정이 그대로 남은 것**(DEBUG, SECRET_KEY 폴백, 디버그 print)에 집중되어 있어 **배포 전 설정 정리로 대부분 해소**됩니다.

---

## 취약 (배포 전 필수 수정)

### V1. [High] CWE-489 Active Debug Code — `DEBUG = True`
- 위치: `server/config/settings.py:28`
- 영향: 운영에서 켜지면 예외 시 스택트레이스·설정·소스경로가 그대로 노출.
- 조치: 환경변수화 — `DEBUG = os.environ.get('DJANGO_DEBUG','False') == 'True'`, 운영 기본 False.

### V2. [High] CWE-532/209 디버그 코드 — JWT 토큰 print
- 위치: `server/apps/api/endpoints/auth.py:88` — `print(JsonResponse(...).content)` 가 **access/refresh 토큰을 그대로 stdout/로그에 출력**.
- 영향: 로그 접근자가 사용자 세션 탈취 가능.
- 조치: 해당 라인 삭제. (CWE-489 디버그 코드 + 민감정보 로깅)

### V3. [High] CWE-259/321/798 Hard-coded Credentials — SECRET_KEY 폴백
- 위치: `server/config/settings.py:25` — `os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-...')`
- 영향: 환경변수 미설정 시 **공개된 기본 키로 JWT가 서명**됨 → 누구나 유효 토큰 위조 가능(인증 우회). JWT를 Django SECRET_KEY로 서명하는 구조라 파급이 큼.
- 조치: 폴백 제거하고 미설정 시 기동 실패하도록. 운영 키는 `.env`(이미 gitignore)로만 주입. 키 교체(rotate) 권장.

---

## 부분이행 (개선 권고)

### P1. [Medium] CWE-209 Error Message Information Exposure
- 위치: `auth.py:40,93`, `meetings.py:630,779` — 500 응답에 `'error': str(e)` 로 내부 예외 메시지를 클라이언트에 반환.
- 조치: 사용자에겐 일반 메시지만, 상세는 서버 로그로. `'error': str(e)` 제거.

### P2. [Medium] CWE-352 CSRF — `@csrf_exempt` 광범위(24곳)
- 평가: API가 **Bearer 토큰(Authorization 헤더, localStorage)** 기반이라 쿠키 자동전송 기반 CSRF는 실질적으로 성립하지 않음 → 현재 악용 가능성 낮음.
- 다만 `settings.py`의 `CORS_ALLOW_CREDENTIALS = True`는 쿠키 인증을 전제하는 설정으로, 토큰 기반 설계와 상충. 혼선 방지를 위해 정리 권장(쿠키 미사용이면 False).

### P3. [High] CWE-434 Unrestricted File Upload — content-type/확장자 미검증
- 위치: `server/apps/api/endpoints/timetables.py` `timetable_upload_image` — **크기(1MB)만 검증**, content-type·확장자·매직바이트 미검증.
- 완화요인: 업로드 파일을 **디스크에 저장하지 않고** 외부 OCR.space로 전달만 함 → 웹셸/경로조작 위험은 낮음.
- 조치: `upload.content_type` 화이트리스트(image/png·jpeg) 또는 매직바이트 검사 추가(방어적 심층).

### P4. [Medium] CWE-754 Improper Exception Handling — 광범위 `except Exception`
- 위치: `auth.py`, `meetings.py`, `timetables.py` 등 다수 `except Exception:` / `except Exception as e`.
- 조치: 가능한 구체 예외로 분리. 최소한 광범위 포착 시 내부 로깅 + 일반 메시지 응답.

### P5. [Low] CWE-611/776 XML 처리 — everytime 응답 파싱
- 위치: `timetables.py` `_parse_everytime_response` — `xml.etree.ElementTree.fromstring`.
- 평가: ElementTree는 **외부 엔티티(XXE)를 확장하지 않음** → XXE 위험 없음. 다만 엔티티 폭발(billion laughs) DoS는 이론상 가능(응답 출처가 everytime API라 위험 낮음).
- 조치(선택): `defusedxml`로 교체하면 방어적으로 안전.

---

## 양호 (특기 사항)

| 항목 | CWE | 근거 |
|------|-----|------|
| SQL Injection | 89 | Django ORM만 사용, raw SQL/문자열쿼리 없음 |
| Code/OS Command Injection | 94/78 | eval·exec·os.system·subprocess 전무 |
| Deserialization | 502 | pickle·yaml.load 미사용 (JSON만) |
| SSRF | 918 | 외부요청 2건 모두 **고정 URL**(everytime API, OCR.space). 사용자 URL은 host 화이트리스트(`_is_everytime_url`) 검증 후 식별자만 추출 |
| XSS | 79 | React 자동 이스케이프, `dangerouslySetInnerHTML`·`innerHTML`·`mark_safe` 미사용, 서버는 JSON API |
| 인증·인가 | 306/285 | 전 민감 엔드포인트 `_get_authorized_user` + `filter(user=user)`/소유권 검증 → **IDOR 없음** |
| 난수 | 330 | 초대토큰 `secrets.token_urlsafe` (암호학적 난수) |
| 비밀번호 | 312/521/307 | Google 소셜로그인, `set_unusable_password` → 평문저장·약한정책·브루트포스 해당 약화 |
| 약한 암호/해시 | 327/759 | MD5·SHA1·DES·random 보안용도 미사용 |
| 자원 해제 | 404 | DB 커서/파일 `with` 문 사용 |
| 하드코딩(프론트) | 259 | 프론트에 시크릿 없음. `VITE_GOOGLE_CLIENT_ID`는 공개 클라이언트 ID(정상) |

### 참고: localStorage 토큰 저장
- JWT를 `localStorage`에 저장(`utils/token.js`). XSS 발생 시 탈취 가능한 구조이나, **현재 XSS 벡터는 발견되지 않음**. 장기적으로 httpOnly 쿠키 + CSRF 토큰 조합 고려 가능(설계 변경 사안).

---

## 우선순위 조치 로드맵
1. **즉시**: V2(토큰 print 삭제), V3(SECRET_KEY 폴백 제거)
2. **배포 전**: V1(DEBUG 환경변수화), P1(에러 str(e) 제거), P3(업로드 content-type 검증)
3. **개선**: P2(CORS/CSRF 정리), P4(예외 구체화), P5(defusedxml)
