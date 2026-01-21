from __future__ import annotations

from django.contrib.postgres.search import SearchVector

from .models import Article


def build_article_search_vector() -> SearchVector:
    # Blueprint: title + dek + body_md + tags.
    return (
        SearchVector("title", weight="A")
        + SearchVector("dek", weight="B")
        + SearchVector("body_md", weight="C")
        + SearchVector("tags__name", weight="B")
    )


def update_article_search_tsv(*, article: Article) -> None:
    """Persist `Article.search_tsv` for the given article.

    Note: `search_tsv` is currently a TextField in the PoC schema. We store the
    canonical search document text. Later we can migrate this to a proper
    tsvector column without changing call sites.
    """

    tags = list(article.tags.values_list("name", flat=True))
    parts = [article.title or "", article.dek or "", article.body_md or "", " ".join(tags)]
    article.search_tsv = "\n\n".join([p for p in parts if p]).strip()
    article.save(update_fields=["search_tsv", "updated_at"])
