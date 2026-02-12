import { Metadata } from "next";
import Link from "next/link";
import { getApiUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: "Search - Common Strange",
  description: "Search articles on Common Strange",
};

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string;
  category?: { name: string; slug: string };
  authors: Array<{ name: string; slug: string }>;
  reading_time_minutes?: number;
}

interface SearchResponse {
  count: number;
  results: SearchResult[];
}

async function searchArticles(query: string): Promise<SearchResponse> {
  if (!query) return { count: 0, results: [] };

  try {
    const url = getApiUrl(`v1/search/?q=${encodeURIComponent(query)}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { count: 0, results: [] };
    const data = await res.json();
    // Handle both paginated and flat responses
    if (Array.isArray(data)) return { count: data.length, results: data };
    if (data && typeof data === "object" && "results" in data) return data;
    return { count: 0, results: [] };
  } catch {
    return { count: 0, results: [] };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const results = await searchArticles(query);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-2xl font-serif font-bold text-gray-900 dark:text-zinc-100">
            Common Strange
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-6">Search</h1>

        {/* Search Form */}
        <form action="/search" method="GET" className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search articles..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        {query && (
          <div>
            <p className="text-gray-600 dark:text-zinc-400 mb-6">
              {results.count} result{results.count !== 1 ? "s" : ""} for &quot;{query}&quot;
            </p>

            {results.results.length > 0 ? (
              <div className="space-y-6">
                {results.results.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 p-6 hover:shadow-md dark:hover:border-zinc-600 transition-shadow"
                  >
                    {article.category && (
                      <Link
                        href={`/categories/${article.category.slug}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {article.category.name}
                      </Link>
                    )}
                    <h2 className="mt-2">
                      <Link
                        href={`/${article.slug}`}
                        className="text-xl font-bold text-gray-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {article.title}
                      </Link>
                    </h2>
                    {article.dek && (
                      <p className="mt-2 text-gray-600 dark:text-zinc-400 line-clamp-2">{article.dek}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-500">
                      {article.authors.length > 0 && (
                        <span>
                          By{" "}
                          {article.authors.map((author, i) => (
                            <span key={author.slug}>
                              {i > 0 && ", "}
                              <Link
                                href={`/authors/${author.slug}`}
                                className="hover:underline"
                              >
                                {author.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      )}
                      {article.published_at && (
                        <time>
                          {new Date(article.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-zinc-400 mb-4">No articles found matching your search.</p>
                <p className="text-sm text-gray-500 dark:text-zinc-500">
                  Try different keywords or{" "}
                  <Link href="/categories" className="text-blue-600 dark:text-blue-400 hover:underline">
                    browse categories
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {!query && (
          <div className="text-center py-12 text-gray-600 dark:text-zinc-400">
            Enter a search term above to find articles.
          </div>
        )}
      </main>
    </div>
  );
}
