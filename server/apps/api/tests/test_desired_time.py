from types import SimpleNamespace

from django.test import SimpleTestCase

from api.endpoints.meetings import _does_slot_match_requested_time

AFTERNOON = 14 * 60
DAY_LABELS = {'MON': '월', 'TUE': '화', 'WED': '수', 'THU': '목', 'FRI': '금', 'SAT': '토', 'SUN': '일'}


def _reasons(desired_time, day_code):
    meeting = SimpleNamespace(desired_time=desired_time)
    return _does_slot_match_requested_time(day_code, AFTERNOON, meeting)


class RequestedDayMatchTests(SimpleTestCase):
    def test_words_containing_a_day_character_do_not_match_that_day(self):
        cases = [
            ('평일 오후', 'SUN'),
            ('매일 오후', 'SUN'),
            ('일찍', 'SUN'),
            ('일정 없는 시간', 'SUN'),
            ('수업 끝나고', 'WED'),
            ('화상 회의', 'TUE'),
            ('월말', 'MON'),
            ('3일', 'SUN'),
            ('11월', 'MON'),
        ]
        for desired_time, day_code in cases:
            with self.subTest(desired_time=desired_time):
                self.assertNotIn(
                    f'{DAY_LABELS[day_code]}요일 선호와 일치',
                    _reasons(desired_time, day_code),
                )

    def test_weekday_preference_does_not_add_a_sunday_reason(self):
        self.assertEqual(_reasons('평일 오후', 'SUN'), ['오후 선호와 일치'])

    def test_explicit_day_expressions_match(self):
        cases = [
            ('일요일', 'SUN'),
            ('매주 수요일 저녁', 'WED'),
            ('월요일에', 'MON'),
            ('금', 'FRI'),
            ('월 저녁', 'MON'),
            ('화, 목', 'THU'),
            ('월수금', 'WED'),
            ('토일', 'SUN'),
        ]
        for desired_time, day_code in cases:
            with self.subTest(desired_time=desired_time):
                self.assertIn(f'{DAY_LABELS[day_code]}요일 선호와 일치', _reasons(desired_time, day_code))

    def test_unrequested_day_does_not_match(self):
        self.assertNotIn('화요일 선호와 일치', _reasons('월요일', 'TUE'))
