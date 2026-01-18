"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function SearchBar({ onResults }: { onResults: (results: PublicArticleListItem[]) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        onResults(data);
      } else {
        onResults([]);
      }
    } catch {
      onResults([]);
    }
    setLoading(false);
  }

  return (
    <form className="mb-6 flex gap-2" onSubmit={handleSearch}>
      <input
        type="text"
        className="border rounded px-3 py-2 w-full"
        placeholder="Search articles..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className="bg-zinc-800 text-white px-4 py-2 rounded" disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}

function getTrendingAndEditorPicks(articles: PublicArticleListItem[]) {
  // Trending: most recently updated
  const trending = [...articles].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 3);
  // Editor Picks: if you have a flag, use it; else, pick first 2
  const editorPicks = articles.slice(0, 2);
  return { trending, editorPicks };
}

export default function Home() {
  const [results, setResults] = useState<PublicArticleListItem[] | null>(null);
  const [articles, setArticles] = useState<PublicArticleListItem[]>([]);
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
        const data = await fetchArticles();
        if (cancelled) return;
        setArticles(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        console.error("Article fetch error:", err);
        setError("Failed to load articles. Please check your backend/API connection.");
        setArticles([]);
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

  const { trending, editorPicks } = getTrendingAndEditorPicks(results ?? articles);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Common Strange</h1>
        <p className="mt-2 text-zinc-600">PoC: list of published articles</p>
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
      </header>

      <SearchBar onResults={setResults} />

      {loading ? (
        <p className="text-zinc-600">Loading articles...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-2">Trending</h2>
            <ul className="flex gap-4">
              {trending.length === 0 ? (
                <li className="text-zinc-600">No trending articles yet.</li>
              ) : (
                trending.map((a) => (
                  <li key={a.slug} className="border rounded p-3 w-1/3">
                    <Link className="font-medium hover:underline" href={`/${a.slug}`}>
                      {a.title}
                    </Link>
                    <div className="text-xs text-zinc-500 mt-1">{a.category?.name}</div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold mb-2">Editor Picks</h2>
            <ul className="flex gap-4">
              {editorPicks.length === 0 ? (
                <li className="text-zinc-600">No editor picks yet.</li>
              ) : (
                editorPicks.map((a) => (
                  <li key={a.slug} className="border rounded p-3 w-1/3">
                    <Link className="font-medium hover:underline" href={`/${a.slug}`}>
                      {a.title}
                    </Link>
                    <div className="text-xs text-zinc-500 mt-1">{a.category?.name}</div>
                  </li>
                ))
              )}
            </ul>
          </section>

          {(results ?? articles).length === 0 ? (
            <p className="text-zinc-600">No published articles yet.</p>
          ) : (
            <ul className="space-y-6">
              {(results ?? articles).map((a) => (
                <li key={a.slug} className="rounded-xl border border-zinc-200 p-5">
                  <h2 className="text-xl font-medium">
                    <Link className="hover:underline" href={`/${a.slug}`}>
                      {a.title}
                    </Link>
                  </h2>
                  {a.dek ? <p className="mt-2 text-zinc-700">{a.dek}</p> : null}
                  <div className="mt-3 text-sm text-zinc-500">
                    {a.category ? (
                      <Link className="hover:underline" href={`/categories/${a.category.slug}`}>
                        {a.category.name}
                      </Link>
                    ) : null}
                    {a.category && a.authors.length ? <span> · </span> : null}
                    {a.authors.length ? <span>{a.authors.map((x) => x.name).join(", ")}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
