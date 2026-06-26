from .common import method_not_allowed, not_implemented


def meetings_collection(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()
    return not_implemented('B-07 and B-10 /api/meetings/')


def meeting_detail(request, meeting_id):
    if request.method not in ['GET', 'PATCH', 'DELETE']:
        return method_not_allowed()
    return not_implemented(f'B-10 and B-11 /api/meetings/{meeting_id}/')


def meeting_invite_detail(request, token):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented(f'B-09 /api/meetings/invite/{token}/')


def meeting_invite_join(request, token):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented(f'B-08 /api/meetings/invite/{token}/join/')


def meeting_recommendations(request, meeting_id):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented(f'B-12 and B-13 /api/meetings/{meeting_id}/recommendations/')


def meeting_confirm(request, meeting_id):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented(f'B-14 /api/meetings/{meeting_id}/confirm/')


def meeting_confirmed(request, meeting_id):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented(f'B-15 /api/meetings/{meeting_id}/confirmed/')
