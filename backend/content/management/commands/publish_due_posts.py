from django.core.management.base import BaseCommand
from django.utils import timezone

from content.models import Article, ArticleStatus, ArticleVersion, ArticleVersionKind
from content.tasks import generate_og_image_for_article


def _snapshot(article: Article, *, kind: str):
    ArticleVersion.objects.create(
        article=article,
        kind=kind,
        title=article.title,
        slug=article.slug,
        dek=article.dek,
        body_md=article.body_md,
        widgets_json=article.widgets_json,
        category=article.category,
        series=article.series,
        hero_media=article.hero_media,
        created_by=None,
    )


class Command(BaseCommand):
    help = "Publish articles whose publish_at is due (cron-compatible)."

    def handle(self, *args, **options):
        now = timezone.now()
        due = Article.objects.filter(
            status=ArticleStatus.SCHEDULED,
            publish_at__isnull=False,
            publish_at__lte=now,
        )

        count = 0
        for article in due:
            article.status = ArticleStatus.PUBLISHED
            article.published_at = now
            article.save()
            _snapshot(article, kind=ArticleVersionKind.PUBLISH)

            # Publish-time OG generation (async). Safe to call even if the worker
            # is not running; the publish itself should never fail.
            generate_og_image_for_article.delay(article.id)

            count += 1

        self.stdout.write(self.style.SUCCESS(f"Published {count} due article(s)."))
