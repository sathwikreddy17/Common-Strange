from __future__ import annotations

from django.contrib.auth.models import Group, User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    Article,
    ArticleStatus,
    ArticleVersion,
    ArticleVersionKind,
    Author,
    Category,
    CuratedModule,
    CuratedModuleItem,
    CuratedPlacement,
    CuratedItemType,
    Event,
    MediaAsset,
    PreviewToken,
    Series,
    Tag,
)
from .events import EventKind


def get_results(response):
    """Extract results from paginated or non-paginated response."""
    data = response.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


def get_count(response):
    """Extract count from paginated response."""
    data = response.json()
    if isinstance(data, dict) and "count" in data:
        return data["count"]
    if isinstance(data, list):
        return len(data)
    return 0


class PublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.author = Author.objects.create(name="Jane Doe", slug="jane-doe", bio="")
        self.series = Series.objects.create(name="Deep Dives", slug="deep-dives", description="")
        self.tag = Tag.objects.create(name="AI", slug="ai")

        self.published = Article.objects.create(
            title="Hello",
            slug="hello",
            status=ArticleStatus.PUBLISHED,
            publish_at=timezone.now(),
            published_at=timezone.now(),
            series=self.series,
        )
        self.published.authors.add(self.author)
        self.published.tags.add(self.tag)

        self.draft = Article.objects.create(
            title="Draft",
            slug="draft",
            status=ArticleStatus.DRAFT,
        )

    def test_public_articles_list_default_is_published_only(self):
        res = self.client.get("/v1/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_articles_list_published_only(self):
        res = self.client.get("/v1/articles/?status=published")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_article_detail_blocks_unpublished(self):
        res = self.client.get("/v1/articles/draft/")
        self.assertEqual(res.status_code, 404)

    def test_public_authors_list(self):
        res = self.client.get("/v1/authors/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("jane-doe", slugs)

    def test_public_series_list(self):
        res = self.client.get("/v1/series/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("deep-dives", slugs)

    def test_public_author_articles_list(self):
        res = self.client.get("/v1/authors/jane-doe/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_series_articles_list(self):
        res = self.client.get("/v1/series/deep-dives/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_tags_list(self):
        res = self.client.get("/v1/tags/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("ai", slugs)

    def test_public_tag_articles_list(self):
        res = self.client.get("/v1/tags/ai/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("hello", slugs)
        self.assertNotIn("draft", slugs)

    def test_public_articles_by_ids_returns_only_requested_and_published(self):
        res = self.client.get(f"/v1/articles/by-ids/?ids={self.published.id},{self.draft.id}")
        self.assertEqual(res.status_code, 200)
        data = get_results(res)
        ids = [x["id"] for x in data]
        self.assertIn(self.published.id, ids)
        self.assertNotIn(self.draft.id, ids)

    def test_public_articles_by_ids_preserves_order(self):
        a2 = Article.objects.create(
            title="Second",
            slug="second",
            status=ArticleStatus.PUBLISHED,
            publish_at=timezone.now(),
            published_at=timezone.now(),
        )

        res = self.client.get(f"/v1/articles/by-ids/?ids={a2.id},{self.published.id}")
        self.assertEqual(res.status_code, 200)
        data = get_results(res)
        self.assertEqual([x["id"] for x in data], [a2.id, self.published.id])


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


class EditorialTaxonomyTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.editor_group, _ = Group.objects.get_or_create(name="Editor")
        self.editor = User.objects.create_user(username="editor", password="pass")
        self.editor.groups.add(self.editor_group)

        self.client.login(username="editor", password="pass")

    def test_editor_can_create_and_delete_tag(self):
        create_res = self.client.post(
            "/v1/editor/tags/",
            data={"name": "Robots", "slug": "robots"},
            format="json",
        )
        self.assertEqual(create_res.status_code, 201)

        del_res = self.client.delete("/v1/editor/tags/robots/")
        self.assertIn(del_res.status_code, [204, 404])

    def test_writer_cannot_create_tag(self):
        self.client.logout()

        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user(username="writer2", password="pass")
        writer.groups.add(writer_group)

        self.client.login(username="writer2", password="pass")
        res = self.client.post(
            "/v1/editor/tags/",
            data={"name": "Blocked", "slug": "blocked"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class WidgetsSchemaTests(TestCase):
    def test_embed_widget_accepts_allowed_provider_and_http_url(self):
        from .widgets_schema import validate_widgets_json

        payload = {
            "widgets": [
                {
                    "type": "embed",
                    "provider": "youtube",
                    "url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                    "title": "Example",
                }
            ]
        }
        out = validate_widgets_json(payload)
        self.assertEqual(out["widgets"][0]["type"], "embed")

    def test_heading_widget_accepts_valid_payload(self):
        from .widgets_schema import validate_widgets_json

        payload = {"widgets": [{"type": "heading", "level": 2, "text": "Section"}]}
        out = validate_widgets_json(payload)
        self.assertEqual(out["widgets"][0]["type"], "heading")
        self.assertEqual(out["widgets"][0]["level"], 2)

    def test_heading_widget_rejects_invalid_level(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "heading", "level": 6, "text": "Bad"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)

    def test_divider_widget_accepts_valid_payload(self):
        from .widgets_schema import validate_widgets_json

        payload = {"widgets": [{"type": "divider"}]}
        out = validate_widgets_json(payload)
        self.assertEqual(out["widgets"][0]["type"], "divider")

    def test_embed_widget_rejects_unknown_provider(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "embed", "provider": "evil", "url": "https://example.com"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)

    def test_embed_widget_rejects_non_http_url(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "embed", "provider": "youtube", "url": "javascript:alert(1)"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)

    def test_embed_widget_rejects_wrong_host_for_provider(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "embed", "provider": "youtube", "url": "https://example.com/embed/abc"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)

    def test_embed_widget_rejects_spotify_without_embed_path(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "embed", "provider": "spotify", "url": "https://open.spotify.com/track/xyz"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)

    def test_callout_widget_accepts_valid_variant(self):
        from .widgets_schema import validate_widgets_json

        payload = {"widgets": [{"type": "callout", "variant": "note", "title": "Note", "text": "Hello"}]}
        out = validate_widgets_json(payload)
        self.assertEqual(out["widgets"][0]["type"], "callout")

    def test_callout_widget_rejects_invalid_variant(self):
        from .widgets_schema import validate_widgets_json
        from pydantic import ValidationError

        payload = {"widgets": [{"type": "callout", "variant": "loud", "text": "Hello"}]}
        with self.assertRaises(ValidationError):
            validate_widgets_json(payload)


# =============================================================================
# Pagination format tests — regression guard for the paginated-response bug
# =============================================================================


class PaginationFormatTests(TestCase):
    """Ensure all list endpoints return DRF paginated responses (count + results).

    Bug reference: Frontend assumed list responses were plain arrays, but DRF
    wraps them in {count, next, previous, results}. These tests ensure the
    format is consistent so the frontend unwrapPaginated() helper works.
    """

    def setUp(self):
        self.client = APIClient()
        self.author = Author.objects.create(name="Test Author", slug="test-author")
        self.category = Category.objects.create(name="Science", slug="science")
        self.series = Series.objects.create(name="Explainers", slug="explainers")
        self.tag = Tag.objects.create(name="Tech", slug="tech")

        self.article = Article.objects.create(
            title="Pagination Test",
            slug="pagination-test",
            status=ArticleStatus.PUBLISHED,
            publish_at=timezone.now(),
            published_at=timezone.now(),
            category=self.category,
            series=self.series,
        )
        self.article.authors.add(self.author)
        self.article.tags.add(self.tag)

    def _assert_paginated(self, url):
        """Assert the response is a paginated envelope with count + results."""
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, dict, f"{url} should return a dict, not a list")
        self.assertIn("count", data, f"{url} missing 'count' field")
        self.assertIn("results", data, f"{url} missing 'results' field")
        self.assertIsInstance(data["results"], list)
        return data

    def test_public_articles_paginated(self):
        self._assert_paginated("/v1/articles/")

    def test_public_categories_paginated(self):
        self._assert_paginated("/v1/categories/")

    def test_public_authors_paginated(self):
        self._assert_paginated("/v1/authors/")

    def test_public_series_paginated(self):
        self._assert_paginated("/v1/series/")

    def test_public_tags_paginated(self):
        self._assert_paginated("/v1/tags/")

    def test_public_category_articles_paginated(self):
        self._assert_paginated("/v1/categories/science/articles/")

    def test_public_series_articles_paginated(self):
        self._assert_paginated("/v1/series/explainers/articles/")

    def test_public_author_articles_paginated(self):
        self._assert_paginated("/v1/authors/test-author/articles/")

    def test_public_tag_articles_paginated(self):
        self._assert_paginated("/v1/tags/tech/articles/")

    def test_public_articles_by_ids_paginated(self):
        self._assert_paginated(f"/v1/articles/by-ids/?ids={self.article.id}")

    def test_public_home_modules_paginated(self):
        self._assert_paginated("/v1/home/modules/")

    def test_editor_articles_paginated(self):
        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user(username="w", password="pass")
        writer.groups.add(writer_group)
        self.client.login(username="w", password="pass")
        self._assert_paginated("/v1/editor/articles/")

    def test_editor_modules_paginated(self):
        pub_group, _ = Group.objects.get_or_create(name="Publisher")
        pub = User.objects.create_user(username="p", password="pass")
        pub.groups.add(pub_group)
        self.client.login(username="p", password="pass")
        self._assert_paginated("/v1/editor/modules/")


# =============================================================================
# Editor article workflow — full lifecycle
# =============================================================================


class EditorArticleWorkflowTests(TestCase):
    """Test the full editorial workflow: create → submit → approve → publish.

    Also tests role-based access: writers cannot approve, editors cannot
    publish, only publishers have full control.
    """

    def setUp(self):
        self.client = APIClient()

        self.writer_group, _ = Group.objects.get_or_create(name="Writer")
        self.editor_group, _ = Group.objects.get_or_create(name="Editor")
        self.publisher_group, _ = Group.objects.get_or_create(name="Publisher")

        self.writer = User.objects.create_user(username="writer", password="pass")
        self.writer.groups.add(self.writer_group)

        self.editor = User.objects.create_user(username="editor", password="pass")
        self.editor.groups.add(self.editor_group)

        self.publisher = User.objects.create_user(username="publisher", password="pass")
        self.publisher.groups.add(self.publisher_group)

    def _login(self, username):
        self.client.logout()
        self.client.login(username=username, password="pass")

    def test_writer_can_create_article(self):
        self._login("writer")
        res = self.client.post("/v1/editor/articles/", {
            "title": "New Article",
            "slug": "new-article",
            "body_md": "# Hello World",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["slug"], "new-article")
        # Should start as DRAFT
        article = Article.objects.get(slug="new-article")
        self.assertEqual(article.status, ArticleStatus.DRAFT)

    def test_writer_can_submit_draft(self):
        self._login("writer")
        article = Article.objects.create(title="Draft", slug="draft-submit", status=ArticleStatus.DRAFT)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/submit/")
        self.assertEqual(res.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.status, ArticleStatus.IN_REVIEW)

    def test_submit_non_draft_fails(self):
        self._login("writer")
        article = Article.objects.create(title="Published", slug="pub-submit",
                                         status=ArticleStatus.PUBLISHED, published_at=timezone.now())
        res = self.client.post(f"/v1/editor/articles/{article.pk}/submit/")
        self.assertEqual(res.status_code, 400)

    def test_editor_can_approve(self):
        self._login("editor")
        article = Article.objects.create(title="InReview", slug="in-review", status=ArticleStatus.IN_REVIEW)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/approve/")
        self.assertEqual(res.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.status, ArticleStatus.SCHEDULED)

    def test_writer_cannot_approve(self):
        self._login("writer")
        article = Article.objects.create(title="InReview", slug="in-review-w", status=ArticleStatus.IN_REVIEW)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/approve/")
        self.assertEqual(res.status_code, 403)

    def test_publisher_can_publish_now(self):
        self._login("publisher")
        article = Article.objects.create(title="Scheduled", slug="sched-pub", status=ArticleStatus.SCHEDULED)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/publish_now/")
        self.assertEqual(res.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.status, ArticleStatus.PUBLISHED)
        self.assertIsNotNone(article.published_at)

    def test_editor_cannot_publish_now(self):
        self._login("editor")
        article = Article.objects.create(title="Scheduled", slug="sched-ed", status=ArticleStatus.SCHEDULED)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/publish_now/")
        self.assertEqual(res.status_code, 403)

    def test_writer_cannot_publish_now(self):
        self._login("writer")
        article = Article.objects.create(title="Scheduled", slug="sched-wr", status=ArticleStatus.SCHEDULED)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/publish_now/")
        self.assertEqual(res.status_code, 403)

    def test_full_workflow_draft_to_published(self):
        """Test the entire lifecycle: create → submit → approve → publish."""
        # Writer creates
        self._login("writer")
        res = self.client.post("/v1/editor/articles/", {
            "title": "Full Lifecycle",
            "slug": "full-lifecycle",
            "body_md": "Content here",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        pk = res.json()["id"]

        # Writer submits
        res = self.client.post(f"/v1/editor/articles/{pk}/submit/")
        self.assertEqual(res.status_code, 200)

        # Editor approves
        self._login("editor")
        res = self.client.post(f"/v1/editor/articles/{pk}/approve/")
        self.assertEqual(res.status_code, 200)

        # Publisher publishes
        self._login("publisher")
        res = self.client.post(f"/v1/editor/articles/{pk}/publish_now/")
        self.assertEqual(res.status_code, 200)

        # Verify article is now publicly visible
        self.client.logout()
        res = self.client.get("/v1/articles/full-lifecycle/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["slug"], "full-lifecycle")

    def test_article_versions_created_on_workflow(self):
        """Each workflow step should create an ArticleVersion snapshot."""
        self._login("writer")
        article = Article.objects.create(title="Versioned", slug="versioned", status=ArticleStatus.DRAFT)

        self.client.post(f"/v1/editor/articles/{article.pk}/submit/")
        article.refresh_from_db()

        self._login("editor")
        self.client.post(f"/v1/editor/articles/{article.pk}/approve/")

        self._login("publisher")
        self.client.post(f"/v1/editor/articles/{article.pk}/publish_now/")

        versions = ArticleVersion.objects.filter(article=article).order_by("created_at")
        kinds = list(versions.values_list("kind", flat=True))
        self.assertIn(ArticleVersionKind.SUBMIT, kinds)
        self.assertIn(ArticleVersionKind.APPROVE, kinds)
        self.assertIn(ArticleVersionKind.PUBLISH, kinds)

    def test_unauthenticated_cannot_create_article(self):
        self.client.logout()
        res = self.client.post("/v1/editor/articles/", {
            "title": "Unauth",
            "slug": "unauth",
        }, format="json")
        self.assertIn(res.status_code, [401, 403])

    def test_editor_can_update_article(self):
        """Editors should be able to PATCH an article."""
        self._login("editor")
        article = Article.objects.create(title="Original", slug="original", status=ArticleStatus.DRAFT)
        res = self.client.patch(f"/v1/editor/articles/{article.pk}/", {
            "title": "Updated Title",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.title, "Updated Title")

    def test_schedule_requires_publish_at(self):
        self._login("publisher")
        article = Article.objects.create(title="Sched", slug="sched-no-date", status=ArticleStatus.IN_REVIEW)
        res = self.client.post(f"/v1/editor/articles/{article.pk}/schedule/")
        self.assertEqual(res.status_code, 400)

    def test_schedule_with_valid_date(self):
        self._login("publisher")
        article = Article.objects.create(title="Sched", slug="sched-date", status=ArticleStatus.IN_REVIEW)
        future = (timezone.now() + timezone.timedelta(days=1)).isoformat()
        res = self.client.post(f"/v1/editor/articles/{article.pk}/schedule/", {
            "publish_at": future,
        }, format="json")
        self.assertEqual(res.status_code, 200)
        article.refresh_from_db()
        self.assertEqual(article.status, ArticleStatus.SCHEDULED)


# =============================================================================
# Curated modules — CRUD, replace_items, public visibility
# =============================================================================


class CuratedModuleCRUDTests(TestCase):
    """Test editorial module management: create, update, delete, list."""

    def setUp(self):
        self.client = APIClient()
        self.pub_group, _ = Group.objects.get_or_create(name="Publisher")
        self.publisher = User.objects.create_user(username="pub", password="pass")
        self.publisher.groups.add(self.pub_group)
        self.client.login(username="pub", password="pass")

    def test_create_home_module(self):
        res = self.client.post("/v1/editor/modules/", {
            "title": "Featured",
            "subtitle": "Top picks",
            "placement": "HOME",
            "order": 0,
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["title"], "Featured")
        self.assertEqual(res.json()["placement"], "HOME")

    def test_create_category_module(self):
        cat = Category.objects.create(name="Tech", slug="tech")
        res = self.client.post("/v1/editor/modules/", {
            "title": "Tech Picks",
            "placement": "CATEGORY",
            "category": cat.id,
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["placement"], "CATEGORY")

    def test_list_modules(self):
        CuratedModule.objects.create(title="M1", placement=CuratedPlacement.HOME, order=0)
        CuratedModule.objects.create(title="M2", placement=CuratedPlacement.HOME, order=1)
        res = self.client.get("/v1/editor/modules/")
        self.assertEqual(res.status_code, 200)
        results = get_results(res)
        self.assertEqual(len(results), 2)

    def test_update_module(self):
        m = CuratedModule.objects.create(title="Old", placement=CuratedPlacement.HOME)
        res = self.client.patch(f"/v1/editor/modules/{m.pk}/", {
            "title": "New Title",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        m.refresh_from_db()
        self.assertEqual(m.title, "New Title")

    def test_delete_module(self):
        m = CuratedModule.objects.create(title="ToDelete", placement=CuratedPlacement.HOME)
        res = self.client.delete(f"/v1/editor/modules/{m.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(CuratedModule.objects.filter(pk=m.pk).exists())

    def test_writer_cannot_manage_modules(self):
        self.client.logout()
        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user(username="w", password="pass")
        writer.groups.add(writer_group)
        self.client.login(username="w", password="pass")

        res = self.client.post("/v1/editor/modules/", {
            "title": "Blocked",
            "placement": "HOME",
        }, format="json")
        self.assertEqual(res.status_code, 403)

    def test_filter_modules_by_placement(self):
        CuratedModule.objects.create(title="Home1", placement=CuratedPlacement.HOME)
        cat = Category.objects.create(name="Art", slug="art")
        CuratedModule.objects.create(title="Cat1", placement=CuratedPlacement.CATEGORY, category=cat)

        res = self.client.get("/v1/editor/modules/?placement=HOME")
        results = get_results(res)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Home1")


class CuratedModuleReplaceItemsTests(TestCase):
    """Test replace_items endpoint for curated modules."""

    def setUp(self):
        self.client = APIClient()
        self.pub_group, _ = Group.objects.get_or_create(name="Publisher")
        self.publisher = User.objects.create_user(username="pub", password="pass")
        self.publisher.groups.add(self.pub_group)
        self.client.login(username="pub", password="pass")

        self.module = CuratedModule.objects.create(
            title="Featured", placement=CuratedPlacement.HOME
        )
        self.article1 = Article.objects.create(
            title="Article 1", slug="article-1",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )
        self.article2 = Article.objects.create(
            title="Article 2", slug="article-2",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )

    def test_replace_items_with_articles(self):
        res = self.client.post(f"/v1/editor/modules/{self.module.pk}/replace_items/", {
            "items": [
                {"order": 0, "item_type": "ARTICLE", "article": self.article1.id},
                {"order": 1, "item_type": "ARTICLE", "article": self.article2.id},
            ]
        }, format="json")
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["article"]["slug"], "article-1")

    def test_replace_items_clears_old_items(self):
        # Add initial items
        CuratedModuleItem.objects.create(
            module=self.module, order=0, item_type=CuratedItemType.ARTICLE, article=self.article1
        )

        # Replace with different set
        res = self.client.post(f"/v1/editor/modules/{self.module.pk}/replace_items/", {
            "items": [
                {"order": 0, "item_type": "ARTICLE", "article": self.article2.id},
            ]
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.module.items.count(), 1)
        self.assertEqual(self.module.items.first().article_id, self.article2.id)

    def test_replace_items_with_empty_list(self):
        CuratedModuleItem.objects.create(
            module=self.module, order=0, item_type=CuratedItemType.ARTICLE, article=self.article1
        )
        res = self.client.post(f"/v1/editor/modules/{self.module.pk}/replace_items/", {
            "items": []
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.module.items.count(), 0)

    def test_replace_items_non_list_rejected(self):
        res = self.client.post(f"/v1/editor/modules/{self.module.pk}/replace_items/", {
            "items": "not a list"
        }, format="json")
        self.assertEqual(res.status_code, 400)


class PublicCuratedModulesTests(TestCase):
    """Test public module endpoints visibility and filtering."""

    def setUp(self):
        self.client = APIClient()
        self.article = Article.objects.create(
            title="Visible", slug="visible",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )

    def test_active_module_visible(self):
        m = CuratedModule.objects.create(
            title="Active", placement=CuratedPlacement.HOME, is_active=True
        )
        CuratedModuleItem.objects.create(module=m, order=0, item_type=CuratedItemType.ARTICLE, article=self.article)
        res = self.client.get("/v1/home/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Active")
        self.assertTrue(len(results[0]["items"]) > 0)

    def test_inactive_module_hidden(self):
        CuratedModule.objects.create(
            title="Inactive", placement=CuratedPlacement.HOME, is_active=False
        )
        res = self.client.get("/v1/home/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 0)

    def test_expired_module_hidden(self):
        CuratedModule.objects.create(
            title="Expired", placement=CuratedPlacement.HOME, is_active=True,
            expires_at=timezone.now() - timezone.timedelta(hours=1)
        )
        res = self.client.get("/v1/home/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 0)

    def test_future_publish_at_hidden(self):
        CuratedModule.objects.create(
            title="Future", placement=CuratedPlacement.HOME, is_active=True,
            publish_at=timezone.now() + timezone.timedelta(hours=1)
        )
        res = self.client.get("/v1/home/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 0)

    def test_category_modules_scoped(self):
        cat = Category.objects.create(name="Tech", slug="tech")
        CuratedModule.objects.create(
            title="Tech Module", placement=CuratedPlacement.CATEGORY, category=cat, is_active=True
        )
        CuratedModule.objects.create(
            title="Home Module", placement=CuratedPlacement.HOME, is_active=True
        )

        res = self.client.get("/v1/categories/tech/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Tech Module")

    def test_series_modules_scoped(self):
        s = Series.objects.create(name="Deep Dives", slug="deep-dives")
        CuratedModule.objects.create(
            title="Series Module", placement=CuratedPlacement.SERIES, series=s, is_active=True
        )
        res = self.client.get("/v1/series/deep-dives/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 1)

    def test_author_modules_scoped(self):
        a = Author.objects.create(name="Jane", slug="jane")
        CuratedModule.objects.create(
            title="Author Module", placement=CuratedPlacement.AUTHOR, author=a, is_active=True
        )
        res = self.client.get("/v1/authors/jane/modules/")
        results = get_results(res)
        self.assertEqual(len(results), 1)


# =============================================================================
# Model validation tests
# =============================================================================


class ArticleModelTests(TestCase):
    """Test Article model-level validation."""

    def test_reserved_slug_rejected(self):
        from django.core.exceptions import ValidationError
        article = Article(title="Admin", slug="admin", status=ArticleStatus.DRAFT)
        with self.assertRaises(ValidationError):
            article.full_clean()

    def test_next_internal_slug_rejected(self):
        from django.core.exceptions import ValidationError
        article = Article(title="Next", slug="_next", status=ArticleStatus.DRAFT)
        with self.assertRaises(ValidationError):
            article.full_clean()

    def test_normal_slug_accepted(self):
        article = Article(title="Good", slug="good-article", status=ArticleStatus.DRAFT)
        article.full_clean()  # Should not raise
        article.save()
        self.assertTrue(Article.objects.filter(slug="good-article").exists())


class CuratedModuleModelTests(TestCase):
    """Test CuratedModule model-level validation."""

    def test_home_module_rejects_category_scope(self):
        from django.core.exceptions import ValidationError
        cat = Category.objects.create(name="Cat", slug="cat")
        m = CuratedModule(title="Bad", placement=CuratedPlacement.HOME, category=cat)
        with self.assertRaises(ValidationError):
            m.full_clean()

    def test_category_module_requires_category(self):
        from django.core.exceptions import ValidationError
        m = CuratedModule(title="Bad", placement=CuratedPlacement.CATEGORY)
        with self.assertRaises(ValidationError):
            m.full_clean()

    def test_expires_must_be_after_publish(self):
        from django.core.exceptions import ValidationError
        now = timezone.now()
        m = CuratedModule(
            title="Bad", placement=CuratedPlacement.HOME,
            publish_at=now, expires_at=now - timezone.timedelta(hours=1)
        )
        with self.assertRaises(ValidationError):
            m.full_clean()


class CuratedModuleItemModelTests(TestCase):
    """Test CuratedModuleItem model-level validation."""

    def test_article_item_requires_article_fk(self):
        from django.core.exceptions import ValidationError
        m = CuratedModule.objects.create(title="M", placement=CuratedPlacement.HOME)
        item = CuratedModuleItem(module=m, item_type=CuratedItemType.ARTICLE)
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_article_item_rejects_extra_fk(self):
        from django.core.exceptions import ValidationError
        m = CuratedModule.objects.create(title="M", placement=CuratedPlacement.HOME)
        a = Article.objects.create(title="A", slug="a", status=ArticleStatus.DRAFT)
        cat = Category.objects.create(name="C", slug="c")
        item = CuratedModuleItem(module=m, item_type=CuratedItemType.ARTICLE, article=a, category=cat)
        with self.assertRaises(ValidationError):
            item.full_clean()


# =============================================================================
# Preview token tests (extended)
# =============================================================================


class PreviewTokenExtendedTests(TestCase):
    """Extended preview token tests covering expiration and cross-article access."""

    def setUp(self):
        self.client = APIClient()
        self.writer_group, _ = Group.objects.get_or_create(name="Writer")
        self.writer = User.objects.create_user(username="writer", password="pass")
        self.writer.groups.add(self.writer_group)

    def test_expired_token_returns_404(self):
        article = Article.objects.create(title="Draft", slug="draft-exp", status=ArticleStatus.DRAFT)
        token = PreviewToken.objects.create(
            token="expired-token",
            article=article,
            expires_at=timezone.now() - timezone.timedelta(hours=1),
        )
        res = self.client.get(f"/v1/articles/{article.slug}/?preview_token={token.token}")
        self.assertEqual(res.status_code, 404)

    def test_token_for_different_article_returns_404(self):
        article1 = Article.objects.create(title="Article 1", slug="a1", status=ArticleStatus.DRAFT)
        article2 = Article.objects.create(title="Article 2", slug="a2", status=ArticleStatus.DRAFT)
        token = PreviewToken.mint(article=article1, article_version=None, created_by=self.writer)

        # Try to use article1's token for article2's slug
        res = self.client.get(f"/v1/articles/{article2.slug}/?preview_token={token.token}")
        self.assertEqual(res.status_code, 404)

    def test_preview_token_endpoint_generates_valid_token(self):
        self.client.login(username="writer", password="pass")
        article = Article.objects.create(title="Preview", slug="preview-test", status=ArticleStatus.DRAFT)
        res = self.client.get(f"/v1/editor/articles/{article.pk}/preview_token/")
        self.assertEqual(res.status_code, 200)
        token = res.json()["preview_token"]
        self.assertIsNotNone(token)

        # Use the token to view the draft
        self.client.logout()
        res = self.client.get(f"/v1/articles/{article.slug}/?preview_token={token}")
        self.assertEqual(res.status_code, 200)


# =============================================================================
# Editor taxonomy CRUD (extended)
# =============================================================================


class EditorTaxonomyCRUDTests(TestCase):
    """Test CRUD for all taxonomy types: categories, authors, series, tags."""

    def setUp(self):
        self.client = APIClient()
        self.editor_group, _ = Group.objects.get_or_create(name="Editor")
        self.editor = User.objects.create_user(username="editor", password="pass")
        self.editor.groups.add(self.editor_group)
        self.client.login(username="editor", password="pass")

    def test_create_category(self):
        res = self.client.post("/v1/editor/categories/", {
            "name": "Science", "slug": "science"
        }, format="json")
        self.assertEqual(res.status_code, 201)

    def test_update_category(self):
        Category.objects.create(name="Old", slug="old-cat")
        res = self.client.patch("/v1/editor/categories/old-cat/", {
            "name": "Updated"
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Category.objects.get(slug="old-cat").name, "Updated")

    def test_delete_category(self):
        Category.objects.create(name="Delete", slug="del-cat")
        res = self.client.delete("/v1/editor/categories/del-cat/")
        self.assertEqual(res.status_code, 204)

    def test_create_author(self):
        res = self.client.post("/v1/editor/authors/", {
            "name": "John Doe", "slug": "john-doe"
        }, format="json")
        self.assertEqual(res.status_code, 201)

    def test_create_series(self):
        res = self.client.post("/v1/editor/series/", {
            "name": "Deep Dives", "slug": "deep-dives"
        }, format="json")
        self.assertEqual(res.status_code, 201)

    def test_create_tag(self):
        res = self.client.post("/v1/editor/tags/", {
            "name": "AI", "slug": "ai"
        }, format="json")
        self.assertEqual(res.status_code, 201)

    def test_writer_can_read_taxonomy(self):
        """Writers should be able to read taxonomy for article assignment."""
        Category.objects.create(name="Cat", slug="writer-cat")
        self.client.logout()
        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user(username="writer", password="pass")
        writer.groups.add(writer_group)
        self.client.login(username="writer", password="pass")

        res = self.client.get("/v1/editor/categories/")
        self.assertEqual(res.status_code, 200)

    def test_writer_cannot_write_taxonomy(self):
        """Writers should NOT be able to create/update/delete taxonomy."""
        self.client.logout()
        writer_group, _ = Group.objects.get_or_create(name="Writer")
        writer = User.objects.create_user(username="writer", password="pass")
        writer.groups.add(writer_group)
        self.client.login(username="writer", password="pass")

        res = self.client.post("/v1/editor/categories/", {
            "name": "Blocked", "slug": "blocked"
        }, format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_access_editor_taxonomy(self):
        self.client.logout()
        res = self.client.get("/v1/editor/categories/")
        self.assertIn(res.status_code, [401, 403])


# =============================================================================
# Event tracking tests
# =============================================================================


class EventTrackingTests(TestCase):
    """Test pageview and read event endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.article = Article.objects.create(
            title="Event Test", slug="event-test",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now()
        )

    def test_pageview_event_created(self):
        res = self.client.post("/v1/events/pageview/", {
            "slug": "event-test",
            "path": "/event-test",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Event.objects.filter(article=self.article, kind=EventKind.PAGEVIEW).exists())

    def test_read_event_created(self):
        res = self.client.post("/v1/events/read/", {
            "slug": "event-test",
            "read_ratio": 0.75,
        }, format="json")
        self.assertEqual(res.status_code, 200)
        event = Event.objects.get(article=self.article, kind=EventKind.READ)
        self.assertEqual(event.read_ratio, 0.75)

    def test_pageview_for_nonexistent_article(self):
        res = self.client.post("/v1/events/pageview/", {
            "slug": "nonexistent",
        }, format="json")
        self.assertEqual(res.status_code, 404)

    def test_pageview_for_draft_article(self):
        draft = Article.objects.create(title="Draft", slug="draft-event", status=ArticleStatus.DRAFT)
        res = self.client.post("/v1/events/pageview/", {
            "slug": "draft-event",
        }, format="json")
        self.assertEqual(res.status_code, 404)


# =============================================================================
# Public article filtering tests
# =============================================================================


class PublicArticleFilteringTests(TestCase):
    """Test article list filtering by category, tag, and status."""

    def setUp(self):
        self.client = APIClient()
        self.cat_science = Category.objects.create(name="Science", slug="science")
        self.cat_tech = Category.objects.create(name="Tech", slug="tech")
        self.tag_ai = Tag.objects.create(name="AI", slug="ai")
        self.tag_ml = Tag.objects.create(name="ML", slug="ml")

        self.art1 = Article.objects.create(
            title="Science AI", slug="science-ai",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now(),
            category=self.cat_science,
        )
        self.art1.tags.add(self.tag_ai)

        self.art2 = Article.objects.create(
            title="Tech ML", slug="tech-ml",
            status=ArticleStatus.PUBLISHED, published_at=timezone.now(),
            category=self.cat_tech,
        )
        self.art2.tags.add(self.tag_ml)

        self.draft = Article.objects.create(
            title="Draft", slug="draft-filter",
            status=ArticleStatus.DRAFT, category=self.cat_science,
        )

    def test_filter_by_category(self):
        res = self.client.get("/v1/articles/?category=science")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("science-ai", slugs)
        self.assertNotIn("tech-ml", slugs)

    def test_filter_by_tag(self):
        res = self.client.get("/v1/articles/?tag=ml")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("tech-ml", slugs)
        self.assertNotIn("science-ai", slugs)

    def test_category_articles_endpoint(self):
        res = self.client.get("/v1/categories/tech/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertIn("tech-ml", slugs)
        self.assertNotIn("science-ai", slugs)
        self.assertNotIn("draft-filter", slugs)

    def test_default_only_published(self):
        res = self.client.get("/v1/articles/")
        self.assertEqual(res.status_code, 200)
        slugs = {x["slug"] for x in get_results(res)}
        self.assertNotIn("draft-filter", slugs)

    def test_articles_by_ids_only_published(self):
        res = self.client.get(f"/v1/articles/by-ids/?ids={self.art1.id},{self.draft.id}")
        self.assertEqual(res.status_code, 200)
        ids = [x["id"] for x in get_results(res)]
        self.assertIn(self.art1.id, ids)
        self.assertNotIn(self.draft.id, ids)


# =============================================================================
# Health endpoint test
# =============================================================================


class HealthEndpointTests(TestCase):
    def test_health_returns_ok(self):
        client = APIClient()
        res = client.get("/v1/health/")
        self.assertEqual(res.status_code, 200)

    def test_healthz_returns_ok(self):
        client = APIClient()
        res = client.get("/healthz")
        self.assertEqual(res.status_code, 200)
