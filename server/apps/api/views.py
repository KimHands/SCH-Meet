from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def _not_implemented(endpoint_name):
    return JsonResponse(
        {
            'detail': 'API endpoint stub',
            'endpoint': endpoint_name,
        },
        status=501,
    )


def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-01 /api/auth/login/')


def user_me(request):
    if request.method not in ['GET', 'PATCH']:
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-02 /api/users/me/')


def timetable_upload_url(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-03 /api/timetables/upload-url/')


def timetable_upload_image(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-04 /api/timetables/upload-image/')


def fixed_schedules(request):
    if request.method not in ['GET', 'POST']:
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-05 /api/schedules/fixed/')


def fixed_schedule_detail(request, schedule_id):
    if request.method != 'DELETE':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-05 /api/schedules/fixed/{schedule_id}/')


def consolidated_timetables(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-06 /api/timetables/consolidated/')


def meetings_collection(request):
    if request.method not in ['GET', 'POST']:
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-07 and B-10 /api/meetings/')


def meeting_detail(request, meeting_id):
    if request.method not in ['GET', 'PATCH', 'DELETE']:
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-10 and B-11 /api/meetings/{meeting_id}/')


def meeting_invite_detail(request, token):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-09 /api/meetings/invite/{token}/')


def meeting_invite_join(request, token):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-08 /api/meetings/invite/{token}/join/')


def meeting_recommendations(request, meeting_id):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-12 and B-13 /api/meetings/{meeting_id}/recommendations/')


def meeting_confirm(request, meeting_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-14 /api/meetings/{meeting_id}/confirm/')


def meeting_confirmed(request, meeting_id):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-15 /api/meetings/{meeting_id}/confirmed/')


def dashboard_summary(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-16 /api/dashboard/summary/')


def notifications_collection(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented('B-17 /api/notifications/')


def notification_read(request, notification_id):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    return _not_implemented(f'B-17 /api/notifications/read/{notification_id}/')
