from __future__ import annotations

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0003_event"),
    ]

    operations = [
        # Blueprint: enable trigram matching for typo tolerance.
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="-- no-op",
        ),
        # Blueprint Phase 1: trigram indexes for partial/typo matching.
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS content_article_title_trgm_idx ON content_article USING GIN (title gin_trgm_ops);",
            reverse_sql="DROP INDEX IF EXISTS content_article_title_trgm_idx;",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS content_article_slug_trgm_idx ON content_article USING GIN (slug gin_trgm_ops);",
            reverse_sql="DROP INDEX IF EXISTS content_article_slug_trgm_idx;",
        ),
    ]
