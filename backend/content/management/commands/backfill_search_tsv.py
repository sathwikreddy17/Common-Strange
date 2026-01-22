from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import Article, ArticleStatus
from content.search_index import update_article_search_tsv


class Command(BaseCommand):
    help = "Backfill Article.search_tsv for published content (cron-friendly)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-missing",
            action="store_true",
            help="Only update rows where search_tsv is null.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Max number of articles to process (0 = no limit).",
        )

    def handle(self, *args, **options):
        only_missing: bool = options["only_missing"]
        limit: int = options["limit"]

        qs = Article.objects.filter(status=ArticleStatus.PUBLISHED).order_by("id")
        if only_missing:
            qs = qs.filter(search_tsv__isnull=True)
        if limit and limit > 0:
            qs = qs[:limit]

        total = qs.count() if not (limit and limit > 0) else qs.count()
        self.stdout.write(f"Backfilling search_tsv for {total} published articles...")

        processed = 0
        # Iterate with only minimal fields to keep memory low
        for a in qs.only("id"):
            with transaction.atomic():
                # Refetch full row inside transaction (safe if row got deleted)
                article = Article.objects.get(pk=a.pk)
                update_article_search_tsv(article=article)
            processed += 1
            if processed % 100 == 0:
                self.stdout.write(f"... {processed} done")

        self.stdout.write(self.style.SUCCESS(f"Done. Updated {processed} articles."))
