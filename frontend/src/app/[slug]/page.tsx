import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ArticleEvents from "@/app/[slug]/ArticleEvents";
import ShareActions from "./ShareActions";
import SaveArticleButton from "./SaveArticleButton";
import EditArticleLink from "./EditArticleLink";
import TableOfContents, { type TocItem } from "./TableOfContents";
import RelatedArticles from "./RelatedArticles";
import SeriesNavigation, { type SeriesNavData } from "./SeriesNavigation";

type PullQuoteWidget = {
  type: "pull_quote";
  text: string;
  attribution?: string | null;
};

type RelatedCardWidget = {
  type: "related_card";
  articleId: number;
};

type YouTubeWidget = {
  type: "youtube";
  videoId: string;
  title?: string | null;
  caption?: string | null;
};

type GalleryWidget = {
  type: "gallery";
  mediaIds: number[];
  title?: string | null;
  caption?: string | null;
};

type ImageWidget = {
  type: "image";
  mediaId: number;
  altText?: string | null;
  caption?: string | null;
};

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

type Tag = {
  name: string;
  slug: string;
};

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
  id: number;
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
  hero_image?: HeroImage | null;
  reading_time_minutes?: number;
};

type MediaAsset = {
  id: number;
  thumb_key: string;
  medium_key: string;
  large_key: string;
  original_key: string;
  thumb_url?: string;
  medium_url?: string;
  large_url?: string;
  original_url?: string;
  width?: number | null;
  height?: number | null;
  caption: string;
  credit: string;
  alt_text: string;
  mime_type: string;
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

async function fetchRelatedArticlesByIds(ids: number[]): Promise<Map<number, PublicArticleListItem>> {
  const unique = Array.from(new Set(ids)).filter((x) => Number.isFinite(x));
  const out = new Map<number, PublicArticleListItem>();
  if (!unique.length) return out;

  const origin = await getOriginForServerFetch();
  const qs = new URLSearchParams({ ids: unique.join(",") });
  const res = await fetch(apiUrl(`/v1/articles/by-ids/?${qs.toString()}`, origin), { next: { revalidate: 60 } });
  if (!res.ok) return out;
  const data = (await res.json()) as unknown;
  // Handle paginated response
  let items: PublicArticleListItem[];
  if (data && typeof data === 'object' && 'results' in data) {
    items = (data as { results: PublicArticleListItem[] }).results;
  } else {
    items = Array.isArray(data) ? (data as PublicArticleListItem[]) : [];
  }

  for (const it of items) out.set(it.id, it);
  return out;
}

async function fetchMediaAsset(id: number): Promise<MediaAsset | null> {
  const origin = await getOriginForServerFetch();
  const res = await fetch(apiUrl(`/v1/media-assets/${encodeURIComponent(String(id))}/`, origin), {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { media?: MediaAsset };
  return data?.media ?? null;
}

async function fetchMediaAssetsByIds(ids: number[]): Promise<Map<number, MediaAsset>> {
  const unique = Array.from(new Set(ids)).filter((x) => Number.isFinite(x));
  const out = new Map<number, MediaAsset>();
  await Promise.all(
    unique.map(async (id) => {
      const m = await fetchMediaAsset(id);
      if (m) out.set(id, m);
    }),
  );
  return out;
}

type RelatedArticleItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  category: { name: string; slug: string } | null;
  authors: Array<{ name: string; slug: string }>;
  hero_image?: HeroImage | null;
  reading_time_minutes?: number;
};

async function fetchRelatedArticles(slug: string): Promise<RelatedArticleItem[]> {
  try {
    const origin = await getOriginForServerFetch();
    const res = await fetch(apiUrl(`/v1/articles/${encodeURIComponent(slug)}/related/?limit=4`, origin), {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchSeriesNav(slug: string): Promise<SeriesNavData | null> {
  try {
    const origin = await getOriginForServerFetch();
    const res = await fetch(apiUrl(`/v1/articles/${encodeURIComponent(slug)}/series-nav/`, origin), {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SeriesNavData;
  } catch {
    return null;
  }
}

/**
 * Extract headings from rendered HTML for the table of contents.
 * Looks for h2 and h3 tags and generates stable IDs.
 */
function extractTocFromHtml(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])[^>]*>([^<]+)<\/h[23]>/gi;
  let match;
  const slugCounts = new Map<string, number>();

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].trim();
    if (!text) continue;

    // Generate a stable slug-based ID
    const baseId = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);

    // Deduplicate
    const count = slugCounts.get(baseId) || 0;
    slugCounts.set(baseId, count + 1);
    const id = count > 0 ? `${baseId}-${count}` : baseId;

    items.push({ id, text, level });
  }

  return items;
}

/**
 * Inject anchor IDs into rendered HTML headings so the ToC links work.
 */
function injectHeadingIds(html: string, tocItems: TocItem[]): string {
  let idx = 0;
  return html.replace(/<h([23])([^>]*)>/gi, (fullMatch, level, attrs) => {
    if (idx < tocItems.length) {
      const item = tocItems[idx];
      idx++;
      // Check if id already exists in attrs
      if (/id=/.test(attrs)) return fullMatch;
      return `<h${level}${attrs} id="${item.id}">`;
    }
    return fullMatch;
  });
}

function pickBestMediaUrl(origin: string, m: MediaAsset | undefined): string | null {
  if (!m) return null;
  const url = m.medium_url || m.large_url || m.thumb_url || m.original_url;
  if (!url) return null;
  // Backend may return relative URLs; normalize to absolute for SSR safety.
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function PullQuote({ widget }: { widget: PullQuoteWidget }) {
  return (
    <figure className="my-10 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-700 dark:bg-zinc-900">
      <blockquote className="text-lg font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">“{widget.text}”</blockquote>
      {widget.attribution ? (
        <figcaption className="mt-3 text-sm text-zinc-600">— {widget.attribution}</figcaption>
      ) : null}
    </figure>
  );
}

function RelatedCard({ related }: { related: PublicArticleListItem }) {
  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Related</div>
      <Link className="mt-3 block" href={`/${related.slug}`}>
        <div className="text-base font-semibold text-zinc-900 hover:underline">{related.title}</div>
        {related.dek ? <div className="mt-1 text-sm text-zinc-600">{related.dek}</div> : null}
      </Link>
    </aside>
  );
}

function YouTubeEmbed({ widget }: { widget: YouTubeWidget }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(widget.videoId)}`;
  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={src}
            title={widget.title ?? "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
      {widget.caption ? (
        <figcaption className="mt-3 text-sm text-zinc-600">{widget.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function Gallery({ widget, origin, mediaById }: { widget: GalleryWidget; origin: string; mediaById: Map<number, MediaAsset> }) {
  const ids = Array.isArray(widget.mediaIds) ? widget.mediaIds : [];

  return (
    <section className="my-10 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Gallery</div>
          {widget.title ? <h3 className="mt-1 text-base font-semibold text-zinc-900">{widget.title}</h3> : null}
        </div>
        <div className="text-xs text-zinc-500">{ids.length} items</div>
      </div>

      {widget.caption ? <div className="mt-3 text-sm text-zinc-600">{widget.caption}</div> : null}

      {ids.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ids.map((id) => {
            const m = mediaById.get(id);
            const src = pickBestMediaUrl(origin, m);

            return (
              <li key={id} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={m?.alt_text || m?.caption || `Media ${id}`}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-zinc-500">Missing media #{id}</div>
                )}
                {m?.caption || m?.credit ? (
                  <div className="space-y-1 p-3">
                    {m.caption ? <div className="text-sm text-zinc-700">{m.caption}</div> : null}
                    {m.credit ? <div className="text-xs text-zinc-500">{m.credit}</div> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 text-sm text-zinc-600">(Empty gallery)</div>
      )}
    </section>
  );
}

function ImageEmbed({ widget, origin, mediaById }: { widget: ImageWidget; origin: string; mediaById: Map<number, MediaAsset> }) {
  const m = mediaById.get(widget.mediaId);
  const src = pickBestMediaUrl(origin, m);
  const alt = widget.altText || m?.alt_text || m?.caption || `Media ${widget.mediaId}`;

  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-auto w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-zinc-500">Missing media #{widget.mediaId}</div>
        )}
      </div>

      {widget.caption || m?.credit ? (
        <figcaption className="mt-3 space-y-1 text-sm text-zinc-600">
          {widget.caption ? <div>{widget.caption}</div> : null}
          {m?.credit ? <div className="text-xs text-zinc-500">{m.credit}</div> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function EmbedWidgetView({ w }: { w: Extract<Widget, { type: "embed" }> }) {
  const provider = (w.provider || "").trim().toLowerCase();
  const url = (w.url || "").trim();

  const allowed = new Set(["youtube", "vimeo", "spotify", "soundcloud", "substack", "instagram", "tiktok", "x", "twitter"]);
  if (!allowed.has(provider)) return null;
  if (!(url.startsWith("https://") || url.startsWith("http://"))) return null;

  return (
    <figure className="my-8 rounded-2xl border border-zinc-200 bg-white p-4">
      {w.title ? <div className="mb-3 text-sm font-semibold text-zinc-900">{w.title}</div> : null}

      <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-50">
        <iframe
          className="h-full w-full"
          src={url}
          title={w.title || `${provider} embed`}
          allow={provider === "youtube" || provider === "vimeo" ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" : undefined}
          allowFullScreen={provider === "youtube" || provider === "vimeo"}
        />
      </div>

      {w.caption ? <figcaption className="mt-3 text-sm text-zinc-600">{w.caption}</figcaption> : null}
    </figure>
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

  const origin = await getOriginForServerFetch();
  const canonicalPath = `/${encodeURIComponent(article.slug)}`;
  const canonicalUrl = `${origin}${canonicalPath}`;

  const ogImageUrl = article.og_image_key
    ? `${origin}/v1/media/${encodeURIComponent(article.og_image_key)}`
    : undefined;

  return {
    title: `${article.title} | Common Strange`,
    description: article.dek || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
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

  const origin = await getOriginForServerFetch();
  const canonicalPath = `/${encodeURIComponent(article.slug)}`;
  const canonicalUrl = `${origin}${canonicalPath}`;
  const publishedTime = article.published_at ?? undefined;
  const modifiedTime = article.updated_at ?? undefined;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: canonicalUrl,
    headline: article.title,
    description: article.dek || undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    author: article.authors?.length ? article.authors.map((a) => ({ "@type": "Person", name: a.name })) : undefined,
    publisher: {
      "@type": "Organization",
      name: "Common Strange",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      ...(article.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: article.category.name,
              item: `${origin}/?category=${encodeURIComponent(article.category.slug)}`,
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

  const shareUrl = canonicalUrl;
  const shareTitle = article.title;

  const widgets = article.widgets_json?.widgets ?? [];
  const relatedCardWidgets = widgets.filter((w) => w.type === "related_card") as RelatedCardWidget[];

  const galleryWidgets = widgets.filter((w) => w.type === "gallery") as GalleryWidget[];
  const galleryMediaIds = galleryWidgets.flatMap((g) => (Array.isArray(g.mediaIds) ? g.mediaIds : []));

  const imageWidgets = widgets.filter((w) => w.type === "image") as ImageWidget[];
  const imageMediaIds = imageWidgets
    .map((w) => w.mediaId)
    .filter((id) => Number.isFinite(id) && id > 0);

  const mediaById = await fetchMediaAssetsByIds([...galleryMediaIds, ...imageMediaIds]);

  const [relatedById, autoRelatedArticles, seriesNav] = await Promise.all([
    fetchRelatedArticlesByIds(relatedCardWidgets.map((w) => w.articleId)),
    fetchRelatedArticles(article.slug),
    fetchSeriesNav(article.slug),
  ]);

  const relatedCards = relatedCardWidgets
    .map((w) => relatedById.get(w.articleId))
    .filter(Boolean) as PublicArticleListItem[];

  // Extract ToC from rendered HTML
  const tocItems = article.body_html ? extractTocFromHtml(article.body_html) : [];
  const bodyHtmlWithIds = article.body_html && tocItems.length > 0
    ? injectHeadingIds(article.body_html, tocItems)
    : article.body_html;

  const hasSidebar = relatedCards.length > 0 || (article.tags?.length ?? 0) > 0 || tocItems.length >= 2;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Blueprint: emit pageview/read events */}
      <ArticleEvents slug={article.slug} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-10 flex items-center justify-between gap-4">
        <Link className="text-sm text-zinc-600 hover:underline dark:text-zinc-400" href="/">
          ← Back
        </Link>

        <div className="flex items-center gap-2">
          <EditArticleLink articleId={article.id} />
          <SaveArticleButton articleId={article.id} articleSlug={article.slug} />
          <ShareActions title={shareTitle} url={shareUrl} />
          <a
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(
              shareUrl,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Share
          </a>
          <a
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}
          >
            Email
          </a>
        </div>
      </div>

      <div className={hasSidebar ? "grid gap-12 lg:grid-cols-[1fr_320px]" : ""}>
        <article className="min-w-0">
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {article.series ? (
                <Link
                  href={`/series/${article.series.slug}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Series: {article.series.name}
                </Link>
              ) : null}

              {article.category ? (
                <Link
                  href={`/categories/${article.category.slug}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {article.category.name}
                </Link>
              ) : null}
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">{article.title}</h1>
            {article.dek ? <p className="mt-4 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">{article.dek}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              {article.authors.length ? <span>{article.authors.map((x) => x.name).join(", ")}</span> : null}
              {publishedTime ? (
                <>
                  {article.authors.length ? <span aria-hidden>·</span> : null}
                  <time dateTime={publishedTime}>Published {formatDateShort(publishedTime)}</time>
                </>
              ) : null}
              {article.reading_time_minutes ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{article.reading_time_minutes} min read</span>
                </>
              ) : null}
            </div>
          </header>

          {/* Hero Image */}
          {article.hero_image && (article.hero_image.large || article.hero_image.medium || article.hero_image.original) ? (
            <figure className="mb-10 overflow-hidden rounded-2xl">
              <Image
                src={article.hero_image.large || article.hero_image.medium || article.hero_image.original || ""}
                alt={article.hero_image.alt || article.title}
                width={article.hero_image.width || 1200}
                height={article.hero_image.height || 675}
                className="w-full object-cover"
                priority
                unoptimized
              />
            </figure>
          ) : null}

          {article.body_html ? (
            <section
              className="prose prose-zinc max-w-none lg:prose-lg"
              // body_html is rendered server-side with escaping enabled
              dangerouslySetInnerHTML={{ __html: bodyHtmlWithIds || article.body_html }}
            />
          ) : article.body_md ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {article.body_md}
            </pre>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">(No body yet)</p>
          )}

          {widgets.length ? (
            <section className="mt-12">
              {widgets.map((w, idx) => {
                if (w.type === "pull_quote") {
                  return <PullQuote key={idx} widget={w} />;
                }
                if (w.type === "heading") {
                  return <Heading key={idx} w={w} />;
                }
                if (w.type === "divider") {
                  return <Divider key={idx} />;
                }
                if (w.type === "youtube") {
                  return <YouTubeEmbed key={idx} widget={w} />;
                }
                if (w.type === "gallery") {
                  return <Gallery key={idx} widget={w} origin={origin} mediaById={mediaById} />;
                }
                if (w.type === "image") {
                  return <ImageEmbed key={idx} widget={w} origin={origin} mediaById={mediaById} />;
                }
                if (w.type === "embed") return <EmbedWidgetView key={idx} w={w} />;
                if (w.type === "callout") return <Callout key={idx} w={w} />;
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
          <aside className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
            {tocItems.length >= 2 && (
              <TableOfContents items={tocItems} />
            )}

            {article.tags && article.tags.length ? (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {article.tags.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/tags/${t.slug}`}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

      {/* Series prev/next navigation */}
      {seriesNav && seriesNav.series && (
        <SeriesNavigation data={seriesNav} />
      )}

      {/* Auto-recommended related articles */}
      <RelatedArticles articles={autoRelatedArticles} />

      {/* footer meta */}
      {modifiedTime ? <div className="mt-10 text-xs text-zinc-500 dark:text-zinc-400">Updated {formatDateShort(modifiedTime)}</div> : null}
    </main>
  );
}

function Callout({ w }: { w: Extract<Widget, { type: "callout" }> }) {
  const v = (w.variant || "note").toLowerCase();
  const tone =
    v === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : v === "tip"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : "border-blue-200 bg-blue-50 text-blue-950";

  return (
    <aside className={`my-8 rounded-2xl border p-4 ${tone}`}>
      {w.title ? <div className="text-sm font-semibold">{w.title}</div> : null}
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{w.text}</div>
    </aside>
  );
}

function Heading({ w }: { w: Extract<Widget, { type: "heading" }> }) {
  const level = w.level;
  const text = w.text;
  if (level === 2) return <h2 className="mt-10 text-2xl font-semibold tracking-tight text-zinc-900">{text}</h2>;
  if (level === 3) return <h3 className="mt-8 text-xl font-semibold tracking-tight text-zinc-900">{text}</h3>;
  return <h4 className="mt-6 text-lg font-semibold tracking-tight text-zinc-900">{text}</h4>;
}

function Divider() {
  return <hr className="my-10 border-zinc-200" />;
}
