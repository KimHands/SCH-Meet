from django.views.decorators.csrf import csrf_exempt

from .common import method_not_allowed, not_implemented


@csrf_exempt
def notifications_collection(request):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented('B-17 /api/notifications/')


@csrf_exempt
def notification_read(request, notification_id):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented(f'B-17 /api/notifications/read/{notification_id}/')
