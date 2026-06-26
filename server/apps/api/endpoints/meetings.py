import json
import secrets
import datetime

from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse

from ..models import Meeting, MeetingMember, InviteToken
from .common import method_not_allowed, not_implemented
from .user import _get_authorized_user


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
    return not_implemented(f'B-12 and B-13 /api/meetings/{meeting_id}/recommendations/')


@csrf_exempt
def meeting_confirm(request, meeting_id):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented(f'B-14 /api/meetings/{meeting_id}/confirm/')


@csrf_exempt
def meeting_confirmed(request, meeting_id):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented(f'B-15 /api/meetings/{meeting_id}/confirmed/')
