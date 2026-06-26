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


@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return method_not_allowed()

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    id_token_str = body.get('id_token')
    if not id_token_str:
        return JsonResponse({'detail': 'Missing id_token'}, status=400)

    # Verify Google ID token
    try:
        idinfo = id_token.verify_oauth2_token(id_token_str, grequests.Request())
        # verify audience matches our client id
        aud = idinfo.get('aud')
        if aud != getattr(settings, 'GOOGLE_CLIENT_ID', None):
            return JsonResponse({'detail': 'Invalid token audience'}, status=401)
    except ValueError:
        return JsonResponse({'detail': 'Invalid social token'}, status=401)
    except Exception as e:
        return JsonResponse({'detail': 'Failed to verify social token', 'error': str(e)}, status=500)

    email = idinfo.get('email')
    if not email:
        return JsonResponse({'detail': 'Email not present in social token'}, status=400)

    # Find or create user
    is_new_user = False
    try:
        user = User.objects.filter(email=email).first()
        if not user:
            username_base = email.split('@')[0]
            username = username_base
            i = 1
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{i}"
                i += 1
            user = User.objects.create_user(username=username, email=email)
            user.set_unusable_password()
            user.save()
            is_new_user = True

        # Issue JWT tokens (signed with Django SECRET_KEY)
        now = datetime.datetime.utcnow()
        access_payload = {
            'user_id': user.id,
            'exp': now + datetime.timedelta(minutes=60),
            'iat': now,
            'type': 'access',
        }
        refresh_payload = {
            'user_id': user.id,
            'exp': now + datetime.timedelta(days=7),
            'iat': now,
            'type': 'refresh',
        }

        secret = settings.SECRET_KEY
        access_token = jwt.encode(access_payload, secret, algorithm='HS256')
        refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')

        response_data = {
            'access': access_token,
            'refresh': refresh_token,
        }
        if is_new_user:
            response_data['is_new_user'] = True
            
        return JsonResponse(response_data, status=201 if is_new_user else 200)

    except Exception as e:
        return JsonResponse({'detail': 'Internal server error', 'error': str(e)}, status=500)
