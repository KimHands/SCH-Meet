import datetime
import json
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import TestCase

from api.endpoints.meetings import _close_if_finished
from api.models import FixedSchedule, Meeting, Notification, TimetableClass, UserProfile

from .helpers import auth_header, make_user, post_json

KST = ZoneInfo('Asia/Seoul')
WEDNESDAY_10AM = datetime.datetime(2026, 11, 4, 10, 0, tzinfo=KST)


def at(moment):
    return mock.patch('api.endpoints.meetings.timezone.now', return_value=moment)


class ReviewFixTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')
        UserProfile.objects.create(user=self.member, nickname='민지')

    def make_meeting(self, name='팀플', **fields):
        body = {'name': name, 'capacity': 4, 'desired_location': '도서관', **fields}
        created = post_json(self.client, '/api/meetings/', body, self.creator).json()
        post_json(self.client, f"/api/meetings/invite/{created['token']}/join/", {}, self.member)
        return created['meeting_id']

    def confirm(self, meeting_id, day, start_time, **extra):
        body = {'day': day, 'start_time': start_time, **extra}
        return post_json(self.client, f'/api/meetings/{meeting_id}/confirm/', body, self.creator)


class DateAwareConflictTest(ReviewFixTestCase):
    def test_meeting_next_week_does_not_block_same_time_today(self):
        first, second = self.make_meeting('다음 주'), self.make_meeting('오늘')
        with at(WEDNESDAY_10AM):
            # 09:00은 이미 지나 다음 주 수요일 09~10시로 확정된다
            self.assertEqual(self.confirm(first, 'WED', '09:00').json()['confirmed_time']['date'], '2026-11-11')
            res = self.confirm(second, 'WED', '10:30')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['confirmed_time']['date'], '2026-11-04')

    def test_same_date_overlap_is_still_rejected(self):
        first, second = self.make_meeting('하나'), self.make_meeting('둘')
        with at(WEDNESDAY_10AM):
            self.confirm(first, 'MON', '13:00')
            self.assertEqual(self.confirm(second, 'MON', '13:30').status_code, 409)

    def test_overlap_reaching_past_now_is_rejected_on_exact_date(self):
        first, second = self.make_meeting('하나', duration_minutes=60), self.make_meeting('둘', duration_minutes=120)
        with at(WEDNESDAY_10AM):
            # 첫 모임은 오늘 11~12시. 둘째는 09:30이라 다음 주로 가므로 겹치지 않는다
            self.confirm(first, 'WED', '11:00')
            res = self.confirm(second, 'WED', '09:30')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['confirmed_time']['date'], '2026-11-11')

    def test_next_week_meeting_blocks_next_week_overlap_past_now(self):
        first, second = self.make_meeting('하나', duration_minutes=60), self.make_meeting('둘', duration_minutes=120)
        with at(WEDNESDAY_10AM):
            # 첫 모임은 09:30이라 다음 주 09:30~10:30. 둘째도 09:00 시작이라 같은 날 겹친다
            self.confirm(first, 'WED', '09:30')
            self.assertEqual(self.confirm(second, 'WED', '09:00').status_code, 409)

    def test_recommendations_offer_time_blocked_only_on_another_date(self):
        first, second = self.make_meeting('다음 주'), self.make_meeting('오늘', desired_time='수요일')
        with at(WEDNESDAY_10AM):
            self.confirm(first, 'WED', '09:30')
            recs = self.client.get(f'/api/meetings/{second}/recommendations/', **auth_header(self.creator)).json()
        today = [rec for rec in recs['recommendations'] if rec['date'] == '2026-11-04']
        self.assertTrue(today)
        with at(WEDNESDAY_10AM):
            res = self.confirm(second, 'WED', today[0]['start_time'], date='2026-11-04')
        self.assertEqual(res.status_code, 200)

    def test_every_recommendation_can_be_confirmed(self):
        first = self.make_meeting('다음 주')
        with at(WEDNESDAY_10AM):
            self.confirm(first, 'WED', '09:30')
        for index in range(5):
            meeting_id = self.make_meeting(f'후보 {index}')
            with at(WEDNESDAY_10AM):
                url = f'/api/meetings/{meeting_id}/recommendations/'
                recs = self.client.get(url, **auth_header(self.creator)).json()['recommendations']
                rec = recs[index]
                res = self.confirm(meeting_id, rec['day'], rec['start_time'], date=rec['date'])
                self.assertEqual(res.status_code, 200, rec)
                self.client.delete(f'/api/meetings/{meeting_id}/confirm/', **auth_header(self.creator))


class ConfirmDateCheckTest(ReviewFixTestCase):
    def test_matching_date_is_accepted(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            res = self.confirm(meeting_id, 'WED', '13:00', date='2026-11-04')
        self.assertEqual(res.status_code, 200)

    def test_date_that_moved_is_rejected(self):
        meeting_id = self.make_meeting()
        with at(datetime.datetime(2026, 11, 4, 13, 1, tzinfo=KST)):
            res = self.confirm(meeting_id, 'WED', '13:00', date='2026-11-04')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'OPEN')


class CloseRaceTest(ReviewFixTestCase):
    def test_close_rechecks_current_state(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')  # 11월 9일
        # 오래된 판단으로 호출돼도 지금 값이 미래면 종료하지 않는다
        _close_if_finished(meeting_id, WEDNESDAY_10AM)
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'CONFIRMED')
        self.assertEqual(TimetableClass.objects.filter(source='meeting').count(), 2)

    def test_close_finishes_past_meeting(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')
        _close_if_finished(meeting_id, datetime.datetime(2026, 11, 9, 14, 0, tzinfo=KST))
        self.assertEqual(Meeting.objects.get(id=meeting_id).status, 'CLOSED')
        self.assertFalse(TimetableClass.objects.filter(source='meeting').exists())


class ConfirmedEditSyncTest(ReviewFixTestCase):
    def patch(self, meeting_id, body):
        return self.client.patch(
            f'/api/meetings/{meeting_id}/', data=json.dumps(body), content_type='application/json',
            **auth_header(self.creator),
        )

    def test_name_and_place_reach_timetable_and_confirmed_location(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')
            self.assertEqual(self.patch(meeting_id, {'name': '최종발표', 'desired_location': '카페'}).status_code, 200)
        meeting = Meeting.objects.get(id=meeting_id)
        self.assertEqual(meeting.confirmed_location, '카페')
        rows = TimetableClass.objects.filter(source='meeting')
        self.assertEqual({row.name for row in rows}, {'최종발표'})
        self.assertEqual({row.place for row in rows}, {'카페'})

    def test_members_are_told_about_change(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')
            Notification.objects.all().delete()
            self.patch(meeting_id, {'desired_location': '카페'})
        note = Notification.objects.get(user=self.member)
        self.assertIn('카페', note.body)

    def test_open_meeting_edit_sends_no_notification(self):
        meeting_id = self.make_meeting()
        Notification.objects.all().delete()
        self.patch(meeting_id, {'desired_location': '카페'})
        self.assertFalse(Notification.objects.exists())


class LeaveNotificationLinkTest(ReviewFixTestCase):
    def test_leaving_unlinks_own_notifications(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')
        self.assertTrue(Notification.objects.filter(user=self.member, related_meeting_id=meeting_id).exists())
        self.client.delete(f'/api/meetings/{meeting_id}/', **auth_header(self.member))
        self.assertFalse(Notification.objects.filter(user=self.member, related_meeting_id=meeting_id).exists())
        self.assertTrue(Notification.objects.filter(user=self.member).exists())


class CancelNotificationKindTest(ReviewFixTestCase):
    def test_cancel_notification_is_not_confirmed_kind(self):
        meeting_id = self.make_meeting()
        with at(WEDNESDAY_10AM):
            self.confirm(meeting_id, 'MON', '13:00')
            Notification.objects.all().delete()
            self.client.delete(f'/api/meetings/{meeting_id}/confirm/', **auth_header(self.creator))
        self.assertEqual(Notification.objects.get(user=self.member).kind, 'SYSTEM')


class FixedScheduleBodyTest(TestCase):
    def setUp(self):
        self.user = make_user('kim')
        self.schedule = FixedSchedule.objects.create(
            user=self.user, title='알바', repeat_days=['MON'], start_time='18:00', end_time='20:00',
        )

    def test_non_object_body_on_post_is_400(self):
        res = self.client.post(
            '/api/schedules/fixed/', data='[]', content_type='application/json', **auth_header(self.user),
        )
        self.assertEqual(res.status_code, 400)

    def test_non_object_body_on_patch_is_400(self):
        res = self.client.patch(
            f'/api/schedules/fixed/{self.schedule.id}/', data='[]', content_type='application/json',
            **auth_header(self.user),
        )
        self.assertEqual(res.status_code, 400)
