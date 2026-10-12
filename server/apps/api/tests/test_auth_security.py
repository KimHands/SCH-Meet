import datetime
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings

from api.endpoints import auth, ocr
from api.endpoints.throttle import client_ip
from api.endpoints.timetables import _parse_everytime_response
from api.models import TimetableClass

from .helpers import auth_header, make_token, make_user, post_json


def _google_idinfo(**overrides):
    return {'aud': 'test-client', 'email': 'new@test.com', 'email_verified': True, **overrides}


@override_settings(GOOGLE_CLIENT_ID='test-client')
class GoogleLoginTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()

    def login(self, idinfo=None, side_effect=None):
        with mock.patch.object(auth.id_token, 'verify_oauth2_token', return_value=idinfo, side_effect=side_effect):
            return post_json(self.client, '/api/auth/login/', {'id_token': 'x'})

    def test_unverified_email_is_rejected(self):
        res = self.login(_google_idinfo(email_verified=False))
        self.assertEqual(res.status_code, 401)
        self.assertFalse(User.objects.exists())

    def test_verification_failure_does_not_leak_exception(self):
        res = self.login(side_effect=RuntimeError('secret internals'))
        self.assertNotIn('secret internals', res.content.decode())

    def test_login_issues_access_and_refresh(self):
        body = self.login(_google_idinfo()).json()
        self.assertIn('access', body)
        self.assertIn('refresh', body)

    @override_settings(RATE_LIMITS={'login': (2, 60)})
    def test_login_is_rate_limited(self):
        for _ in range(2):
            self.login(_google_idinfo())
        self.assertEqual(self.login(_google_idinfo()).status_code, 429)


class RefreshTokenTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = make_user('kim')

    def refresh(self, token):
        return post_json(self.client, '/api/auth/refresh/', {'refresh': token})

    def test_valid_refresh_returns_new_access(self):
        res = self.refresh(make_token(self.user, 'refresh', datetime.timedelta(days=1)))
        self.assertEqual(res.status_code, 200)
        access = res.json()['access']
        me = self.client.get('/api/users/me/', HTTP_AUTHORIZATION=f'Bearer {access}')
        self.assertEqual(me.status_code, 200)

    def test_access_token_cannot_refresh(self):
        self.assertEqual(self.refresh(make_token(self.user, 'access')).status_code, 401)

    def test_expired_refresh_is_rejected(self):
        expired = make_token(self.user, 'refresh', datetime.timedelta(seconds=-1))
        self.assertEqual(self.refresh(expired).status_code, 401)

    def test_garbage_is_rejected(self):
        self.assertEqual(self.refresh('not-a-jwt').status_code, 401)


class ProfileValidationTest(TestCase):
    def test_profile_image_must_be_https(self):
        user = make_user('kim')
        res = self.client.patch(
            '/api/users/me/',
            data='{"profile_image_url": "javascript:alert(1)"}',
            content_type='application/json',
            **auth_header(user),
        )
        self.assertEqual(res.status_code, 400)


class EverytimeXmlTest(TestCase):
    def test_entity_expansion_is_refused(self):
        payload = (
            '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]>'
            '<response><table><subject><name value="&b;"/></subject></table></response>'
        )
        self.assertIsNone(_parse_everytime_response(payload, 'id'))


class ImageUploadSecurityTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user('kim')
        self._orig_call = ocr.call_ocr_space
        ocr.call_ocr_space = lambda *args, **kwargs: []

    def tearDown(self):
        ocr.call_ocr_space = self._orig_call

    def upload(self, content, name='t.png', content_type='image/png'):
        file = SimpleUploadedFile(name, content, content_type=content_type)
        return self.client.post('/api/timetables/upload-image/', {'file': file}, **auth_header(self.user))

    def test_non_image_content_is_rejected(self):
        self.assertEqual(self.upload(b'<?php echo 1; ?>').status_code, 400)

    def test_png_signature_is_accepted(self):
        self.assertEqual(self.upload(b'\x89PNG\r\n\x1a\n' + b'0' * 10).status_code, 200)

    @override_settings(RATE_LIMITS={'ocr': (1, 60)})
    def test_ocr_is_rate_limited(self):
        self.upload(b'\x89PNG\r\n\x1a\n' + b'0' * 10)
        self.assertEqual(self.upload(b'\x89PNG\r\n\x1a\n' + b'0' * 10).status_code, 429)


class ImageConfirmValidationTest(TestCase):
    def test_non_string_name_returns_400(self):
        user = make_user('kim')
        body = {'classes': [{'name': 123, 'day': 'MON', 'start_time': '09:00', 'end_time': '10:00'}]}
        res = post_json(self.client, '/api/timetables/image/confirm/', body, user)
        self.assertEqual(res.status_code, 400)
        self.assertFalse(TimetableClass.objects.exists())


class DashboardTimezoneTest(TestCase):
    def test_uses_korean_weekday(self):
        user = make_user('kim')
        TimetableClass.objects.create(user=user, name='수업', day='TUE', start_minute=9 * 60, end_minute=10 * 60)
        monday_utc_16 = datetime.datetime(2026, 10, 12, 16, 0, tzinfo=datetime.timezone.utc)  # 화 01:00 KST
        with mock.patch('django.utils.timezone.now', return_value=monday_utc_16):
            res = self.client.get('/api/dashboard/summary/', **auth_header(user))
        self.assertEqual(res.json()['remaining_classes'], 1)


class AdminExposureTest(TestCase):
    def test_admin_is_not_routed_by_default(self):
        self.assertEqual(self.client.get('/admin/login/').status_code, 404)


class ClientIpTest(TestCase):
    def request_with(self, forwarded_for):
        return mock.Mock(META={'HTTP_X_FORWARDED_FOR': forwarded_for, 'REMOTE_ADDR': '10.0.0.1'})

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_spoofed_leftmost_entry_is_ignored(self):
        self.assertEqual(client_ip(self.request_with('6.6.6.6, 203.0.113.7')), '203.0.113.7')

    @override_settings(TRUSTED_PROXY_COUNT=0)
    def test_header_ignored_without_trusted_proxy(self):
        self.assertEqual(client_ip(self.request_with('6.6.6.6')), '10.0.0.1')


class JsonShapeTest(TestCase):
    def test_login_with_json_array_returns_400(self):
        res = self.client.post('/api/auth/login/', data='[]', content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_refresh_with_json_null_returns_400(self):
        res = self.client.post('/api/auth/refresh/', data='null', content_type='application/json')
        self.assertEqual(res.status_code, 400)


class InactiveUserTest(TestCase):
    def test_inactive_user_cannot_refresh_or_call_api(self):
        user = make_user('kim')
        refresh = make_token(user, 'refresh', datetime.timedelta(days=1))
        user.is_active = False
        user.save()
        self.assertEqual(post_json(self.client, '/api/auth/refresh/', {'refresh': refresh}).status_code, 401)
        self.assertEqual(self.client.get('/api/users/me/', **auth_header(user)).status_code, 401)


class EverytimeResponseSizeTest(TestCase):
    def test_oversized_xml_is_refused(self):
        def wrap(padding):
            return '<response><table year="2026" semester="2"></table><!--' + padding + '--></response>'

        self.assertIsNotNone(_parse_everytime_response(wrap('a' * 100), 'id'))
        self.assertIsNone(_parse_everytime_response(wrap('a' * (3 * 1024 * 1024)), 'id'))


class EverytimeUploadShapeTest(TestCase):
    def test_json_array_body_returns_400(self):
        user = make_user('kim')
        res = self.client.post('/api/timetables/upload-url/', data='[]', content_type='application/json', **auth_header(user))
        self.assertEqual(res.status_code, 400)


class EverytimeStreamingLimitTest(TestCase):
    def test_reads_at_most_limit_bytes(self):
        from api.endpoints import timetables
        raw = mock.Mock()
        raw.read.return_value = b'x' * (timetables.MAX_EVERYTIME_RESPONSE_BYTES + 1)
        response = mock.Mock(raw=raw, encoding='utf-8')
        self.assertIsNone(timetables._read_limited_text(response))
        raw.read.assert_called_once_with(timetables.MAX_EVERYTIME_RESPONSE_BYTES + 1, decode_content=True)
