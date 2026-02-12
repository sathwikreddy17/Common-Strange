"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, ApiError } from "../../_shared";
import ArticleEditor from "@/components/ArticleEditor";

function formatApiError(err: unknown): string {
  if (err instanceof ApiError && err.body) {
    // Handle DRF validation errors (e.g., { "slug": ["article with this slug already exists."] })
    if (typeof err.body === "object" && err.body !== null) {
      const errors = err.body as Record<string, string[]>;
      const messages: string[] = [];
      for (const [field, fieldErrors] of Object.entries(errors)) {
        if (Array.isArray(fieldErrors)) {
          messages.push(`${field}: ${fieldErrors.join(", ")}`);
        } else if (typeof fieldErrors === "string") {
          messages.push(`${field}: ${fieldErrors}`);
        }
      }
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
    // Fallback to string body
    if (typeof err.body === "string") {
      return err.body;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Failed to create article. Check permissions and try again.";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

type CreateArticleResponse = {
  id: number;
  title: string;
  slug: string;
};

export default function NewArticlePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    dek: "",
    body_md: "",
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm((f) => ({
      ...f,
      title,
      slug: autoSlug ? slugify(title) : f.slug,
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await apiPost<CreateArticleResponse>("/v1/editor/articles/", {
        title: form.title,
        slug: form.slug,
        dek: form.dek,
        body_md: form.body_md,
      });
      router.push(`/editor/articles/${result.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-3" href="/editor/articles">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              All Articles
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              ✍️ New Article
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create a new article draft</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-6 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:border-transparent"
              value={form.title}
              onChange={handleTitleChange}
              required
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-zinc-900 dark:text-white font-mono text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:border-transparent"
              value={form.slug}
              onChange={handleSlugChange}
              required
              placeholder="article-url-slug"
            />
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              URL: /articles/{form.slug || "…"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dek <span className="text-zinc-400 dark:text-zinc-500 font-normal">(subtitle)</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:border-transparent"
              value={form.dek}
              onChange={(e) => setForm((f) => ({ ...f, dek: e.target.value }))}
              placeholder="A brief description or subtitle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Body
            </label>
            <ArticleEditor
              value={form.body_md}
              onChange={(value: string) => setForm((f) => ({ ...f, body_md: value }))}
              placeholder="Write your article content here..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving || !form.title || !form.slug}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Creating…" : "Create Draft"}
            </button>
            <Link
              href="/editor/articles"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-300">
        <strong>💡 Tip:</strong> After creating, you can add hero images, assign categories, authors, and tags from the edit page.
      </section>
    </main>
  );
}
