"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "../../_shared";

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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create article. Check permissions and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">New Article</h1>
            <p className="mt-2 text-zinc-600">Create a new article draft</p>
          </div>

          <nav className="text-sm">
            <Link className="text-zinc-700 hover:underline" href="/editor/articles">
              ← Back to articles
            </Link>
          </nav>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.title}
              onChange={handleTitleChange}
              required
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 font-mono text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.slug}
              onChange={handleSlugChange}
              required
              placeholder="article-url-slug"
            />
            <p className="mt-1 text-xs text-zinc-500">
              URL: /articles/{form.slug || "..."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Dek <span className="text-zinc-400">(subtitle)</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.dek}
              onChange={(e) => setForm((f) => ({ ...f, dek: e.target.value }))}
              placeholder="A brief description or subtitle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Body <span className="text-zinc-400">(Markdown)</span>
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 font-mono text-sm min-h-[200px] focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              value={form.body_md}
              onChange={(e) => setForm((f) => ({ ...f, body_md: e.target.value }))}
              placeholder="Write your article content in Markdown..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving || !form.title || !form.slug}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Creating..." : "Create Draft"}
            </button>
            <Link
              href="/editor/articles"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Tip:</strong> After creating, you can add hero images, assign categories, 
        authors, and tags from the edit page.
      </section>
    </main>
  );
}
