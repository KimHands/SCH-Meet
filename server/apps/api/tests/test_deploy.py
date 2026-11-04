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


def _load_settings(**env):
    """settings는 import 시점에 환경변수를 읽으므로 별도 프로세스에서 읽는다."""
    clean_env = {
        key: value for key, value in os.environ.items()
        if key not in ('RENDER', 'DJANGO_BEHIND_HTTPS_PROXY', 'DATABASE_SSL_REQUIRE', 'TRUSTED_PROXY_COUNT')
    }
    clean_env.update(
        DJANGO_SECRET_KEY='test-only',
        DATABASE_URL='postgres://u:p@db:5432/x',
        **env,
    )
    output = subprocess.check_output(
        [sys.executable, '-c', _PRINT_SETTINGS], cwd=SERVER_DIR, env=clean_env, text=True,
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
