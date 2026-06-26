from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_normalize_timetable_minutes'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='timetableclass',
            name='subject_id',
        ),
        migrations.RemoveField(
            model_name='timetableclass',
            name='internal_value',
        ),
    ]