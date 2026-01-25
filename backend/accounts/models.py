"""
User profile and reader preferences models.

We extend Django's built-in User with a Profile for reader-specific features.
"""
from django.conf import settings
from django.db import models


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
