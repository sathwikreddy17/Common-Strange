"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ArticleCard, { type ArticleCardItem } from "@/components/ArticleCard";

// Use a same-origin proxy so this works both in Docker and non-Docker.
const API_BASE = "";

type PublicArticleListItem = {
  title: string;
  slug: string;
  dek: string;
  updated_at: string;
  published_at: string | null;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
};

type TrendingItem = {
  id: number;
  slug: string;
  title: string;
  views_24h: number;
};

async function fetchArticles(): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/articles?status=published`);
    if (!res.ok) return [];
    return (await res.json()) as PublicArticleListItem[];
  } catch (err) {
    console.error("Error fetching articles:", err);
    return [];
  }
}

async function fetchTrending(): Promise<TrendingItem[]> {
  // Editor-only endpoint (session auth). If the user isn't logged in, we should just treat it as "no trending".
  try {
    // Note: call without trailing slash to avoid Next.js proxy/middleware redirect.
    const res = await fetch(`${API_BASE}/v1/editor/trending`, {
      credentials: "include",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as TrendingItem[]) : [];
  } catch {
    return [];
  }
}

function SearchBar({ onResults }: { onResults: (results: PublicArticleListItem[], q: string) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      onResults([], "");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as unknown;
        onResults(Array.isArray(data) ? (data as PublicArticleListItem[]) : [], q);
      } else {
        onResults([], q);
      }
    } catch {
      onResults([], q);
    }
    setLoading(false);
  }

  return (
    <form className="mt-6 flex gap-2" onSubmit={handleSearch}>
      <input
        type="text"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300"
        placeholder="Search articles…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

function getFallbackModules(articles: PublicArticleListItem[]) {
  // Pure public fallback while editor-only modules are empty/unauthenticated.
  const trending = [...articles].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 3);
  const editorPicks = articles.slice(0, 3);
  return { trending, editorPicks };
}

export default function Home() {
  const [results, setResults] = useState<PublicArticleListItem[] | null>(null);
  const [query, setQuery] = useState<string>("");
  const [articles, setArticles] = useState<PublicArticleListItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Safety timeout in dev so we don't get stuck on "Loading..." silently.
    const t = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError((prev) => prev ?? "Request timed out while loading articles.");
      }
    }, 8000);

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [data, trendingData] = await Promise.all([fetchArticles(), fetchTrending()]);

        if (cancelled) return;
        setArticles(Array.isArray(data) ? data : []);
        setTrending(Array.isArray(trendingData) ? trendingData : []);
      } catch (err) {
        if (cancelled) return;
        console.error("Home fetch error:", err);
        setError("Failed to load content. Please check your backend/API connection.");
        setArticles([]);
        setTrending([]);
      } finally {
        if (cancelled) return;
        clearTimeout(t);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const fallback = useMemo(() => getFallbackModules(articles), [articles]);
  const feed = results ?? articles;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="mb-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Common Strange</h1>
            <p className="mt-2 text-zinc-600">A small publishing PoC (SEO-first).</p>

            <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link className="text-zinc-700 hover:underline" href="/categories">
                Categories
              </Link>
              <Link className="text-zinc-700 hover:underline" href="/authors">
                Authors
              </Link>
              <Link className="text-zinc-700 hover:underline" href="/series">
                Series
              </Link>
              <Link className="text-zinc-700 hover:underline" href="/tags">
                Tags
              </Link>
            </nav>
          </div>

          <div className="w-full md:w-[420px]">
            <SearchBar
              onResults={(r, q) => {
                setResults(q ? r : null);
                setQuery(q);
              }}
            />
            {query ? (
              <div className="mt-2 text-xs text-zinc-500">
                Showing results for{" "}
                <span className="font-medium text-zinc-700">“{query}”</span>
                <button
                  type="button"
                  className="ml-2 underline hover:text-zinc-700"
                  onClick={() => {
                    setResults(null);
                    setQuery("");
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-zinc-700">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Latest</h2>
              <div className="text-xs text-zinc-500">{feed.length} items</div>
            </div>

            {feed.length === 0 ? (
              <p className="text-zinc-600">No published articles yet.</p>
            ) : (
              <ul className="space-y-4">
                {feed.map((a) => (
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
          </section>

          <aside className="space-y-8">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Trending</h2>
              <ul className="mt-4 space-y-3">
                {(trending.length ? trending.slice(0, 5) : fallback.trending).map((t) => (
                  <li key={t.slug} className="text-sm">
                    <Link className="font-medium text-zinc-900 hover:underline" href={`/${t.slug}`}>
                      {t.title}
                    </Link>
                    {"views_24h" in t ? (
                      <div className="mt-1 text-xs text-zinc-500">{t.views_24h} views (24h)</div>
                    ) : (
                      <div className="mt-1 text-xs text-zinc-500">Recently updated</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Editor Picks</h2>
              <ul className="mt-4 space-y-3">
                {fallback.editorPicks.map((a) => (
                  <li key={a.slug} className="text-sm">
                    <Link className="font-medium text-zinc-900 hover:underline" href={`/${a.slug}`}>
                      {a.title}
                    </Link>
                    {a.category ? <div className="mt-1 text-xs text-zinc-500">{a.category.name}</div> : null}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-zinc-500">
                Note: curated homepage modules (publisher/editor) are a blueprint item and come next.
              </p>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
