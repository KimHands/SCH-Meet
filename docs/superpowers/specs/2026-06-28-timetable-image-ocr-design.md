# 시간표 이미지 OCR 업로드 설계

- 날짜: 2026-06-28
- 상태: 승인됨 (구현 대기)
- 관련 기능: B-04 `/api/timetables/upload-image/`

## 배경 / 목적

현재 시간표 등록은 에브리타임 URL 파싱만 동작하고, 이미지 업로드(`timetable_upload_image`)는
`not_implemented` 상태다. 사용자가 **에브리타임 캡쳐(격자형 이미지)** 를 올리면 OCR로 과목을
인식해 시간표로 등록할 수 있게 한다.

OCR 자체는 [OCR.space API](https://ocr.space/ocrapi)를 사용한다. OCR 결과(텍스트+단어 좌표)를
격자 구조로 복원하는 것이 이 기능의 핵심 난관이며, OCR은 100% 정확하지 않으므로
**"미리보기 후 확정"** 흐름으로 사용자가 검토·수정한 뒤 저장한다.

## 결정 사항 (확정)

- 이미지 형태: **에타 캡쳐(격자형)** 중심
- 결과 처리: **미리보기 후 확정** (파싱 즉시 저장하지 않음)
- 범위: **백엔드 + 프론트 전체**
- 파싱 전략: **A. 격자 기하 복원** (OCR 단어 좌표로 요일 열/시간 행 복원)
  - B(평문 휴리스틱)는 신뢰도 낮아 제외, C(LLM 보조)는 LLM 키 미설정으로 향후 과제로 보류

## 아키텍처 / 컴포넌트

### 백엔드 (Django)

- 신규 모듈 `server/apps/api/endpoints/ocr.py` — OCR 호출 + 격자 파싱 로직 격리
  - `call_ocr_space(image_bytes, filename)` → overlay 단어 목록 반환
  - `parse_timetable_grid(words)` → 과목 리스트 반환 (순수 함수, 테스트 용이)
- `server/apps/api/endpoints/timetables.py`
  - `timetable_upload_image` 구현 (현재 `not_implemented` 교체)
  - 신규 `timetable_image_confirm` 추가
- `server/apps/api/urls.py` — `timetables/image/confirm/` 라우트 추가
- `server/config/settings.py` — `OCR_SPACE_API_KEY` 환경변수 읽기
  - `.env`에 실제 키 저장(gitignore), `.env.example`엔 플레이스홀더

### 프론트 (React)

- `frontend/src/pages/TimetableUploadPage.jsx` — "준비중" 박스를 실제 파일 업로드 영역으로 교체
- 신규 `frontend/src/pages/TimetablePreviewPage.jsx` — 파싱 결과 표 + 행 수정/삭제/추가 후 확정
- `frontend/src/api/timetable.js` — `confirmTimetableImage(classes)` 추가
- `frontend/src/App.jsx` — `/upload-timetable/preview` 라우트 추가

## 데이터 흐름

```
[파일 선택] → POST /upload-image/ (multipart)
   → OCR.space 호출 → 격자 파싱 → 파싱결과 반환 (저장 X)
→ [미리보기/수정 화면] → POST /image/confirm/ (JSON)
   → 검증 → source='image' 기존 삭제 후 저장 → {status, count}
→ [토스트 "N개 등록"] → 다음 단계
```

## API 계약

### ① POST /api/timetables/upload-image/ (multipart, 인증 필요)

- 요청: `file` (JPG/PNG/HEIC, **최대 1MB** — OCR.space 무료 한도)
- 저장하지 않음. 사람이 읽는 `start_time/end_time`(HH:MM)으로 반환.
- 응답 200:

```json
{
  "status": "parsed",
  "parsed_classes_count": 5,
  "parsed_classes": [
    {"name": "자료구조", "day": "MON",
     "start_time": "09:00", "end_time": "10:30",
     "place": "", "professor": ""}
  ],
  "warnings": [
    "종료 시간은 추정값입니다. 미리보기에서 확인·수정해 주세요",
    "요일 헤더를 일부 인식하지 못해 균등 분할로 추정했습니다"
  ]
}
```

### ② POST /api/timetables/image/confirm/ (JSON, 인증 필요)

- 요청: `{ "classes": [ {name, day, start_time, end_time, place?, professor?}, ... ] }`
- 검증: day ∈ 요일코드, time는 HH:MM, end>start, name 필수, 개수 상한 50
- 처리: `TimetableClass.objects.filter(user, source='image').delete()` 후 `bulk_create`
  (URL 업로드가 `source='everytime'`을 지우는 패턴과 동일)
- 응답 200: `{ "status": "success", "parsed_classes_count": 5 }`

### OCR.space 제약

- 무료 키: 파일당 **1MB 제한**
- 호출 파라미터: **엔진1 + language=kor + isOverlayRequired=true**
- 1MB 초과 시 프론트에서 사전 차단 + 백엔드 413 응답

## 격자 파싱 알고리즘 (`parse_timetable_grid`)

입력: 각 단어 `{text, x, y, w, h}` (x/y는 중심 좌표)

1. **요일 열 경계 산출**
   - 상단 밴드(y 최소)에서 `월화수목금토일`(또는 `월요일`…) 매칭 → 헤더 x중심으로 열 경계
   - 폴백: 헤더 미검출 시 콘텐츠 x범위 5등분(월~금) + `warnings`
2. **시간 행 매핑 (y → 분)**
   - 좌측 밴드(x 최소)에서 숫자/`HH:MM` 라벨 탐색 → `(y, 분)` 선형 회귀 (minute = a·y + b)
   - 폴백: 라벨 미검출 시 격자 상단 y=09:00, 한 시간=평균 행높이 추정 + `warnings`
3. **셀 클러스터링 → 과목**
   - 헤더/시간 라벨 제외 단어를 같은 요일 열 내 y 인접도로 묶음
   - 클러스터: `name`=첫 줄 단어 join, `place`=나머지 줄(있으면), `day`=열
   - **시작 시간**: 클러스터 최상단 y → 회귀 환산 후 **30분 단위 스냅** (텍스트가 셀 위쪽에
     몰려 있어 시작은 비교적 정확)
   - **종료 시간**: OCR은 색칠된 셀 사각형이 아닌 글자만 인식하므로 셀 높이를 알 수 없음.
     **시작 + 60분 기본값**으로 채우고 `warnings`에 "종료 시간은 추정값이니 확인 필요" 표시.
     → 사용자가 미리보기에서 수정
   - 08:00~22:00 클램프
4. 결과를 `start_time/end_time`(HH:MM)으로 직렬화

## 에러 처리

| 상황 | 응답 |
|------|------|
| 파일 없음/빈 파일 | 400 `파일이 필요합니다` |
| 1MB 초과 | 413 `이미지는 1MB 이하만 가능합니다` |
| OCR.space 통신 실패/타임아웃 | 502 `OCR 서비스 연결 실패` |
| OCR 키 미설정 | 503 `OCR 미설정` |
| 단어 0개/과목 0개 인식 | 200 `parsed_classes: []` + `warnings` (에러 아님) |
| confirm 검증 실패 | 400 + 구체 사유 |

파싱은 불확실성을 숨기지 않고 `warnings`로 노출 → 사용자가 미리보기에서 판단·수정.

## 테스트 전략

### 백엔드 (`manage.py test`)

- `parse_timetable_grid` 단위 테스트 (가짜 단어 좌표 fixture, OCR 호출 없음)
  - 정상 격자 → 기대 과목 리스트(시작 시간 정확, 종료=시작+60)
  - 헤더 누락 → 5등분 폴백 + warnings
  - 시간 라벨 누락 → 시각 추정 폴백 + warnings
  - 빈 입력 → `[]`
  - 시작 30분 스냅 / 08:00~22:00 클램프 / 종료=시작+60 경계값
  - 종료 추정 warning 항상 포함
- 엔드포인트 테스트 (`call_ocr_space` monkeypatch 모킹)
  - upload-image 정상 → 200 + parsed_classes, **DB 미저장 확인**
  - 파일 없음 400 / 1MB 초과 413 / 미인증 401
  - image/confirm 정상 → DB 저장 + 기존 source='image' 교체
  - confirm 검증 실패 → 400
- 실제 OCR.space 통신은 **수동 검증** (샘플 에타 캡쳐 1장 실제 호출)

### 프론트 (수동 검증)

- 테스트 러너 미도입(YAGNI). 실제 업로드 → 미리보기 → 수정/삭제/추가 → 확정 → 토스트 확인
- 1MB 초과 사전 차단 확인

## 비범위 (Non-goals)

- LLM 보조 파싱 (향후 과제)
- 종이/PDF/손글씨 등 비격자 이미지 정밀 지원 (best-effort만)
- 프론트 자동화 테스트 도입
