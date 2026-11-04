from django.core.cache import cache
from django.test import TestCase

from api.models import FixedSchedule, TimetableClass, UserProfile

from .helpers import auth_header, make_user, post_json


class MissingScheduleTest(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')
        UserProfile.objects.create(user=self.member, nickname='member')
        created = post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()
        self.meeting_id = created['meeting_id']
        self.token = created['token']

    def join(self, user):
        return post_json(self.client, f'/api/meetings/invite/{self.token}/join/', {}, user)

    def recommendations(self):
        url = f'/api/meetings/{self.meeting_id}/recommendations/'
        return self.client.get(url, **auth_header(self.creator)).json()

    def member_flags(self):
        url = f'/api/meetings/{self.meeting_id}/'
        members = self.client.get(url, **auth_header(self.creator)).json()['members']
        return {member['user_id']: member['has_schedule'] for member in members}

    def give_class(self, user, source='everytime'):
        TimetableClass.objects.create(
            user=user, name='수업', day='MON', start_minute=540, end_minute=600, source=source,
        )

    def test_recommendation_lists_members_without_schedule(self):
        self.give_class(self.creator)
        self.join(self.member)

        data = self.recommendations()

        self.assertEqual(data['members_without_schedule'], ['member'])
        self.assertTrue(data['recommendations'][0]['reason_bullets'][0].startswith('시간표를 등록한 1명'))

    def test_all_scheduled_keeps_everyone_wording(self):
        self.give_class(self.creator)
        self.give_class(self.member)
        self.join(self.member)

        data = self.recommendations()

        self.assertEqual(data['members_without_schedule'], [])
        self.assertEqual(data['recommendations'][0]['reason_bullets'][0], '2명 모두 가능한 공통 공강')

    def test_no_one_scheduled_says_result_is_unreliable(self):
        self.join(self.member)
        self.assertIn('정확하지 않', self.recommendations()['recommendations'][0]['reason_bullets'][0])

    def test_fixed_schedule_counts_as_schedule(self):
        FixedSchedule.objects.create(
            user=self.member, title='알바', repeat_days=['TUE'], start_time='18:00', end_time='20:00',
        )
        self.join(self.member)
        self.assertTrue(self.member_flags()[self.member.id])

    def test_confirmed_meeting_block_is_not_a_schedule(self):
        self.give_class(self.member, source='meeting')
        self.join(self.member)
        self.assertFalse(self.member_flags()[self.member.id])

    def test_join_response_reports_missing_schedule(self):
        self.assertIs(self.join(self.member).json()['has_schedule'], False)

    def test_join_response_reports_existing_schedule(self):
        self.give_class(self.member)
        self.assertIs(self.join(self.member).json()['has_schedule'], True)

    def test_rejoin_response_reports_schedule_too(self):
        self.join(self.member)
        self.assertIs(self.join(self.member).json()['has_schedule'], False)
