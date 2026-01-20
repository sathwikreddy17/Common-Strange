"use client";

import ArticleEditForm from "./edit-form";
import TaxonomyForm from "./taxonomy-form";
import WidgetsForm from "./widgets-form";

type Widget =
  | { type: "pull_quote"; text: string; attribution?: string | null }
  | { type: "related_card"; articleId: number };

type SlugObj = { slug: string };

function hasSlug(x: unknown): x is SlugObj {
  return !!x && typeof x === "object" && "slug" in x && typeof (x as { slug?: unknown }).slug === "string";
}

function isWidgetContainer(x: unknown): x is { widgets: unknown[] } {
  return !!x && typeof x === "object" && "widgets" in x && Array.isArray((x as { widgets?: unknown }).widgets);
}

function isWidget(x: unknown): x is Widget {
  if (!x || typeof x !== "object" || !("type" in x)) return false;
  const t = String((x as { type?: unknown }).type);
  if (t === "pull_quote") {
    return typeof (x as { text?: unknown }).text === "string";
  }
  if (t === "related_card") {
    return typeof (x as { articleId?: unknown }).articleId === "number";
  }
  return false;
}

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
    category: hasSlug(article.category) ? { slug: article.category.slug } : null,
    series: hasSlug(article.series) ? { slug: article.series.slug } : null,
    authors: Array.isArray(article.authors) ? article.authors.filter(hasSlug).map((a) => ({ slug: a.slug })) : [],
    tags: Array.isArray(article.tags) ? article.tags.filter(hasSlug).map((t) => ({ slug: t.slug })) : [],
  };

  let widgets: Widget[] = [];
  if (isWidgetContainer(article.widgets_json)) {
    widgets = article.widgets_json.widgets.filter(isWidget);
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
