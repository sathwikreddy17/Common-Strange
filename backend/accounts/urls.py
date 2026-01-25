"""
URL patterns for accounts app.
"""
from django.urls import path

from . import views

urlpatterns = [
    # CSRF token
    path("csrf/", views.CSRFTokenView.as_view(), name="csrf-token"),
    
    # Authentication
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.CurrentUserView.as_view(), name="current-user"),
    
    # Profile
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    
    # Saved articles
    path("saved-articles/", views.SavedArticlesView.as_view(), name="saved-articles"),
    path("saved-articles/<int:article_id>/", views.SavedArticleDetailView.as_view(), name="saved-article-detail"),
    path("saved-articles/<int:article_id>/check/", views.CheckSavedArticleView.as_view(), name="check-saved-article"),
    
    # Followed topics
    path("followed-topics/", views.FollowedTopicsView.as_view(), name="followed-topics"),
    path("followed-topics/<str:topic_type>/<slug:topic_slug>/", views.FollowedTopicDetailView.as_view(), name="followed-topic-detail"),
    
    # Reading history
    path("reading-history/", views.ReadingHistoryView.as_view(), name="reading-history"),
    path("record-reading/", views.RecordReadingView.as_view(), name="record-reading"),
    
    # Admin user management
    path("admin/users/", views.AdminUserListView.as_view(), name="admin-users"),
    path("admin/users/create/", views.AdminUserCreateView.as_view(), name="admin-user-create"),
    path("admin/users/<int:user_id>/", views.AdminUserDetailView.as_view(), name="admin-user-detail"),
]
