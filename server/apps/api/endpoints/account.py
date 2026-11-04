from django.db import transaction

from .meetings import _delete_meeting, _leave_meeting


def delete_account(user):
    """만든 모임은 지우고 참여한 모임에서는 나간 뒤 계정을 지운다. 나머지 개인 데이터는 함께 삭제된다."""
    with transaction.atomic():
        for membership in user.meetings.select_related('meeting', 'meeting__creator'):
            if membership.role == 'CREATOR':
                _delete_meeting(membership.meeting)
            else:
                _leave_meeting(membership.meeting, membership, user)
        user.delete()
