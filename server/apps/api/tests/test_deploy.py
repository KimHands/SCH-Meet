import json
import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase, TestCase, override_settings

SERVER_DIR = Path(__file__).resolve().parents[3]

_PRINT_SETTINGS = """
import json
from config import settings as s
print(json.dumps({
    'SECURE_SSL_REDIRECT': getattr(s, 'SECURE_SSL_REDIRECT', False),
    'SECURE_PROXY_SSL_HEADER': getattr(s, 'SECURE_PROXY_SSL_HEADER', None),
    'SECURE_REDIRECT_EXEMPT': getattr(s, 'SECURE_REDIRECT_EXEMPT', []),
    'TRUSTED_PROXY_COUNT': s.TRUSTED_PROXY_COUNT,
    'DB_OPTIONS': s.DATABASES['default'].get('OPTIONS', {}),
}))
"""


_LOG_REQUEST_ERROR = """
import logging
import django
django.setup()
logging.getLogger('django.request').error('probe-500')
"""


def _clean_env(**env):
    clean_env = {
        key: value for key, value in os.environ.items()
        if key not in ('RENDER', 'DJANGO_BEHIND_HTTPS_PROXY', 'DATABASE_SSL_REQUIRE', 'TRUSTED_PROXY_COUNT')
    }
    clean_env.update(
        DJANGO_SECRET_KEY='test-only',
        DATABASE_URL='postgres://u:p@db:5432/x',
        **env,
    )
    return clean_env


def _load_settings(**env):
    """settings는 import 시점에 환경변수를 읽으므로 별도 프로세스에서 읽는다."""
    output = subprocess.check_output(
        [sys.executable, '-c', _PRINT_SETTINGS], cwd=SERVER_DIR, env=_clean_env(**env), text=True,
    )
    return json.loads(output)


class HealthCheckTest(TestCase):
    def test_get_returns_ok_without_auth(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'status': 'ok'})

    def test_post_not_allowed(self):
        self.assertEqual(self.client.post('/api/health/').status_code, 405)

    @override_settings(SECURE_SSL_REDIRECT=True, SECURE_REDIRECT_EXEMPT=[r'^api/health/$'])
    def test_only_health_is_exempt_from_https_redirect(self):
        self.assertEqual(self.client.get('/api/health/').status_code, 200)
        self.assertEqual(self.client.get('/api/users/me/').status_code, 301)


class DeploySettingsTest(SimpleTestCase):
    def test_behind_https_proxy_enables_security(self):
        loaded = _load_settings(DJANGO_BEHIND_HTTPS_PROXY='True')
        self.assertTrue(loaded['SECURE_SSL_REDIRECT'])
        self.assertEqual(loaded['SECURE_PROXY_SSL_HEADER'], ['HTTP_X_FORWARDED_PROTO', 'https'])
        self.assertEqual(loaded['SECURE_REDIRECT_EXEMPT'], [r'^api/health/$'])

    def test_render_still_enables_security(self):
        loaded = _load_settings(RENDER='true')
        self.assertTrue(loaded['SECURE_SSL_REDIRECT'])
        self.assertEqual(loaded['TRUSTED_PROXY_COUNT'], 1)

    def test_security_off_by_default(self):
        self.assertFalse(_load_settings()['SECURE_SSL_REDIRECT'])

    def test_database_ssl_required_by_default(self):
        self.assertEqual(_load_settings()['DB_OPTIONS'].get('sslmode'), 'require')

    def test_database_ssl_can_be_disabled(self):
        self.assertNotIn('sslmode', _load_settings(DATABASE_SSL_REQUIRE='False')['DB_OPTIONS'])

    def test_database_ssl_stays_on_for_blank_or_typo(self):
        for value in ('', 'Ture'):
            with self.subTest(value=value):
                self.assertEqual(_load_settings(DATABASE_SSL_REQUIRE=value)['DB_OPTIONS'].get('sslmode'), 'require')

    def test_request_errors_reach_stderr_when_debug_off(self):
        result = subprocess.run(
            [sys.executable, '-c', _LOG_REQUEST_ERROR],
            cwd=SERVER_DIR,
            env=_clean_env(DJANGO_DEBUG='False', DJANGO_SETTINGS_MODULE='config.settings'),
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertIn('probe-500', result.stderr)
