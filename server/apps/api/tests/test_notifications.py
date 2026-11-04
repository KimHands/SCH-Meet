from django.core.cache import cache
from django.test import TestCase

from api.models import Notification

from .helpers import auth_header, make_user, post_json


class MeetingNotificationTest(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')

    def create_meeting(self):
        return post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()

    def test_creator_gets_no_notification_for_own_meeting(self):
        self.create_meeting()
        self.assertFalse(Notification.objects.filter(user=self.creator).exists())

    def test_join_notification_names_the_member_and_is_not_a_request(self):
        token = self.create_meeting()['token']
        post_json(self.client, f'/api/meetings/invite/{token}/join/', {}, self.member)
        note = Notification.objects.get(user=self.creator, kind='MEETING_JOINED')
        self.assertNotIn('요청', note.title)
        self.assertIn('member', note.body)


class ReadAllNotificationsTest(TestCase):
    def setUp(self):
        self.user = make_user('kim')
        self.other = make_user('lee')
        Notification.objects.create(user=self.user, title='하나')
        Notification.objects.create(user=self.user, title='둘')
        Notification.objects.create(user=self.other, title='다른 사람')

    def test_marks_only_own_notifications(self):
        res = self.client.post('/api/notifications/read-all/', **auth_header(self.user))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'updated': 2})
        self.assertFalse(Notification.objects.filter(user=self.user, is_read=False).exists())
        self.assertTrue(Notification.objects.filter(user=self.other, is_read=False).exists())

    def test_requires_auth(self):
        self.assertEqual(self.client.post('/api/notifications/read-all/').status_code, 401)

    def test_get_not_allowed(self):
        self.assertEqual(self.client.get('/api/notifications/read-all/', **auth_header(self.user)).status_code, 405)
