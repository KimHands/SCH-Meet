from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import Client, TestCase

from api.models import Meeting, MeetingMember, TimetableClass

from .helpers import auth_header, make_user, post_json


def _create_meeting(client, creator, **overrides):
    body = {'name': '캡스톤 회의', 'capacity': 4, **overrides}
    return post_json(client, '/api/meetings/', body, creator)


def _join(client, token, user, **prefs):
    return post_json(client, f'/api/meetings/invite/{token}/join/', prefs, user)


def _busy_whole_day(user, day):
    TimetableClass.objects.create(user=user, name='종일 수업', day=day, start_minute=8 * 60, end_minute=22 * 60)


class MeetingTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.creator = make_user('creator')
        self.member = make_user('member')

    def create_with_member(self, **overrides):
        created = _create_meeting(self.client, self.creator, **overrides).json()
        _join(self.client, created['token'], self.member)
        return created


class MeetingCreateTest(MeetingTestCase):
    def test_default_duration_is_60(self):
        created = _create_meeting(self.client, self.creator).json()
        self.assertEqual(Meeting.objects.get(id=created['meeting_id']).duration_minutes, 60)

    def test_rejects_duration_not_multiple_of_30(self):
        res = _create_meeting(self.client, self.creator, duration_minutes=45)
        self.assertEqual(res.status_code, 400)

    def test_rejects_duration_over_limit(self):
        res = _create_meeting(self.client, self.creator, duration_minutes=300)
        self.assertEqual(res.status_code, 400)

    def test_invalid_latitude_returns_400_without_leaking_error(self):
        res = _create_meeting(self.client, self.creator, latitude='abc')
        self.assertEqual(res.status_code, 400)
        self.assertNotIn('error', res.json())


class MeetingDetailTest(MeetingTestCase):
    def test_detail_includes_invite_link_role_and_duration(self):
        created = self.create_with_member(duration_minutes=90)
        res = self.client.get(f"/api/meetings/{created['meeting_id']}/", **auth_header(self.member))
        body = res.json()
        self.assertTrue(body['invite_link'].endswith(f"/invite/{created['token']}"))
        self.assertEqual(body['my_role'], 'MEMBER')
        self.assertEqual(body['duration_minutes'], 90)


class RecommendationTest(MeetingTestCase):
    def test_recommendation_length_equals_meeting_duration(self):
        created = self.create_with_member(duration_minutes=90)
        res = self.client.get(f"/api/meetings/{created['meeting_id']}/recommendations/", **auth_header(self.creator))
        for item in res.json()['recommendations']:
            self.assertEqual(item['duration_minutes'], 90)

    def test_recommendation_skips_busy_day(self):
        created = self.create_with_member()
        _busy_whole_day(self.member, 'MON')
        res = self.client.get(f"/api/meetings/{created['meeting_id']}/recommendations/", **auth_header(self.creator))
        self.assertNotIn('MON', [item['day'] for item in res.json()['recommendations']])


class MeetingConfirmTest(MeetingTestCase):
    def first_recommendation(self, meeting_id):
        res = self.client.get(f'/api/meetings/{meeting_id}/recommendations/', **auth_header(self.creator))
        return res.json()['recommendations'][0]

    def confirm(self, meeting_id, recommendation):
        body = {
            'selected_recommendation_id': recommendation['recommendation_id'],
            'day': recommendation['day'],
            'start_time': recommendation['start_time'],
        }
        return post_json(self.client, f'/api/meetings/{meeting_id}/confirm/', body, self.creator)

    def test_confirm_blocks_only_meeting_duration(self):
        created = self.create_with_member(duration_minutes=60)
        meeting_id = created['meeting_id']
        self.confirm(meeting_id, self.first_recommendation(meeting_id))
        rows = TimetableClass.objects.filter(source='meeting')
        self.assertEqual(rows.count(), 2)
        for row in rows:
            self.assertEqual(row.end_minute - row.start_minute, 60)

    def test_confirm_twice_does_not_duplicate_rows(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        recommendation = self.first_recommendation(meeting_id)
        self.confirm(meeting_id, recommendation)
        res = self.confirm(meeting_id, recommendation)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TimetableClass.objects.filter(source='meeting').count(), 2)

    def test_confirm_stale_slot_returns_409(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        recommendation = self.first_recommendation(meeting_id)
        _busy_whole_day(self.member, recommendation['day'])
        res = self.confirm(meeting_id, recommendation)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'OPEN')

    def test_join_confirmed_meeting_returns_409(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        self.confirm(meeting_id, self.first_recommendation(meeting_id))
        res = _join(self.client, created['token'], make_user('late'))
        self.assertEqual(res.status_code, 409)

    def test_delete_meeting_removes_confirmed_rows(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        self.confirm(meeting_id, self.first_recommendation(meeting_id))
        self.client.delete(f'/api/meetings/{meeting_id}/', **auth_header(self.creator))
        self.assertEqual(TimetableClass.objects.filter(source='meeting').count(), 0)

    def test_leave_meeting_removes_member_rows(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        self.confirm(meeting_id, self.first_recommendation(meeting_id))
        self.client.delete(f'/api/meetings/{meeting_id}/', **auth_header(self.member))
        self.assertFalse(TimetableClass.objects.filter(source='meeting', user=self.member).exists())
        self.assertTrue(TimetableClass.objects.filter(source='meeting', user=self.creator).exists())


class MeetingJoinTest(MeetingTestCase):
    def test_invalid_latitude_returns_400_without_leaking_error(self):
        created = _create_meeting(self.client, self.creator).json()
        res = _join(self.client, created['token'], self.member, latitude='abc')
        self.assertEqual(res.status_code, 400)
        self.assertNotIn('error', res.json())

    def test_duplicate_membership_is_rejected_by_db(self):
        created = _create_meeting(self.client, self.creator).json()
        meeting = Meeting.objects.get(id=created['meeting_id'])
        with self.assertRaises(IntegrityError), transaction.atomic():
            MeetingMember.objects.create(meeting=meeting, user=self.creator)


class MeetingContractTest(MeetingTestCase):
    def test_confirm_without_time_returns_400(self):
        created = self.create_with_member()
        body = {'selected_recommendation_id': 1}
        res = post_json(self.client, f"/api/meetings/{created['meeting_id']}/confirm/", body, self.creator)
        self.assertEqual(res.status_code, 400)

    def test_confirm_rejects_off_grid_minute(self):
        created = self.create_with_member()
        body = {'day': 'MON', 'start_time': '09:17'}
        res = post_json(self.client, f"/api/meetings/{created['meeting_id']}/confirm/", body, self.creator)
        self.assertEqual(res.status_code, 400)

    def test_fractional_duration_is_rejected(self):
        res = _create_meeting(self.client, self.creator, duration_minutes=60.9)
        self.assertEqual(res.status_code, 400)

    def test_duration_cannot_change_after_confirm(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        body = {'day': 'MON', 'start_time': '09:00'}
        post_json(self.client, f'/api/meetings/{meeting_id}/confirm/', body, self.creator)
        res = self.client.patch(
            f'/api/meetings/{meeting_id}/',
            data='{"duration_minutes": 120}',
            content_type='application/json',
            **auth_header(self.creator),
        )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'CONFIRMED')

    def test_patch_does_not_overwrite_status(self):
        created = self.create_with_member()
        meeting_id = created['meeting_id']
        Meeting.objects.filter(id=meeting_id).update(status='CONFIRMED')
        meeting = Meeting.objects.get(id=meeting_id)
        meeting.status = 'OPEN'  # 오래된 객체를 흉내 낸다
        from api.endpoints.meetings import _save_meeting_updates
        _save_meeting_updates(meeting, {'name': '새 이름'})
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'CONFIRMED')


class OldClientConfirmTest(MeetingTestCase):
    def test_id_only_confirm_asks_to_reload(self):
        created = self.create_with_member()
        body = {'selected_recommendation_id': 1}
        res = post_json(self.client, f"/api/meetings/{created['meeting_id']}/confirm/", body, self.creator)
        self.assertEqual(res.status_code, 400)
        self.assertIn('새로고침', res.json()['detail'])
