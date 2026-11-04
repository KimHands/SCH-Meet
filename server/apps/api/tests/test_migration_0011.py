from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

BEFORE = [('api', '0010_notification')]
AFTER = [('api', '0011_meeting_duration_unique_member')]


class Migration0011Test(TransactionTestCase):
    def migrate(self, targets):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        self.migrate(AFTER)

    def seed_old_data(self, old_apps):
        User = old_apps.get_model('auth', 'User')
        Meeting = old_apps.get_model('api', 'Meeting')
        MeetingMember = old_apps.get_model('api', 'MeetingMember')
        creator = User.objects.create(username='creator')
        member = User.objects.create(username='member')
        confirmed = Meeting.objects.create(
            name='확정 모임', creator=creator, status='CONFIRMED',
            confirmed_day='MON', confirmed_start_minute=600, confirmed_end_minute=720,
        )
        MeetingMember.objects.create(meeting=confirmed, user=creator, role='CREATOR')
        MeetingMember.objects.create(meeting=confirmed, user=creator, role='MEMBER')
        MeetingMember.objects.create(meeting=confirmed, user=member, role='MEMBER', desired_location='')
        MeetingMember.objects.create(meeting=confirmed, user=member, role='MEMBER', desired_location='신창역')
        return confirmed.id

    def test_backfills_duration_and_dedupes_members(self):
        meeting_id = self.seed_old_data(self.migrate(BEFORE))
        new_apps = self.migrate(AFTER)

        Meeting = new_apps.get_model('api', 'Meeting')
        MeetingMember = new_apps.get_model('api', 'MeetingMember')
        self.assertEqual(Meeting.objects.get(id=meeting_id).duration_minutes, 120)
        members = MeetingMember.objects.filter(meeting_id=meeting_id)
        self.assertEqual(members.count(), 2)
        self.assertEqual(members.get(user__username='creator').role, 'CREATOR')
        self.assertEqual(members.get(user__username='member').desired_location, '신창역')
