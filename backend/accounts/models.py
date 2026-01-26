"""
User profile and reader preferences models.

We extend Django's built-in User with a Profile for reader-specific features.
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class PasswordResetToken(models.Model):
    """Token for password reset requests."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens"
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    # Token expires after 1 hour
    EXPIRY_HOURS = 1
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"Password reset for {self.user.username}"
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new password reset token for a user."""
        # Invalidate any existing unused tokens
        cls.objects.filter(user=user, used_at__isnull=True).update(
            used_at=timezone.now()
        )
        # Create new token
        token = secrets.token_urlsafe(48)
        return cls.objects.create(user=user, token=token)
    
    @property
    def is_valid(self):
        """Check if token is still valid (not used and not expired)."""
        if self.used_at:
            return False
        expiry = self.created_at + timedelta(hours=self.EXPIRY_HOURS)
        return timezone.now() < expiry
    
    def mark_used(self):
        """Mark the token as used."""
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])


class EmailVerificationToken(models.Model):
    """Token for email verification."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens"
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    email = models.EmailField()  # The email being verified
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Token expires after 24 hours
    EXPIRY_HOURS = 24
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"Email verification for {self.user.username} ({self.email})"
    
    @classmethod
    def create_for_user(cls, user, email=None):
        """Create a new email verification token."""
        email = email or user.email
        # Invalidate any existing unused tokens for this email
        cls.objects.filter(user=user, email=email, verified_at__isnull=True).update(
            verified_at=timezone.now()
        )
        token = secrets.token_urlsafe(48)
        return cls.objects.create(user=user, token=token, email=email)
    
    @property
    def is_valid(self):
        """Check if token is still valid."""
        if self.verified_at:
            return False
        expiry = self.created_at + timedelta(hours=self.EXPIRY_HOURS)
        return timezone.now() < expiry
    
    def mark_verified(self):
        """Mark the email as verified."""
        self.verified_at = timezone.now()
        self.save(update_fields=["verified_at"])


class UserProfile(models.Model):
    """Extended profile for all users (readers, writers, editors, publishers)."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    
    # Profile info
    display_name = models.CharField(max_length=100, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    avatar_url = models.URLField(max_length=500, blank=True, default="")
    
    # Preferences
    email_notifications = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.username}"


class SavedArticle(models.Model):
    """Reader's saved/bookmarked articles."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_articles"
    )
    article = models.ForeignKey(
        "content.Article",
        on_delete=models.CASCADE,
        related_name="saved_by"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ["user", "article"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} saved {self.article.title}"


class FollowedTopic(models.Model):
    """Topics (categories/tags) that a reader follows."""
    
    TOPIC_TYPES = [
        ("category", "Category"),
        ("tag", "Tag"),
        ("author", "Author"),
        ("series", "Series"),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followed_topics"
    )
    topic_type = models.CharField(max_length=20, choices=TOPIC_TYPES)
    topic_slug = models.SlugField(max_length=220)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ["user", "topic_type", "topic_slug"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} follows {self.topic_type}:{self.topic_slug}"


class ReadingHistory(models.Model):
    """Track what articles a user has read."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_history"
    )
    article = models.ForeignKey(
        "content.Article",
        on_delete=models.CASCADE,
        related_name="read_by"
    )
    
    # Reading progress
    read_ratio = models.FloatField(default=0.0)  # 0.0 to 1.0
    completed = models.BooleanField(default=False)
    
    first_read_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ["user", "article"]
        ordering = ["-last_read_at"]

    def __str__(self):
        return f"{self.user.username} read {self.article.title}"
