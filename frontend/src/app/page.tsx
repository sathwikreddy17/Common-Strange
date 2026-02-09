import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { getApiUrl } from "@/lib/config";
import { HomeShell } from "./_components/HomeShell";
import { Footer } from "./_components/Footer";
import { NewsletterCTA } from "./_components/NewsletterCTA";

// ----- Revalidate every 60 seconds (ISR) -----
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Common Strange — Ideas that expand your perspective",
  description:
    "Long-form essays, thoughtful analysis, and stories that matter. Explore categories, series, and authors.",
};

// ----- Types -----

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
  updated_at: string;
  published_at: string | null;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
  hero_image?: HeroImage | null;
  reading_time_minutes?: number;
};

type TrendingItem = {
  id: number;
  slug: string;
  title: string;
  dek?: string;
  category?: { name: string; slug: string } | null;
  authors?: Array<{ name: string; slug: string }>;
  published_at?: string | null;
};

type CuratedModuleItem = {
  id: number;
  order: number;
  item_type: "ARTICLE" | "CATEGORY" | "SERIES" | "AUTHOR";
  override_title: string;
  override_dek: string;
  article: { id: number; title: string; slug: string; dek: string } | null;
  category: { name: string; slug: string; description?: string } | null;
  series: { name: string; slug: string; description?: string } | null;
  author: { name: string; slug: string; bio?: string } | null;
};

type CuratedModule = {
  id: number;
  placement: "HOME" | "CATEGORY" | "SERIES" | "AUTHOR";
  title: string;
  subtitle: string;
  order: number;
  is_active: boolean;
  items: CuratedModuleItem[];
};

// ----- Date helper -----

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ----- Server-side data fetching -----

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  results: T[];
};

function extractResults<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "results" in data) return data.results;
  return [];
}

async function fetchArticles(): Promise<PublicArticleListItem[]> {
  try {
    const url = getApiUrl("v1/articles/?status=published");
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return extractResults(data);
  } catch {
    return [];
  }
}

async function fetchTrending(): Promise<TrendingItem[]> {
  try {
    const url = getApiUrl("v1/trending?limit=10");
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchCuratedModules(): Promise<CuratedModule[]> {
  try {
    const url = getApiUrl("v1/home/modules/");
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ----- Pure UI components (server-rendered) -----

function HeroSection({ article }: { article: PublicArticleListItem }) {
  const heroSrc = article.hero_image?.large || article.hero_image?.original;

  return (
    <section className="relative">
      {heroSrc ? (
        <div className="relative h-[70vh] min-h-[500px]">
          <Image
            src={heroSrc}
            alt={article.hero_image?.alt || article.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="mx-auto max-w-7xl">
              {article.category && (
                <Link
                  href={`/categories/${article.category.slug}`}
                  className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors"
                >
                  {article.category.name}
                </Link>
              )}
              <Link href={`/${article.slug}`} className="group block">
                <h2 className="font-serif text-3xl font-bold text-white md:text-5xl lg:text-6xl leading-tight group-hover:text-white/90 transition-colors">
                  {article.title}
                </h2>
              </Link>
              {article.dek && (
                <p className="mt-4 max-w-2xl text-lg text-white/80 leading-relaxed">
                  {article.dek}
                </p>
              )}
              <div className="mt-6 flex items-center gap-4 text-sm text-white/70">
                {article.authors?.length > 0 && (
                  <span className="font-medium text-white/90">
                    {article.authors.map((a) => a.name).join(", ")}
                  </span>
                )}
                {article.published_at && <span>{formatDate(article.published_at)}</span>}
                {article.reading_time_minutes && (
                  <span>{article.reading_time_minutes} min read</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-7xl">
            {article.category && (
              <Link
                href={`/categories/${article.category.slug}`}
                className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {article.category.name}
              </Link>
            )}
            <Link href={`/${article.slug}`} className="group block">
              <h2 className="font-serif text-4xl font-bold text-zinc-900 md:text-5xl lg:text-6xl leading-tight group-hover:text-zinc-600 transition-colors">
                {article.title}
              </h2>
            </Link>
            {article.dek && (
              <p className="mt-4 max-w-2xl text-lg text-zinc-600 leading-relaxed">
                {article.dek}
              </p>
            )}
            <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500">
              {article.authors?.length > 0 && (
                <span className="font-medium text-zinc-700">
                  {article.authors.map((a) => a.name).join(", ")}
                </span>
              )}
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
              {article.reading_time_minutes && (
                <span>{article.reading_time_minutes} min read</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ArticleCard({
  article,
  featured,
  showDate,
}: {
  article: PublicArticleListItem;
  featured?: boolean;
  showDate?: boolean;
}) {
  const heroSrc = article.hero_image?.medium || article.hero_image?.thumb;

  return (
    <article className="group">
      {heroSrc && (
        <Link href={`/${article.slug}`} className="block overflow-hidden rounded-sm">
          <Image
            src={heroSrc}
            alt={article.hero_image?.alt || article.title}
            width={600}
            height={featured ? 400 : 340}
            className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      )}
      <div className="mt-4">
        {article.category && (
          <Link
            href={`/categories/${article.category.slug}`}
            className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {article.category.name}
          </Link>
        )}
        <Link href={`/${article.slug}`} className="mt-2 block">
          <h3
            className={`font-serif font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors leading-snug ${
              featured ? "text-2xl" : "text-xl"
            }`}
          >
            {article.title}
          </h3>
        </Link>
        {article.dek && (
          <p className="mt-2 text-sm text-zinc-600 line-clamp-2 leading-relaxed">
            {article.dek}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          {article.authors?.length > 0 && (
            <span className="font-medium text-zinc-600">
              {article.authors.map((a) => a.name).join(", ")}
            </span>
          )}
          {showDate && article.published_at && (
            <>
              <span>·</span>
              <span>{formatDate(article.published_at)}</span>
            </>
          )}
          {article.reading_time_minutes && (
            <>
              <span>·</span>
              <span>{article.reading_time_minutes} min</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between border-b border-zinc-200 pb-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          View all →
        </Link>
      )}
    </div>
  );
}

function CuratedModulesSection({ modules }: { modules: CuratedModule[] }) {
  const active = modules
    .filter((m) => m.is_active)
    .sort((a, b) => a.order - b.order);

  if (!active.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      {active.map((mod) => (
        <div key={mod.id} className="mb-12 last:mb-0">
          <SectionHeader title={mod.title || "Featured Collection"} />
          {mod.subtitle && (
            <p className="mb-6 text-sm text-zinc-600">{mod.subtitle}</p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mod.items
              ?.slice()
              .sort((a, b) => a.order - b.order)
              .map((item) => {
                const title =
                  item.override_title ||
                  (item.item_type === "ARTICLE"
                    ? item.article?.title
                    : item.item_type === "CATEGORY"
                      ? item.category?.name
                      : item.item_type === "SERIES"
                        ? item.series?.name
                        : item.author?.name) ||
                  "Untitled";

                const dek =
                  item.override_dek ||
                  (item.item_type === "ARTICLE"
                    ? item.article?.dek
                    : item.item_type === "CATEGORY"
                      ? item.category?.description
                      : item.item_type === "SERIES"
                        ? item.series?.description
                        : item.author?.bio) ||
                  "";

                const href =
                  item.item_type === "ARTICLE"
                    ? `/${item.article?.slug}`
                    : item.item_type === "CATEGORY"
                      ? `/categories/${item.category?.slug}`
                      : item.item_type === "SERIES"
                        ? `/series/${item.series?.slug}`
                        : `/authors/${item.author?.slug}`;

                const typeLabel =
                  item.item_type === "ARTICLE"
                    ? null
                    : item.item_type === "CATEGORY"
                      ? "Category"
                      : item.item_type === "SERIES"
                        ? "Series"
                        : "Author";

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="group block rounded-sm border border-zinc-200 p-5 hover:border-zinc-400 hover:shadow-sm transition-all"
                  >
                    {typeLabel && (
                      <span className="mb-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {typeLabel}
                      </span>
                    )}
                    <h3 className="font-serif text-lg font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors leading-snug">
                      {title}
                    </h3>
                    {dek && (
                      <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{dek}</p>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}

function TrendingSidebar({ items }: { items: TrendingItem[] }) {
  if (!items.length) return null;

  return (
    <aside className="rounded-sm border border-zinc-200 bg-white p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Popular This Week
      </h3>
      <ul className="mt-6 space-y-6">
        {items.slice(0, 5).map((item, idx) => (
          <li key={item.id} className="flex gap-4 group">
            <span className="font-serif text-2xl font-bold text-zinc-200 group-hover:text-zinc-400 transition-colors">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/${item.slug}`}
                className="font-serif font-semibold text-zinc-900 hover:text-zinc-600 transition-colors leading-snug block"
              >
                {item.title}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                {item.authors && item.authors.length > 0 && (
                  <span className="font-medium text-zinc-600">
                    {item.authors[0].name}
                  </span>
                )}
                {item.category && (
                  <>
                    {item.authors && item.authors.length > 0 && <span>·</span>}
                    <span>{item.category.name}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/categories"
        className="mt-6 block text-center text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        View all articles →
      </Link>
    </aside>
  );
}

// ----- Main Page (Server Component with ISR) -----

export default async function Home() {
  const [articles, trending, curatedModules] = await Promise.all([
    fetchArticles(),
    fetchTrending(),
    fetchCuratedModules(),
  ]);

  if (!articles.length) {
    return (
      <HomeShell>
        <main className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-zinc-900">No articles yet</h2>
            <p className="mt-2 text-zinc-600">Check back soon for new content.</p>
          </div>
        </main>
        <Footer />
      </HomeShell>
    );
  }

  // Split articles: prefer one with a hero image for the main hero section
  const heroArticle = articles.find((a) => a.hero_image) || articles[0];
  const remainingArticles = articles.filter((a) => a.id !== heroArticle?.id);
  const featuredArticles = remainingArticles.slice(0, 3);
  const latestArticles = remainingArticles.slice(3, 9);

  return (
    <HomeShell>
      {/* Hero Section */}
      {heroArticle && <HeroSection article={heroArticle} />}

      {/* Featured Articles Grid */}
      {featuredArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeader title="Featured" />
          <div className="grid gap-8 md:grid-cols-3">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} featured />
            ))}
          </div>
        </section>
      )}

      {/* Curated Modules */}
      <CuratedModulesSection modules={curatedModules} />

      {/* Newsletter CTA */}
      <NewsletterCTA />

      {/* Latest + Trending */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* Latest Articles */}
          <div>
            <SectionHeader title="Latest" href="/categories" />
            <div className="grid gap-8 sm:grid-cols-2">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} showDate />
              ))}
            </div>

            {articles.length > 10 && (
              <div className="mt-10 text-center">
                <Link
                  href="/categories"
                  className="inline-block rounded-sm border border-zinc-300 px-8 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                >
                  Browse all articles
                </Link>
              </div>
            )}
          </div>

          {/* Trending Sidebar */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <TrendingSidebar items={trending} />
          </div>
        </div>
      </section>

      <Footer />
    </HomeShell>
  );
}
