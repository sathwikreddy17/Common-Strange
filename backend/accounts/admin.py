from django.contrib import admin
from .models import UserProfile, SavedArticle, FollowedTopic, ReadingHistory


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "email_notifications", "created_at"]
    search_fields = ["user__username", "user__email", "display_name"]
    list_filter = ["email_notifications"]


@admin.register(SavedArticle)
class SavedArticleAdmin(admin.ModelAdmin):
    list_display = ["user", "article", "created_at"]
    search_fields = ["user__username", "article__title"]
    list_filter = ["created_at"]


@admin.register(FollowedTopic)
class FollowedTopicAdmin(admin.ModelAdmin):
    list_display = ["user", "topic_type", "topic_slug", "created_at"]
    search_fields = ["user__username", "topic_slug"]
    list_filter = ["topic_type", "created_at"]


@admin.register(ReadingHistory)
class ReadingHistoryAdmin(admin.ModelAdmin):
    list_display = ["user", "article", "read_ratio", "completed", "last_read_at"]
    search_fields = ["user__username", "article__title"]
    list_filter = ["completed", "last_read_at"]
