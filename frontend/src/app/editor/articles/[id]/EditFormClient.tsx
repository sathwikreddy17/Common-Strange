"use client";

import ArticleEditForm from "./edit-form";
import TaxonomyForm from "./taxonomy-form";
import WidgetsForm from "./widgets-form";
import HeroImageForm from "./hero-image-form";

type Widget =
  | { type: "pull_quote"; text: string; attribution?: string | null }
  | { type: "related_card"; articleId: number }
  | { type: "youtube"; videoId: string; title?: string | null; caption?: string | null }
  | { type: "gallery"; mediaIds: number[]; title?: string | null; caption?: string | null }
  | { type: "image"; mediaId: number; altText?: string | null; caption?: string | null }
  | { type: "embed"; provider: string; url: string; title?: string | null; caption?: string | null }
  | { type: "callout"; variant: "note" | "tip" | "warning"; title?: string | null; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "divider" };

type SlugObj = { slug: string };

function hasSlug(x: unknown): x is SlugObj {
  return !!x && typeof x === "object" && "slug" in x && typeof (x as { slug?: unknown }).slug === "string";
}

function isWidgetContainer(x: unknown): x is { widgets: unknown[] } {
  return !!x && typeof x === "object" && "widgets" in x && Array.isArray((x as { widgets?: unknown }).widgets);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object";
}

function isWidget(x: unknown): x is Widget {
  if (!isObject(x)) return false;
  const t = x.type;
  if (t === "pull_quote") {
    return typeof x.text === "string";
  }
  if (t === "related_card") {
    return typeof x.articleId === "number";
  }
  if (t === "youtube") {
    return typeof x.videoId === "string";
  }
  if (t === "gallery") {
    return Array.isArray(x.mediaIds);
  }
  if (t === "image") {
    return typeof x.mediaId === "number";
  }
  if (t === "embed") {
    return typeof x.provider === "string" && typeof x.url === "string";
  }
  if (t === "callout") {
    return typeof x.variant === "string" && typeof x.text === "string";
  }
  if (t === "heading") {
    return (x.level === 2 || x.level === 3 || x.level === 4) && typeof x.text === "string";
  }
  if (t === "divider") {
    return true;
  }
  return false;
}

type HeroImage = {
  id: number;
  thumb: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

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
  hero_image?: HeroImage | null;
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
      <div className="mt-10 rounded-lg border border-zinc-200 p-5">
        <HeroImageForm 
          articleId={article.id} 
          currentHeroImage={article.hero_image}
        />
      </div>
      <div className="mt-10">
        <TaxonomyForm article={normalized} />
      </div>
      <div className="mt-10">
        <WidgetsForm id={article.id} widgets={widgets} />
      </div>
    </>
  );
}
