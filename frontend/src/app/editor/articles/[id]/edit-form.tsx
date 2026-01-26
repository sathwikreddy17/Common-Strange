"use client";

import { useState } from "react";
import { apiPatch } from "../../_shared";
import MarkdownEditor from "@/components/MarkdownEditor";

type EditorialArticleDetail = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  body_md: string;
  widgets_json: unknown;
  status: string;
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
  category: unknown;
  series: unknown;
  authors: unknown[];
  tags?: unknown[];
  og_image_key: string;
};

type Props = {
  article: EditorialArticleDetail;
};

async function revalidateArticle(slug: string) {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch (e) {
    console.error("Failed to revalidate cache:", e);
  }
}

export default function ArticleEditForm({ article }: Props) {
  const [form, setForm] = useState({
    title: article.title,
    dek: article.dek,
    body_md: article.body_md,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPatch(`/v1/editor/articles/${article.id}/`, form);
      // Revalidate the article page cache so changes appear immediately
      await revalidateArticle(article.slug);
      setSuccess(true);
    } catch {
      setError("Save failed. Check your permissions and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Title</label>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Dek</label>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={form.dek}
          onChange={(e) => setForm((f) => ({ ...f, dek: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Body</label>
        <MarkdownEditor
          value={form.body_md}
          onChange={(value) => setForm((f) => ({ ...f, body_md: value }))}
          placeholder="Write your article content here...

Use the toolbar or type markdown directly:
# Main Heading
## Section Heading  
### Sub Heading

**Bold text** and *italic text*

- Bullet points
- Another point

> Blockquotes for quotes"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
      {success ? <div className="text-sm text-green-700">Saved!</div> : null}
    </form>
  );
}
