"""
Views for user authentication and management.
"""
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import Group
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from content.models import Article, ArticleStatus
from content.permissions import IsPublisher

from .models import UserProfile, SavedArticle, FollowedTopic, ReadingHistory
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserProfileSerializer,
    SavedArticleSerializer,
    FollowedTopicSerializer,
    ReadingHistorySerializer,
    AdminUserListSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
)

User = get_user_model()


# ============================================
# Public Authentication Views
# ============================================

class CSRFTokenView(APIView):
    """Get CSRF token for forms."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(APIView):
    """User registration endpoint."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)
            return Response({
                "user": UserSerializer(user).data,
                "message": "Registration successful"
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """User login endpoint."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                request,
                username=serializer.validated_data["username"],
                password=serializer.validated_data["password"]
            )
            if user is not None:
                if not user.is_active:
                    return Response(
                        {"detail": "Account is disabled."},
                        status=status.HTTP_403_FORBIDDEN
                    )
                login(request, user)
                return Response({
                    "user": UserSerializer(user).data,
                    "message": "Login successful"
                })
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """User logout endpoint."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"})


class CurrentUserView(APIView):
    """Get current authenticated user."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        if request.user.is_authenticated:
            return Response({"user": UserSerializer(request.user).data})
        return Response({"user": None})


# ============================================
# User Profile Views
# ============================================

class ProfileView(APIView):
    """View and update user profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({"profile": UserProfileSerializer(profile).data})
    
    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"profile": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change user password."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        
        if not current_password or not new_password:
            return Response(
                {"detail": "Both current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not request.user.check_password(current_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.user.set_password(new_password)
        request.user.save()
        
        # Re-login to refresh session
        login(request, request.user)
        
        return Response({"message": "Password changed successfully"})


# ============================================
# Saved Articles / Reading List
# ============================================

class SavedArticlesView(APIView):
    """List and manage saved articles."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        saved = SavedArticle.objects.filter(user=request.user).select_related("article")
        return Response({"saved_articles": SavedArticleSerializer(saved, many=True).data})
    
    def post(self, request):
        article_id = request.data.get("article_id")
        if not article_id:
            return Response(
                {"detail": "article_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            article = Article.objects.get(pk=article_id, status=ArticleStatus.PUBLISHED)
        except Article.DoesNotExist:
            return Response(
                {"detail": "Article not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        saved, created = SavedArticle.objects.get_or_create(user=request.user, article=article)
        return Response({
            "saved_article": SavedArticleSerializer(saved).data,
            "created": created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SavedArticleDetailView(APIView):
    """Remove a saved article."""
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, article_id):
        try:
            saved = SavedArticle.objects.get(user=request.user, article_id=article_id)
            saved.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SavedArticle.DoesNotExist:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND
            )


class CheckSavedArticleView(APIView):
    """Check if an article is saved."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, article_id):
        is_saved = SavedArticle.objects.filter(
            user=request.user,
            article_id=article_id
        ).exists()
        return Response({"is_saved": is_saved})


# ============================================
# Followed Topics
# ============================================

class FollowedTopicsView(APIView):
    """List and manage followed topics."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        topics = FollowedTopic.objects.filter(user=request.user)
        return Response({"followed_topics": FollowedTopicSerializer(topics, many=True).data})
    
    def post(self, request):
        topic_type = request.data.get("topic_type")
        topic_slug = request.data.get("topic_slug")
        
        if not topic_type or not topic_slug:
            return Response(
                {"detail": "topic_type and topic_slug are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if topic_type not in ["category", "tag", "author", "series"]:
            return Response(
                {"detail": "Invalid topic_type."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        topic, created = FollowedTopic.objects.get_or_create(
            user=request.user,
            topic_type=topic_type,
            topic_slug=topic_slug
        )
        return Response({
            "followed_topic": FollowedTopicSerializer(topic).data,
            "created": created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FollowedTopicDetailView(APIView):
    """Unfollow a topic."""
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, topic_type, topic_slug):
        try:
            topic = FollowedTopic.objects.get(
                user=request.user,
                topic_type=topic_type,
                topic_slug=topic_slug
            )
            topic.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FollowedTopic.DoesNotExist:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# Reading History
# ============================================

class ReadingHistoryView(APIView):
    """List reading history."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        history = ReadingHistory.objects.filter(user=request.user).select_related("article")[:50]
        return Response({"reading_history": ReadingHistorySerializer(history, many=True).data})


class RecordReadingView(APIView):
    """Record reading progress (called from frontend)."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        article_id = request.data.get("article_id")
        read_ratio = request.data.get("read_ratio", 0.0)
        
        if not article_id:
            return Response(
                {"detail": "article_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            article = Article.objects.get(pk=article_id)
        except Article.DoesNotExist:
            return Response(
                {"detail": "Article not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        history, _ = ReadingHistory.objects.get_or_create(
            user=request.user,
            article=article
        )
        
        # Only update if new ratio is higher
        if read_ratio > history.read_ratio:
            history.read_ratio = min(1.0, read_ratio)
            history.completed = read_ratio >= 0.9
            history.save()
        
        return Response({"reading_history": ReadingHistorySerializer(history).data})


# ============================================
# Admin User Management Views
# ============================================

class AdminUserListView(APIView):
    """List all users (Publisher only)."""
    permission_classes = [permissions.IsAuthenticated, IsPublisher]
    
    def get(self, request):
        users = User.objects.all().prefetch_related("groups").order_by("-date_joined")
        return Response({"users": AdminUserListSerializer(users, many=True).data})


class AdminUserCreateView(APIView):
    """Create a staff user (Publisher only)."""
    permission_classes = [permissions.IsAuthenticated, IsPublisher]
    
    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Create user
            user = User.objects.create_user(
                username=data["username"],
                email=data["email"],
                password=data["password"],
                is_staff=True,  # Staff users can access Django admin
            )
            
            # Assign role group
            role = data["role"]
            group_name = role.capitalize()  # "writer" -> "Writer"
            group, _ = Group.objects.get_or_create(name=group_name)
            user.groups.add(group)
            
            # Create profile
            UserProfile.objects.create(
                user=user,
                display_name=data.get("display_name", ""),
            )
            
            return Response({
                "user": AdminUserListSerializer(user).data,
                "message": f"User created with {role} role"
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminUserDetailView(APIView):
    """View and update a specific user (Publisher only)."""
    permission_classes = [permissions.IsAuthenticated, IsPublisher]
    
    def get(self, request, user_id):
        try:
            user = User.objects.prefetch_related("groups").get(pk=user_id)
            return Response({"user": AdminUserListSerializer(user).data})
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, user_id):
        try:
            user = User.objects.prefetch_related("groups").get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent modifying yourself
        if user == request.user:
            return Response(
                {"detail": "Cannot modify your own account via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AdminUserUpdateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Update role if provided
            if "role" in data:
                role = data["role"]
                # Clear existing role groups
                user.groups.clear()
                
                if role != "reader":
                    group_name = role.capitalize()
                    group, _ = Group.objects.get_or_create(name=group_name)
                    user.groups.add(group)
                    user.is_staff = True
                else:
                    user.is_staff = False
                
                user.save()
            
            # Update active status if provided
            if "is_active" in data:
                user.is_active = data["is_active"]
                user.save()
            
            return Response({"user": AdminUserListSerializer(user).data})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent deleting yourself
        if user == request.user:
            return Response(
                {"detail": "Cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
