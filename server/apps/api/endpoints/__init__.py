from .auth import auth_login
from .dashboard import dashboard_summary
from .meetings import (
    meeting_confirm,
    meeting_confirmed,
    meeting_detail,
    meeting_invite_detail,
    meeting_invite_join,
    meeting_recommendations,
    meetings_collection,
)
from .notifications import notification_read, notifications_collection
from .schedules import fixed_schedule_detail, fixed_schedules
from .timetables import consolidated_timetables, timetable_upload_image, timetable_upload_url
from .user import user_me

__all__ = [
    'auth_login',
    'user_me',
    'timetable_upload_url',
    'timetable_upload_image',
    'fixed_schedules',
    'fixed_schedule_detail',
    'consolidated_timetables',
    'meetings_collection',
    'meeting_detail',
    'meeting_invite_detail',
    'meeting_invite_join',
    'meeting_recommendations',
    'meeting_confirm',
    'meeting_confirmed',
    'dashboard_summary',
    'notifications_collection',
    'notification_read',
]
