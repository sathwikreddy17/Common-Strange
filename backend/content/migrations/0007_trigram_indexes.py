"""Add trigram indexes for typo-tolerant search.

Blueprint requirement: trigram indexes for fuzzy matching.
"""

from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0006_curated_modules"),
    ]

    operations = [
        # Enable pg_trgm extension (idempotent if already installed)
        TrigramExtension(),
        # Add trigram GIN index on article title for fuzzy search
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS article_title_trgm_gin
                ON content_article USING gin (title gin_trgm_ops);
            """,
            reverse_sql="DROP INDEX IF EXISTS article_title_trgm_gin;",
        ),
        # Add trigram GIN index on article dek for fuzzy search
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS article_dek_trgm_gin
                ON content_article USING gin (dek gin_trgm_ops);
            """,
            reverse_sql="DROP INDEX IF EXISTS article_dek_trgm_gin;",
        ),
    ]
