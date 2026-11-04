import json
import datetime

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.http import JsonResponse

import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from .common import method_not_allowed
from .throttle import check_rate_limit, client_ip


ACCESS_TOKEN_LIFETIME = datetime.timedelta(minutes=60)
REFRESH_TOKEN_LIFETIME = datetime.timedelta(days=7)


def _issue_token(user_id, token_type, lifetime):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'user_id': user_id,
        'exp': now + lifetime,
        'iat': now,
        'type': token_type,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def _parse_json_body(request):
    try:
        body = json.loads(request.body.decode() or '{}')
    except (ValueError, UnicodeDecodeError):
        body = None
    if not isinstance(body, dict):
        return None, JsonResponse({'detail': 'Invalid JSON body'}, status=400)
    return body, None


def _verify_google_token(id_token_str):
    """검증된 Google 계정 정보를, 실패하면 (None, 오류 응답)을 돌려준다."""
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    try:
        idinfo = id_token.verify_oauth2_token(id_token_str, grequests.Request(), audience=client_id)
    except ValueError:
        return None, JsonResponse({'detail': '구글 인증 정보가 올바르지 않아요.'}, status=401)
    except Exception:
        return None, JsonResponse({'detail': '구글 인증 서버에 연결하지 못했어요.'}, status=502)

    if not client_id or idinfo.get('aud') != client_id:
        return None, JsonResponse({'detail': '구글 인증 정보가 올바르지 않아요.'}, status=401)
    if idinfo.get('email_verified') is not True or not idinfo.get('email'):
        return None, JsonResponse({'detail': '이메일 인증이 완료된 구글 계정만 사용할 수 있어요.'}, status=401)
    return idinfo, None


def _get_or_create_user(email):
    user = User.objects.filter(email=email).first()
    if user:
        return user, False

    username_base = email.split('@')[0]
    username = username_base
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f'{username_base}{suffix}'
        suffix += 1
    user = User.objects.create_user(username=username, email=email)
    user.set_unusable_password()
    user.save()
    return user, True


@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return method_not_allowed()

    rate_limited = check_rate_limit('login', client_ip(request))
    if rate_limited:
        return rate_limited

    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    id_token_str = body.get('id_token')
    if not id_token_str:
        return JsonResponse({'detail': 'Missing id_token'}, status=400)

    idinfo, error_response = _verify_google_token(id_token_str)
    if error_response:
        return error_response

    user, is_new_user = _get_or_create_user(idinfo['email'])
    response_data = {
        'access': _issue_token(user.id, 'access', ACCESS_TOKEN_LIFETIME),
        'refresh': _issue_token(user.id, 'refresh', REFRESH_TOKEN_LIFETIME),
    }
    if is_new_user:
        response_data['is_new_user'] = True

    return JsonResponse(response_data, status=201 if is_new_user else 200)


@csrf_exempt
def auth_refresh(request):
    if request.method != 'POST':
        return method_not_allowed()

    rate_limited = check_rate_limit('refresh', client_ip(request))
    if rate_limited:
        return rate_limited

    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    unauthorized = JsonResponse({'detail': '로그인이 만료되었어요. 다시 로그인해 주세요.'}, status=401)
    refresh_token = body.get('refresh')
    if not isinstance(refresh_token, str) or not refresh_token:
        return unauthorized

    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=['HS256'], options={'require': ['exp']})
    except jwt.InvalidTokenError:
        return unauthorized

    user_id = payload.get('user_id')
    if payload.get('type') != 'refresh' or not User.objects.filter(id=user_id, is_active=True).exists():
        return unauthorized

    return JsonResponse({'access': _issue_token(user_id, 'access', ACCESS_TOKEN_LIFETIME)}, status=200)
