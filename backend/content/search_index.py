from __future__ import annotations

from django.contrib.postgres.search import SearchVector
from django.db.models import OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.contrib.postgres.aggregates import StringAgg
from django.db.models import TextField

from .models import Article


def build_article_search_vector() -> SearchVector:
    # Blueprint: title + dek + body_md + tags.
    # Note: in UPDATE queries Django forbids joined field references; tags are
    # injected via a Subquery in `update_article_search_tsv`.
    return (
        SearchVector("title", weight="A")
        + SearchVector("dek", weight="B")
        + SearchVector("body_md", weight="C")
        + SearchVector("_tags_text", weight="B")
    )


def update_article_search_tsv(*, article: Article) -> None:
    """Persist `Article.search_tsv` for the given article.

    Blueprint Phase 1: `search_tsv` is a real Postgres tsvector column.

    Because tags are M2M, we materialize them via an aggregation subquery so the
    UPDATE does not require joins.
    """

    tags_text = (
        Article.objects.filter(pk=OuterRef("pk"))
        .annotate(
            _tags_text=Coalesce(
                StringAgg("tags__name", delimiter=" ", distinct=True),
                Value(""),
                output_field=TextField(),
            )
        )
        .values("_tags_text")[:1]
    )

    vector = build_article_search_vector()

    (
        Article.objects.filter(pk=article.pk)
        .annotate(_tags_text=Subquery(tags_text))
        .update(search_tsv=vector)
    )
