from unittest import mock

import requests
from django.core.cache import cache
from django.test import TestCase

from api.endpoints.timetables import _parse_everytime_response
from api.models import TimetableClass

from .helpers import auth_header, make_user, post_json

CLASSES_URL = '/api/timetables/classes/'
UPLOAD_URL = '/api/timetables/upload-url/'
EVERYTIME_URL = 'https://everytime.kr/@abc'


def _make_class(user, name='자료구조', day='MON', start_minute=540, end_minute=600, source='everytime'):
    return TimetableClass.objects.create(
        user=user, name=name, day=day, start_minute=start_minute, end_minute=end_minute, source=source,
    )


class TimetableClassListTest(TestCase):
    def setUp(self):
        self.user = make_user('kim')

    def test_requires_auth(self):
        self.assertEqual(self.client.get(CLASSES_URL).status_code, 401)

    def test_returns_only_own_classes_without_meetings(self):
        own = _make_class(self.user)
        _make_class(self.user, name='확정 모임', source='meeting')
        _make_class(make_user('lee'), name='다른 사람 수업')

        res = self.client.get(CLASSES_URL, **auth_header(self.user))

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [{
            'id': own.id,
            'name': '자료구조',
            'day': 'MON',
            'start_time': '09:00',
            'end_time': '10:00',
            'professor': '',
            'place': '',
        }])

    def test_sorted_by_weekday_then_start(self):
        _make_class(self.user, name='금요일', day='FRI')
        _make_class(self.user, name='월요일 오후', day='MON', start_minute=780, end_minute=840)
        _make_class(self.user, name='월요일 오전', day='MON', start_minute=540, end_minute=600)

        res = self.client.get(CLASSES_URL, **auth_header(self.user))

        self.assertEqual([c['name'] for c in res.json()], ['월요일 오전', '월요일 오후', '금요일'])


class TimetableClassDeleteTest(TestCase):
    def setUp(self):
        self.user = make_user('kim')

    def delete_one(self, class_id, user=None):
        return self.client.delete(f'{CLASSES_URL}{class_id}/', **auth_header(user or self.user))

    def test_deletes_own_class(self):
        target = _make_class(self.user)
        self.assertEqual(self.delete_one(target.id).status_code, 204)
        self.assertFalse(TimetableClass.objects.filter(id=target.id).exists())

    def test_requires_auth(self):
        target = _make_class(self.user)
        self.assertEqual(self.client.delete(f'{CLASSES_URL}{target.id}/').status_code, 401)
        self.assertTrue(TimetableClass.objects.filter(id=target.id).exists())

    def test_other_users_class_is_not_found(self):
        target = _make_class(make_user('lee'))
        self.assertEqual(self.delete_one(target.id).status_code, 404)
        self.assertTrue(TimetableClass.objects.filter(id=target.id).exists())

    def test_meeting_class_is_not_found(self):
        target = _make_class(self.user, source='meeting')
        self.assertEqual(self.delete_one(target.id).status_code, 404)
        self.assertTrue(TimetableClass.objects.filter(id=target.id).exists())

    def test_delete_all_keeps_meetings_and_other_users(self):
        _make_class(self.user)
        _make_class(self.user, name='이미지로 올린 수업', source='image')
        meeting = _make_class(self.user, name='확정 모임', source='meeting')
        others = _make_class(make_user('lee'))

        res = self.client.delete(CLASSES_URL, **auth_header(self.user))

        self.assertEqual(res.status_code, 204)
        remaining = set(TimetableClass.objects.values_list('id', flat=True))
        self.assertEqual(remaining, {meeting.id, others.id})

    def test_delete_all_requires_auth(self):
        target = _make_class(self.user)
        self.assertEqual(self.client.delete(CLASSES_URL).status_code, 401)
        self.assertTrue(TimetableClass.objects.filter(id=target.id).exists())


class EverytimeFailureTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user('kim')

    def upload(self, url=EVERYTIME_URL):
        return post_json(self.client, UPLOAD_URL, {'url': url}, self.user)

    def upload_with_response(self, xml_text):
        with mock.patch('api.endpoints.timetables.requests.post') as post, \
                mock.patch('api.endpoints.timetables._read_limited_text', return_value=xml_text):
            post.return_value.__enter__.return_value = post.return_value
            post.return_value.status_code = 200
            return self.upload()

    def test_empty_timetable_keeps_existing_classes(self):
        existing = _make_class(self.user)

        res = self.upload_with_response('<response><table year="2026" semester="2"></table></response>')

        self.assertEqual(res.status_code, 422)
        self.assertIn('직접 입력', res.json()['detail'])
        self.assertTrue(TimetableClass.objects.filter(id=existing.id).exists())

    def test_unreadable_response_explains_next_step(self):
        res = self.upload_with_response('<response></response>')
        self.assertEqual(res.status_code, 502)
        self.assertIn('직접 입력', res.json()['detail'])

    def test_connection_failure_explains_next_step(self):
        with mock.patch('api.endpoints.timetables.requests.post', side_effect=requests.RequestException):
            res = self.upload()
        self.assertEqual(res.status_code, 502)
        self.assertIn('직접 입력', res.json()['detail'])

    def test_invalid_url_is_explained_in_korean(self):
        res = self.upload('https://example.com/@abc')
        self.assertEqual(res.status_code, 400)
        self.assertIn('에브리타임', res.json()['detail'])


class EverytimeFieldLengthTest(TestCase):
    def test_long_values_fit_model_columns(self):
        long_value = 'x' * 300
        xml_text = (
            f'<response><table year="2026" semester="{long_value}" identifier="{long_value}">'
            f'<subject id="1"><name value="{long_value}"/><professor value="{long_value}"/>'
            f'<time value="{long_value}"><data day="0" starttime="108" endtime="126" place="{long_value}"/></time>'
            '</subject></table></response>'
        )

        parsed = _parse_everytime_response(xml_text, 'abc')

        row = parsed['parsed_classes'][0]
        for field in ('name', 'professor', 'place', 'time_label', 'semester'):
            max_length = TimetableClass._meta.get_field(field).max_length
            self.assertLessEqual(len(row[field]), max_length, field)
        identifier_limit = TimetableClass._meta.get_field('source_identifier').max_length
        self.assertLessEqual(len(parsed['source_identifier']), identifier_limit)


class FixedScheduleTitleTest(TestCase):
    def test_too_long_title_is_explained_in_korean(self):
        body = {'title': '가' * 21, 'repeat_days': ['MON'], 'start_time': '09:00', 'end_time': '10:00'}
        res = post_json(self.client, '/api/schedules/fixed/', body, make_user('kim'))
        self.assertEqual(res.status_code, 400)
        self.assertIn('20자', res.json()['detail'])
