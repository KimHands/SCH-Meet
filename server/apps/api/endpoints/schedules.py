import json
from datetime import datetime

from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import FixedSchedule
from .common import method_not_allowed
from .user import _get_authorized_user


DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']


def _parse_time(value):
    if not isinstance(value, str):
        return None

    try:
        return datetime.strptime(value, '%H:%M').time()
    except ValueError:
        return None


def _serialize_fixed_schedule(schedule):
    return {
        'id': schedule.id,
        'title': schedule.title,
        'repeat_days': schedule.repeat_days,
        'start_time': schedule.start_time.strftime('%H:%M'),
        'end_time': schedule.end_time.strftime('%H:%M'),
        'created_at': schedule.created_at.isoformat(),
    }


def _validate_repeat_days(value):
    if not isinstance(value, list) or not value:
        return None

    normalized_days = []
    seen_days = set()
    for day in value:
        if not isinstance(day, str):
            return None

        day_code = day.strip().upper()
        if day_code not in DAY_CODES or day_code in seen_days:
            return None

        seen_days.add(day_code)
        normalized_days.append(day_code)

    return normalized_days


@csrf_exempt
def fixed_schedules(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    if request.method == 'GET':
        schedules = FixedSchedule.objects.filter(user=user).order_by('-created_at', '-id')
        return JsonResponse([_serialize_fixed_schedule(schedule) for schedule in schedules], safe=False, status=200)

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    title = body.get('title')
    repeat_days = body.get('repeat_days')
    start_time = _parse_time(body.get('start_time'))
    end_time = _parse_time(body.get('end_time'))

    if not isinstance(title, str) or not title.strip():
        return JsonResponse({'detail': 'title is required'}, status=400)
    if len(title.strip()) > 20:
        return JsonResponse({'detail': 'title is too long'}, status=400)

    normalized_days = _validate_repeat_days(repeat_days)
    if normalized_days is None:
        return JsonResponse({'detail': 'repeat_days must contain valid day codes'}, status=400)

    if start_time is None or end_time is None:
        return JsonResponse({'detail': 'start_time and end_time must be HH:MM'}, status=400)
    if end_time <= start_time:
        return JsonResponse({'detail': 'end_time must be after start_time'}, status=400)

    with transaction.atomic():
        schedule = FixedSchedule.objects.create(
            user=user,
            title=title.strip(),
            repeat_days=normalized_days,
            start_time=start_time,
            end_time=end_time,
        )

    return JsonResponse(_serialize_fixed_schedule(schedule), status=201)


@csrf_exempt
def fixed_schedule_detail(request, schedule_id):
    if request.method != 'DELETE':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    schedule = FixedSchedule.objects.filter(id=schedule_id, user=user).first()
    if not schedule:
        return JsonResponse({'detail': 'Not found'}, status=404)

    schedule.delete()
    return HttpResponse(status=204)
