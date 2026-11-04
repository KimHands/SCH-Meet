# 🔌 API 명세서

> 프론트와 백엔드가 **"이렇게 주고받자"고 약속하는 문서**.
> 이게 명확하면 백·프가 서로를 안 기다리고 동시에 개발할 수 있다.

---

## 0. 공통 규칙

| 항목 | 값 |
|---|---|
| **Base URL (로컬)** | `http://localhost:8000` |
| **Base URL (배포)** | `https://your-app.up.railway.app` |
| **Content-Type** | `application/json` |
| **인증** | 없음 (이번 프로젝트는 인증 없이 진행) |

### HTTP 상태 코드 약속

| Code | 의미 | 사용 시점 |
|---|---|---|
| 200 | OK | 조회·수정 성공 |
| 201 | Created | 생성 성공 |
| 204 | No Content | 삭제 성공 (body 없음) |
| 400 | Bad Request | 클라이언트 입력 오류 (검증 실패) |
| 404 | Not Found | 리소스 없음 |
| 500 | Server Error | 백엔드 내부 오류 |

---

## 1. 엔드포인트 요약표

| # | Method | URL | 설명 | 상태 |
|---|---|---|---|---|
| 1 | `GET` | `/api/memos/` | 메모 전체 목록 조회 | ⬜ |
| 2 | `POST` | `/api/memos/` | 새 메모 생성 | ⬜ |
| 3 | `GET` | `/api/memos/<id>/` | 메모 단일 조회 | ⬜ |
| 4 | `PATCH` | `/api/memos/<id>/` | 메모 부분 수정 | ⬜ |
| 5 | `DELETE` | `/api/memos/<id>/` | 메모 삭제 | ⬜ |
| 6 | `GET` | `/api/memos/?q=keyword` | 키워드 검색 | ⬜ |

> 상태: ⬜ 미구현 / 🟡 개발중 / ✅ 완료

---

## 2. 엔드포인트별 상세

### 1️⃣ `GET /api/memos/` — 메모 목록

**Request**
- Query: 없음

**Response — 200 OK**
```json
[
  {
    "id": 1,
    "title": "장보기",
    "content": "우유, 빵, 계란",
    "created_at": "2026-05-26T10:30:00Z"
  },
  {
    "id": 2,
    "title": "스터디",
    "content": "오후 7시 정문 앞",
    "created_at": "2026-05-26T09:15:00Z"
  }
]
```

**호출 예시**
```bash
curl http://localhost:8000/api/memos/
```

---

### 2️⃣ `POST /api/memos/` — 메모 생성

**Request — Body**
```json
{
  "title": "장보기",
  "content": "우유, 빵, 계란"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `title` | string | ✅ | 1~50자 |
| `content` | string | ❌ | 최대 500자 |

**Response — 201 Created**
```json
{
  "id": 3,
  "title": "장보기",
  "content": "우유, 빵, 계란",
  "created_at": "2026-05-26T11:00:00Z"
}
```

**Response — 400 Bad Request**
```json
{ "error": "title은 필수입니다" }
```

---

### 3️⃣ `GET /api/memos/<id>/` — 메모 단일 조회

**Request**
- Path: `id` (integer)

**Response — 200 OK**
```json
{
  "id": 1,
  "title": "장보기",
  "content": "우유, 빵, 계란",
  "created_at": "2026-05-26T10:30:00Z"
}
```

**Response — 404 Not Found**
```json
{ "error": "해당 메모를 찾을 수 없습니다" }
```

---

### 4️⃣ `PATCH /api/memos/<id>/` — 메모 부분 수정

**Request — Body** (보낸 필드만 업데이트)
```json
{
  "title": "장보기 (수정됨)"
}
```

**Response — 200 OK**
```json
{
  "id": 1,
  "title": "장보기 (수정됨)",
  "content": "우유, 빵, 계란",
  "created_at": "2026-05-26T10:30:00Z"
}
```

> 💡 `PATCH`는 부분 수정. `PUT`은 전체 교체. 우리는 일부만 바꾸므로 PATCH.

---

### 5️⃣ `DELETE /api/memos/<id>/` — 메모 삭제

**Request**
- Path: `id`

**Response — 204 No Content**
- 응답 본문 없음

---

### 6️⃣ `GET /api/memos/?q=keyword` — 키워드 검색

**Request — Query**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | ✅ | 제목에 포함되는 키워드 |

**Response — 200 OK**
- 형식은 1번과 동일, 필터링된 결과

---

## 3. 외부 API (R7 충족용)

| API | Method | URL | 인증 | 용도 |
|---|---|---|---|---|
| 명언 API | GET | `https://dummyjson.com/quotes/random` | 없음 | 메모 작성 화면 영감 |

> 외부 API 호출은 **백엔드에서 프록시** 처리할 수도 있고, **프론트에서 직접** 호출할 수도 있다. API 키가 필요한 경우 반드시 백엔드 프록시로 처리할 것 (키 노출 방지).

---

## 4. CORS 설정 메모

```python
# backend/mysite/settings.py
INSTALLED_APPS = [..., 'corsheaders']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...]

# 개발용
CORS_ALLOW_ALL_ORIGINS = True

# 배포 시 (개발용 제거하고 화이트리스트로)
CORS_ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
]
```

---

## 5. 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|---|---|---|
| 2026-05-26 | 초안 작성 | 홍길동 |
| | | |
