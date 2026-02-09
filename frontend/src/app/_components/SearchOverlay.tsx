"use client";

import Link from "next/link";
import { useState } from "react";

type SearchResult = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  category?: { name: string; slug: string } | null;
  authors?: Array<{ name: string; slug: string }>;
};

export function SearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/v1/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.results || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white/98 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-6 pt-20">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              onClose();
              setQuery("");
              setResults([]);
            }}
            className="p-2 text-zinc-500 hover:text-zinc-900"
            aria-label="Close search"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full border-b-2 border-zinc-300 bg-transparent pb-4 font-serif text-3xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 transition-colors"
            autoFocus
          />
        </form>

        {loading && (
          <div className="mt-8 text-center text-sm text-zinc-500">Searching...</div>
        )}

        {results.length > 0 && (
          <ul className="mt-8 space-y-6">
            {results.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/${item.slug}`}
                  onClick={() => {
                    onClose();
                    setQuery("");
                    setResults([]);
                  }}
                  className="group block"
                >
                  <h3 className="font-serif text-xl font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">
                    {item.title}
                  </h3>
                  {item.dek && (
                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{item.dek}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && query && results.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">No results found.</p>
        )}
      </div>
    </div>
  );
}
