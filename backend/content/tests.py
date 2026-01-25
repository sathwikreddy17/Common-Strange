from __future__ import annotations

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Article, ArticleStatus, Author, Category, Series, Tag


def get_results(response):
    """Extract results from paginated or non-paginated response."""
    data = response.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


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
