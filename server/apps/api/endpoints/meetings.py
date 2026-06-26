import json
import secrets
import datetime

from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from ..models import Meeting, MeetingMember, InviteToken
from .common import method_not_allowed, not_implemented
from .user import _get_authorized_user


@csrf_exempt
def meetings_collection(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()
    if request.method == 'GET':
        return not_implemented('B-10 /api/meetings/')

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
    return not_implemented(f'B-10 and B-11 /api/meetings/{meeting_id}/')


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
