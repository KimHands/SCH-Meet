import json

import jwt
from django.conf import settings
from django.contrib.auth.models import User
from django.http import JsonResponse

from ..models import UserProfile
from .common import method_not_allowed


def _get_authorized_user(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    token = auth_header.removeprefix('Bearer ').strip()
    if not token:
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)
    except jwt.InvalidTokenError:
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    if payload.get('type') != 'access':
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    user_id = payload.get('user_id')
    if not user_id:
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return None, JsonResponse({'detail': 'Unauthorized'}, status=401)

    return user, None


def _get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _serialize_user(user, profile):
    return {
        'id': user.id,
        'email': user.email,
        'nickname': profile.nickname,
        'profile_image_url': profile.profile_image_url,
    }


def user_me(request):
    if request.method not in ['GET', 'PATCH']:
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    profile = _get_or_create_profile(user)

    if request.method == 'GET':
        return JsonResponse(_serialize_user(user, profile), status=200)

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    if 'nickname' in body:
        nickname = body.get('nickname')
        if nickname is not None and not isinstance(nickname, str):
            return JsonResponse({'detail': 'nickname must be a string'}, status=400)
        if nickname is not None and len(nickname) > 30:
            return JsonResponse({'detail': 'Nickname too long'}, status=400)
        profile.nickname = nickname or ''

    if 'profile_image_url' in body:
        profile_image_url = body.get('profile_image_url')
        if profile_image_url is not None and not isinstance(profile_image_url, str):
            return JsonResponse({'detail': 'profile_image_url must be a string'}, status=400)
        profile.profile_image_url = profile_image_url or ''

    profile.save()
    return JsonResponse(_serialize_user(user, profile), status=200)