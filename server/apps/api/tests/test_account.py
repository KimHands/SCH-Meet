from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from api.models import FixedSchedule, Meeting, MeetingMember, Notification, TimetableClass

from .helpers import auth_header, make_user, post_json


class DeleteAccountTest(TestCase):
    def setUp(self):
        cache.clear()
        self.me = make_user('me')
        self.friend = make_user('friend')

    def make_meeting(self, creator, joiner, name):
        created = post_json(self.client, '/api/meetings/', {'name': name, 'capacity': 3}, creator).json()
        post_json(self.client, f"/api/meetings/invite/{created['token']}/join/", {}, joiner)
        return created['meeting_id']

    def delete_me(self):
        return self.client.delete('/api/users/me/', **auth_header(self.me))

    def test_requires_auth(self):
        self.assertEqual(self.client.delete('/api/users/me/').status_code, 401)
        self.assertTrue(User.objects.filter(id=self.me.id).exists())

    def test_removes_user_and_personal_data(self):
        my_id = self.me.id
        TimetableClass.objects.create(user=self.me, name='수업', day='MON', start_minute=540, end_minute=600)
        FixedSchedule.objects.create(user=self.me, title='알바', repeat_days=['TUE'], start_time='18:00', end_time='20:00')

        self.assertEqual(self.delete_me().status_code, 204)

        self.assertFalse(User.objects.filter(id=my_id).exists())
        self.assertFalse(TimetableClass.objects.filter(user_id=my_id).exists())
        self.assertFalse(FixedSchedule.objects.filter(user_id=my_id).exists())

    def test_old_token_stops_working(self):
        header = auth_header(self.me)
        self.delete_me()
        self.assertEqual(self.client.get('/api/users/me/', **header).status_code, 401)

    def test_my_meeting_is_deleted_and_members_are_told(self):
        meeting_id = self.make_meeting(self.me, self.friend, '내 모임')
        self.delete_me()
        self.assertFalse(Meeting.objects.filter(id=meeting_id).exists())
        self.assertTrue(Notification.objects.filter(user=self.friend, title='모임이 삭제되었습니다').exists())

    def test_leaves_other_meetings_and_creator_is_told(self):
        meeting_id = self.make_meeting(self.friend, self.me, '친구 모임')
        self.delete_me()
        self.assertTrue(Meeting.objects.filter(id=meeting_id).exists())
        self.assertEqual(MeetingMember.objects.filter(meeting_id=meeting_id).count(), 1)
        self.assertTrue(Notification.objects.filter(user=self.friend, title='참여자가 모임을 나갔습니다').exists())
