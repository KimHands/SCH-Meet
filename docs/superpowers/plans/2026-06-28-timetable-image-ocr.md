# 시간표 이미지 OCR 업로드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에브리타임 캡쳐(격자형) 이미지를 OCR.space로 인식해 시간표 과목을 추정하고, 사용자가 미리보기에서 수정·확정한 뒤 저장한다.

**Architecture:** OCR 호출과 격자 파싱을 신규 `ocr.py`에 격리(파싱은 순수 함수로 단위 테스트). `upload-image` 엔드포인트는 파싱 결과만 반환(저장 X), `image/confirm` 엔드포인트가 검증 후 `source='image'`로 저장. 프론트는 업로드 → 미리보기/수정 페이지 → 확정.

**Tech Stack:** Django 6.0 (함수형 뷰 + JsonResponse), `requests`, React 18 + Vite + React Router 6.

## Global Constraints

- OCR.space 무료 키 제약: 파일당 **1MB**, 호출은 **OCREngine=1 + language=kor + isOverlayRequired=true**.
- 시각 단위: 내부는 분(minute) 정수, 외부 계약은 `HH:MM` 문자열.
- 요일 코드: `['MON','TUE','WED','THU','FRI','SAT','SUN']`.
- 추천/시각 윈도우: 08:00(480) ~ 22:00(1320)로 클램프.
- 저장 시 `source='image'`, 재업로드 시 기존 `source='image'` 항목 삭제 후 교체(URL 업로드가 `source='everytime'`을 교체하는 패턴과 동일).
- 모든 엔드포인트는 `@csrf_exempt` + `_get_authorized_user(request)`로 Bearer JWT 인증.
- 설명/주석/사용자 메시지는 한국어.

---

### Task 1: 백엔드 OCR 설정 (API 키)

**Files:**
- Modify: `server/config/settings.py` (끝부분, FRONTEND_BASE_URL 아래)
- Modify: `server/.env.example`
- Create: `server/.env` (gitignore됨 — `.gitignore`에 `.env` 포함 확인)

**Interfaces:**
- Produces: `settings.OCR_SPACE_API_KEY` (str, 미설정 시 `''`)

- [ ] **Step 1: `.env`에 키 저장**

`server/.env` 파일을 생성하고 다음을 기록(이미 존재하면 줄만 추가):

```
OCR_SPACE_API_KEY=K82796185288957
```

- [ ] **Step 2: `.env.example`에 플레이스홀더 추가**

`server/.env.example` 끝에 추가:

```
# OCR.space (시간표 이미지 인식)
OCR_SPACE_API_KEY=
```

- [ ] **Step 3: settings.py에서 환경변수 읽기**

`server/config/settings.py` 맨 끝(FRONTEND_BASE_URL 줄 아래)에 추가. `.env` 로더가 이미 위에서 `os.environ`을 채우므로 그 아래에 둔다:

```python
# OCR.space API key for timetable image recognition
OCR_SPACE_API_KEY = os.environ.get('OCR_SPACE_API_KEY', '')
```

- [ ] **Step 4: `.env`가 gitignore되는지 확인**

Run: `cd server && git check-ignore .env`
Expected: `.env` (출력되면 무시됨). 출력이 없으면 `server/.gitignore`에 `.env` 한 줄 추가.

- [ ] **Step 5: 설정 로딩 확인**

Run: `cd server && python -c "import django,os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup(); from django.conf import settings; print(bool(settings.OCR_SPACE_API_KEY))"`
Expected: `True`

- [ ] **Step 6: Commit**

```bash
git add server/config/settings.py server/.env.example
git commit -m "feat: OCR.space API 키 설정 추가"
```

(`.env`는 커밋하지 않는다 — gitignore 대상)

---

### Task 2: 격자 파싱 순수 함수 (`parse_timetable_grid`)

OCR 호출 없이 단어 좌표 리스트만으로 과목을 추정하는 순수 로직. 가장 핵심이며 단위 테스트로 검증한다.

**Files:**
- Create: `server/apps/api/endpoints/ocr.py` (파싱 부분)
- Create: `server/apps/api/tests/__init__.py`
- Create: `server/apps/api/tests/test_ocr_parse.py`

**Interfaces:**
- Produces:
  - `parse_timetable_grid(words: list[dict]) -> dict`
    - 입력 각 단어: `{'text': str, 'x': float, 'y': float, 'w': float, 'h': float}` (x,y는 중심 좌표)
    - 반환: `{'classes': list[dict], 'warnings': list[str]}`
    - 각 class: `{'name': str, 'day': str, 'start_time': 'HH:MM', 'end_time': 'HH:MM', 'place': str, 'professor': str}`
  - 모듈 상수: `DAY_CODES`, `DAY_HEADERS`, `WINDOW_START=480`, `WINDOW_END=1320`, `DEFAULT_DURATION=60`

- [ ] **Step 1: 테스트 패키지 init 생성**

`server/apps/api/tests/__init__.py` — 빈 파일.

- [ ] **Step 2: 실패하는 테스트 작성**

`server/apps/api/tests/test_ocr_parse.py`:

```python
from django.test import SimpleTestCase

from api.endpoints.ocr import parse_timetable_grid


def _w(text, x, y, w=20, h=20):
    return {'text': text, 'x': x, 'y': y, 'w': w, 'h': h}


# y→분 매핑: 시간라벨 9(y=50)->540, 12(y=230)->720  => 1px=1분, minute(y)=540+(y-50)
def _base_words():
    return [
        # 요일 헤더 (상단)
        _w('월', 100, 10), _w('화', 200, 10),
        # 좌측 시간 라벨
        _w('9', 20, 50), _w('12', 20, 230),
        # 월요일 9시 수업 (텍스트는 셀 상단, y=60 -> top=50 -> 540=09:00)
        _w('자료구조', 100, 60),
        # 화요일 10시 수업 (y=120 -> top=110 -> 600=10:00)
        _w('운영체제', 200, 120),
    ]


class ParseTimetableGridTest(SimpleTestCase):
    def test_normal_grid_extracts_classes(self):
        result = parse_timetable_grid(_base_words())
        classes = result['classes']
        self.assertEqual(len(classes), 2)

        mon = next(c for c in classes if c['day'] == 'MON')
        self.assertEqual(mon['name'], '자료구조')
        self.assertEqual(mon['start_time'], '09:00')
        self.assertEqual(mon['end_time'], '10:00')  # 시작 + 60분

        tue = next(c for c in classes if c['day'] == 'TUE')
        self.assertEqual(tue['name'], '운영체제')
        self.assertEqual(tue['start_time'], '10:00')

    def test_end_time_is_always_estimated_warning(self):
        result = parse_timetable_grid(_base_words())
        self.assertTrue(any('종료' in w for w in result['warnings']))

    def test_empty_input_returns_no_classes(self):
        result = parse_timetable_grid([])
        self.assertEqual(result['classes'], [])
        self.assertTrue(result['warnings'])

    def test_missing_day_header_falls_back_and_warns(self):
        words = [
            _w('9', 20, 50), _w('12', 20, 230),
            _w('자료구조', 300, 60),  # 헤더 없음
        ]
        result = parse_timetable_grid(words)
        self.assertEqual(len(result['classes']), 1)
        self.assertTrue(any('요일' in w for w in result['warnings']))

    def test_missing_time_labels_falls_back_and_warns(self):
        words = [
            _w('월', 100, 10), _w('화', 200, 10),
            _w('자료구조', 100, 60),
        ]
        result = parse_timetable_grid(words)
        self.assertEqual(len(result['classes']), 1)
        self.assertTrue(any('시간' in w for w in result['warnings']))

    def test_start_time_snaps_to_30_minutes(self):
        # y=65 -> top=55 -> 545분 -> 30분 스냅 -> 540(09:00)
        words = [
            _w('월', 100, 10), _w('화', 200, 10),
            _w('9', 20, 50), _w('12', 20, 230),
            _w('알고리즘', 100, 65),
        ]
        result = parse_timetable_grid(words)
        self.assertEqual(result['classes'][0]['start_time'], '09:00')

    def test_times_are_clamped_to_window(self):
        result = parse_timetable_grid(_base_words())
        for c in result['classes']:
            self.assertGreaterEqual(c['start_time'], '08:00')
            self.assertLessEqual(c['end_time'], '22:00')
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `cd server && python manage.py test api.tests.test_ocr_parse -v 2`
Expected: FAIL (`ModuleNotFoundError` 또는 `cannot import name 'parse_timetable_grid'`)

- [ ] **Step 4: 파싱 구현 작성**

`server/apps/api/endpoints/ocr.py` 생성 (이 Task는 파싱 부분만, OCR HTTP는 Task 3에서 같은 파일에 추가):

```python
import re

DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
DAY_HEADERS = {'월': 'MON', '화': 'TUE', '수': 'WED', '목': 'THU', '금': 'FRI', '토': 'SAT', '일': 'SUN'}

WINDOW_START = 8 * 60      # 480
WINDOW_END = 22 * 60       # 1320
FALLBACK_TOP_MINUTE = 9 * 60    # 540
FALLBACK_BOTTOM_MINUTE = 21 * 60  # 1260
DEFAULT_DURATION = 60

WARN_END_ESTIMATE = '종료 시간은 추정값입니다. 미리보기에서 확인·수정해 주세요'
WARN_NO_HEADER = '요일 헤더를 인식하지 못해 월~금 균등 분할로 추정했습니다'
WARN_NO_TIME = '시간 라벨을 인식하지 못해 시각을 추정했습니다'
WARN_NO_TEXT = '이미지에서 글자를 인식하지 못했습니다'


def _word_top(word):
    return word['y'] - word['h'] / 2


def _word_bottom(word):
    return word['y'] + word['h'] / 2


def _clamp_minute(minute):
    return int(max(WINDOW_START, min(WINDOW_END, minute)))


def _snap_30(minute):
    return int(round(minute / 30.0)) * 30


def _minute_to_clock(minute):
    return f'{minute // 60:02d}:{minute % 60:02d}'


def _parse_time_label(text):
    cleaned = text.strip()
    match = re.match(r'^(\d{1,2}):(\d{2})$', cleaned)
    if match:
        return int(match.group(1)) * 60 + int(match.group(2))
    match = re.match(r'^(\d{1,2})$', cleaned)
    if match:
        hour = int(match.group(1))
        if 0 <= hour <= 23:
            return hour * 60
    return None


def _day_code_for_header(text):
    cleaned = text.strip()
    if cleaned in DAY_HEADERS:
        return DAY_HEADERS[cleaned]
    if cleaned and cleaned[0] in DAY_HEADERS and '요일' in cleaned:
        return DAY_HEADERS[cleaned[0]]
    return None


def _detect_day_columns(words):
    found = {}  # code -> (x, word) — 같은 요일이 여러 번이면 최상단(작은 y) 채택
    for word in words:
        code = _day_code_for_header(word['text'])
        if code and (code not in found or word['y'] < found[code][1]['y']):
            found[code] = (word['x'], word)

    if len(found) >= 2:
        headers = sorted(
            [(x, code, word) for code, (x, word) in found.items()],
            key=lambda item: item[0],
        )
        ranges = {}
        for index, (x, code, _word) in enumerate(headers):
            low = float('-inf') if index == 0 else (headers[index - 1][0] + x) / 2
            high = float('inf') if index == len(headers) - 1 else (headers[index + 1][0] + x) / 2
            ranges[code] = (low, high)
        header_ids = {id(word) for _x, _code, word in headers}
        return ranges, header_ids, None

    # 폴백: 콘텐츠 x범위를 월~금 5등분
    xs = [word['x'] for word in words]
    x_min, x_max = min(xs), max(xs)
    span = (x_max - x_min) or 1.0
    ranges = {}
    for index, code in enumerate(DAY_CODES[:5]):
        low = float('-inf') if index == 0 else x_min + span * index / 5
        high = float('inf') if index == 4 else x_min + span * (index + 1) / 5
        ranges[code] = (low, high)
    return ranges, set(), WARN_NO_HEADER


def _build_time_mapping(words):
    labels = []  # (y, minute, word)
    for word in words:
        minute = _parse_time_label(word['text'])
        if minute is not None:
            labels.append((word['y'], minute, word))

    label_ids = {id(word) for _y, _m, word in labels}

    if len(labels) >= 2:
        labels.sort(key=lambda item: item[0])
        y0, m0, _ = labels[0]
        y1, m1, _ = labels[-1]
        slope = 0.0 if y1 == y0 else (m1 - m0) / (y1 - y0)

        def mapping(y):
            return m0 + slope * (y - y0)

        return mapping, label_ids, None

    # 폴백: 콘텐츠 상단=09:00, 하단=21:00 선형
    ys = [word['y'] for word in words]
    y_min, y_max = min(ys), max(ys)
    if y_max == y_min:
        def mapping(y):
            return FALLBACK_TOP_MINUTE
    else:
        slope = (FALLBACK_BOTTOM_MINUTE - FALLBACK_TOP_MINUTE) / (y_max - y_min)

        def mapping(y):
            return FALLBACK_TOP_MINUTE + slope * (y - y_min)

    return mapping, label_ids, WARN_NO_TIME


def _cluster_by_y(column_words):
    if not column_words:
        return []
    ordered = sorted(column_words, key=lambda word: word['y'])
    clusters = [[ordered[0]]]
    for word in ordered[1:]:
        prev = clusters[-1][-1]
        gap = _word_top(word) - _word_bottom(prev)
        avg_height = (prev['h'] + word['h']) / 2
        if gap > avg_height * 0.8:
            clusters.append([word])
        else:
            clusters[-1].append(word)
    return clusters


def _group_lines(cluster):
    ordered = sorted(cluster, key=lambda word: word['y'])
    lines = [[ordered[0]]]
    for word in ordered[1:]:
        prev = lines[-1][-1]
        if abs(word['y'] - prev['y']) <= max(word['h'], prev['h']) * 0.6:
            lines[-1].append(word)
        else:
            lines.append([word])
    return [
        ' '.join(w['text'] for w in sorted(line, key=lambda word: word['x']))
        for line in lines
    ]


def parse_timetable_grid(words):
    if not words:
        return {'classes': [], 'warnings': [WARN_NO_TEXT]}

    warnings = [WARN_END_ESTIMATE]

    ranges, header_ids, header_warn = _detect_day_columns(words)
    if header_warn:
        warnings.append(header_warn)

    y_to_minute, label_ids, time_warn = _build_time_mapping(words)
    if time_warn:
        warnings.append(time_warn)

    consumed = header_ids | label_ids
    content = [word for word in words if id(word) not in consumed]

    classes = []
    for code, (x_low, x_high) in ranges.items():
        column_words = [w for w in content if x_low <= w['x'] < x_high]
        for cluster in _cluster_by_y(column_words):
            top_minute = y_to_minute(min(_word_top(w) for w in cluster))
            start_minute = _clamp_minute(_snap_30(top_minute))
            end_minute = _clamp_minute(start_minute + DEFAULT_DURATION)
            if end_minute <= start_minute:
                continue
            lines = _group_lines(cluster)
            classes.append({
                'name': lines[0],
                'day': code,
                'start_time': _minute_to_clock(start_minute),
                'end_time': _minute_to_clock(end_minute),
                'place': lines[1] if len(lines) > 1 else '',
                'professor': '',
            })

    classes.sort(key=lambda c: (DAY_CODES.index(c['day']), c['start_time']))
    return {'classes': classes, 'warnings': warnings}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `cd server && python manage.py test api.tests.test_ocr_parse -v 2`
Expected: PASS (7 tests OK)

- [ ] **Step 6: Commit**

```bash
git add server/apps/api/endpoints/ocr.py server/apps/api/tests/__init__.py server/apps/api/tests/test_ocr_parse.py
git commit -m "feat: 시간표 격자 OCR 파싱 순수 함수 구현"
```

---

### Task 3: OCR.space HTTP 호출 래퍼 (`call_ocr_space`)

**Files:**
- Modify: `server/apps/api/endpoints/ocr.py` (상단 import + 함수 추가)
- Create: `server/apps/api/tests/test_ocr_call.py`

**Interfaces:**
- Consumes: `settings.OCR_SPACE_API_KEY` (Task 1)
- Produces:
  - `call_ocr_space(image_bytes: bytes, filename: str) -> list[dict]` — `parse_timetable_grid`이 받는 단어 dict 리스트 반환
  - 예외: `OcrNotConfigured`, `OcrServiceError` (둘 다 `OcrError` 하위)
  - `extract_words_from_response(data: dict) -> list[dict]` (테스트/내부용)

- [ ] **Step 1: 실패하는 테스트 작성**

`server/apps/api/tests/test_ocr_call.py`:

```python
from django.test import SimpleTestCase

from api.endpoints.ocr import extract_words_from_response


class ExtractWordsTest(SimpleTestCase):
    def test_extracts_word_centers_from_overlay(self):
        data = {
            'ParsedResults': [{
                'TextOverlay': {
                    'Lines': [{
                        'Words': [
                            {'WordText': '월', 'Left': 90, 'Top': 0, 'Width': 20, 'Height': 20},
                        ]
                    }]
                }
            }]
        }
        words = extract_words_from_response(data)
        self.assertEqual(len(words), 1)
        self.assertEqual(words[0]['text'], '월')
        self.assertEqual(words[0]['x'], 100)  # 90 + 20/2
        self.assertEqual(words[0]['y'], 10)   # 0 + 20/2

    def test_skips_empty_words_and_missing_overlay(self):
        data = {'ParsedResults': [{'TextOverlay': {'Lines': [{'Words': [
            {'WordText': '  ', 'Left': 1, 'Top': 1, 'Width': 1, 'Height': 1},
        ]}]}}]}
        self.assertEqual(extract_words_from_response(data), [])

    def test_handles_no_parsed_results(self):
        self.assertEqual(extract_words_from_response({}), [])
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd server && python manage.py test api.tests.test_ocr_call -v 2`
Expected: FAIL (`cannot import name 'extract_words_from_response'`)

- [ ] **Step 3: 구현 추가**

`server/apps/api/endpoints/ocr.py` 상단 `import re` 아래에 추가:

```python
import requests
from django.conf import settings

OCR_SPACE_URL = 'https://api.ocr.space/parse/image'
OCR_TIMEOUT_SECONDS = 30


class OcrError(Exception):
    pass


class OcrNotConfigured(OcrError):
    pass


class OcrServiceError(OcrError):
    pass


def extract_words_from_response(data):
    words = []
    for result in data.get('ParsedResults') or []:
        overlay = result.get('TextOverlay') or {}
        for line in overlay.get('Lines') or []:
            for word in line.get('Words') or []:
                text = (word.get('WordText') or '').strip()
                if not text:
                    continue
                left = float(word.get('Left', 0))
                top = float(word.get('Top', 0))
                width = float(word.get('Width', 0))
                height = float(word.get('Height', 0))
                words.append({
                    'text': text,
                    'x': left + width / 2,
                    'y': top + height / 2,
                    'w': width,
                    'h': height,
                })
    return words


def call_ocr_space(image_bytes, filename):
    api_key = getattr(settings, 'OCR_SPACE_API_KEY', '')
    if not api_key:
        raise OcrNotConfigured()

    try:
        response = requests.post(
            OCR_SPACE_URL,
            files={'file': (filename or 'image.png', image_bytes)},
            data={
                'apikey': api_key,
                'language': 'kor',
                'isOverlayRequired': 'true',
                'OCREngine': '1',
            },
            timeout=OCR_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise OcrServiceError(str(exc))

    if response.status_code != 200:
        raise OcrServiceError(f'OCR status {response.status_code}')

    try:
        data = response.json()
    except ValueError:
        raise OcrServiceError('OCR 응답을 해석할 수 없습니다')

    if data.get('IsErroredOnProcessing'):
        raise OcrServiceError(str(data.get('ErrorMessage')))

    return extract_words_from_response(data)
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd server && python manage.py test api.tests.test_ocr_call -v 2`
Expected: PASS (3 tests OK)

- [ ] **Step 5: Commit**

```bash
git add server/apps/api/endpoints/ocr.py server/apps/api/tests/test_ocr_call.py
git commit -m "feat: OCR.space 호출 및 응답 파싱 래퍼 추가"
```

---

### Task 4: `upload-image` 엔드포인트 (파싱 결과 반환, 저장 X)

**Files:**
- Modify: `server/apps/api/endpoints/timetables.py` (`timetable_upload_image` 교체)
- Create: `server/apps/api/tests/test_timetable_image_endpoints.py` (이 Task에서 생성, Task 5에서 확장)

**Interfaces:**
- Consumes: `call_ocr_space`, `parse_timetable_grid`, `OcrNotConfigured`, `OcrServiceError` (ocr.py); `_get_authorized_user` (user.py)
- Produces: `POST /api/timetables/upload-image/` — multipart `file` → 200 `{status:'parsed', parsed_classes_count, parsed_classes, warnings}`. 413/400/401/502/503 에러.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/apps/api/tests/test_timetable_image_endpoints.py`:

```python
import datetime
import jwt
from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, Client

from api.endpoints import ocr
from api.models import TimetableClass


def _access_token(user):
    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=60),
        'iat': datetime.datetime.utcnow(),
        'type': 'access',
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class UploadImageTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='kim', email='kim@test.com')
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {_access_token(self.user)}'}

    def _fake_words(self, *args, **kwargs):
        return [
            {'text': '월', 'x': 100, 'y': 10, 'w': 20, 'h': 20},
            {'text': '9', 'x': 20, 'y': 50, 'w': 20, 'h': 20},
            {'text': '12', 'x': 20, 'y': 230, 'w': 20, 'h': 20},
            {'text': '자료구조', 'x': 100, 'y': 60, 'w': 40, 'h': 20},
            {'text': '화', 'x': 200, 'y': 10, 'w': 20, 'h': 20},
            {'text': '운영체제', 'x': 200, 'y': 120, 'w': 40, 'h': 20},
        ]

    def test_requires_auth(self):
        res = self.client.post('/api/timetables/upload-image/')
        self.assertEqual(res.status_code, 401)

    def test_missing_file_returns_400(self):
        res = self.client.post('/api/timetables/upload-image/', **self.auth)
        self.assertEqual(res.status_code, 400)

    def test_oversize_file_returns_413(self):
        big = SimpleUploadedFile('t.png', b'x' * (1024 * 1024 + 1), content_type='image/png')
        res = self.client.post('/api/timetables/upload-image/', {'file': big}, **self.auth)
        self.assertEqual(res.status_code, 413)

    def test_parses_and_does_not_save(self):
        ocr.call_ocr_space = self._fake_words  # monkeypatch
        try:
            upload = SimpleUploadedFile('t.png', b'imgbytes', content_type='image/png')
            res = self.client.post('/api/timetables/upload-image/', {'file': upload}, **self.auth)
        finally:
            pass
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body['status'], 'parsed')
        self.assertEqual(body['parsed_classes_count'], 2)
        self.assertTrue(any('종료' in w for w in body['warnings']))
        # 저장되지 않아야 함
        self.assertEqual(TimetableClass.objects.filter(user=self.user).count(), 0)

    def test_ocr_not_configured_returns_503(self):
        def _raise(*a, **k):
            raise ocr.OcrNotConfigured()
        ocr.call_ocr_space = _raise
        upload = SimpleUploadedFile('t.png', b'imgbytes', content_type='image/png')
        res = self.client.post('/api/timetables/upload-image/', {'file': upload}, **self.auth)
        self.assertEqual(res.status_code, 503)

    def test_ocr_service_error_returns_502(self):
        def _raise(*a, **k):
            raise ocr.OcrServiceError('boom')
        ocr.call_ocr_space = _raise
        upload = SimpleUploadedFile('t.png', b'imgbytes', content_type='image/png')
        res = self.client.post('/api/timetables/upload-image/', {'file': upload}, **self.auth)
        self.assertEqual(res.status_code, 502)

    def tearDown(self):
        # 원본 함수 복구
        import importlib
        importlib.reload(ocr)
```

> 참고: 엔드포인트는 `from . import ocr` 후 `ocr.call_ocr_space(...)`로 호출해야 monkeypatch가 먹는다(아래 구현 주의).

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd server && python manage.py test api.tests.test_timetable_image_endpoints -v 2`
Expected: FAIL (현재 501 not_implemented 반환 → 여러 단언 실패)

- [ ] **Step 3: 엔드포인트 구현**

`server/apps/api/endpoints/timetables.py` 상단 import에 추가:

```python
from . import ocr
```

그리고 기존 `timetable_upload_image` 함수를 다음으로 **교체**:

```python
MAX_IMAGE_BYTES = 1024 * 1024  # OCR.space 무료 한도 1MB


@csrf_exempt
def timetable_upload_image(request):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    upload = request.FILES.get('file')
    if not upload or upload.size == 0:
        return JsonResponse({'detail': '파일이 필요합니다'}, status=400)
    if upload.size > MAX_IMAGE_BYTES:
        return JsonResponse({'detail': '이미지는 1MB 이하만 가능합니다'}, status=413)

    try:
        words = ocr.call_ocr_space(upload.read(), upload.name)
    except ocr.OcrNotConfigured:
        return JsonResponse({'detail': 'OCR 기능이 설정되지 않았습니다'}, status=503)
    except ocr.OcrServiceError:
        return JsonResponse({'detail': 'OCR 서비스 연결에 실패했습니다'}, status=502)

    parsed = ocr.parse_timetable_grid(words)
    return JsonResponse(
        {
            'status': 'parsed',
            'parsed_classes_count': len(parsed['classes']),
            'parsed_classes': parsed['classes'],
            'warnings': parsed['warnings'],
        },
        status=200,
    )
```

> `csrf_exempt`, `JsonResponse`, `method_not_allowed`, `_get_authorized_user`는 이미 timetables.py에 import되어 있다. `ocr.parse_timetable_grid`도 `ocr` 모듈을 통해 접근한다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd server && python manage.py test api.tests.test_timetable_image_endpoints -v 2`
Expected: PASS (6 tests OK)

- [ ] **Step 5: Commit**

```bash
git add server/apps/api/endpoints/timetables.py server/apps/api/tests/test_timetable_image_endpoints.py
git commit -m "feat: 시간표 이미지 업로드 OCR 파싱 엔드포인트 구현"
```

---

### Task 5: `image/confirm` 엔드포인트 (검증 후 저장)

**Files:**
- Modify: `server/apps/api/endpoints/timetables.py` (`timetable_image_confirm` 추가)
- Modify: `server/apps/api/endpoints/__init__.py` (export 추가)
- Modify: `server/apps/api/views.py` (import + `__all__` 추가)
- Modify: `server/apps/api/urls.py` (라우트 추가)
- Modify: `server/apps/api/tests/test_timetable_image_endpoints.py` (확정 테스트 추가)

**Interfaces:**
- Consumes: `_get_authorized_user`, `TimetableClass`
- Produces: `POST /api/timetables/image/confirm/` — JSON `{classes:[{name,day,start_time,end_time,place?,professor?}]}` → 200 `{status:'success', parsed_classes_count}`. 400 검증 실패.

- [ ] **Step 1: 실패하는 테스트 추가**

`server/apps/api/tests/test_timetable_image_endpoints.py` 끝에 클래스 추가:

```python
import json


class ConfirmImageTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='lee', email='lee@test.com')
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {_access_token(self.user)}'}

    def _post(self, payload):
        return self.client.post(
            '/api/timetables/image/confirm/',
            data=json.dumps(payload),
            content_type='application/json',
            **self.auth,
        )

    def test_requires_auth(self):
        res = self.client.post('/api/timetables/image/confirm/',
                               data='{}', content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_saves_classes(self):
        payload = {'classes': [
            {'name': '자료구조', 'day': 'MON', 'start_time': '09:00', 'end_time': '10:00'},
            {'name': '운영체제', 'day': 'TUE', 'start_time': '10:00', 'end_time': '11:00',
             'place': '공학관', 'professor': '김교수'},
        ]}
        res = self._post(payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['parsed_classes_count'], 2)
        saved = TimetableClass.objects.filter(user=self.user, source='image')
        self.assertEqual(saved.count(), 2)
        ds = saved.get(name='자료구조')
        self.assertEqual(ds.day, 'MON')
        self.assertEqual(ds.start_minute, 540)
        self.assertEqual(ds.end_minute, 600)

    def test_replaces_previous_image_classes(self):
        TimetableClass.objects.create(
            user=self.user, source='image', name='이전수업', day='MON',
            start_minute=540, end_minute=600,
        )
        payload = {'classes': [
            {'name': '새수업', 'day': 'WED', 'start_time': '13:00', 'end_time': '14:00'},
        ]}
        self._post(payload)
        names = list(TimetableClass.objects.filter(user=self.user, source='image')
                     .values_list('name', flat=True))
        self.assertEqual(names, ['새수업'])

    def test_does_not_touch_everytime_classes(self):
        TimetableClass.objects.create(
            user=self.user, source='everytime', name='에타수업', day='FRI',
            start_minute=600, end_minute=660,
        )
        self._post({'classes': [{'name': 'x', 'day': 'MON',
                                 'start_time': '09:00', 'end_time': '10:00'}]})
        self.assertEqual(
            TimetableClass.objects.filter(user=self.user, source='everytime').count(), 1)

    def test_rejects_invalid_day(self):
        res = self._post({'classes': [{'name': 'x', 'day': 'XXX',
                                       'start_time': '09:00', 'end_time': '10:00'}]})
        self.assertEqual(res.status_code, 400)

    def test_rejects_bad_time_format(self):
        res = self._post({'classes': [{'name': 'x', 'day': 'MON',
                                       'start_time': '9시', 'end_time': '10:00'}]})
        self.assertEqual(res.status_code, 400)

    def test_rejects_end_before_start(self):
        res = self._post({'classes': [{'name': 'x', 'day': 'MON',
                                       'start_time': '10:00', 'end_time': '09:00'}]})
        self.assertEqual(res.status_code, 400)

    def test_rejects_missing_name(self):
        res = self._post({'classes': [{'name': '', 'day': 'MON',
                                       'start_time': '09:00', 'end_time': '10:00'}]})
        self.assertEqual(res.status_code, 400)

    def test_empty_classes_clears_image_source(self):
        TimetableClass.objects.create(
            user=self.user, source='image', name='이전', day='MON',
            start_minute=540, end_minute=600,
        )
        res = self._post({'classes': []})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['parsed_classes_count'], 0)
        self.assertEqual(TimetableClass.objects.filter(user=self.user, source='image').count(), 0)
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd server && python manage.py test api.tests.test_timetable_image_endpoints.ConfirmImageTest -v 2`
Expected: FAIL (404 — 라우트 없음)

- [ ] **Step 3: 확정 엔드포인트 구현**

`server/apps/api/endpoints/timetables.py`에 함수 추가 (`json`, `transaction`은 이미 import됨):

```python
MAX_CONFIRM_CLASSES = 50
_CLOCK_PATTERN = re.compile(r'^([01]?\d|2[0-3]):([0-5]\d)$')


def _clock_to_minute(value):
    if not isinstance(value, str):
        return None
    match = _CLOCK_PATTERN.match(value.strip())
    if not match:
        return None
    return int(match.group(1)) * 60 + int(match.group(2))


@csrf_exempt
def timetable_image_confirm(request):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    raw_classes = body.get('classes')
    if not isinstance(raw_classes, list):
        return JsonResponse({'detail': 'classes must be a list'}, status=400)
    if len(raw_classes) > MAX_CONFIRM_CLASSES:
        return JsonResponse({'detail': f'최대 {MAX_CONFIRM_CLASSES}개까지 저장할 수 있습니다'}, status=400)

    validated = []
    for index, item in enumerate(raw_classes):
        if not isinstance(item, dict):
            return JsonResponse({'detail': f'{index}번째 항목 형식이 올바르지 않습니다'}, status=400)

        name = (item.get('name') or '').strip()
        if not name:
            return JsonResponse({'detail': f'{index}번째 과목명이 비어 있습니다'}, status=400)

        day = item.get('day')
        if day not in ocr.DAY_CODES:
            return JsonResponse({'detail': f'{index}번째 요일이 올바르지 않습니다'}, status=400)

        start_minute = _clock_to_minute(item.get('start_time'))
        end_minute = _clock_to_minute(item.get('end_time'))
        if start_minute is None or end_minute is None:
            return JsonResponse({'detail': f'{index}번째 시간 형식이 올바르지 않습니다'}, status=400)
        if end_minute <= start_minute:
            return JsonResponse({'detail': f'{index}번째 종료 시간이 시작보다 빠릅니다'}, status=400)

        validated.append({
            'name': name[:200],
            'day': day,
            'start_minute': start_minute,
            'end_minute': end_minute,
            'place': (item.get('place') or '')[:100],
            'professor': (item.get('professor') or '')[:200],
        })

    with transaction.atomic():
        TimetableClass.objects.filter(user=user, source='image').delete()
        TimetableClass.objects.bulk_create([
            TimetableClass(
                user=user,
                source='image',
                name=entry['name'],
                day=entry['day'],
                start_minute=entry['start_minute'],
                end_minute=entry['end_minute'],
                place=entry['place'],
                professor=entry['professor'],
                time_label='이미지 인식',
            )
            for entry in validated
        ])

    return JsonResponse({'status': 'success', 'parsed_classes_count': len(validated)}, status=200)
```

- [ ] **Step 4: 함수 export 연결**

`server/apps/api/endpoints/__init__.py`의 timetables import 줄을 수정:

```python
from .timetables import (
    consolidated_timetables,
    timetable_image_confirm,
    timetable_upload_image,
    timetable_upload_url,
)
```

같은 파일 `__all__` 리스트에 `'timetable_image_confirm',` 추가 (`'timetable_upload_image',` 다음 줄).

`server/apps/api/views.py`의 import 블록에 `timetable_image_confirm,` 추가하고, `__all__`에도 `'timetable_image_confirm',` 추가 (`'timetable_upload_image',` 다음 줄).

- [ ] **Step 5: URL 라우트 추가**

`server/apps/api/urls.py`의 `timetables/upload-image/` 줄 **아래**에 추가:

```python
    path('timetables/image/confirm/', views.timetable_image_confirm, name='timetable-image-confirm'),
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `cd server && python manage.py test api.tests.test_timetable_image_endpoints -v 2`
Expected: PASS (UploadImageTest 6 + ConfirmImageTest 9 = 15 OK)

- [ ] **Step 7: 전체 백엔드 테스트 실행**

Run: `cd server && python manage.py test api -v 1`
Expected: PASS (전체 OK), 마이그레이션 불필요(모델 변경 없음)

- [ ] **Step 8: Commit**

```bash
git add server/apps/api/endpoints/timetables.py server/apps/api/endpoints/__init__.py server/apps/api/views.py server/apps/api/urls.py server/apps/api/tests/test_timetable_image_endpoints.py
git commit -m "feat: 시간표 이미지 확정 저장 엔드포인트 구현"
```

---

### Task 6: 프론트 API 함수 추가/정리

**Files:**
- Modify: `frontend/src/api/timetable.js`

**Interfaces:**
- Consumes: 백엔드 `upload-image/`, `image/confirm/`
- Produces:
  - `uploadTimetableImage(imageFile) -> {status, parsed_classes_count, parsed_classes, warnings}` (기존 함수, 토큰 키 정정)
  - `confirmTimetableImage(classes) -> {status, parsed_classes_count}`

- [ ] **Step 1: 토큰 키 정정 + confirm 함수 추가**

`frontend/src/api/timetable.js`의 `uploadTimetableImage` 함수에서, `client.js`와 일관되게 `localStorage` 키를 `'accessToken'`으로 사용 중인지 확인한다(현재 `'accessToken'`로 되어 있으면 그대로 둔다). 이어서 파일 끝에 `confirmTimetableImage`를 추가:

```javascript
// 이미지 OCR 파싱 결과 확정 저장
// POST /api/timetables/image/confirm/
export async function confirmTimetableImage(classes) {
  return apiClient('/api/timetables/image/confirm/', {
    method: 'POST',
    body: JSON.stringify({ classes }),
  });
  // 응답: { status: "success", parsed_classes_count: 5 }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd frontend && npm install && npm run build`
Expected: 빌드 성공 (에러 없음)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/timetable.js
git commit -m "feat: 시간표 이미지 확정 저장 API 함수 추가"
```

---

### Task 7: 업로드 페이지에 이미지 선택 UI 연결

**Files:**
- Modify: `frontend/src/pages/TimetableUploadPage.jsx`

**Interfaces:**
- Consumes: `uploadTimetableImage` (api/timetable.js)
- Produces: 파일 선택 → 파싱 → `navigate('/upload-timetable/preview', { state: { parsed_classes, warnings } })`

- [ ] **Step 1: import 및 상태 추가**

`frontend/src/pages/TimetableUploadPage.jsx` 상단 import에 `uploadTimetableImage`를 추가하고 `useRef`를 react에서 import:

```javascript
import { useState, useRef } from 'react';
```
```javascript
import { uploadTimetableUrl, uploadTimetableImage } from '../api/timetable';
```

컴포넌트 내부 상태 영역(`const [toast, setToast] = useState('');` 아래)에 추가:

```javascript
  const fileInputRef = useRef(null);
  const [imageLoading, setImageLoading] = useState(false);

  const MAX_IMAGE_BYTES = 1024 * 1024;

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';            // 같은 파일 재선택 허용
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      showToast('이미지는 1MB 이하만 가능합니다.');
      return;
    }
    setImageLoading(true);
    try {
      const data = await uploadTimetableImage(file);
      navigate('/upload-timetable/preview', {
        state: { parsedClasses: data.parsed_classes, warnings: data.warnings },
      });
    } catch (err) {
      showToast(err.message || '이미지 인식에 실패했어요.');
    } finally {
      setImageLoading(false);
    }
  };
```

- [ ] **Step 2: "준비중" 박스를 클릭 가능한 업로드 영역으로 교체**

기존 이미지 업로드 영역(제목 `이미지 업로드` `준비중` 배지 + 점선 박스, 약 76~96행)을 다음으로 교체:

```jsx
        {/* 이미지 업로드 */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="image" size={18} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>이미지 업로드</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/heic"
          onChange={handleImagePick}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => !imageLoading && fileInputRef.current?.click()}
          style={{
            marginTop: 10, width: '100%',
            border: `1.5px dashed ${colors.outlineVariant}`,
            borderRadius: 16,
            backgroundColor: colors.surfaceContainerLow,
            paddingTop: 22, paddingBottom: 22, paddingLeft: 16, paddingRight: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: imageLoading ? 'default' : 'pointer',
            opacity: imageLoading ? 0.6 : 1,
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          <Icon name="cloud_upload" size={34} color={colors.primary} />
          <p style={{ textAlign: 'center', fontSize: 13, lineHeight: '18px', color: colors.onSurfaceVariant }}>
            {imageLoading ? '이미지를 인식하는 중...' : '에타 시간표 캡쳐를 올려주세요'}
          </p>
          <span style={{ fontSize: 11, color: colors.outline }}>JPG, PNG, HEIC 파일 (최대 1MB)</span>
        </button>
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TimetableUploadPage.jsx
git commit -m "feat: 시간표 업로드 페이지 이미지 선택 UI 연결"
```

---

### Task 8: 미리보기/수정 페이지 + 라우트

**Files:**
- Create: `frontend/src/pages/TimetablePreviewPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: router `location.state.parsedClasses`, `location.state.warnings`; `confirmTimetableImage`
- Produces: `/upload-timetable/preview` 라우트. 확정 시 저장 후 `/add-schedule`로 이동.

- [ ] **Step 1: 미리보기 페이지 생성**

`frontend/src/pages/TimetablePreviewPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../styles/theme';
import AppBar from '../components/AppBar';
import Button from '../components/Button';
import { confirmTimetableImage } from '../api/timetable';

const DAY_OPTIONS = [
  { code: 'MON', label: '월' }, { code: 'TUE', label: '화' },
  { code: 'WED', label: '수' }, { code: 'THU', label: '목' },
  { code: 'FRI', label: '금' }, { code: 'SAT', label: '토' },
  { code: 'SUN', label: '일' },
];

const EMPTY_ROW = { name: '', day: 'MON', start_time: '09:00', end_time: '10:00', place: '', professor: '' };

export default function TimetablePreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.parsedClasses || [];
  const warnings = location.state?.warnings || [];

  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);

  const handleConfirm = async () => {
    setError('');
    for (const row of rows) {
      if (!row.name.trim()) { setError('과목명을 모두 입력해주세요.'); return; }
      if (row.end_time <= row.start_time) { setError('종료 시간이 시작보다 빨라요.'); return; }
    }
    setSaving(true);
    try {
      const data = await confirmTimetableImage(rows);
      navigate('/add-schedule', {
        state: { toast: `시간표 ${data.parsed_classes_count}개 수업이 등록되었습니다.` },
      });
    } catch (e) {
      setError(e.message || '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: `1px solid ${colors.outlineVariant}`, borderRadius: 8,
    padding: '8px 10px', fontSize: 13, color: colors.onSurface,
    fontFamily: "'Be Vietnam Pro', sans-serif", outline: 'none', backgroundColor: '#fff',
  };

  return (
    <div style={{ height: '100vh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>
      <AppBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
        <h1 style={{ marginTop: 6, fontSize: 22, fontWeight: '700', color: colors.onSurface }}>
          인식 결과를 확인해주세요
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: '19px', color: colors.secondary }}>
          잘못 인식된 과목은 수정하거나 삭제할 수 있어요.
        </p>

        {warnings.length > 0 && (
          <div style={{
            marginTop: 12, backgroundColor: colors.surfaceContainerLow,
            borderRadius: 12, padding: '10px 14px',
          }}>
            {warnings.map((w, i) => (
              <p key={i} style={{ fontSize: 12, lineHeight: '17px', color: colors.warning }}>• {w}</p>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row, index) => (
            <div key={index} style={{
              border: `1px solid ${colors.outlineVariant}`, borderRadius: 12,
              padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="과목명"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  style={{ border: 'none', background: 'none', color: colors.error, fontSize: 13, cursor: 'pointer' }}
                >삭제</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={row.day}
                  onChange={(e) => updateRow(index, 'day', e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {DAY_OPTIONS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
                <input
                  type="time"
                  value={row.start_time}
                  onChange={(e) => updateRow(index, 'start_time', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="time"
                  value={row.end_time}
                  onChange={(e) => updateRow(index, 'end_time', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          style={{
            marginTop: 12, width: '100%', border: `1.5px dashed ${colors.outlineVariant}`,
            borderRadius: 12, padding: '12px', backgroundColor: 'transparent',
            color: colors.primary, fontSize: 13, fontWeight: '600', cursor: 'pointer',
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >+ 수업 추가</button>

        {error && <p style={{ marginTop: 10, fontSize: 12, color: colors.error }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px 18px' }}>
        <Button variant="outline" label="이전" onClick={() => navigate(-1)} height={52} fontSize={15} style={{ flex: 1 }} />
        <Button
          label={saving ? '저장 중...' : '확정'}
          onClick={handleConfirm}
          disabled={saving}
          height={52} fontSize={15} style={{ flex: 1.6 }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 라우트 등록**

`frontend/src/App.jsx`에서 import 추가 (TimetableUploadPage import 아래):

```javascript
import TimetablePreviewPage from './pages/TimetablePreviewPage';
```

`<Route path="/upload-timetable" ... />` 아래에 라우트 추가:

```jsx
      <Route path="/upload-timetable/preview" element={<TimetablePreviewPage />} />
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TimetablePreviewPage.jsx frontend/src/App.jsx
git commit -m "feat: 시간표 이미지 인식 결과 미리보기/수정 페이지 추가"
```

---

### Task 9: 수동 통합 검증 (실제 OCR 호출 + E2E)

자동 테스트는 OCR을 모킹했으므로, 실제 OCR.space 정확도와 전체 플로우를 사람이 확인한다.

**Files:** 없음 (검증만)

- [ ] **Step 1: 백엔드 마이그레이션/서버 기동**

Run: `cd server && python manage.py migrate && python manage.py runserver`
Expected: 서버 기동, 에러 없음

- [ ] **Step 2: 실제 OCR 파싱 단독 검증**

샘플 에타 캡쳐(격자형) 1장을 준비해, 인증 토큰으로 호출:

```bash
curl -s -X POST http://localhost:8000/api/timetables/upload-image/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/everytime.png" | python -m json.tool
```
Expected: 200, `parsed_classes`에 과목들이 채워짐. 시작 시간이 대체로 맞는지, `warnings`에 종료 추정 경고가 있는지 눈으로 확인. 정확도가 매우 낮으면 좌표 기반 임계값(헤더 밴드/클러스터 gap 0.8) 조정 필요 — 발견 시 기록.

- [ ] **Step 3: 프론트 E2E 확인**

Run: `cd frontend && npm run dev`
브라우저에서 로그인 → 시간표 업로드 페이지 → 이미지 선택 → 미리보기 표시 → 행 수정/삭제/추가 → 확정 → `/add-schedule` 이동.
그 후 홈/캘린더에서 통합 시간표에 `이미지 인식` 수업이 보이는지 확인.

- [ ] **Step 4: 경계 확인**

1MB 초과 파일 선택 시 토스트로 사전 차단되는지 확인. 인식 0개 이미지 업로드 시 빈 미리보기 + "수업 추가"로 수동 입력 가능한지 확인.

- [ ] **Step 5: 검증 결과 기록**

발견된 정확도 이슈/조정값을 설계 문서 하단 또는 커밋 메시지에 한 줄로 남긴다. 코드 수정이 있었다면 별도 커밋.

---

## Self-Review 결과

- **Spec coverage:** OCR 설정(T1), 격자 파싱 A안+종료 60분 추정(T2), OCR 호출(T3), upload-image 미저장 반환(T4), image/confirm 검증·저장·source 교체(T5), 프론트 API/업로드 UI/미리보기 수정(T6~T8), 테스트(각 Task TDD + T9 수동) — 스펙 전 항목 매핑됨.
- **에러 처리 매핑:** 400(파일 없음/검증)·413(1MB)·401(인증)·502(서비스)·503(미설정)·200+warnings(0개 인식) 모두 T4/T5 테스트로 커버.
- **Type 일관성:** `parse_timetable_grid` 반환 `{classes, warnings}`, class 키(name/day/start_time/end_time/place/professor)가 T2→T4→T6→T8에서 동일. `call_ocr_space(bytes, filename)` 시그니처 T3 정의·T4 사용 일치. `confirmTimetableImage(classes)` 계약 T6 정의·T8 사용 일치.
- **Placeholder scan:** 모든 코드 단계에 실제 코드 포함, TBD 없음.
