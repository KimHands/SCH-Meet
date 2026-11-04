from django.db import migrations, models
from django.db.models import Count


def backfill_confirmed_durations(apps, schema_editor):
    """이미 확정된 모임은 실제 확정 길이를 duration_minutes로 채운다."""
    Meeting = apps.get_model('api', 'Meeting')
    confirmed = Meeting.objects.filter(confirmed_start_minute__isnull=False, confirmed_end_minute__isnull=False)
    for meeting in confirmed.only('id', 'confirmed_start_minute', 'confirmed_end_minute'):
        length = meeting.confirmed_end_minute - meeting.confirmed_start_minute
        if length > 0:
            Meeting.objects.filter(id=meeting.id).update(duration_minutes=length)


def _pick_member_to_keep(rows):
    """모임장 행을 우선 남기고, 없으면 가장 최근 참여 행(최신 선호 정보)을 남긴다."""
    creators = [row for row in rows if row.role == 'CREATOR']
    if creators:
        return creators[0]
    return max(rows, key=lambda row: (row.joined_at, row.id))


def remove_duplicate_members(apps, schema_editor):
    """고유 제약을 걸기 전에 같은 모임·사용자의 중복 참여 행을 하나만 남긴다."""
    MeetingMember = apps.get_model('api', 'MeetingMember')
    duplicate_pairs = (
        MeetingMember.objects.values('meeting_id', 'user_id')
        .annotate(row_count=Count('id'))
        .filter(row_count__gt=1)
    )
    for pair in duplicate_pairs:
        rows = list(MeetingMember.objects.filter(meeting_id=pair['meeting_id'], user_id=pair['user_id']))
        keeper = _pick_member_to_keep(rows)
        MeetingMember.objects.filter(id__in=[row.id for row in rows if row.id != keeper.id]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='meeting',
            name='duration_minutes',
            field=models.PositiveSmallIntegerField(default=60),
        ),
        migrations.RunPython(backfill_confirmed_durations, migrations.RunPython.noop),
        migrations.RunPython(remove_duplicate_members, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='meetingmember',
            constraint=models.UniqueConstraint(fields=('meeting', 'user'), name='unique_meeting_member'),
        ),
    ]
