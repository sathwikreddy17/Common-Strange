"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiGet } from "../../_shared";

type EditorialArticleDetail = {
  id: number;
  category: { slug: string } | null;
  series: { slug: string } | null;
  authors: Array<{ slug: string }>;
  tags: Array<{ slug: string }>;
};

type Taxonomy = {
  categories: Array<{ slug: string; name: string }>;
  series: Array<{ slug: string; name: string }>;
  authors: Array<{ slug: string; name: string }>;
  tags: Array<{ slug: string; name: string }>;
};

type Props = {
  article: EditorialArticleDetail;
};

export default function TaxonomyForm({ article }: Props) {
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    category: article.category?.slug ?? "",
    series: article.series?.slug ?? "",
    authors: article.authors.map((a) => a.slug),
    tags: article.tags.map((t) => t.slug),
  });

  useEffect(() => {
    async function loadTaxonomy() {
      try {
        // API returns paginated responses: { count, results: [...] }
        type PaginatedResponse<T> = { results: T[] } | T[];
        const unwrap = <T,>(data: PaginatedResponse<T>): T[] => 
          Array.isArray(data) ? data : data.results;
        
        const [categoriesRes, seriesRes, authorsRes, tagsRes] = await Promise.all([
          apiGet("/v1/editor/categories/"),
          apiGet("/v1/editor/series/"),
          apiGet("/v1/editor/authors/"),
          apiGet("/v1/editor/tags/"),
        ]);
        setTax({
          categories: unwrap(categoriesRes as PaginatedResponse<{ slug: string; name: string }>),
          series: unwrap(seriesRes as PaginatedResponse<{ slug: string; name: string }>),
          authors: unwrap(authorsRes as PaginatedResponse<{ slug: string; name: string }>),
          tags: unwrap(tagsRes as PaginatedResponse<{ slug: string; name: string }>),
        });
      } catch {
        setTax(null);
      }
    }
    loadTaxonomy();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPatch(`/v1/editor/articles/${article.id}/`, {
        category: form.category || null,
        series: form.series || null,
        authors: form.authors,
        tags: form.tags,
      });
      setSuccess(true);
    } catch {
      setError("Save failed. Check your permissions and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!tax) return <div className="text-sm text-zinc-500">Loading taxonomy…</div>;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Category</label>
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="">None</option>
          {tax.categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Series</label>
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={form.series}
          onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
        >
          <option value="">None</option>
          {tax.series.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Authors</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {tax.authors.map((a) => (
            <label key={a.slug} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.authors.includes(a.slug)}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    authors: e.target.checked
                      ? [...f.authors, a.slug]
                      : f.authors.filter((slug) => slug !== a.slug),
                  }));
                }}
              />
              {a.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Tags</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {tax.tags.map((t) => (
            <label key={t.slug} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.tags.includes(t.slug)}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    tags: e.target.checked
                      ? [...f.tags, t.slug]
                      : f.tags.filter((slug) => slug !== t.slug),
                  }));
                }}
              />
              {t.name}
            </label>
          ))}
        </div>
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
