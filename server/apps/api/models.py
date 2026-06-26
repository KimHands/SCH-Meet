from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=30, blank=True, default='')
    profile_image_url = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return f'UserProfile(user_id={self.user_id})'


class TimetableClass(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='timetable_classes')
    source = models.CharField(max_length=20, default='everytime')
    source_identifier = models.CharField(max_length=100, blank=True, default='')
    year = models.PositiveIntegerField(null=True, blank=True)
    semester = models.CharField(max_length=10, blank=True, default='')
    name = models.CharField(max_length=200)
    professor = models.CharField(max_length=200, blank=True, default='')
    day = models.CharField(max_length=3)
    start_minute = models.PositiveIntegerField()
    end_minute = models.PositiveIntegerField()
    place = models.CharField(max_length=100, blank=True, default='')
    time_label = models.CharField(max_length=100, blank=True, default='')
    closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'TimetableClass(user_id={self.user_id}, name={self.name}, day={self.day})'


class FixedSchedule(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fixed_schedules')
    title = models.CharField(max_length=20)
    repeat_days = models.JSONField(default=list)
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'FixedSchedule(user_id={self.user_id}, title={self.title})'