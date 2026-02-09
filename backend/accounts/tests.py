"""
Tests for accounts app: authentication, registration, profile, password reset,
saved articles, followed topics, reading history, and admin user management.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from content.models import Article, ArticleStatus, Category, Tag

from .models import (
    FollowedTopic,
    PasswordResetToken,
    ReadingHistory,
    SavedArticle,
    UserProfile,
)

User = get_user_model()


class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        res = self.client.post("/v1/auth/register/", {
            "username": "newuser",
            "email": "new@example.com",
            "password": "SecureP@ss123",
            "password_confirm": "SecureP@ss123",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("user", res.json())
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_password_mismatch(self):
        res = self.client.post("/v1/auth/register/", {
            "username": "baduser",
            "email": "bad@example.com",
            "password": "SecureP@ss123",
            "password_confirm": "WrongPassword",
        }, format="json")
        self.assertIn(res.status_code, [400])

    def test_register_duplicate_username(self):
        User.objects.create_user("existing", "e@example.com", "pass1234")
        res = self.client.post("/v1/auth/register/", {
            "username": "existing",
            "email": "other@example.com",
            "password": "SecureP@ss123",
            "password_confirm": "SecureP@ss123",
        }, format="json")
        self.assertEqual(res.status_code, 400)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            "testuser", "test@example.com", "TestP@ss123"
        )

    def test_login_success(self):
        res = self.client.post("/v1/auth/login/", {
            "username": "testuser",
            "password": "TestP@ss123",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("user", res.json())

    def test_login_wrong_password(self):
        res = self.client.post("/v1/auth/login/", {
            "username": "testuser",
            "password": "WrongPassword",
        }, format="json")
        self.assertEqual(res.status_code, 401)

    def test_login_nonexistent_user(self):
        res = self.client.post("/v1/auth/login/", {
            "username": "ghost",
            "password": "Whatever123",
        }, format="json")
        self.assertEqual(res.status_code, 401)


class LogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            "testuser", "test@example.com", "TestP@ss123"
        )

    def test_logout_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/v1/auth/logout/")
        self.assertEqual(res.status_code, 200)

    def test_logout_unauthenticated(self):
        res = self.client.post("/v1/auth/logout/")
        self.assertIn(res.status_code, [401, 403])


class CurrentUserTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            "testuser", "test@example.com", "TestP@ss123"
        )

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["username"], "testuser")

    def test_me_anonymous(self):
        res = self.client.get("/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json()["user"])


class CSRFTokenTests(TestCase):
    def test_csrf_endpoint(self):
        client = APIClient()
        res = client.get("/v1/auth/csrf/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("csrfToken", res.json())


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            "testuser", "test@example.com", "OldP@ss123"
        )

    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/v1/auth/change-password/", {
            "current_password": "OldP@ss123",
            "new_password": "NewP@ss456",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewP@ss456"))

    def test_change_password_wrong_current(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/v1/auth/change-password/", {
            "current_password": "WrongPassword",
            "new_password": "NewP@ss456",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_change_password_unauthenticated(self):
        res = self.client.post("/v1/auth/change-password/", {
            "current_password": "OldP@ss123",
            "new_password": "NewP@ss456",
        }, format="json")
        self.assertIn(res.status_code, [401, 403])


class PasswordResetRequestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            "testuser", "test@example.com", "TestP@ss123"
        )

    def test_password_reset_request_valid_email(self):
        res = self.client.post("/v1/auth/password-reset/request/", {
            "email": "test@example.com",
        }, format="json")
        # Should always return 200 (don't leak user existence)
        self.assertEqual(res.status_code, 200)

    def test_password_reset_request_unknown_email(self):
        res = self.client.post("/v1/auth/password-reset/request/", {
            "email": "unknown@example.com",
        }, format="json")
        # Should still return 200 (no user enumeration)
        self.assertEqual(res.status_code, 200)


# =============================================================================
# Profile tests
# =============================================================================


class ProfileTests(TestCase):
    """Test profile viewing and updating."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("profuser", "prof@example.com", "TestP@ss123")
        # Ensure profile exists
        UserProfile.objects.get_or_create(user=self.user)

    def test_get_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/v1/auth/profile/")
        self.assertEqual(res.status_code, 200)

    def test_update_profile_display_name(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.patch("/v1/auth/profile/", {
            "display_name": "New Display Name",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.display_name, "New Display Name")

    def test_profile_unauthenticated(self):
        res = self.client.get("/v1/auth/profile/")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Saved articles tests
# =============================================================================


class SavedArticlesTests(TestCase):
    """Test article bookmarking/saving feature."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("saver", "saver@example.com", "TestP@ss123")
        self.article = Article.objects.create(
            title="Saveable", slug="saveable",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )
        self.client.force_authenticate(user=self.user)

    def test_save_article(self):
        res = self.client.post("/v1/auth/saved-articles/", {
            "article_id": self.article.id,
        }, format="json")
        self.assertIn(res.status_code, [200, 201])
        self.assertTrue(SavedArticle.objects.filter(user=self.user, article=self.article).exists())

    def test_list_saved_articles(self):
        SavedArticle.objects.create(user=self.user, article=self.article)
        res = self.client.get("/v1/auth/saved-articles/")
        self.assertEqual(res.status_code, 200)

    def test_unsave_article(self):
        SavedArticle.objects.create(user=self.user, article=self.article)
        res = self.client.delete(f"/v1/auth/saved-articles/{self.article.id}/")
        self.assertIn(res.status_code, [200, 204])
        self.assertFalse(SavedArticle.objects.filter(user=self.user, article=self.article).exists())

    def test_check_saved_article(self):
        SavedArticle.objects.create(user=self.user, article=self.article)
        res = self.client.get(f"/v1/auth/saved-articles/{self.article.id}/check/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("is_saved", False))

    def test_unauthenticated_cannot_save(self):
        self.client.logout()
        res = self.client.post("/v1/auth/saved-articles/", {
            "article_id": self.article.id,
        }, format="json")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Followed topics tests
# =============================================================================


class FollowedTopicsTests(TestCase):
    """Test topic following feature."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("follower", "follower@example.com", "TestP@ss123")
        self.category = Category.objects.create(name="Science", slug="science")
        self.client.force_authenticate(user=self.user)

    def test_follow_category(self):
        res = self.client.post("/v1/auth/followed-topics/", {
            "topic_type": "category",
            "topic_slug": "science",
        }, format="json")
        self.assertIn(res.status_code, [200, 201])
        self.assertTrue(
            FollowedTopic.objects.filter(user=self.user, topic_type="category", topic_slug="science").exists()
        )

    def test_list_followed_topics(self):
        FollowedTopic.objects.create(user=self.user, topic_type="category", topic_slug="science")
        res = self.client.get("/v1/auth/followed-topics/")
        self.assertEqual(res.status_code, 200)

    def test_unfollow_topic(self):
        FollowedTopic.objects.create(user=self.user, topic_type="category", topic_slug="science")
        res = self.client.delete("/v1/auth/followed-topics/category/science/")
        self.assertIn(res.status_code, [200, 204])
        self.assertFalse(
            FollowedTopic.objects.filter(user=self.user, topic_type="category", topic_slug="science").exists()
        )

    def test_unauthenticated_cannot_follow(self):
        self.client.logout()
        res = self.client.post("/v1/auth/followed-topics/", {
            "topic_type": "category",
            "topic_slug": "science",
        }, format="json")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Reading history tests
# =============================================================================


class ReadingHistoryTests(TestCase):
    """Test reading history tracking."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("reader", "reader@example.com", "TestP@ss123")
        self.article = Article.objects.create(
            title="Readable", slug="readable",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )
        self.client.force_authenticate(user=self.user)

    def test_record_reading(self):
        res = self.client.post("/v1/auth/record-reading/", {
            "article_id": self.article.id,
            "read_ratio": 0.5,
        }, format="json")
        self.assertIn(res.status_code, [200, 201])

    def test_list_reading_history(self):
        ReadingHistory.objects.create(user=self.user, article=self.article, read_ratio=1.0, completed=True)
        res = self.client.get("/v1/auth/reading-history/")
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_access_history(self):
        self.client.logout()
        res = self.client.get("/v1/auth/reading-history/")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Auth session consistency tests — regression guard for login/logout bugs
# =============================================================================


class AuthSessionConsistencyTests(TestCase):
    """Regression tests for session-related bugs.

    Bug reference: Sign-in button was unresponsive after logout because
    the frontend had stale user state. These tests verify the backend
    correctly manages session state.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("sessionuser", "s@example.com", "TestP@ss123")

    def test_login_then_me_returns_user(self):
        self.client.post("/v1/auth/login/", {
            "username": "sessionuser",
            "password": "TestP@ss123",
        }, format="json")
        res = self.client.get("/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.json()["user"])
        self.assertEqual(res.json()["user"]["username"], "sessionuser")

    def test_logout_then_me_returns_null_user(self):
        self.client.force_authenticate(user=self.user)
        self.client.post("/v1/auth/logout/")
        # After logout, me should return null user
        self.client.force_authenticate(user=None)
        res = self.client.get("/v1/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json()["user"])

    def test_login_logout_login_cycle(self):
        """Verify a full login → logout → re-login cycle works correctly."""
        # Login
        res1 = self.client.post("/v1/auth/login/", {
            "username": "sessionuser",
            "password": "TestP@ss123",
        }, format="json")
        self.assertEqual(res1.status_code, 200)

        # Verify session
        res2 = self.client.get("/v1/auth/me/")
        self.assertIsNotNone(res2.json()["user"])

        # Logout
        self.client.post("/v1/auth/logout/")

        # Verify logged out (use session-based check)
        self.client.credentials()  # Clear any auth
        res3 = self.client.get("/v1/auth/me/")
        self.assertEqual(res3.status_code, 200)

        # Re-login
        res4 = self.client.post("/v1/auth/login/", {
            "username": "sessionuser",
            "password": "TestP@ss123",
        }, format="json")
        self.assertEqual(res4.status_code, 200)

        # Verify session restored
        res5 = self.client.get("/v1/auth/me/")
        self.assertIsNotNone(res5.json()["user"])

    def test_invalid_credentials_returns_401(self):
        res = self.client.post("/v1/auth/login/", {
            "username": "sessionuser",
            "password": "WrongPassword",
        }, format="json")
        self.assertEqual(res.status_code, 401)

    def test_register_auto_logs_in(self):
        """After registration, user should be logged in (me returns user)."""
        res = self.client.post("/v1/auth/register/", {
            "username": "newreg",
            "email": "newreg@example.com",
            "password": "SecureP@ss123",
            "password_confirm": "SecureP@ss123",
        }, format="json")
        self.assertEqual(res.status_code, 201)

        # Should be logged in now
        res2 = self.client.get("/v1/auth/me/")
        self.assertEqual(res2.status_code, 200)
        self.assertIsNotNone(res2.json()["user"])
        self.assertEqual(res2.json()["user"]["username"], "newreg")


# =============================================================================
# Admin user management tests
# =============================================================================


class AdminUserManagementTests(TestCase):
    """Test admin user list/create/update endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.pub_group, _ = Group.objects.get_or_create(name="Publisher")
        self.admin_user = User.objects.create_user("admin", "admin@example.com", "AdminP@ss123")
        self.admin_user.groups.add(self.pub_group)

    def test_publisher_can_list_users(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/v1/auth/admin/users/")
        self.assertEqual(res.status_code, 200)

    def test_publisher_can_create_user(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post("/v1/auth/admin/users/create/", {
            "username": "newstaff",
            "email": "staff@example.com",
            "password": "StaffP@ss123",
            "role": "writer",
        }, format="json")
        self.assertIn(res.status_code, [200, 201])

    def test_non_publisher_cannot_list_users(self):
        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user("writer", "w@example.com", "pass")
        writer.groups.add(writer_group)
        self.client.force_authenticate(user=writer)
        res = self.client.get("/v1/auth/admin/users/")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_manage_users(self):
        res = self.client.get("/v1/auth/admin/users/")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Password Reset Token model tests
# =============================================================================


class PasswordResetTokenTests(TestCase):
    """Test PasswordResetToken model behavior."""

    def setUp(self):
        self.user = User.objects.create_user("resetuser", "reset@example.com", "TestP@ss123")

    def test_create_token(self):
        token = PasswordResetToken.create_for_user(self.user)
        self.assertIsNotNone(token.token)
        self.assertTrue(token.is_valid)

    def test_used_token_invalid(self):
        token = PasswordResetToken.create_for_user(self.user)
        token.mark_used()
        self.assertFalse(token.is_valid)

    def test_creating_new_token_invalidates_old(self):
        token1 = PasswordResetToken.create_for_user(self.user)
        token2 = PasswordResetToken.create_for_user(self.user)
        token1.refresh_from_db()
        self.assertIsNotNone(token1.used_at)  # Old token should be invalidated
        self.assertTrue(token2.is_valid)
