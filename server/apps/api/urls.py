from django.urls import path

from . import views

urlpatterns = [
    path('auth/login/', views.auth_login, name='auth-login'),
    path('users/me/', views.user_me, name='user-me'),
    path('timetables/upload-url/', views.timetable_upload_url, name='timetable-upload-url'),
    path('timetables/upload-image/', views.timetable_upload_image, name='timetable-upload-image'),
    path('schedules/fixed/', views.fixed_schedules, name='fixed-schedules'),
    path('schedules/fixed/<int:schedule_id>/', views.fixed_schedule_detail, name='fixed-schedule-detail'),
    path('timetables/consolidated/', views.consolidated_timetables, name='consolidated-timetables'),
    path('meetings/', views.meetings_collection, name='meetings-collection'),
    path('meetings/invite/<str:token>/', views.meeting_invite_detail, name='meeting-invite-detail'),
    path('meetings/invite/<str:token>/join/', views.meeting_invite_join, name='meeting-invite-join'),
    path('meetings/<int:meeting_id>/', views.meeting_detail, name='meeting-detail'),
    path('meetings/<int:meeting_id>/recommendations/', views.meeting_recommendations, name='meeting-recommendations'),
    path('meetings/<int:meeting_id>/confirm/', views.meeting_confirm, name='meeting-confirm'),
    path('meetings/<int:meeting_id>/confirmed/', views.meeting_confirmed, name='meeting-confirmed'),
    path('dashboard/summary/', views.dashboard_summary, name='dashboard-summary'),
    path('notifications/', views.notifications_collection, name='notifications-collection'),
    path('notifications/read/<int:notification_id>/', views.notification_read, name='notification-read'),
]
