from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from ..models import Notification
from .common import method_not_allowed
from .user import _get_authorized_user


def _serialize_notification(notification):
    meeting = notification.related_meeting
    return {
        'id': notification.id,
        'kind': notification.kind,
        'title': notification.title,
        'body': notification.body,
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat(),
        'meeting_id': meeting.id if meeting else None,
        'meeting_name': meeting.name if meeting else None,
    }


@csrf_exempt
def notifications_collection(request):
    if request.method != 'GET':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    notifications = Notification.objects.filter(user=user).select_related('related_meeting').order_by('-created_at', '-id')
    return JsonResponse([_serialize_notification(notification) for notification in notifications], safe=False, status=200)


@csrf_exempt
def notification_read(request, notification_id):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    notification = Notification.objects.filter(id=notification_id, user=user).select_related('related_meeting').first()
    if not notification:
        return JsonResponse({'detail': 'Notification not found'}, status=404)

    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=['is_read'])

    return JsonResponse(_serialize_notification(notification), status=200)
