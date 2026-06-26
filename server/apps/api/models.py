from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=30, blank=True, default='')
    profile_image_url = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return f'UserProfile(user_id={self.user_id})'