from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from content.models import Event


class Command(BaseCommand):
    help = "Prune old Event rows (cron-friendly)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="How many days of events to keep (default: 90)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only print how many rows would be deleted.",
        )

    def handle(self, *args, **options):
        days: int = options["days"]
        dry_run: bool = options["dry_run"]

        if days <= 0:
            self.stderr.write(self.style.ERROR("--days must be a positive integer"))
            return

        cutoff = timezone.now() - timedelta(days=days)
        qs = Event.objects.filter(created_at__lt=cutoff)
        count = qs.count()

        if dry_run:
            self.stdout.write(f"Would delete {count} events older than {days} days (cutoff={cutoff.isoformat()})")
            return

        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Deleted {deleted} events older than {days} days (cutoff={cutoff.isoformat()})"
        ))
