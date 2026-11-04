from django.core.cache import cache
from django.test import TestCase

from api.models import FixedSchedule, Notification, TimetableClass, UserProfile

from .helpers import auth_header, make_user, post_json


def _set_nickname(user, nickname):
    UserProfile.objects.update_or_create(user=user, defaults={'nickname': nickname})


class DisplayNameTest(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator.secret')
        self.member = make_user('member.secret')
        created = post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()
        self.meeting_id = created['meeting_id']
        self.token = created['token']
        post_json(self.client, f'/api/meetings/invite/{self.token}/join/', {}, self.member)

    def assert_no_email_part(self, payload):
        self.assertNotIn('secret', str(payload))

    def test_meeting_detail_hides_email_part(self):
        payload = self.client.get(f'/api/meetings/{self.meeting_id}/', **auth_header(self.creator)).json()
        self.assert_no_email_part({key: value for key, value in payload.items() if key != 'invite_link'})
        names = {member['user_id']: member['nickname'] for member in payload['members']}
        self.assertEqual(names[self.member.id], f'참여자 {self.member.id}')

    def test_public_invite_hides_email_part(self):
        self.assert_no_email_part(self.client.get(f'/api/meetings/invite/{self.token}/').json())

    def test_join_notification_hides_email_part(self):
        note = Notification.objects.get(user=self.creator, kind='MEETING_JOINED')
        self.assert_no_email_part(note.body)

    def test_recommendation_warning_hides_email_part(self):
        url = f'/api/meetings/{self.meeting_id}/recommendations/'
        self.assert_no_email_part(self.client.get(url, **auth_header(self.creator)).json())

    def test_confirmed_members_hide_email_part(self):
        url = f'/api/meetings/{self.meeting_id}/confirm/'
        res = post_json(self.client, url, {'day': 'MON', 'start_time': '13:00'}, self.creator)
        self.assert_no_email_part(res.json())

    def test_nickname_is_used_when_set(self):
        _set_nickname(self.member, '민지')
        payload = self.client.get(f'/api/meetings/{self.meeting_id}/', **auth_header(self.creator)).json()
        self.assertIn('민지', [member['nickname'] for member in payload['members']])


class MemberTimePreferenceTest(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')
        for user in (self.creator, self.member):
            TimetableClass.objects.create(user=user, name='수업', day='SUN', start_minute=540, end_minute=600)
        created = post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()
        self.meeting_id = created['meeting_id']
        self.token = created['token']

    def test_member_preference_affects_recommendation(self):
        post_json(self.client, f'/api/meetings/invite/{self.token}/join/', {'desired_time': '저녁'}, self.member)
        url = f'/api/meetings/{self.meeting_id}/recommendations/'
        top = self.client.get(url, **auth_header(self.creator)).json()['recommendations'][0]
        self.assertIn('저녁 선호와 일치', top['reason_bullets'])
        self.assertGreaterEqual(top['start_time'], '17:00')


class FixedScheduleEditTest(TestCase):
    def setUp(self):
        self.user = make_user('kim')
        self.schedule = FixedSchedule.objects.create(
            user=self.user, title='알바', repeat_days=['MON'], start_time='18:00', end_time='20:00',
        )
        self.url = f'/api/schedules/fixed/{self.schedule.id}/'

    def patch(self, body, user=None, url=None):
        return self.client.patch(
            url or self.url, data=__import__('json').dumps(body), content_type='application/json',
            **auth_header(user or self.user),
        )

    def valid_body(self, **overrides):
        return {'title': '과외', 'repeat_days': ['TUE', 'THU'], 'start_time': '19:00', 'end_time': '21:00', **overrides}

    def test_updates_schedule(self):
        res = self.patch(self.valid_body())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['title'], '과외')
        self.assertEqual(res.json()['repeat_days'], ['TUE', 'THU'])
        self.assertEqual(res.json()['start_time'], '19:00')
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.title, '과외')

    def test_other_users_schedule_is_not_found(self):
        self.assertEqual(self.patch(self.valid_body(), user=make_user('lee')).status_code, 404)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.title, '알바')

    def test_requires_auth(self):
        res = self.client.patch(self.url, data='{}', content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_invalid_time_is_rejected(self):
        self.assertEqual(self.patch(self.valid_body(end_time='18:00')).status_code, 400)

    def test_title_limit_is_50(self):
        self.assertEqual(self.patch(self.valid_body(title='가' * 50)).status_code, 200)
        res = self.patch(self.valid_body(title='가' * 51))
        self.assertEqual(res.status_code, 400)
        self.assertIn('50자', res.json()['detail'])
