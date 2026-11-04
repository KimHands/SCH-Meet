import datetime
import json
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import TestCase

from api.models import Meeting, Notification, TimetableClass

from .helpers import auth_header, make_user, post_json

KST = ZoneInfo('Asia/Seoul')
WEDNESDAY_10AM = datetime.datetime(2026, 11, 4, 10, 0, tzinfo=KST)


def at(moment):
    return mock.patch('api.endpoints.meetings.timezone.now', return_value=moment)


class MeetingDateTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.creator = make_user('creator')
        self.member = make_user('member')
        for user in (self.creator, self.member):
            TimetableClass.objects.create(user=user, name='수업', day='SUN', start_minute=540, end_minute=600)
        created = post_json(self.client, '/api/meetings/', {'name': '팀플', 'capacity': 3}, self.creator).json()
        self.meeting_id = created['meeting_id']
        post_json(self.client, f"/api/meetings/invite/{created['token']}/join/", {}, self.member)

    def get(self, path, user=None):
        return self.client.get(path, **auth_header(user or self.creator))

    def confirm(self, day='MON', start_time='13:00', user=None):
        body = {'day': day, 'start_time': start_time}
        return post_json(self.client, f'/api/meetings/{self.meeting_id}/confirm/', body, user or self.creator)

    def detail(self):
        return self.get(f'/api/meetings/{self.meeting_id}/').json()

    def active_ids(self):
        return [m['id'] for m in self.get('/api/meetings/?status=active').json()]

    def ended_ids(self):
        return [m['id'] for m in self.get('/api/meetings/?status=ended').json()]


class ConfirmDateTest(MeetingDateTestCase):
    def test_recommendations_show_nearest_date(self):
        with at(WEDNESDAY_10AM):
            recs = self.get(f'/api/meetings/{self.meeting_id}/recommendations/').json()['recommendations']
        by_day = {rec['day']: rec for rec in recs}
        self.assertEqual(by_day['MON']['date'], '2026-11-09')

    def test_later_today_stays_today(self):
        with at(WEDNESDAY_10AM):
            self.confirm(day='WED', start_time='13:00')
        self.assertEqual(self.detail()['confirmed_time']['date'], '2026-11-04')

    def test_already_passed_today_moves_to_next_week(self):
        with at(WEDNESDAY_10AM):
            self.confirm(day='WED', start_time='09:00')
        self.assertEqual(self.detail()['confirmed_time']['date'], '2026-11-11')

    def test_confirm_response_and_notification_include_date(self):
        with at(WEDNESDAY_10AM):
            confirmed = self.confirm().json()
        self.assertEqual(confirmed['confirmed_time']['date'], '2026-11-09')
        note = Notification.objects.get(user=self.member, kind='MEETING_CONFIRMED')
        self.assertIn('11월 9일', note.body)

    def test_open_meeting_has_no_confirmed_time(self):
        self.assertIsNone(self.detail()['confirmed_time'])


class FinishedMeetingTest(MeetingDateTestCase):
    def setUp(self):
        super().setUp()
        with at(WEDNESDAY_10AM):
            self.confirm()  # 11월 9일(월) 13:00~14:00

    def test_before_end_stays_active(self):
        with at(datetime.datetime(2026, 11, 9, 13, 59, tzinfo=KST)):
            self.assertIn(self.meeting_id, self.active_ids())

    def test_after_end_moves_to_ended(self):
        with at(datetime.datetime(2026, 11, 9, 14, 0, tzinfo=KST)):
            self.assertNotIn(self.meeting_id, self.active_ids())
            self.assertIn(self.meeting_id, self.ended_ids())
        self.assertEqual(Meeting.objects.get(id=self.meeting_id).status, 'CLOSED')

    def test_finished_meeting_stops_blocking_time(self):
        blocked = TimetableClass.objects.filter(source='meeting')
        self.assertEqual(blocked.count(), 2)
        with at(datetime.datetime(2026, 11, 10, 9, 0, tzinfo=KST)):
            self.get('/api/timetables/consolidated/')
        self.assertEqual(blocked.count(), 0)

    def test_other_member_sees_it_closed_too(self):
        with at(datetime.datetime(2026, 11, 10, 9, 0, tzinfo=KST)):
            ids = [m['id'] for m in self.get('/api/meetings/?status=ended', self.member).json()]
        self.assertIn(self.meeting_id, ids)

    def test_detail_reports_closed_after_end(self):
        with at(datetime.datetime(2026, 11, 10, 9, 0, tzinfo=KST)):
            self.assertEqual(self.detail()['status'], 'CLOSED')

    def test_confirmed_without_date_is_left_alone(self):
        Meeting.objects.filter(id=self.meeting_id).update(confirmed_date=None)
        with at(datetime.datetime(2027, 1, 1, 9, 0, tzinfo=KST)):
            self.assertIn(self.meeting_id, self.active_ids())


class CancelConfirmationTest(MeetingDateTestCase):
    def cancel(self, user=None):
        return self.client.delete(
            f'/api/meetings/{self.meeting_id}/confirm/', **auth_header(user or self.creator),
        )

    def test_creator_can_reopen(self):
        with at(WEDNESDAY_10AM):
            self.confirm()
            res = self.cancel()
        self.assertEqual(res.status_code, 200)
        meeting = Meeting.objects.get(id=self.meeting_id)
        self.assertEqual(meeting.status, 'OPEN')
        self.assertIsNone(meeting.confirmed_date)
        self.assertIsNone(meeting.confirmed_start_minute)
        self.assertFalse(TimetableClass.objects.filter(source='meeting').exists())

    def test_members_are_notified(self):
        with at(WEDNESDAY_10AM):
            self.confirm()
            self.cancel()
        self.assertTrue(Notification.objects.filter(user=self.member, title__contains='취소').exists())

    def test_member_cannot_cancel(self):
        with at(WEDNESDAY_10AM):
            self.confirm()
            res = self.cancel(self.member)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(Meeting.objects.get(id=self.meeting_id).status, 'CONFIRMED')

    def test_open_meeting_cannot_be_cancelled(self):
        self.assertEqual(self.cancel().status_code, 409)

    def test_finished_meeting_cannot_be_cancelled(self):
        with at(WEDNESDAY_10AM):
            self.confirm()
        with at(datetime.datetime(2026, 11, 10, 9, 0, tzinfo=KST)):
            self.assertEqual(self.cancel().status_code, 409)

    def test_can_confirm_again_after_cancel(self):
        with at(WEDNESDAY_10AM):
            self.confirm()
            self.cancel()
            res = self.confirm(day='TUE', start_time='15:00')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['confirmed_time']['date'], '2026-11-10')
