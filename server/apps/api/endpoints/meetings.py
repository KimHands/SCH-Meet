import json
import secrets
import datetime
import math

from django.utils import timezone
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse

from ..models import FixedSchedule, InviteToken, Meeting, MeetingMember, TimetableClass
from ..models import Notification
from .common import method_not_allowed, not_implemented
from .user import _get_authorized_user


DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
DAY_INDEX = {day_code: index for index, day_code in enumerate(DAY_CODES)}
WEEKDAY_CODES = {'MON', 'TUE', 'WED', 'THU', 'FRI'}
RECOMMENDATION_WINDOW_START = 8 * 60
RECOMMENDATION_WINDOW_END = 22 * 60
MAX_RECOMMENDATIONS = 5
CANDIDATE_START_STEP = 30
SLOT_LENGTH_SCORE_CAP = 240
MEETING_DURATION_STEP = 30
CONFIRM_MINUTE_STEP = 5
MIN_MEETING_DURATION = 30
MAX_MEETING_DURATION = 240
INVITE_TOKEN_LIFETIME = datetime.timedelta(days=30)
TEXT_FIELD_LIMITS = {'purpose': 200, 'desired_time': 100, 'desired_location': 200}
COORDINATE_LIMITS = {'latitude': 90, 'longitude': 180}
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


def _create_notification(user, kind, title, body='', related_meeting=None):
    return Notification.objects.create(
        user=user,
        kind=kind,
        title=title,
        body=body,
        related_meeting=related_meeting,
    )


def _serialize_meeting_summary(meeting, user_member, participant_count):
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
        'duration_minutes': meeting.duration_minutes,
        'status': meeting.status,
        'is_creator': user_member.role == 'CREATOR',
        'role': user_member.role,
        'participant_count': participant_count,
        'participants_count': participant_count,
        'creator_name': _get_profile_display_name(meeting.creator),
        'created_at': meeting.created_at.isoformat(),
    }


def _build_invite_link(token, request):
    frontend_base = getattr(settings, 'FRONTEND_BASE_URL', None)
    if frontend_base:
        return f"{frontend_base.rstrip('/')}/invite/{token}"
    return request.build_absolute_uri(f'/api/meetings/invite/{token}/')


def _active_invite_link(meeting, request):
    not_expired = Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    invite = meeting.invite_tokens.filter(not_expired, is_active=True).order_by('-created_at').first()
    return _build_invite_link(invite.token, request) if invite else None


def _serialize_meeting_detail(meeting, membership, request):
    members = list(meeting.members.select_related('user', 'user__profile').all())
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
        'duration_minutes': meeting.duration_minutes,
        'status': meeting.status,
        'my_role': membership.role,
        'invite_link': _active_invite_link(meeting, request),
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
        hour, minute = int(hour_value), int(minute_value)
    except ValueError:
        return None
    if not (0 <= hour < 24 and 0 <= minute < 60):
        return None
    return hour * 60 + minute


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


def _collect_busy_intervals(user_ids):
    daily_busy_intervals = {day_code: [] for day_code in DAY_CODES}

    for timetable_class in TimetableClass.objects.filter(user_id__in=user_ids):
        if timetable_class.day in daily_busy_intervals:
            daily_busy_intervals[timetable_class.day].append((timetable_class.start_minute, timetable_class.end_minute))

    for fixed_schedule in FixedSchedule.objects.filter(user_id__in=user_ids):
        start_minute = _time_to_minute_value(fixed_schedule.start_time)
        end_minute = _time_to_minute_value(fixed_schedule.end_time)
        for day_code in fixed_schedule.repeat_days or []:
            if day_code in daily_busy_intervals:
                daily_busy_intervals[day_code].append((start_minute, end_minute))

    return daily_busy_intervals


def _compute_common_free_slots(members):
    daily_busy = _collect_busy_intervals([member.user_id for member in members])
    common_free_slots = {day_code: [] for day_code in DAY_CODES}

    for day_code in DAY_CODES:
        cursor = RECOMMENDATION_WINDOW_START
        for start_minute, end_minute in _merge_intervals(daily_busy[day_code]):
            if start_minute > cursor:
                common_free_slots[day_code].append((cursor, start_minute))
            cursor = max(cursor, end_minute)

        if cursor < RECOMMENDATION_WINDOW_END:
            common_free_slots[day_code].append((cursor, RECOMMENDATION_WINDOW_END))

    return common_free_slots


def _fits_in_free_slot(common_free_slots, day_code, start_minute, end_minute):
    return any(
        slot_start <= start_minute and end_minute <= slot_end
        for slot_start, slot_end in common_free_slots.get(day_code, [])
    )


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


def _location_reasons(meeting, members):
    reasons = []
    if meeting.desired_location:
        for member in members:
            member_location = getattr(member, 'desired_location', '') or ''
            if member_location and (meeting.desired_location in member_location or member_location in meeting.desired_location):
                reasons.append('희망 장소 조건이 일부 참여자 선호와 일치함')
                break

    if meeting.latitude is None or meeting.longitude is None:
        return reasons

    distances = [
        _haversine_distance_km(meeting.latitude, meeting.longitude, member.latitude, member.longitude)
        for member in members
        if member.latitude is not None and member.longitude is not None
    ]
    if distances:
        average_distance = sum(distances) / len(distances)
        if average_distance <= 2:
            reasons.append('참여자 기준 이동 거리가 매우 짧음')
        elif average_distance <= 5:
            reasons.append('참여자 기준 이동 거리가 짧은 편임')
    return reasons


def _build_rule_based_reasons(meeting, members, day_code, start_minute, slot_length):
    member_count = len(members)
    preference_matches = _does_slot_match_requested_time(day_code, start_minute, meeting)
    location_reasons = _location_reasons(meeting, members)

    reason_bullets = [f'{member_count}명 모두 가능한 공통 공강']
    if slot_length - meeting.duration_minutes >= 60:
        reason_bullets.append('앞뒤로 여유 시간이 있어 길어져도 괜찮음')
    else:
        reason_bullets.append('공강 시간에 꼭 맞는 일정')
    reason_bullets.extend(preference_matches)
    reason_bullets.extend(location_reasons)

    score = min(slot_length, SLOT_LENGTH_SCORE_CAP)
    score += member_count * 25
    score += len(preference_matches) * 40
    if meeting.desired_location:
        score += 15
    if any('이동 거리' in reason for reason in location_reasons):
        score += 30

    return reason_bullets[:4], score


def _best_start_in_slot(meeting, day_code, slot_start, slot_end):
    """희망 시간대와 가장 많이 맞는 시작 시각(동점이면 이른 시각)을 고른다."""
    latest_start = slot_end - meeting.duration_minutes
    starts = range(slot_start, latest_start + 1, CANDIDATE_START_STEP)
    return max(starts, key=lambda start: (len(_does_slot_match_requested_time(day_code, start, meeting)), -start))


def _build_recommendation_candidates(meeting, members, common_free_slots=None):
    if common_free_slots is None:
        common_free_slots = _compute_common_free_slots(members)
    duration = meeting.duration_minutes
    candidates = []

    for day_code in DAY_CODES:
        for slot_start, slot_end in common_free_slots[day_code]:
            slot_length = slot_end - slot_start
            if slot_length < duration:
                continue

            start_minute = _best_start_in_slot(meeting, day_code, slot_start, slot_end)
            reason_bullets, score = _build_rule_based_reasons(meeting, members, day_code, start_minute, slot_length)
            candidates.append(
                {
                    'day': day_code,
                    'start_minute': start_minute,
                    'reason_bullets': reason_bullets,
                    'score': score,
                }
            )

    candidates.sort(key=lambda candidate: (-candidate['score'], DAY_INDEX[candidate['day']], candidate['start_minute']))

    return [
        {
            'recommendation_id': index,
            'rank': index,
            'day': candidate['day'],
            'day_label': DAY_CODE_LABELS[candidate['day']],
            'start_time': _minute_to_clock_label(candidate['start_minute']),
            'end_time': _minute_to_clock_label(candidate['start_minute'] + duration),
            'duration_minutes': duration,
            'reason_bullets': candidate['reason_bullets'],
        }
        for index, candidate in enumerate(candidates[:MAX_RECOMMENDATIONS], start=1)
    ]


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


def _meeting_source_identifier(meeting):
    return f'meeting:{meeting.id}'


def _remove_confirmed_rows(meeting, user=None):
    rows = TimetableClass.objects.filter(source='meeting', source_identifier=_meeting_source_identifier(meeting))
    if user is not None:
        rows = rows.filter(user=user)
    rows.delete()


def _sync_confirmed_meeting_to_timetables(meeting):
    if meeting.confirmed_day not in DAY_CODES:
        return

    _remove_confirmed_rows(meeting)

    if meeting.confirmed_start_minute is None or meeting.confirmed_end_minute is None:
        return

    TimetableClass.objects.bulk_create(
        [
            TimetableClass(
                user=member.user,
                source='meeting',
                source_identifier=_meeting_source_identifier(meeting),
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
            for member in meeting.members.select_related('user').all()
        ]
    )


def _get_meeting_for_user_or_403(user, meeting_id):
    meeting = Meeting.objects.filter(id=meeting_id).select_related('creator').first()
    if not meeting:
        return None, JsonResponse({'detail': 'Meeting not found'}, status=404)

    membership = MeetingMember.objects.filter(meeting=meeting, user=user).first()
    if not membership:
        return None, JsonResponse({'detail': 'Forbidden'}, status=403)

    return (meeting, membership), None


def _bad_request(message):
    return JsonResponse({'detail': message}, status=400)


def _parse_coordinate(value, limit):
    """(값, 유효 여부). 빈 값은 None으로 허용한다."""
    if value is None or value == '':
        return None, True
    if isinstance(value, bool):
        return None, False
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None, False
    if not math.isfinite(number) or abs(number) > limit:
        return None, False
    return number, True


def _parse_text_fields(body):
    values = {}
    for field_name, max_length in TEXT_FIELD_LIMITS.items():
        if field_name not in body:
            continue
        value = body.get(field_name)
        if value is not None and not isinstance(value, str):
            return None, _bad_request('입력 형식이 올바르지 않아요.')
        if value and len(value) > max_length:
            return None, _bad_request(f'입력은 {max_length}자 이하로 해 주세요.')
        values[field_name] = value or ''
    return values, None


def _parse_coordinates(body):
    values = {}
    for field_name, limit in COORDINATE_LIMITS.items():
        if field_name not in body:
            continue
        number, is_valid = _parse_coordinate(body.get(field_name), limit)
        if not is_valid:
            return None, _bad_request('위치 정보가 올바르지 않아요.')
        values[field_name] = number
    return values, None


def _parse_positive_int(value):
    """정수 또는 숫자 문자열만 허용한다(bool·소수는 거부)."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _validate_name(name):
    if not name or not isinstance(name, str) or not name.strip():
        return _bad_request('모임 이름을 입력해 주세요.')
    if len(name) > 100:
        return _bad_request('모임 이름은 100자 이하로 입력해 주세요.')
    return None


def _validate_capacity(value, meeting):
    capacity = _parse_positive_int(value)
    if capacity is None or capacity < 2:
        return None, _bad_request('정원은 2명 이상이어야 해요.')
    if meeting and meeting.members.count() > capacity:
        return None, _bad_request('정원은 현재 참여 인원보다 작을 수 없어요.')
    return capacity, None


def _validate_duration(value):
    duration = _parse_positive_int(value)
    is_valid = (
        duration is not None
        and MIN_MEETING_DURATION <= duration <= MAX_MEETING_DURATION
        and duration % MEETING_DURATION_STEP == 0
    )
    if not is_valid:
        return None, _bad_request('모임 시간은 30분 단위로 30분~4시간 사이여야 해요.')
    return duration, None


def _validate_meeting_payload(body, meeting=None):
    updates = {}

    if 'name' in body:
        error_response = _validate_name(body.get('name'))
        if error_response:
            return None, error_response
        updates['name'] = body['name'].strip()

    for parse_fields in (_parse_text_fields, _parse_coordinates):
        values, error_response = parse_fields(body)
        if error_response:
            return None, error_response
        updates.update(values)

    if 'capacity' in body:
        updates['capacity'], error_response = _validate_capacity(body.get('capacity'), meeting)
        if error_response:
            return None, error_response

    if 'duration_minutes' in body:
        updates['duration_minutes'], error_response = _validate_duration(body.get('duration_minutes'))
        if error_response:
            return None, error_response

    return updates, None


def _parse_member_preferences(body):
    preferences = {'desired_time': '', 'desired_location': ''}
    for parse_fields in (_parse_text_fields, _parse_coordinates):
        values, error_response = parse_fields(body)
        if error_response:
            return None, error_response
        preferences.update(values)
    preferences.pop('purpose', None)
    return preferences, None


def _parse_json_body(request):
    try:
        body = json.loads(request.body.decode() or '{}')
    except (ValueError, UnicodeDecodeError):
        return None, _bad_request('Invalid JSON body')
    if not isinstance(body, dict):
        return None, _bad_request('Invalid JSON body')
    return body, None


def _create_invite_token(meeting):
    token = secrets.token_urlsafe(16)
    while InviteToken.objects.filter(token=token).exists():
        token = secrets.token_urlsafe(16)
    InviteToken.objects.create(token=token, meeting=meeting, expires_at=timezone.now() + INVITE_TOKEN_LIFETIME)
    return token


@csrf_exempt
def meetings_collection(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    if request.method == 'GET':
        return _list_meetings(request, user)
    return _create_meeting(request, user)


def _list_meetings(request, user):
    status_filter = request.GET.get('status', 'active').strip().lower()
    if status_filter not in ['active', 'ended']:
        return JsonResponse({'detail': 'Invalid status filter'}, status=400)

    meeting_statuses = ['OPEN', 'CONFIRMED'] if status_filter == 'active' else ['CLOSED']
    memberships = (
        MeetingMember.objects.filter(user=user, meeting__status__in=meeting_statuses)
        .select_related('meeting', 'meeting__creator', 'meeting__creator__profile')
        .annotate(participant_total=Count('meeting__members'))
        .order_by('-meeting__created_at')
    )

    meetings = [
        _serialize_meeting_summary(membership.meeting, membership, membership.participant_total)
        for membership in memberships
    ]
    return JsonResponse(meetings, safe=False, status=200)


def _create_meeting(request, user):
    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response
    if 'name' not in body:
        return _bad_request('모임 이름을 입력해 주세요.')
    if 'capacity' not in body:
        return _bad_request('정원을 입력해 주세요.')

    fields, error_response = _validate_meeting_payload(body)
    if error_response:
        return error_response

    with transaction.atomic():
        meeting = Meeting.objects.create(creator=user, **fields)
        MeetingMember.objects.create(meeting=meeting, user=user, role='CREATOR')
        token = _create_invite_token(meeting)
        _create_notification(
            user=user,
            kind='MEETING_CREATED',
            title='모임이 생성되었습니다',
            body=f'"{meeting.name}" 모임 초대 링크가 생성되었습니다.',
            related_meeting=meeting,
        )

    invite_link = _build_invite_link(token, request)
    return JsonResponse({'meeting_id': meeting.id, 'invite_link': invite_link, 'token': token}, status=201)


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
        return JsonResponse(_serialize_meeting_detail(meeting, membership, request), status=200)

    if request.method == 'PATCH':
        return _update_meeting(request, meeting, membership)

    with transaction.atomic():
        if membership.role != 'CREATOR':
            _remove_confirmed_rows(meeting, user=user)
            membership.delete()
        else:
            _remove_confirmed_rows(meeting)
            meeting.delete()
    return HttpResponse(status=204)


def _update_meeting(request, meeting, membership):
    if membership.role != 'CREATOR':
        return JsonResponse({'detail': '모임장만 수정할 수 있어요.'}, status=403)

    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    with transaction.atomic():
        meeting = Meeting.objects.select_for_update().get(id=meeting.id)
        updates, validation_error = _validate_meeting_payload(body, meeting=meeting)
        if validation_error:
            return validation_error
        if 'duration_minutes' in updates and meeting.status != 'OPEN':
            return JsonResponse({'detail': '확정된 모임은 시간을 바꿀 수 없어요.'}, status=409)
        _save_meeting_updates(meeting, updates)

    refreshed_meeting = Meeting.objects.select_related('creator').get(id=meeting.id)
    return JsonResponse(_serialize_meeting_detail(refreshed_meeting, membership, request), status=200)


def _save_meeting_updates(meeting, updates):
    """바뀐 필드만 저장해 다른 요청이 바꾼 status 등을 덮어쓰지 않는다."""
    if not updates:
        return
    for field_name, value in updates.items():
        setattr(meeting, field_name, value)
    meeting.save(update_fields=list(updates))


@csrf_exempt
def meeting_invite_detail(request, token):
    if request.method != 'GET':
        return method_not_allowed()

    invite, error_response = _get_valid_invite(token)
    if error_response:
        return error_response

    meeting = invite.meeting
    members = list(meeting.members.select_related('user', 'user__profile').all())
    existing_members = [
        {
            'nickname': _get_profile_display_name(member.user),
            'profile_image_url': getattr(getattr(member.user, 'profile', None), 'profile_image_url', ''),
        }
        for member in members
    ]

    response = {
        'meeting_id': meeting.id,
        'meeting_name': meeting.name,
        'purpose': meeting.purpose,
        'status': meeting.status,
        'duration_minutes': meeting.duration_minutes,
        'creator_name': _get_profile_display_name(meeting.creator),
        'current_participants_count': len(members),
        'capacity': meeting.capacity,
        'existing_members': existing_members,
    }

    return JsonResponse(response, status=200)


def _get_valid_invite(token):
    invite = InviteToken.objects.filter(token=token, is_active=True).select_related('meeting', 'meeting__creator').first()
    if not invite or (invite.expires_at and invite.expires_at < timezone.now()):
        return None, JsonResponse({'detail': '초대 링크가 없거나 만료되었어요.'}, status=404)
    return invite, None


@csrf_exempt
def meeting_invite_join(request, token):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    invite, error_response = _get_valid_invite(token)
    if error_response:
        return error_response

    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    preferences, error_response = _parse_member_preferences(body)
    if error_response:
        return error_response

    with transaction.atomic():
        meeting = Meeting.objects.select_for_update().get(id=invite.meeting_id)
        if MeetingMember.objects.filter(meeting=meeting, user=user).exists():
            return JsonResponse({'detail': 'Already joined'}, status=200)
        if meeting.status != 'OPEN':
            return JsonResponse({'detail': '이미 일정이 확정된 모임이에요.'}, status=409)
        if MeetingMember.objects.filter(meeting=meeting).count() >= meeting.capacity:
            return JsonResponse({'detail': '모임 정원이 가득 찼어요.'}, status=409)

        try:
            with transaction.atomic():
                MeetingMember.objects.create(meeting=meeting, user=user, role='MEMBER', **preferences)
        except IntegrityError:
            if MeetingMember.objects.filter(meeting=meeting, user=user).exists():
                return JsonResponse({'detail': 'Already joined'}, status=200)
            raise

        _create_notification(
            user=meeting.creator,
            kind='MEETING_JOINED',
            title='새 참여 요청이 도착했습니다',
            body=f'"{meeting.name}" 모임에 새로운 참여자가 합류했습니다.',
            related_meeting=meeting,
        )

    return JsonResponse({'detail': 'Joined successfully'}, status=200)


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
        return JsonResponse({'detail': '모임장만 일정을 확정할 수 있어요.'}, status=403)

    body, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    selection, error_response = _parse_confirm_selection(body)
    if error_response:
        return error_response

    with transaction.atomic():
        meeting = Meeting.objects.select_for_update().get(id=meeting.id)
        if meeting.status == 'CONFIRMED':
            return JsonResponse(_serialize_confirmed_meeting(meeting), status=200)
        if meeting.status != 'OPEN':
            return JsonResponse({'detail': '종료된 모임은 확정할 수 없어요.'}, status=409)

        members = list(meeting.members.select_related('user', 'user__profile').all())
        if len(members) < 2:
            return JsonResponse({'detail': '참여자가 2명 이상이어야 확정할 수 있어요.'}, status=409)

        confirmed_slot, error_response = _resolve_confirm_slot(meeting, members, selection)
        if error_response:
            return error_response

        _apply_confirmation(meeting, confirmed_slot)

    return JsonResponse(_serialize_confirmed_meeting(meeting), status=200)


def _parse_confirm_selection(body):
    day = body.get('day')
    start_minute = _parse_clock_to_minute(body.get('start_time'))
    if day is None and body.get('start_time') is None and body.get('selected_recommendation_id') is not None:
        return None, _bad_request('앱이 업데이트되었어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.')
    if day not in DAY_CODES or start_minute is None:
        return None, _bad_request('확정할 시간을 다시 선택해 주세요.')
    if start_minute % CONFIRM_MINUTE_STEP != 0:
        return None, _bad_request('확정 시각은 5분 단위여야 해요.')
    recommendation_id = _parse_positive_int(body.get('selected_recommendation_id'))
    return {'recommendation_id': recommendation_id, 'day': day, 'start_minute': start_minute}, None


def _resolve_confirm_slot(meeting, members, selection):
    end_minute = selection['start_minute'] + meeting.duration_minutes
    common_free_slots = _compute_common_free_slots(members)
    if not _fits_in_free_slot(common_free_slots, selection['day'], selection['start_minute'], end_minute):
        stale_message = '선택한 시간에 다른 일정이 생겼어요. 추천을 다시 불러와 주세요.'
        return None, JsonResponse({'detail': stale_message}, status=409)
    return {**selection, 'end_minute': end_minute}, None


def _apply_confirmation(meeting, confirmed_slot):
    meeting.status = 'CONFIRMED'
    meeting.confirmed_recommendation_id = confirmed_slot.get('recommendation_id')
    meeting.confirmed_day = confirmed_slot['day']
    meeting.confirmed_start_minute = confirmed_slot['start_minute']
    meeting.confirmed_end_minute = confirmed_slot['end_minute']
    meeting.confirmed_location = meeting.desired_location or ''
    meeting.confirmed_at = timezone.now()
    meeting.save()

    _sync_confirmed_meeting_to_timetables(meeting)

    day_label = DAY_CODE_LABELS[meeting.confirmed_day]
    start_label = _minute_to_clock_label(meeting.confirmed_start_minute)
    for member in meeting.members.select_related('user').all():
        _create_notification(
            user=member.user,
            kind='MEETING_CONFIRMED',
            title='모임 일정이 확정되었습니다',
            body=f'"{meeting.name}" 모임이 {day_label} {start_label}에 확정되었습니다.',
            related_meeting=meeting,
        )


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
