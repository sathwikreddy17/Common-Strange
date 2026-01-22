from __future__ import annotations

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0004_search_phase1_indexes"),
    ]

    operations = [
        # Blueprint Phase 1: convert placeholder `search_tsv` column into a real
        # Postgres tsvector and add a GIN index.
        #
        # Earlier PoC versions had `search_tsv` as a TextField. This migration is
        # written to be resilient.
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
              -- If the column exists and is not tsvector, convert it.
              IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='content_article'
                  AND column_name='search_tsv'
                  AND data_type <> 'tsvector'
              ) THEN
                ALTER TABLE content_article
                  ALTER COLUMN search_tsv TYPE tsvector
                  USING to_tsvector('english', coalesce(search_tsv, ''));
              END IF;

              -- Ensure the column is nullable. Some earlier migrations/DB states
              -- may have ended up with NOT NULL, which breaks tests and creates.
              ALTER TABLE content_article
                ALTER COLUMN search_tsv DROP NOT NULL;
            END $$;
            """,
            reverse_sql="""
            -- Intentionally no reverse: converting back to text is lossy.
            """,
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS content_article_search_tsv_gin_idx ON content_article USING GIN (search_tsv);",
            reverse_sql="DROP INDEX IF EXISTS content_article_search_tsv_gin_idx;",
        ),
    ]
