import re
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
        # 12시간제 라벨(9,10,11,12,1,2,3...) 보정: 위→아래로 시각은 커져야 하므로
        # 이전 값보다 작아지면 12시간(720분)씩 더해 24시간제로 변환한다.
        normalized = []
        prev_minute = None
        for y, minute, _word in labels:
            adjusted = minute
            while prev_minute is not None and adjusted < prev_minute:
                adjusted += 12 * 60
            normalized.append((y, adjusted))
            prev_minute = adjusted

        y0, m0 = normalized[0]
        y1, m1 = normalized[-1]
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

    # header_ids에 없더라도 요일 헤더로 인식된 단어는 content에서 제외한다.
    # (_detect_day_columns 폴백 시 header_ids=set()이 되므로 별도로 처리)
    day_header_ids = {id(word) for word in words if _day_code_for_header(word['text']) is not None}
    consumed = header_ids | label_ids | day_header_ids
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
