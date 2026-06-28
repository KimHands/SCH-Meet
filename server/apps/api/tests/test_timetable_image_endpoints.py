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
