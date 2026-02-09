"""
Tests for accounts app: authentication, registration, profile, password reset.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

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
