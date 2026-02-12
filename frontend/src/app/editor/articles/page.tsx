import type { Metadata } from "next";
import Link from "next/link";
import { fetchEditorialArticles, EditorialArticle } from "./list";

export const metadata: Metadata = {
  title: "Editor · Articles",
};

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  DRAFT:     { label: "Draft",     dot: "bg-zinc-400",   bg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300" },
  IN_REVIEW: { label: "In Review", dot: "bg-amber-400",  bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  SCHEDULED: { label: "Scheduled", dot: "bg-blue-400",   bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PUBLISHED: { label: "Published", dot: "bg-emerald-400", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  REJECTED:  { label: "Rejected",  dot: "bg-red-400",    bg: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, dot: "bg-zinc-400", bg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default async function EditorArticlesPage() {
  let articles: EditorialArticle[] = [];
  let error: string | null = null;
  try {
    articles = await fetchEditorialArticles();
  } catch {
    error = "Not authenticated or not authorized. Please log in and ensure you have Writer permissions.";
  }

  const counts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-3" href="/editor">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Editor Dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              📰 Articles
              <span className="ml-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {articles.length}
              </span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Editorial article list</p>
          </div>

          <Link
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-5 py-2.5 text-sm font-medium text-white transition-colors"
            href="/editor/articles/new"
          >
            + New Article
          </Link>
        </div>
      </header>

      {/* Status summary pills */}
      {articles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(counts).map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[status]?.dot ?? "bg-zinc-400"}`} />
              {statusConfig[status]?.label ?? status}: {count}
            </span>
          ))}
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          {error}
          <div className="mt-3">
            <Link href="/login" className="font-medium underline">
              Go to Login
            </Link>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 shadow-sm overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-zinc-500 dark:text-zinc-400">No articles yet.</p>
            <Link href="/editor/articles/new" className="mt-3 inline-block text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
              Create your first article →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/editor/articles/${a.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-zinc-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {a.title}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-500 font-mono truncate">
                      /{a.slug}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
