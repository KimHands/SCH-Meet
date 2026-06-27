from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from ..models import FixedSchedule, Meeting, MeetingMember, Notification, TimetableClass
from .common import method_not_allowed
from .user import _get_authorized_user


@csrf_exempt
def dashboard_summary(request):
    if request.method != 'GET':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    current_time = timezone.localtime(timezone.now())
    day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    current_day_code = day_codes[current_time.weekday()]
    current_minute = current_time.hour * 60 + current_time.minute

    remaining_classes = (
        TimetableClass.objects.filter(user=user, day=current_day_code)
        .exclude(source='meeting')
        .filter(start_minute__gte=current_minute)
        .count()
    )

    today_tasks = sum(
        1
        for fixed_schedule in FixedSchedule.objects.filter(user=user)
        if current_day_code in (fixed_schedule.repeat_days or [])
    )

    pending_requests = Notification.objects.filter(
        user=user,
        is_read=False,
        kind='MEETING_JOINED',
    ).count()

    weekly_recommendations_count = 0
    meetings = (
        Meeting.objects.filter(members__user=user, status='OPEN')
        .select_related('creator')
        .distinct()
    )

    from .meetings import _build_recommendation_candidates

    for meeting in meetings:
        members = list(meeting.members.select_related('user', 'user__profile').all())
        if len(members) < 2:
            continue
        weekly_recommendations_count += len(_build_recommendation_candidates(meeting, members))

    return JsonResponse(
        {
            'remaining_classes': remaining_classes,
            'today_tasks': today_tasks,
            'pending_requests': pending_requests,
            'weekly_recommendations_count': weekly_recommendations_count,
        },
        status=200,
    )
