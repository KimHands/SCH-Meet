from django.core.cache import cache
from django.test import TestCase

from api.models import Meeting, MeetingMember, Notification

from .helpers import auth_header, make_user, post_json


class MeetingManageTest(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')
        created = post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()
        self.meeting_id = created['meeting_id']
        post_json(self.client, f"/api/meetings/invite/{created['token']}/join/", {}, self.member)
        Notification.objects.all().delete()

    def delete_as(self, user):
        return self.client.delete(f'/api/meetings/{self.meeting_id}/', **auth_header(user))

    def test_leaving_notifies_creator_with_name(self):
        self.assertEqual(self.delete_as(self.member).status_code, 204)
        self.assertFalse(MeetingMember.objects.filter(user=self.member).exists())
        note = Notification.objects.get(user=self.creator)
        self.assertEqual(note.related_meeting_id, self.meeting_id)
        self.assertIn('member', note.body)

    def test_deleting_notifies_members_and_keeps_their_notification(self):
        self.assertEqual(self.delete_as(self.creator).status_code, 204)
        self.assertFalse(Meeting.objects.filter(id=self.meeting_id).exists())
        note = Notification.objects.get(user=self.member)
        self.assertIsNone(note.related_meeting)
        self.assertIn('팀플', note.body)

    def test_creator_is_not_notified_of_own_delete(self):
        self.delete_as(self.creator)
        self.assertFalse(Notification.objects.filter(user=self.creator).exists())
