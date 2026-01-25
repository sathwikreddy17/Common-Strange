import type { Metadata } from "next";
import Link from "next/link";
import { fetchEditorialArticles, EditorialArticle } from "./list";

export const metadata: Metadata = {
  title: "Editor · Articles",
};

export default async function EditorArticlesPage() {
  let articles: EditorialArticle[] = [];
  let error: string | null = null;
  try {
    articles = await fetchEditorialArticles();
  } catch {
    error = "Not authenticated or not authorized. Please log in and ensure you have Writer permissions.";
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Articles</h1>
            <p className="mt-2 text-zinc-600">Editorial article list (Writer/Editor/Publisher).</p>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white font-medium hover:bg-zinc-800 transition-colors"
              href="/editor/articles/new"
            >
              + New Article
            </Link>
            <Link className="text-zinc-700 hover:underline" href="/editor">
              Editor
            </Link>
          </nav>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
          <div className="mt-3">
            <Link href="/login" className="font-medium underline">
              Go to Login
            </Link>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-medium">Articles</h2>
        {articles.length === 0 ? (
          <p className="text-zinc-600">No articles found.</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-xl border border-zinc-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-1 text-sm text-zinc-500">{a.slug}</div>
                    <div className="mt-1 text-xs text-zinc-400">Status: {a.status}</div>
                  </div>
                  <Link
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                    href={`/editor/articles/${a.id}`}
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 text-sm text-zinc-500">
        Next: add article edit page + workflow buttons (submit/approve/schedule/publish).
      </section>
    </main>
  );
}
