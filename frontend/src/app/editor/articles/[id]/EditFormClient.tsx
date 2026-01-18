"use client";

import ArticleEditForm from "./edit-form";
import TaxonomyForm from "./taxonomy-form";
import WidgetsForm from "./widgets-form";

type EditorialArticleDetail = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  body_md: string;
  widgets_json: unknown;
  status: string;
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
  category: unknown;
  series: unknown;
  authors: unknown[];
  tags?: unknown[];
  og_image_key: string;
};

type Props = {
  article: EditorialArticleDetail;
};

export default function EditFormClient({ article }: Props) {
  // Normalize taxonomy fields for TaxonomyForm
  const normalized = {
    id: article.id,
    category:
      article.category && typeof article.category === "object" && "slug" in article.category
        ? { slug: String((article.category as any).slug) }
        : null,
    series:
      article.series && typeof article.series === "object" && "slug" in article.series
        ? { slug: String((article.series as any).slug) }
        : null,
    authors: Array.isArray(article.authors)
      ? article.authors
          .filter((a) => a && typeof a === "object" && "slug" in a)
          .map((a) => ({ slug: String((a as any).slug) }))
      : [],
    tags: Array.isArray(article.tags)
      ? article.tags
          .filter((t) => t && typeof t === "object" && "slug" in t)
          .map((t) => ({ slug: String((t as any).slug) }))
      : [],
  };

  let widgets: any[] = [];
  if (
    article.widgets_json &&
    typeof article.widgets_json === "object" &&
    "widgets" in article.widgets_json &&
    Array.isArray((article.widgets_json as any).widgets)
  ) {
    widgets = (article.widgets_json as any).widgets;
  }

  return (
    <>
      <ArticleEditForm article={article} />
      <div className="mt-10">
        <TaxonomyForm article={normalized} />
      </div>
      <div className="mt-10">
        <WidgetsForm id={article.id} widgets={widgets} />
      </div>
    </>
  );
}
