import json
import secrets
import datetime
import math

from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse

from ..models import FixedSchedule, InviteToken, Meeting, MeetingMember, TimetableClass
from .common import method_not_allowed, not_implemented
from .user import _get_authorized_user


DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
DAY_INDEX = {day_code: index for index, day_code in enumerate(DAY_CODES)}
WEEKDAY_CODES = {'MON', 'TUE', 'WED', 'THU', 'FRI'}
RECOMMENDATION_WINDOW_START = 8 * 60
RECOMMENDATION_WINDOW_END = 22 * 60
MIN_RECOMMENDATION_DURATION = 30
MAX_RECOMMENDATIONS = 5
DAY_CODE_LABELS = {
    'MON': '월',
    'TUE': '화',
    'WED': '수',
    'THU': '목',
    'FRI': '금',
    'SAT': '토',
    'SUN': '일',
}


def _get_profile_display_name(user):
    profile = getattr(user, 'profile', None)
    if profile and getattr(profile, 'nickname', ''):
        return profile.nickname
    return user.username or f'user-{user.id}'


def _serialize_meeting_member(member):
    user = member.user
    profile = getattr(user, 'profile', None)
    return {
        'user_id': user.id,
        'nickname': getattr(profile, 'nickname', '') or user.username,
        'profile_image_url': getattr(profile, 'profile_image_url', ''),
        'role': member.role,
        'is_creator': member.role == 'CREATOR',
    }


def _serialize_meeting_summary(meeting, user_member):
    participant_count = meeting.members.count()
    return {
        'meeting_id': meeting.id,
        'id': meeting.id,
        'name': meeting.name,
        'title': meeting.name,
        'purpose': meeting.purpose,
        'desired_time': meeting.desired_time,
        'desired_location': meeting.desired_location,
        'latitude': meeting.latitude,
        'longitude': meeting.longitude,
        'capacity': meeting.capacity,
        'max_members': meeting.capacity,
        'status': meeting.status,
        'is_creator': user_member.role == 'CREATOR',
        'role': user_member.role,
        'participant_count': participant_count,
        'participants_count': participant_count,
        'creator_name': _get_profile_display_name(meeting.creator),
        'created_at': meeting.created_at.isoformat(),
    }


def _serialize_meeting_detail(meeting):
    members = list(meeting.members.select_related('user').all())
    member_list = [_serialize_meeting_member(member) for member in members]
    return {
        'meeting_id': meeting.id,
        'id': meeting.id,
        'meeting_name': meeting.name,
        'name': meeting.name,
        'title': meeting.name,
        'purpose': meeting.purpose,
        'desired_time': meeting.desired_time,
        'desired_location': meeting.desired_location,
        'latitude': meeting.latitude,
        'longitude': meeting.longitude,
        'capacity': meeting.capacity,
        'max_members': meeting.capacity,
        'status': meeting.status,
        'creator_name': _get_profile_display_name(meeting.creator),
        'creator_role': 'CREATOR',
        'current_participants_count': len(member_list),
        'participant_count': len(member_list),
        'members': member_list,
        'existing_members': [
            {
                'nickname': member['nickname'],
                'profile_image_url': member['profile_image_url'],
            }
            for member in member_list
        ],
        'recommended_slots': [],
        'created_at': meeting.created_at.isoformat(),
    }


def _minute_to_clock_label(minute_value):
    hour = minute_value // 60
    minute = minute_value % 60
    return f'{hour:02d}:{minute:02d}'


def _parse_clock_to_minute(clock_value):
    if not isinstance(clock_value, str) or ':' not in clock_value:
        return None

    hour_value, minute_value = clock_value.split(':', 1)
    try:
        return int(hour_value) * 60 + int(minute_value)
    except Exception:
        return None


def _time_to_minute_value(time_value):
    return time_value.hour * 60 + time_value.minute


def _merge_intervals(intervals):
    cleaned_intervals = []
    for start_minute, end_minute in intervals:
        if start_minute is None or end_minute is None:
            continue
        start_minute = max(RECOMMENDATION_WINDOW_START, int(start_minute))
        end_minute = min(RECOMMENDATION_WINDOW_END, int(end_minute))
        if end_minute <= start_minute:
            continue
        cleaned_intervals.append((start_minute, end_minute))

    if not cleaned_intervals:
        return []

    merged = []
    for start_minute, end_minute in sorted(cleaned_intervals, key=lambda interval: (interval[0], interval[1])):
        if not merged or start_minute > merged[-1][1]:
            merged.append([start_minute, end_minute])
            continue

        merged[-1][1] = max(merged[-1][1], end_minute)

    return [(start_minute, end_minute) for start_minute, end_minute in merged]


def _collect_busy_intervals_for_user(user):
    daily_busy_intervals = {day_code: [] for day_code in DAY_CODES}

    for timetable_class in TimetableClass.objects.filter(user=user):
        if timetable_class.day in daily_busy_intervals:
            daily_busy_intervals[timetable_class.day].append((timetable_class.start_minute, timetable_class.end_minute))

    for fixed_schedule in FixedSchedule.objects.filter(user=user):
        start_minute = _time_to_minute_value(fixed_schedule.start_time)
        end_minute = _time_to_minute_value(fixed_schedule.end_time)
        for day_code in fixed_schedule.repeat_days or []:
            if day_code in daily_busy_intervals:
                daily_busy_intervals[day_code].append((start_minute, end_minute))

    return {day_code: _merge_intervals(intervals) for day_code, intervals in daily_busy_intervals.items()}


def _compute_common_free_slots(members):
    daily_busy = {day_code: [] for day_code in DAY_CODES}

    for member in members:
        user_busy = _collect_busy_intervals_for_user(member.user)
        for day_code in DAY_CODES:
            daily_busy[day_code].extend(user_busy.get(day_code, []))

    common_free_slots = {day_code: [] for day_code in DAY_CODES}

    for day_code in DAY_CODES:
        merged_busy = _merge_intervals(daily_busy[day_code])
        cursor = RECOMMENDATION_WINDOW_START
        for start_minute, end_minute in merged_busy:
            if start_minute > cursor:
                common_free_slots[day_code].append((cursor, start_minute))
            cursor = max(cursor, end_minute)

        if cursor < RECOMMENDATION_WINDOW_END:
            common_free_slots[day_code].append((cursor, RECOMMENDATION_WINDOW_END))

    return common_free_slots, daily_busy


def _classify_daypart(minute_value):
    if minute_value < 12 * 60:
        return 'morning'
    if minute_value < 17 * 60:
        return 'afternoon'
    if minute_value < 21 * 60:
        return 'evening'
    return 'night'


def _contains_any(text, values):
    if not text:
        return False
    lowered = text.lower()
    return any(value.lower() in lowered for value in values)


def _does_slot_match_requested_time(day_code, start_minute, meeting):
    requested_time = (meeting.desired_time or '').strip()
    if not requested_time:
        return []

    daypart = _classify_daypart(start_minute)
    reasons = []

    if _contains_any(requested_time, ['주중', '평일']) and day_code in WEEKDAY_CODES:
        reasons.append('주중 선호와 일치')
    if _contains_any(requested_time, ['주말']) and day_code not in WEEKDAY_CODES:
        reasons.append('주말 선호와 일치')
    if _contains_any(requested_time, ['오전', '아침']) and daypart == 'morning':
        reasons.append('오전 선호와 일치')
    if _contains_any(requested_time, ['오후']) and daypart == 'afternoon':
        reasons.append('오후 선호와 일치')
    if _contains_any(requested_time, ['저녁', '밤']) and daypart in ['evening', 'night']:
        reasons.append('저녁 선호와 일치')

    for code, label in DAY_CODE_LABELS.items():
        if label in requested_time and code == day_code:
            reasons.append(f'{label}요일 선호와 일치')
            break

    return reasons


def _haversine_distance_km(lat1, lng1, lat2, lng2):
    radius_km = 6371.0
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)

    delta_lat = lat2_rad - lat1_rad
    delta_lng = lng2_rad - lng1_rad
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def _build_rule_based_reasons(meeting, members, day_code, start_minute, end_minute):
    member_count = len(members)
    duration_minutes = end_minute - start_minute
    reason_bullets = [f'{member_count}명 모두 가능한 공통 공강']

    if duration_minutes >= 120:
        reason_bullets.append(f'연속으로 {duration_minutes}분을 확보할 수 있음')
    elif duration_minutes >= 90:
        reason_bullets.append('1시간 30분 이상 이어서 진행할 수 있음')
    else:
        reason_bullets.append('짧고 집중도 높은 일정으로 잡기 좋음')

    reason_bullets.extend(_does_slot_match_requested_time(day_code, start_minute, meeting))

    if meeting.desired_location:
        matching_location_count = 0
        for member in members:
            member_location = getattr(member, 'desired_location', '') or ''
            if not member_location:
                continue
            if meeting.desired_location in member_location or member_location in meeting.desired_location:
                matching_location_count += 1

        if matching_location_count:
            reason_bullets.append('희망 장소 조건이 일부 참여자 선호와 일치함')

    if meeting.latitude is not None and meeting.longitude is not None:
        distances = []
        for member in members:
            if member.latitude is None or member.longitude is None:
                continue
            distances.append(
                _haversine_distance_km(
                    meeting.latitude,
                    meeting.longitude,
                    member.latitude,
                    member.longitude,
                )
            )

        if distances:
            average_distance = sum(distances) / len(distances)
            if average_distance <= 2:
                reason_bullets.append('참여자 기준 이동 거리가 매우 짧음')
            elif average_distance <= 5:
                reason_bullets.append('참여자 기준 이동 거리가 짧은 편임')

    if len(reason_bullets) > 4:
        reason_bullets = reason_bullets[:4]

    score = duration_minutes
    score += member_count * 25
    score += len(_does_slot_match_requested_time(day_code, start_minute, meeting)) * 40
    if meeting.desired_location:
        score += 15
    if any('이동 거리' in reason for reason in reason_bullets):
        score += 30

    return reason_bullets, score


def _build_recommendation_candidates(meeting, members):
    common_free_slots, _daily_busy_by_member = _compute_common_free_slots(members)
    candidates = []

    for day_code in DAY_CODES:
        for start_minute, end_minute in common_free_slots[day_code]:
            duration_minutes = end_minute - start_minute
            if duration_minutes < MIN_RECOMMENDATION_DURATION:
                continue

            reason_bullets, score = _build_rule_based_reasons(
                meeting,
                members,
                day_code,
                start_minute,
                end_minute,
            )

            candidates.append(
                {
                    'day': day_code,
                    'start_minute': start_minute,
                    'end_minute': end_minute,
                    'start_time': _minute_to_clock_label(start_minute),
                    'end_time': _minute_to_clock_label(end_minute),
                    'duration_minutes': duration_minutes,
                    'reason_bullets': reason_bullets,
                    'score': score,
                }
            )

    candidates.sort(
        key=lambda candidate: (
            -candidate['score'],
            -candidate['duration_minutes'],
            DAY_INDEX[candidate['day']],
            candidate['start_minute'],
        )
    )

    recommendations = []
    for index, candidate in enumerate(candidates[:MAX_RECOMMENDATIONS], start=1):
        recommendations.append(
            {
                'recommendation_id': index,
                'rank': index,
                'day': candidate['day'],
                'day_label': DAY_CODE_LABELS[candidate['day']],
                'start_time': candidate['start_time'],
                'end_time': candidate['end_time'],
                'duration_minutes': candidate['duration_minutes'],
                'reason_bullets': candidate['reason_bullets'],
            }
        )

    return recommendations


def _serialize_confirmed_meeting(meeting):
    if meeting.confirmed_start_minute is None or meeting.confirmed_end_minute is None:
        confirmed_time = None
    else:
        confirmed_time = {
            'day': meeting.confirmed_day,
            'start_time': _minute_to_clock_label(meeting.confirmed_start_minute),
            'end_time': _minute_to_clock_label(meeting.confirmed_end_minute),
        }

    confirmed_members = []
    for member in meeting.members.select_related('user', 'user__profile').all():
        profile = getattr(member.user, 'profile', None)
        confirmed_members.append(
            {
                'user_id': member.user.id,
                'nickname': getattr(profile, 'nickname', '') or member.user.username,
                'profile_image_url': getattr(profile, 'profile_image_url', ''),
                'role': member.role,
            }
        )

    return {
        'meeting_id': meeting.id,
        'meeting_name': meeting.name,
        'status': meeting.status,
        'confirmed_time': confirmed_time,
        'confirmed_location': meeting.confirmed_location,
        'confirmed_members': confirmed_members,
        'confirmed_recommendation_id': meeting.confirmed_recommendation_id,
        'confirmed_at': meeting.confirmed_at.isoformat() if meeting.confirmed_at else None,
    }


def _sync_confirmed_meeting_to_timetables(meeting):
    if meeting.confirmed_day not in DAY_CODES:
        return

    TimetableClass.objects.filter(source='meeting', source_identifier=f'meeting:{meeting.id}').delete()

    if meeting.confirmed_start_minute is None or meeting.confirmed_end_minute is None:
        return

    meeting_members = meeting.members.select_related('user').all()
    for member in meeting_members:
        TimetableClass.objects.create(
            user=member.user,
            source='meeting',
            source_identifier=f'meeting:{meeting.id}',
            year=None,
            semester='',
            name=meeting.name,
            professor='',
            day=meeting.confirmed_day,
            start_minute=meeting.confirmed_start_minute,
            end_minute=meeting.confirmed_end_minute,
            place=meeting.confirmed_location,
            time_label='모임 확정 일정',
            closed=False,
        )


def _get_meeting_for_user_or_403(user, meeting_id):
    meeting = Meeting.objects.filter(id=meeting_id).select_related('creator').first()
    if not meeting:
        return None, JsonResponse({'detail': 'Meeting not found'}, status=404)

    membership = MeetingMember.objects.filter(meeting=meeting, user=user).first()
    if not membership:
        return None, JsonResponse({'detail': 'Forbidden'}, status=403)

    return (meeting, membership), None


def _validate_meeting_payload(body, meeting=None):
    updates = {}

    if 'name' in body:
        name = body.get('name')
        if not name or not isinstance(name, str):
            return None, JsonResponse({'detail': 'Missing or invalid name'}, status=400)
        if len(name) > 100:
            return None, JsonResponse({'detail': 'Meeting name too long'}, status=400)
        updates['name'] = name

    if 'purpose' in body:
        purpose = body.get('purpose')
        if purpose is not None and not isinstance(purpose, str):
            return None, JsonResponse({'detail': 'purpose must be a string'}, status=400)
        updates['purpose'] = purpose or ''

    if 'desired_time' in body:
        desired_time = body.get('desired_time')
        if desired_time is not None and not isinstance(desired_time, str):
            return None, JsonResponse({'detail': 'desired_time must be a string'}, status=400)
        updates['desired_time'] = desired_time or ''

    if 'desired_location' in body:
        desired_location = body.get('desired_location')
        if desired_location is not None and not isinstance(desired_location, str):
            return None, JsonResponse({'detail': 'desired_location must be a string'}, status=400)
        updates['desired_location'] = desired_location or ''

    if 'latitude' in body:
        latitude = body.get('latitude')
        if latitude is None or latitude == '':
            updates['latitude'] = None
        else:
            try:
                updates['latitude'] = float(latitude)
            except Exception:
                return None, JsonResponse({'detail': 'latitude must be a number'}, status=400)

    if 'longitude' in body:
        longitude = body.get('longitude')
        if longitude is None or longitude == '':
            updates['longitude'] = None
        else:
            try:
                updates['longitude'] = float(longitude)
            except Exception:
                return None, JsonResponse({'detail': 'longitude must be a number'}, status=400)

    if 'capacity' in body:
        capacity = body.get('capacity')
        if capacity is None or capacity == '':
            return None, JsonResponse({'detail': 'capacity must be provided'}, status=400)
        try:
            capacity = int(capacity)
        except Exception:
            return None, JsonResponse({'detail': 'capacity must be an integer'}, status=400)
        if capacity < 2:
            return None, JsonResponse({'detail': 'capacity must be at least 2'}, status=400)
        if meeting and meeting.members.count() > capacity:
            return None, JsonResponse({'detail': 'capacity cannot be smaller than current participants'}, status=400)
        updates['capacity'] = capacity

    return updates, None


@csrf_exempt
def meetings_collection(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()
    if request.method == 'GET':
        user, error_response = _get_authorized_user(request)
        if error_response:
            return error_response

        status_filter = request.GET.get('status', 'active').strip().lower()
        if status_filter not in ['active', 'ended']:
            return JsonResponse({'detail': 'Invalid status filter'}, status=400)

        if status_filter == 'active':
            meeting_statuses = ['OPEN', 'CONFIRMED']
        else:
            meeting_statuses = ['CLOSED']

        memberships = (
            MeetingMember.objects.filter(user=user, meeting__status__in=meeting_statuses)
            .select_related('meeting', 'meeting__creator')
            .order_by('-meeting__created_at')
        )

        meetings = [_serialize_meeting_summary(membership.meeting, membership) for membership in memberships]
        return JsonResponse(meetings, safe=False, status=200)

    # POST -> create meeting (B-07)
    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    name = body.get('name')
    purpose = body.get('purpose', '')
    desired_time = body.get('desired_time', '')
    desired_location = body.get('desired_location', '')
    latitude = body.get('latitude')
    longitude = body.get('longitude')
    capacity = body.get('capacity')

    # Validation
    if not name or not isinstance(name, str):
        return JsonResponse({'detail': 'Missing or invalid name'}, status=400)
    if len(name) > 100:
        return JsonResponse({'detail': 'Meeting name too long'}, status=400)
    if capacity is None:
        return JsonResponse({'detail': 'Missing capacity'}, status=400)
    try:
        capacity = int(capacity)
    except Exception:
        return JsonResponse({'detail': 'capacity must be an integer'}, status=400)
    if capacity < 2:
        return JsonResponse({'detail': 'capacity must be at least 2'}, status=400)

    # Create meeting
    try:
        meeting = Meeting.objects.create(
            name=name,
            purpose=purpose or '',
            desired_time=desired_time or '',
            desired_location=desired_location or '',
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None,
            capacity=capacity,
            creator=user,
        )

        # Add creator as meeting member with creator role
        MeetingMember.objects.create(meeting=meeting, user=user, role='CREATOR')

        # Generate invite token
        token = secrets.token_urlsafe(16)
        # ensure uniqueness
        while InviteToken.objects.filter(token=token).exists():
            token = secrets.token_urlsafe(16)

        now = timezone.now()
        expires_at = now + datetime.timedelta(days=30)
        invite = InviteToken.objects.create(token=token, meeting=meeting, expires_at=expires_at)

        # Build invite link pointing to frontend invite route when configured
        frontend_base = getattr(settings, 'FRONTEND_BASE_URL', None)
        if frontend_base:
            invite_link = f"{frontend_base.rstrip('/')}/invite/{token}"
        else:
            invite_link = request.build_absolute_uri(f"/api/meetings/invite/{token}/")

        return JsonResponse({'meeting_id': meeting.id, 'invite_link': invite_link, 'token': token}, status=201)
    except Exception as e:
        return JsonResponse({'detail': 'Internal server error', 'error': str(e)}, status=500)


@csrf_exempt
def meeting_detail(request, meeting_id):
    if request.method not in ['GET', 'PATCH', 'DELETE']:
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    payload, permission_error = _get_meeting_for_user_or_403(user, meeting_id)
    if permission_error:
        return permission_error

    meeting, membership = payload

    if request.method == 'GET':
        return JsonResponse(_serialize_meeting_detail(meeting), status=200)

    if request.method == 'PATCH':
        if membership.role != 'CREATOR':
            return JsonResponse({'detail': 'Forbidden'}, status=403)

        try:
            body = json.loads(request.body.decode() or '{}')
        except Exception:
            return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

        updates, validation_error = _validate_meeting_payload(body, meeting=meeting)
        if validation_error:
            return validation_error

        for field_name, value in updates.items():
            setattr(meeting, field_name, value)
        meeting.save()

        refreshed_meeting = Meeting.objects.select_related('creator').get(id=meeting.id)
        return JsonResponse(_serialize_meeting_detail(refreshed_meeting), status=200)

    if membership.role != 'CREATOR':
        membership.delete()
        return HttpResponse(status=204)

    meeting.delete()
    return HttpResponse(status=204)


@csrf_exempt
def meeting_invite_detail(request, token):
    if request.method != 'GET':
        return method_not_allowed()
    # B-09: Return invite metadata and current participants
    invite = InviteToken.objects.filter(token=token, is_active=True).select_related('meeting').first()
    if not invite:
        return JsonResponse({'detail': 'Invite token not found'}, status=404)

    if invite.expires_at and invite.expires_at < timezone.now():
        return JsonResponse({'detail': 'Invite token expired'}, status=404)

    meeting = invite.meeting

    # gather members
    members_qs = meeting.members.select_related('user')
    existing_members = []
    for mm in members_qs.all():
        user = mm.user
        nickname = ''
        profile_image_url = ''
        try:
            profile = user.profile
            nickname = getattr(profile, 'nickname', '')
            profile_image_url = getattr(profile, 'profile_image_url', '')
        except Exception:
            nickname = user.username or ''
        existing_members.append({'nickname': nickname, 'profile_image_url': profile_image_url})

    response = {
        'meeting_id': meeting.id,
        'meeting_name': meeting.name,
        'purpose': meeting.purpose,
        'creator_name': (getattr(meeting.creator, 'profile').nickname if hasattr(meeting.creator, 'profile') else meeting.creator.username),
        'current_participants_count': members_qs.count(),
        'capacity': meeting.capacity,
        'existing_members': existing_members,
    }

    return JsonResponse(response, status=200)


@csrf_exempt
def meeting_invite_join(request, token):
    if request.method != 'POST':
        return method_not_allowed()
    # B-08: Join meeting via invite token
    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    invite = InviteToken.objects.filter(token=token, is_active=True).select_related('meeting').first()
    if not invite:
        return JsonResponse({'detail': 'Invite token not found'}, status=404)
    if invite.expires_at and invite.expires_at < timezone.now():
        return JsonResponse({'detail': 'Invite token expired'}, status=404)

    meeting = invite.meeting

    # check capacity
    current_count = MeetingMember.objects.filter(meeting=meeting).count()
    if current_count >= meeting.capacity:
        return JsonResponse({'detail': 'Meeting is full'}, status=409)

    # If already member, return success
    if MeetingMember.objects.filter(meeting=meeting, user=user).exists():
        return JsonResponse({'detail': 'Already joined'}, status=200)

    # parse optional preference fields and persist them to MeetingMember
    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        body = {}

    pref_time = body.get('desired_time', '')
    pref_location = body.get('desired_location', '')
    pref_lat = body.get('latitude')
    pref_lng = body.get('longitude')

    # create membership with preferences
    try:
        MeetingMember.objects.create(
            meeting=meeting,
            user=user,
            role='MEMBER',
            desired_time=pref_time or '',
            desired_location=pref_location or '',
            latitude=float(pref_lat) if pref_lat is not None else None,
            longitude=float(pref_lng) if pref_lng is not None else None,
        )
        return JsonResponse({'detail': 'Joined successfully'}, status=200)
    except Exception as e:
        return JsonResponse({'detail': 'Internal server error', 'error': str(e)}, status=500)


@csrf_exempt
def meeting_recommendations(request, meeting_id):
    if request.method != 'GET':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    payload, permission_error = _get_meeting_for_user_or_403(user, meeting_id)
    if permission_error:
        return permission_error

    meeting, _membership = payload
    members = list(meeting.members.select_related('user', 'user__profile').all())

    if len(members) < 2:
        return JsonResponse(
            {
                'meeting_id': meeting.id,
                'can_recommend': False,
                'reason': 'LACK_OF_PARTICIPANTS',
            },
            status=200,
        )

    recommendations = _build_recommendation_candidates(meeting, members)
    if not recommendations:
        return JsonResponse(
            {
                'meeting_id': meeting.id,
                'can_recommend': False,
                'reason': 'NO_COMMON_SLOTS',
            },
            status=200,
        )

    return JsonResponse(
        {
            'meeting_id': meeting.id,
            'meeting_name': meeting.name,
            'can_recommend': True,
            'participant_count': len(members),
            'recommendations': recommendations,
        },
        status=200,
    )


@csrf_exempt
def meeting_confirm(request, meeting_id):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    payload, permission_error = _get_meeting_for_user_or_403(user, meeting_id)
    if permission_error:
        return permission_error

    meeting, membership = payload
    if membership.role != 'CREATOR':
        return JsonResponse({'detail': 'Forbidden'}, status=403)

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    selected_recommendation_id = body.get('selected_recommendation_id')
    if selected_recommendation_id is None:
        return JsonResponse({'detail': 'selected_recommendation_id is required'}, status=400)

    try:
        selected_recommendation_id = int(selected_recommendation_id)
    except Exception:
        return JsonResponse({'detail': 'selected_recommendation_id must be an integer'}, status=400)

    members = list(meeting.members.select_related('user', 'user__profile').all())
    if len(members) < 2:
        return JsonResponse({'detail': 'Meeting has insufficient participants'}, status=409)

    if meeting.status == 'CONFIRMED':
        return JsonResponse(_serialize_confirmed_meeting(meeting), status=200)

    recommendations = _build_recommendation_candidates(meeting, members)
    selected_recommendation = None
    for recommendation in recommendations:
        if recommendation['recommendation_id'] == selected_recommendation_id:
            selected_recommendation = recommendation
            break

    if not selected_recommendation:
        return JsonResponse({'detail': 'Recommendation not found'}, status=404)

    meeting.status = 'CONFIRMED'
    meeting.confirmed_recommendation_id = selected_recommendation_id
    meeting.confirmed_day = selected_recommendation['day']
    meeting.confirmed_start_minute = _parse_clock_to_minute(selected_recommendation['start_time'])
    meeting.confirmed_end_minute = _parse_clock_to_minute(selected_recommendation['end_time'])
    meeting.confirmed_location = meeting.desired_location or ''
    meeting.confirmed_at = timezone.now()
    meeting.save()

    _sync_confirmed_meeting_to_timetables(meeting)

    return JsonResponse(_serialize_confirmed_meeting(meeting), status=200)


@csrf_exempt
def meeting_confirmed(request, meeting_id):
    if request.method != 'GET':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    payload, permission_error = _get_meeting_for_user_or_403(user, meeting_id)
    if permission_error:
        return permission_error

    meeting, _membership = payload
    if meeting.status != 'CONFIRMED':
        return JsonResponse({'detail': 'Meeting is not confirmed yet'}, status=404)

    return JsonResponse(_serialize_confirmed_meeting(meeting), status=200)
