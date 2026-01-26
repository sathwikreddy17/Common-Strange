"""
Serializers for user authentication and profile management.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile, SavedArticle, FollowedTopic, ReadingHistory

User = get_user_model()


class UserRegistrationSerializer(serializers.Serializer):
    """Serializer for user registration."""
    
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    display_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value.lower()
    
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()
    
    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(data["password"])
        return data
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        # Create profile
        UserProfile.objects.create(
            user=user,
            display_name=validated_data.get("display_name", ""),
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data."""
    
    display_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    
    def get_display_name(self, obj):
        try:
            return obj.profile.display_name or obj.username
        except UserProfile.DoesNotExist:
            return obj.username
    
    def get_role(self, obj):
        """Return the highest role for the user."""
        groups = obj.groups.values_list("name", flat=True)
        if "Publisher" in groups:
            return "publisher"
        if "Editor" in groups:
            return "editor"
        if "Writer" in groups:
            return "writer"
        if obj.is_superuser:
            return "admin"
        return "reader"
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "display_name", "role", "is_staff", "date_joined"]
        read_only_fields = ["id", "date_joined", "is_staff"]


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ["username", "email", "display_name", "bio", "avatar_url", "email_notifications", "created_at"]
        read_only_fields = ["created_at"]


class SavedArticleSerializer(serializers.ModelSerializer):
    """Serializer for saved articles."""
    
    article_id = serializers.IntegerField(source="article.id", read_only=True)
    article_title = serializers.CharField(source="article.title", read_only=True)
    article_slug = serializers.CharField(source="article.slug", read_only=True)
    article_dek = serializers.CharField(source="article.dek", read_only=True)
    
    class Meta:
        model = SavedArticle
        fields = ["id", "article_id", "article_title", "article_slug", "article_dek", "created_at"]
        read_only_fields = ["id", "created_at"]


class FollowedTopicSerializer(serializers.ModelSerializer):
    """Serializer for followed topics."""
    
    class Meta:
        model = FollowedTopic
        fields = ["id", "topic_type", "topic_slug", "created_at"]
        read_only_fields = ["id", "created_at"]


class ReadingHistorySerializer(serializers.ModelSerializer):
    """Serializer for reading history."""
    
    article_id = serializers.IntegerField(source="article.id", read_only=True)
    article_title = serializers.CharField(source="article.title", read_only=True)
    article_slug = serializers.CharField(source="article.slug", read_only=True)
    
    class Meta:
        model = ReadingHistory
        fields = ["id", "article_id", "article_title", "article_slug", "read_ratio", "completed", "first_read_at", "last_read_at"]
        read_only_fields = ["id", "first_read_at", "last_read_at"]


# Admin serializers for user management

class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for admin user list."""
    
    role = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    
    def get_role(self, obj):
        groups = obj.groups.values_list("name", flat=True)
        if "Publisher" in groups:
            return "publisher"
        if "Editor" in groups:
            return "editor"
        if "Writer" in groups:
            return "writer"
        if obj.is_superuser:
            return "admin"
        return "reader"
    
    def get_groups(self, obj):
        return list(obj.groups.values_list("name", flat=True))
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "groups", "is_active", "is_staff", "date_joined", "last_login"]


class AdminUserCreateSerializer(serializers.Serializer):
    """Serializer for admin to create staff users."""
    
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=["writer", "editor", "publisher"])
    display_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value.lower()
    
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()


class AdminUserUpdateSerializer(serializers.Serializer):
    """Serializer for admin to update user roles."""
    
    role = serializers.ChoiceField(choices=["reader", "writer", "editor", "publisher"], required=False)
    is_active = serializers.BooleanField(required=False)


# ============================================
# Password Reset Serializers
# ============================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting a password reset."""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        # Always return success even if email doesn't exist (security)
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a password reset."""
    
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(data["password"])
        return data


# ============================================
# Email Verification Serializers
# ============================================

class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""
    
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    """Serializer for resending verification email."""
    
    email = serializers.EmailField(required=False)

