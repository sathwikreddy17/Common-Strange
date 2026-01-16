import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type PullQuoteWidget = {
  type: "pull_quote";
  text: string;
  attribution?: string | null;
};

type RelatedCardWidget = {
  type: "related_card";
  articleId: number;
};

type Widget = PullQuoteWidget | RelatedCardWidget;

type PublicArticleListItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  updated_at: string;
  category: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
};

type PublicArticleDetail = {
  title: string;
  slug: string;
  dek: string;
  body_md: string;
  body_html?: string;
  widgets_json: { widgets: Widget[] };
  status: string;
  publish_at: string | null;
  published_at: string | null;
  updated_at: string;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
  og_image_key: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchArticle(slug: string, previewToken?: string): Promise<PublicArticleDetail | null> {
  const url = new URL(`${API_BASE}/v1/articles/${encodeURIComponent(slug)}/`);
  if (previewToken) url.searchParams.set("preview_token", previewToken);

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load article: ${res.status}`);

  return (await res.json()) as PublicArticleDetail;
}

async function fetchRelatedArticleById(id: number): Promise<PublicArticleListItem | null> {
  // PoC-friendly approach: use list endpoint and find by id.
  // (We can add a dedicated endpoint later if needed.)
  const url = new URL(`${API_BASE}/v1/articles/`);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const items = (await res.json()) as PublicArticleListItem[];
  return items.find((x) => x.id === id) ?? null;
}

function PullQuote({ widget }: { widget: PullQuoteWidget }) {
  return (
    <figure className="my-10 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5">
      <blockquote className="text-lg font-medium leading-relaxed text-zinc-900">
        “{widget.text}”
      </blockquote>
      {widget.attribution ? (
        <figcaption className="mt-3 text-sm text-zinc-600">— {widget.attribution}</figcaption>
      ) : null}
    </figure>
  );
}

function RelatedCard({ related }: { related: PublicArticleListItem }) {
  return (
    <aside className="my-10 rounded-2xl border border-zinc-200 p-6">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Related</div>
      <Link className="mt-2 block hover:underline" href={`/${related.slug}`}>
        <div className="text-lg font-semibold text-zinc-900">{related.title}</div>
        {related.dek ? <div className="mt-1 text-sm text-zinc-600">{related.dek}</div> : null}
      </Link>
    </aside>
  );
}

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "static",
  "media",
  "assets",
  "dashboard",
  "login",
  "logout",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "_next",
]);

function isReservedSlug(slug: string): boolean {
  const s = (slug ?? "").toLowerCase();
  return RESERVED_SLUGS.has(s) || s.startsWith("_next");
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview_token?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSlug(slug)) return {};

  const { preview_token } = await searchParams;
  const article = await fetchArticle(slug, preview_token);
  if (!article) return {};

  const canonical = `${SITE_URL}/${encodeURIComponent(article.slug)}`;

  return {
    title: `${article.title} | Common Strange`,
    description: article.dek || undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.title,
      description: article.dek || undefined,
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview_token?: string }>;
}) {
  const { slug } = await params;

  if (isReservedSlug(slug)) notFound();

  const { preview_token } = await searchParams;

  const article = await fetchArticle(slug, preview_token);
  if (!article) notFound();

  const canonicalUrl = `${SITE_URL}/${encodeURIComponent(article.slug)}`;
  const publishedTime = article.published_at ?? undefined;
  const modifiedTime = article.updated_at ?? undefined;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek || undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    mainEntityOfPage: canonicalUrl,
    author: article.authors?.length
      ? article.authors.map((a) => ({ "@type": "Person", name: a.name }))
      : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      ...(article.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: article.category.name,
              item: `${SITE_URL}/?category=${encodeURIComponent(article.category.slug)}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: article.category ? 3 : 2,
        name: article.title,
        item: canonicalUrl,
      },
    ],
  };

  const widgets = article.widgets_json?.widgets ?? [];
  const relatedCardWidgets = widgets.filter((w) => w.type === "related_card") as RelatedCardWidget[];

  const relatedByIdEntries = await Promise.all(
    relatedCardWidgets.map(async (w) => [w.articleId, await fetchRelatedArticleById(w.articleId)] as const),
  );
  const relatedById = new Map<number, PublicArticleListItem>();
  for (const [id, maybe] of relatedByIdEntries) {
    if (maybe) relatedById.set(id, maybe);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/">
          Back
        </Link>
      </div>

      <article>
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">{article.title}</h1>
          {article.dek ? <p className="mt-4 text-lg text-zinc-700">{article.dek}</p> : null}
          <div className="mt-4 text-sm text-zinc-500">
            {article.category ? <span>{article.category.name}</span> : null}
            {article.category && article.authors.length ? <span> · </span> : null}
            {article.authors.length ? (
              <span>{article.authors.map((x) => x.name).join(", ")}</span>
            ) : null}
          </div>
        </header>

        {article.body_html ? (
          <section
            className="prose prose-zinc max-w-none"
            // body_html is rendered server-side with escaping enabled
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />
        ) : article.body_md ? (
          <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm">
            {article.body_md}
          </pre>
        ) : (
          <p className="text-zinc-600">(No body yet)</p>
        )}

        {widgets.length ? (
          <section className="mt-10">
            {widgets.map((w, idx) => {
              if (w.type === "pull_quote") {
                return <PullQuote key={idx} widget={w} />;
              }
              if (w.type === "related_card") {
                const related = relatedById.get(w.articleId);
                return related ? (
                  <RelatedCard key={idx} related={related} />
                ) : (
                  <pre
                    key={idx}
                    className="my-10 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm"
                  >
                    {JSON.stringify(w, null, 2)}
                  </pre>
                );
              }
              return (
                <pre
                  key={idx}
                  className="my-10 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm"
                >
                  {JSON.stringify(w, null, 2)}
                </pre>
              );
            })}
          </section>
        ) : null}
      </article>
    </main>
  );
}
