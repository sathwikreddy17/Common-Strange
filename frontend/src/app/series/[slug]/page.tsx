import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ArticleCard, { type ArticleCardItem } from "@/components/ArticleCard";
import TaxonomyNav from "@/components/TaxonomyNav";
import { getRequestOrigin, absoluteUrl } from "@/lib/urls";
import { extractResults, type PaginatedResponse } from "@/lib/api";
import { CuratedModules, type CuratedModule } from "@/app/_components/CuratedModules";

type Series = {
  name: string;
  slug: string;
  description: string;
};

type PublicArticleListItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  updated_at: string;
  category: { name: string; slug: string; description: string } | null;
  series: Series | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchSeries(slug: string): Promise<Series | null> {
  try {
    const origin = await getRequestOrigin();
    const res = await fetch(absoluteUrl(origin, `/v1/series/?_=${encodeURIComponent(slug)}`), {
      next: { revalidate: 600 },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as Series[] | PaginatedResponse<Series>;
    const items = extractResults(data);
    return items.find((x) => x.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function fetchSeriesArticles(slug: string): Promise<PublicArticleListItem[]> {
  try {
    const origin = await getRequestOrigin();
    const res = await fetch(absoluteUrl(origin, `/v1/series/${encodeURIComponent(slug)}/articles/`), {
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as PublicArticleListItem[] | PaginatedResponse<PublicArticleListItem>;
    return extractResults(data);
  } catch {
    return [];
  }
}

async function fetchSeriesModules(slug: string): Promise<CuratedModule[]> {
  try {
    const origin = await getRequestOrigin();
    const res = await fetch(absoluteUrl(origin, `/v1/series/${encodeURIComponent(slug)}/modules/`), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as CuratedModule[]) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeries(slug);
  if (!series) return {};

  const canonical = `${SITE_URL}/series/${encodeURIComponent(series.slug)}`;
  return {
    title: `${series.name} | Common Strange`,
    description: series.description || undefined,
    alternates: { canonical },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const series = await fetchSeries(slug);
  if (!series) notFound();

  const [modules, articles] = await Promise.all([fetchSeriesModules(series.slug), fetchSeriesArticles(series.slug)]);

  const canonicalUrl = `${SITE_URL}/series/${encodeURIComponent(series.slug)}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Series", item: `${SITE_URL}/series` },
      { "@type": "ListItem", position: 3, name: series.name, item: canonicalUrl },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-10">
        <Link className="text-sm text-zinc-600 hover:underline dark:text-zinc-400" href="/series">
          ← Back to Series
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{series.name}</h1>
            {series.description ? <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{series.description}</p> : null}
          </div>

          <TaxonomyNav />
        </div>
      </header>

      <CuratedModules modules={modules} />

      {articles.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No published articles in this series yet.</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((a) => (
            <ArticleCard
              key={a.slug}
              a={
                {
                  title: a.title,
                  slug: a.slug,
                  dek: a.dek,
                  category: a.category ? { name: a.category.name, slug: a.category.slug } : null,
                  series: a.series ? { name: a.series.name, slug: a.series.slug } : null,
                  authors: a.authors?.map((x) => ({ name: x.name, slug: x.slug })),
                } satisfies ArticleCardItem
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}
