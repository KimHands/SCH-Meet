import datetime
import json

import jwt
from django.conf import settings
from django.contrib.auth.models import User


def make_token(user, token_type='access', expires_in=datetime.timedelta(minutes=60)):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'user_id': user.id,
        'exp': now + expires_in,
        'iat': now,
        'type': token_type,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def auth_header(user):
    return {'HTTP_AUTHORIZATION': f'Bearer {make_token(user)}'}


def make_user(username):
    return User.objects.create_user(username=username, email=f'{username}@test.com')


def post_json(client, url, body, user=None):
    headers = auth_header(user) if user else {}
    return client.post(url, data=json.dumps(body), content_type='application/json', **headers)
