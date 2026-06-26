from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TimetableClass',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.CharField(default='everytime', max_length=20)),
                ('source_identifier', models.CharField(blank=True, default='', max_length=100)),
                ('subject_id', models.CharField(blank=True, default='', max_length=32)),
                ('internal_value', models.CharField(blank=True, default='', max_length=32)),
                ('year', models.PositiveIntegerField(blank=True, null=True)),
                ('semester', models.CharField(blank=True, default='', max_length=10)),
                ('name', models.CharField(max_length=200)),
                ('professor', models.CharField(blank=True, default='', max_length=200)),
                ('day', models.CharField(max_length=3)),
                ('start_minute', models.PositiveIntegerField()),
                ('end_minute', models.PositiveIntegerField()),
                ('place', models.CharField(blank=True, default='', max_length=100)),
                ('time_label', models.CharField(blank=True, default='', max_length=100)),
                ('closed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='timetable_classes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]