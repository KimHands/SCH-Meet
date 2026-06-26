from django.db import migrations


def normalize_timetable_minutes(apps, schema_editor):
    TimetableClass = apps.get_model('api', 'TimetableClass')

    for timetable_class in TimetableClass.objects.all():
        timetable_class.start_minute *= 5
        timetable_class.end_minute *= 5
        timetable_class.save(update_fields=['start_minute', 'end_minute'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_fixedschedule'),
    ]

    operations = [
        migrations.RunPython(normalize_timetable_minutes, migrations.RunPython.noop),
    ]