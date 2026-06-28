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

    def test_single_day_header_not_parsed_as_class(self):
        # 요일 헤더가 1개뿐일 때 _detect_day_columns는 폴백(5등분)을 사용하고
        # header_ids=set()을 반환한다. 이 경우 인식된 '화' 단어가 content에 남아
        # 유령 수업으로 등록되는 버그를 검증하는 회귀 테스트.
        words = [
            # 요일 헤더: '화' 1개만 존재 (폴백 모드 유도)
            _w('화', 200, 10),
            # 시간 라벨 2개 (y→분 매핑: y=50->540, y=230->720)
            _w('9', 20, 50), _w('12', 20, 230),
            # 실제 수업 (x=200 영역, y=60 → top=50 → 540=09:00)
            _w('알고리즘', 200, 60),
        ]
        result = parse_timetable_grid(words)
        names = [c['name'] for c in result['classes']]
        # '화'가 유령 수업으로 등록되어서는 안 된다
        self.assertNotIn('화', names)
        # 실제 수업은 정상적으로 포함되어야 한다
        self.assertIn('알고리즘', names)
