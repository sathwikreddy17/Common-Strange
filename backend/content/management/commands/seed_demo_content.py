from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from content.models import Article, ArticleStatus, Author, Category, Series, Tag


class Command(BaseCommand):
    help = "Seed demo content for local development (idempotent)."

    def handle(self, *args, **options):
        now = timezone.now()

        categories = [
            ("Technology", "technology", "Tools, systems, and the strange edges of the web."),
            ("Culture", "culture", "Ideas, people, and the internet as a place."),
        ]
        authors = [
            ("Jane Doe", "jane-doe", "Writes about products, systems, and publishing."),
            ("John Smith", "john-smith", "Occasional essays and field notes."),
        ]
        series = [
            ("Deep Dives", "deep-dives", "Longer explorations with receipts."),
        ]
        tags = [
            ("AI", "ai"),
            ("Publishing", "publishing"),
            ("Design", "design"),
        ]

        cat_by_slug = {}
        for name, slug, description in categories:
            c, _ = Category.objects.get_or_create(slug=slug, defaults={"name": name, "description": description})
            # Keep name/description in sync for repeated runs
            if c.name != name or c.description != description:
                c.name = name
                c.description = description
                c.save()
            cat_by_slug[slug] = c

        author_by_slug = {}
        for name, slug, bio in authors:
            a, _ = Author.objects.get_or_create(slug=slug, defaults={"name": name, "bio": bio})
            if a.name != name or a.bio != bio:
                a.name = name
                a.bio = bio
                a.save()
            author_by_slug[slug] = a

        series_by_slug = {}
        for name, slug, description in series:
            s, _ = Series.objects.get_or_create(slug=slug, defaults={"name": name, "description": description})
            if s.name != name or s.description != description:
                s.name = name
                s.description = description
                s.save()
            series_by_slug[slug] = s

        tag_by_slug = {}
        for name, slug in tags:
            t, _ = Tag.objects.get_or_create(slug=slug, defaults={"name": name})
            if t.name != name:
                t.name = name
                t.save()
            tag_by_slug[slug] = t

        articles = [
            {
                "title": "Hello, Common Strange",
                "slug": "hello-common-strange",
                "dek": "A small, production-shaped publishing PoC.",
                "category": "culture",
                "series": "deep-dives",
                "authors": ["jane-doe"],
                "tags": ["publishing", "design"],
                "body_md": """# Hello, Common Strange\n\nThis is demo content seeded by `seed_demo_content`.\n\n- Draft → Review → Scheduled → Published\n- Preview tokens\n- Widgets\n\n> Replace this with real writing when ready.\n""",
            },
            {
                "title": "On Tags and Taxonomy",
                "slug": "on-tags-and-taxonomy",
                "dek": "Tags are cheap. Information architecture is not.",
                "category": "technology",
                "series": None,
                "authors": ["john-smith"],
                "tags": ["publishing", "ai"],
                "body_md": """# On Tags and Taxonomy\n\nThis article exists to exercise tag hubs and sitemap coverage.\n""",
            },
        ]

        created_articles = 0
        updated_articles = 0

        for spec in articles:
            article, created = Article.objects.get_or_create(
                slug=spec["slug"],
                defaults={
                    "title": spec["title"],
                    "dek": spec["dek"],
                    "body_md": spec["body_md"],
                    "status": ArticleStatus.PUBLISHED,
                    "publish_at": now,
                    "published_at": now,
                    "category": cat_by_slug.get(spec["category"]) if spec.get("category") else None,
                    "series": series_by_slug.get(spec["series"]) if spec.get("series") else None,
                },
            )

            if created:
                created_articles += 1
            else:
                updated_articles += 1
                article.title = spec["title"]
                article.dek = spec["dek"]
                article.body_md = spec["body_md"]
                article.status = ArticleStatus.PUBLISHED
                article.publish_at = article.publish_at or now
                article.published_at = article.published_at or now
                article.category = cat_by_slug.get(spec["category"]) if spec.get("category") else None
                article.series = series_by_slug.get(spec["series"]) if spec.get("series") else None
                article.save()

            # M2M
            article.authors.set([author_by_slug[s] for s in spec.get("authors", []) if s in author_by_slug])
            article.tags.set([tag_by_slug[s] for s in spec.get("tags", []) if s in tag_by_slug])

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded demo content: "
                f"categories={len(cat_by_slug)}, authors={len(author_by_slug)}, series={len(series_by_slug)}, tags={len(tag_by_slug)}, "
                f"articles_created={created_articles}, articles_updated={updated_articles}"
            )
        )
