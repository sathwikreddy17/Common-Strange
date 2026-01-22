import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ArticleEvents from "@/app/[slug]/ArticleEvents";

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

type Tag = {
  name: string;
  slug: string;
};

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
  tags?: Tag[];
  og_image_key: string;
};

async function getOriginForServerFetch(): Promise<string> {
  // In Next.js server components, Node's fetch requires an absolute URL.
  // Build it from the incoming request headers so it works in Docker and locally.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function apiUrl(path: string, origin?: string) {
  // On the server we must use an absolute URL; in the browser a relative URL is fine.
  if (origin) return `${origin}${path}`;
  return path;
}

async function fetchArticle(slug: string, previewToken?: string): Promise<PublicArticleDetail | null> {
  const origin = await getOriginForServerFetch();
  const url = apiUrl(`/v1/articles/${encodeURIComponent(slug)}/`, origin);
  const fullUrl = previewToken ? `${url}?preview_token=${encodeURIComponent(previewToken)}` : url;

  const res = await fetch(fullUrl, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load article: ${res.status}`);

  return (await res.json()) as PublicArticleDetail;
}

async function fetchRelatedArticleById(id: number): Promise<PublicArticleListItem | null> {
  const origin = await getOriginForServerFetch();
  const res = await fetch(apiUrl(`/v1/articles/`, origin), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const items = (await res.json()) as PublicArticleListItem[];
  return items.find((x) => x.id === id) ?? null;
}

function PullQuote({ widget }: { widget: PullQuoteWidget }) {
  return (
    <figure className="my-10 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5">
      <blockquote className="text-lg font-medium leading-relaxed text-zinc-900">“{widget.text}”</blockquote>
      {widget.attribution ? (
        <figcaption className="mt-3 text-sm text-zinc-600">— {widget.attribution}</figcaption>
      ) : null}
    </figure>
  );
}

function RelatedCard({ related }: { related: PublicArticleListItem }) {
  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Related</div>
      <Link className="mt-3 block" href={`/${related.slug}`}>
        <div className="text-base font-semibold text-zinc-900 hover:underline">{related.title}</div>
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

  const canonical = `/${encodeURIComponent(article.slug)}`;
  const ogImageUrl = article.og_image_key ? `/v1/media/${encodeURIComponent(article.og_image_key)}` : undefined;

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
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: article.title,
      description: article.dek || undefined,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

function formatDateShort(iso: string): string {
  // Avoid locale surprises like mm/dd vs dd/mm by sticking to a stable, readable format.
  // Example: Jan 22, 2026
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  if (isReservedSlug(slug)) notFound();

  const { preview_token } = await searchParams;
  const previewToken = Array.isArray(preview_token) ? preview_token[0] : preview_token;

  const article = await fetchArticle(slug, previewToken);
  if (!article) notFound();

  const canonicalUrl = `/${encodeURIComponent(article.slug)}`;
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
    author: article.authors?.length ? article.authors.map((a) => ({ "@type": "Person", name: a.name })) : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `/` },
      ...(article.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: article.category.name,
              item: `/?category=${encodeURIComponent(article.category.slug)}`,
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

  const relatedCards = relatedCardWidgets
    .map((w) => relatedById.get(w.articleId))
    .filter(Boolean) as PublicArticleListItem[];

  const hasSidebar = relatedCards.length > 0 || (article.tags?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Blueprint: emit pageview/read events */}
      <ArticleEvents slug={article.slug} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-10">
        <Link className="text-sm text-zinc-600 hover:underline" href="/">
          ← Back
        </Link>
      </div>

      <div className={hasSidebar ? "grid gap-12 lg:grid-cols-[1fr_320px]" : ""}>
        <article className="min-w-0">
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {article.series ? (
                <Link
                  href={`/series/${article.series.slug}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Series: {article.series.name}
                </Link>
              ) : null}

              {article.category ? (
                <Link
                  href={`/categories/${article.category.slug}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {article.category.name}
                </Link>
              ) : null}
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">{article.title}</h1>
            {article.dek ? <p className="mt-4 text-lg leading-relaxed text-zinc-700">{article.dek}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
              {article.authors.length ? <span>{article.authors.map((x) => x.name).join(", ")}</span> : null}
              {publishedTime ? (
                <>
                  {article.authors.length ? <span aria-hidden>·</span> : null}
                  <time dateTime={publishedTime}>Published {formatDateShort(publishedTime)}</time>
                </>
              ) : null}
            </div>
          </header>

          {article.body_html ? (
            <section
              className="prose prose-zinc max-w-none lg:prose-lg"
              // body_html is rendered server-side with escaping enabled
              dangerouslySetInnerHTML={{ __html: article.body_html }}
            />
          ) : article.body_md ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm">
              {article.body_md}
            </pre>
          ) : (
            <p className="text-zinc-600">(No body yet)</p>
          )}

          {widgets.length ? (
            <section className="mt-12">
              {widgets.map((w, idx) => {
                if (w.type === "pull_quote") {
                  return <PullQuote key={idx} widget={w} />;
                }
                // related cards are rendered in the sidebar; keep unknown widgets visible for debugging.
                if (w.type === "related_card") return null;

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

        {hasSidebar ? (
          <aside className="space-y-6">
            {article.tags && article.tags.length ? (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {article.tags.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/tags/${t.slug}`}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      #{t.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedCards.length ? (
              <section className="space-y-3">
                {relatedCards.map((r) => (
                  <RelatedCard key={r.slug} related={r} />
                ))}
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* footer meta */}
      {modifiedTime ? <div className="mt-10 text-xs text-zinc-500">Updated {formatDateShort(modifiedTime)}</div> : null}
    </main>
  );
}
