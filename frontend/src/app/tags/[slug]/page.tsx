import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
  tags: Tag[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchTag(slug: string): Promise<Tag | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const items = (await res.json()) as Tag[];
    return items.find((x) => x.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function fetchTagArticles(slug: string): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/${encodeURIComponent(slug)}/articles/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PublicArticleListItem[];
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
  const tag = await fetchTag(slug);
  if (!tag) return {};

  const canonical = `${SITE_URL}/tags/${encodeURIComponent(tag.slug)}`;
  return {
    title: `#${tag.name} | Common Strange`,
    alternates: { canonical },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tag = await fetchTag(slug);
  if (!tag) notFound();

  const articles = await fetchTagArticles(tag.slug);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-10">
        <Link className="text-sm text-zinc-600 hover:underline" href="/tags">
          ← Back to Tags
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">#{tag.name}</h1>
            <p className="mt-2 text-zinc-600">All published articles tagged “{tag.name}”.</p>
          </div>

          <nav className="text-sm text-zinc-600">
            <Link className="hover:underline" href="/categories">
              Categories
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/series">
              Series
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/authors">
              Authors
            </Link>
          </nav>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="text-zinc-600">No published articles with this tag yet.</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((a) => (
            <li key={a.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                {a.category ? (
                  <Link className="hover:underline" href={`/categories/${a.category.slug}`}>
                    {a.category.name}
                  </Link>
                ) : null}
                {a.category && a.series ? <span aria-hidden>·</span> : null}
                {a.series ? (
                  <Link className="hover:underline" href={`/series/${a.series.slug}`}>
                    {a.series.name}
                  </Link>
                ) : null}
                {(a.category || a.series) && a.authors.length ? <span aria-hidden>·</span> : null}
                {a.authors.length ? <span className="truncate">{a.authors.map((x) => x.name).join(", ")}</span> : null}
              </div>

              <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                <Link className="hover:underline" href={`/${a.slug}`}>
                  {a.title}
                </Link>
              </h2>
              {a.dek ? <p className="mt-2 text-zinc-700">{a.dek}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
