"use client";

import { useState, useCallback } from "react";
import { apiPatch } from "../../_shared";
import ArticleEditor from "@/components/ArticleEditor";

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

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPatch(`/v1/editor/articles/${article.id}/`, form);
      await revalidateArticle(article.slug);
      setSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Save failed. Check your permissions and try again.");
    } finally {
      setSaving(false);
    }
  }, [article.id, article.slug, form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleSave();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Title & Dek in a compact header section */}
      <div className="grid grid-cols-1 gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
            Article Title
          </label>
          <input
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-xl font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Enter your article title..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
            Dek (Subtitle)
          </label>
          <input
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-base text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            value={form.dek}
            onChange={(e) => setForm((f) => ({ ...f, dek: e.target.value }))}
            placeholder="A brief description or subtitle for your article..."
          />
        </div>
      </div>

      {/* Full-height Article Editor */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Article Body
        </label>
        <ArticleEditor
          value={form.body_md}
          onChange={(value) => setForm((f) => ({ ...f, body_md: value }))}
          onSave={handleSave}
          isSaving={saving}
          placeholder={`Start writing your article here...

Tips:
• Use # for headings (# H1, ## H2, ### H3)
• **Bold** and *italic* formatting
• Create lists with - or 1. 2. 3.
• Add quotes with > at the start of a line
• Use the toolbar above or keyboard shortcuts

Press Ctrl+\\ for fullscreen mode`}
        />
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Article saved successfully!
        </div>
      )}
    </form>
  );
}
