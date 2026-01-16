from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Article, ArticleStatus, Author, Series


class PublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.author = Author.objects.create(name="Jane Doe", slug="jane-doe", bio="")
        self.series = Series.objects.create(name="Deep Dives", slug="deep-dives", description="")

        self.published = Article.objects.create(
            title="Hello",
            slug="hello",
            status=ArticleStatus.PUBLISHED,
            publish_at=timezone.now(),
            published_at=timezone.now(),
            series=self.series,
        )
        self.published.authors.add(self.author)

        self.draft = Article.objects.create(
            title="Draft",
            slug="draft",
            status=ArticleStatus.DRAFT,
        )

    def test_public_articles_list_default_is_published_only(self):
        res = self.client.get("/v1/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in res.json()}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_articles_list_published_only(self):
        res = self.client.get("/v1/articles/?status=published")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in res.json()}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_article_detail_blocks_unpublished(self):
        res = self.client.get("/v1/articles/draft/")
        self.assertEqual(res.status_code, 404)

    def test_public_authors_list(self):
        res = self.client.get("/v1/authors/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in res.json()}
        self.assertIn("jane-doe", slugs)

    def test_public_series_list(self):
        res = self.client.get("/v1/series/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in res.json()}
        self.assertIn("deep-dives", slugs)


class PreviewTokenTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.writer_group, _ = Group.objects.get_or_create(name="Writer")

        self.writer = User.objects.create_user(username="writer", password="pass")
        self.writer.groups.add(self.writer_group)

        self.article = Article.objects.create(title="Draft", slug="draft", status=ArticleStatus.DRAFT)

    def test_preview_token_allows_draft_view(self):
        self.client.login(username="writer", password="pass")
        token_res = self.client.get(f"/v1/editor/articles/{self.article.pk}/preview_token/")
        self.assertEqual(token_res.status_code, 200)
        token = token_res.json()["preview_token"]

        self.client.logout()
        res = self.client.get(f"/v1/articles/{self.article.slug}/?preview_token={token}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["slug"], "draft")
