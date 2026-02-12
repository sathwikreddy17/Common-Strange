"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiGet, apiPatch, apiPost, formatAuthHint, unwrapPaginated } from "../_shared";

type EditorialArticle = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  status: string;
};

type CuratedModuleItem = {
  id: number;
  order: number;
  item_type: "ARTICLE" | "CATEGORY" | "SERIES" | "AUTHOR";
  override_title: string;
  override_dek: string;
  article: { id: number; title: string; slug: string; dek: string } | null;
  category: { id: number; name: string; slug: string } | null;
  series: { id: number; name: string; slug: string } | null;
  author: { id: number; name: string; slug: string } | null;
};

type CuratedModule = {
  id: number;
  placement: "HOME" | "CATEGORY" | "SERIES" | "AUTHOR";
  title: string;
  subtitle: string;
  order: number;
  publish_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  category?: { id: number; name: string; slug: string } | null;
  series?: { id: number; name: string; slug: string } | null;
  author?: { id: number; name: string; slug: string } | null;
  items: CuratedModuleItem[];
};

type ReplaceItemPayload =
  | {
      order: number;
      item_type: "ARTICLE";
      article: number;
      override_title?: string;
      override_dek?: string;
    }
  | {
      order: number;
      item_type: "CATEGORY";
      category: number;
      override_title?: string;
    }
  | {
      order: number;
      item_type: "SERIES";
      series: number;
      override_title?: string;
    }
  | {
      order: number;
      item_type: "AUTHOR";
      author: number;
      override_title?: string;
    };

type TaxItem = { id: number; name: string; slug: string };

type Placement = "HOME" | "CATEGORY" | "SERIES" | "AUTHOR";

function sortByOrder<T extends { order: number }>(xs: T[]): T[] {
  return xs.slice().sort((a, b) => a.order - b.order);
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function moduleStatus(m: CuratedModule, now = new Date()): { label: string; tone: "green" | "amber" | "red" | "zinc" } {
  if (!m.is_active) return { label: "Inactive", tone: "zinc" };

  const pub = m.publish_at ? new Date(m.publish_at) : null;
  const exp = m.expires_at ? new Date(m.expires_at) : null;

  if (exp && !Number.isNaN(exp.getTime()) && exp <= now) return { label: "Expired", tone: "red" };
  if (pub && !Number.isNaN(pub.getTime()) && pub > now) return { label: "Scheduled", tone: "amber" };
  return { label: "Live", tone: "green" };
}

function badgeClass(tone: "green" | "amber" | "red" | "zinc"): string {
  if (tone === "green") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (tone === "amber") return "bg-amber-50 text-amber-800 border-amber-200";
  if (tone === "red") return "bg-red-50 text-red-800 border-red-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

// Ensure newItemType is strongly typed
const ITEM_TYPES = ["ARTICLE", "CATEGORY", "SERIES", "AUTHOR"] as const;
type ItemType = (typeof ITEM_TYPES)[number];

function isItemType(s: string): s is ItemType {
  return (ITEM_TYPES as readonly string[]).includes(s);
}

export default function EditorModulesPage() {
  const [modules, setModules] = useState<CuratedModule[]>([]);
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [categories, setCategories] = useState<TaxItem[]>([]);
  const [series, setSeries] = useState<TaxItem[]>([]);
  const [authors, setAuthors] = useState<TaxItem[]>([]);

  const [placement, setPlacement] = useState<Placement>("HOME");
  const [scopeSlug, setScopeSlug] = useState<string>("");

  const [newItemType, setNewItemType] = useState<"ARTICLE" | "CATEGORY" | "SERIES" | "AUTHOR">("ARTICLE");
  const [newItemSlug, setNewItemSlug] = useState<string>("");
  const [newItemOverrideTitle, setNewItemOverrideTitle] = useState<string>("");

  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [copyFromModuleId, setCopyFromModuleId] = useState<number | null>(null);

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) ?? null,
    [modules, selectedModuleId]
  );

  const placementLabel = useMemo(() => {
    if (placement === "HOME") return "Home";
    if (placement === "CATEGORY") return "Category";
    if (placement === "SERIES") return "Series";
    return "Author";
  }, [placement]);

  const scopeOptions = useMemo(() => {
    if (placement === "CATEGORY") return categories;
    if (placement === "SERIES") return series;
    if (placement === "AUTHOR") return authors;
    return [];
  }, [placement, categories, series, authors]);

  async function reload() {
    setError(null);
    try {
      const qs = new URLSearchParams({ placement });
      if (placement === "CATEGORY" && scopeSlug) qs.set("category", scopeSlug);
      if (placement === "SERIES" && scopeSlug) qs.set("series", scopeSlug);
      if (placement === "AUTHOR" && scopeSlug) qs.set("author", scopeSlug);

      const [msRaw, asRaw, csRaw, ssRaw, ausRaw] = await Promise.all([
        apiGet<CuratedModule[] | { results: CuratedModule[] }>(`/v1/editor/modules/?${qs.toString()}`),
        apiGet<EditorialArticle[] | { results: EditorialArticle[] }>("/v1/editor/articles/"),
        apiGet<TaxItem[] | { results: TaxItem[] }>("/v1/categories/"),
        apiGet<TaxItem[] | { results: TaxItem[] }>("/v1/series/"),
        apiGet<TaxItem[] | { results: TaxItem[] }>("/v1/authors/"),
      ]);

      const msList = unwrapPaginated(msRaw);
      setModules(msList);
      setArticles(unwrapPaginated(asRaw));
      setCategories(unwrapPaginated(csRaw));
      setSeries(unwrapPaginated(ssRaw));
      setAuthors(unwrapPaginated(ausRaw));

      setSelectedModuleId((prev) => {
        if (prev && msList.some((m) => m.id === prev)) return prev;
        return msList.length ? msList[0].id : null;
      });
    } catch (e) {
      setError(`Failed to load modules. ${formatAuthHint(e)}`);
      setModules([]);
      setArticles([]);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, scopeSlug]);

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.status === "PUBLISHED"),
    [articles]
  );

  const latestPublishedArticles = useMemo(() => {
    // Best-effort ordering: API may not guarantee order, but this is still useful.
    // If status list ever includes published_at, we can sort accurately.
    return publishedArticles.slice().reverse();
  }, [publishedArticles]);

  const [bulkAddCount, setBulkAddCount] = useState<number>(6);

  async function createModule() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        placement,
        title: `${placementLabel} module`,
        subtitle: "",
        order: modules.length,
        is_active: true,
      };

      if (placement === "CATEGORY" && scopeSlug) payload.category_slug = scopeSlug;
      if (placement === "SERIES" && scopeSlug) payload.series_slug = scopeSlug;
      if (placement === "AUTHOR" && scopeSlug) payload.author_slug = scopeSlug;

      const m = await apiPost<CuratedModule>("/v1/editor/modules/", payload);
      setModules((prev) => [...prev, m]);
      setSelectedModuleId(m.id);
    } catch (e) {
      setError(`Failed to create module. ${formatAuthHint(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function replaceItems(newItems: ReplaceItemPayload[]) {
    if (!selectedModule) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiPost<CuratedModule>(
        `/v1/editor/modules/${selectedModule.id}/replace_items/`,
        { items: newItems }
      );
      setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (e) {
      setError(`Failed to save items. ${formatAuthHint(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyItemsFromModule(sourceModuleId: number) {
    if (!selectedModule) return;
    const src = modules.find((m) => m.id === sourceModuleId) ?? null;
    if (!src) {
      setError("Source module not found.");
      return;
    }

    const payload = moduleItemsAsPayload(src).map((it, idx) => ({ ...it, order: idx }));
    await replaceItems(payload);
  }

  function moduleItemsAsPayload(m: CuratedModule): ReplaceItemPayload[] {
    const out: ReplaceItemPayload[] = [];
    const items = sortByOrder(m.items);

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const order = it.order ?? idx;

      if (it.item_type === "ARTICLE" && it.article) {
        out.push({
          order,
          item_type: "ARTICLE",
          article: it.article.id,
          override_title: it.override_title || undefined,
          override_dek: it.override_dek || undefined,
        });
        continue;
      }

      if (it.item_type === "CATEGORY" && it.category) {
        out.push({
          order,
          item_type: "CATEGORY",
          category: it.category.id,
          override_title: it.override_title || undefined,
        });
        continue;
      }

      if (it.item_type === "SERIES" && it.series) {
        out.push({
          order,
          item_type: "SERIES",
          series: it.series.id,
          override_title: it.override_title || undefined,
        });
        continue;
      }

      if (it.item_type === "AUTHOR" && it.author) {
        out.push({
          order,
          item_type: "AUTHOR",
          author: it.author.id,
          override_title: it.override_title || undefined,
        });
        continue;
      }
    }

    return out;
  }

  async function replaceItemsFromModule(m: CuratedModule) {
    await replaceItems(moduleItemsAsPayload(m));
  }

  async function updateItemOverrides(itemId: number, patch: { override_title?: string; override_dek?: string }) {
    if (!selectedModule) return;

    const next: CuratedModule = {
      ...selectedModule,
      items: selectedModule.items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              override_title: patch.override_title !== undefined ? patch.override_title : it.override_title,
              override_dek: patch.override_dek !== undefined ? patch.override_dek : it.override_dek,
            }
          : it
      ),
    };
    await replaceItemsFromModule(next);
  }

  async function addArticle(articleId: number) {
    if (!selectedModule) return;
    const existing = sortByOrder(selectedModule.items)
      .filter((it) => it.item_type === "ARTICLE" && it.article)
      .map((it) => it.article!.id);

    if (existing.includes(articleId)) return;

    const seed = moduleItemsAsPayload(selectedModule);
    const next = [...seed, { order: seed.length, item_type: "ARTICLE", article: articleId } as const];
    await replaceItems(next);
  }

  async function removeItem(itemId: number) {
    if (!selectedModule) return;
    const remaining = sortByOrder(selectedModule.items).filter((it) => it.id !== itemId);
    const nextModule = { ...selectedModule, items: remaining.map((it, idx) => ({ ...it, order: idx })) };
    await replaceItemsFromModule(nextModule);
  }

  async function moveItem(itemId: number, dir: -1 | 1) {
    if (!selectedModule) return;
    const items = sortByOrder(selectedModule.items);
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;

    const next = items.slice();
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;

    const nextModule = { ...selectedModule, items: next.map((it, k) => ({ ...it, order: k })) };
    await replaceItemsFromModule(nextModule);
  }

  async function addTaxonomyItem() {
    if (!selectedModule) return;
    if (!newItemSlug) return;
    if (newItemType === "ARTICLE") return;

    let id: number | null = null;
    if (newItemType === "CATEGORY") id = categories.find((x) => x.slug === newItemSlug)?.id ?? null;
    if (newItemType === "SERIES") id = series.find((x) => x.slug === newItemSlug)?.id ?? null;
    if (newItemType === "AUTHOR") id = authors.find((x) => x.slug === newItemSlug)?.id ?? null;
    if (!id) {
      setError("Could not resolve selected item to an ID.");
      return;
    }

    const seed = moduleItemsAsPayload(selectedModule);

    // Prevent duplicates by (type, id)
    const dup = seed.some((it) => {
      if (newItemType === "CATEGORY" && it.item_type === "CATEGORY") return it.category === id;
      if (newItemType === "SERIES" && it.item_type === "SERIES") return it.series === id;
      if (newItemType === "AUTHOR" && it.item_type === "AUTHOR") return it.author === id;
      return false;
    });
    if (dup) return;

    const base = {
      order: seed.length,
      override_title: newItemOverrideTitle || undefined,
    };

    const next: ReplaceItemPayload[] =
      newItemType === "CATEGORY"
        ? [...seed, { ...base, item_type: "CATEGORY", category: id }]
        : newItemType === "SERIES"
          ? [...seed, { ...base, item_type: "SERIES", series: id }]
          : [...seed, { ...base, item_type: "AUTHOR", author: id }];

    await replaceItems(next);
    setNewItemSlug("");
    setNewItemOverrideTitle("");
  }

  async function clearAllItems() {
    if (!selectedModule) return;
    await replaceItems([]);
  }

  async function appendLatestPublishedArticles(count: number) {
    if (!selectedModule) return;
    const n = Math.max(1, Math.min(20, Math.floor(count)));

    const seed = moduleItemsAsPayload(selectedModule);
    const existingArticles = new Set<number>();
    for (const it of seed) {
      if (it.item_type === "ARTICLE") existingArticles.add(it.article);
    }

    const toAdd: number[] = [];
    for (const a of latestPublishedArticles) {
      if (toAdd.length >= n) break;
      if (!existingArticles.has(a.id)) toAdd.push(a.id);
    }

    if (!toAdd.length) return;

    const next: ReplaceItemPayload[] = seed.concat(
      toAdd.map((id, idx) => ({ order: seed.length + idx, item_type: "ARTICLE", article: id } as const))
    );

    await replaceItems(next);
  }

  async function updateModule(patch: Partial<Pick<CuratedModule, "title" | "subtitle" | "order" | "is_active" | "publish_at" | "expires_at">>) {
    if (!selectedModule) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiPatch<CuratedModule>(`/v1/editor/modules/${selectedModule.id}/`, patch);
      setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (e) {
      setError(`Failed to update module. ${formatAuthHint(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function publishNow() {
    await updateModule({ is_active: true, publish_at: new Date().toISOString() });
  }

  async function expireNow() {
    await updateModule({ expires_at: new Date().toISOString() });
  }

  async function duplicateSelectedModule() {
    if (!selectedModule) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        placement: selectedModule.placement,
        title: (selectedModule.title || "") + " (copy)",
        subtitle: selectedModule.subtitle || "",
        order: modules.length,
        is_active: false,
        publish_at: null,
        expires_at: null,
      };

      if (selectedModule.placement === "CATEGORY" && selectedModule.category?.slug) {
        payload.category_slug = selectedModule.category.slug;
      }
      if (selectedModule.placement === "SERIES" && selectedModule.series?.slug) {
        payload.series_slug = selectedModule.series.slug;
      }
      if (selectedModule.placement === "AUTHOR" && selectedModule.author?.slug) {
        payload.author_slug = selectedModule.author.slug;
      }

      const created = await apiPost<CuratedModule>("/v1/editor/modules/", payload);

      // Copy items
      const items = moduleItemsAsPayload(selectedModule).map((it, idx) => ({ ...it, order: idx }));
      if (items.length) {
        const withItems = await apiPost<CuratedModule>(`/v1/editor/modules/${created.id}/replace_items/`, { items });
        setModules((prev) => [...prev, withItems]);
        setSelectedModuleId(withItems.id);
      } else {
        setModules((prev) => [...prev, created]);
        setSelectedModuleId(created.id);
      }
    } catch (e) {
      setError(`Failed to duplicate module. ${formatAuthHint(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const moduleWindowError = useMemo(() => {
    if (!selectedModule) return null;
    if (!selectedModule.publish_at || !selectedModule.expires_at) return null;
    const a = new Date(selectedModule.publish_at);
    const b = new Date(selectedModule.expires_at);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    if (b <= a) return "expires_at must be after publish_at";
    return null;
  }, [selectedModule]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-900">Curation Manager</h1>
          <p className="mt-1 text-sm text-zinc-500">Curate what appears on the homepage and hub pages.</p>
        </div>
        <Link
          href="/editor"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          ← Back to Editor
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="text-red-500">⚠</span>
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Placement bar ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Show</span>
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none"
            value={placement}
            onChange={(e) => {
              setPlacement(e.target.value as Placement);
              setScopeSlug("");
              setSelectedModuleId(null);
            }}
          >
            <option value="HOME">Home</option>
            <option value="CATEGORY">Category</option>
            <option value="SERIES">Series</option>
            <option value="AUTHOR">Author</option>
          </select>

          {placement !== "HOME" && (
            <>
              <span className="text-zinc-300">›</span>
              <select
                className="min-w-[180px] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none"
                value={scopeSlug}
                onChange={(e) => {
                  setScopeSlug(e.target.value);
                  setSelectedModuleId(null);
                }}
              >
                <option value="">Pick a {placementLabel.toLowerCase()}…</option>
                {scopeOptions.map((x) => (
                  <option key={x.slug} value={x.slug}>{x.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            onClick={() => void reload()}
            disabled={busy}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            onClick={() => void createModule()}
            disabled={busy || (placement !== "HOME" && !scopeSlug)}
          >
            + New module
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="space-y-5">
          {/* Module list */}
          <div>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {placementLabel} Modules
            </h2>
            <div className="space-y-1.5">
              {sortByOrder(modules).map((m) => {
                const st = moduleStatus(m);
                const isSelected = selectedModuleId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModuleId(m.id)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                      isSelected
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "bg-white border border-zinc-100 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium truncate ${isSelected ? "text-white" : "text-zinc-900"}`}>
                        {m.title || `Module ${m.id}`}
                      </div>
                      <div className={`mt-0.5 text-xs ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                        {m.items?.length ?? 0} items
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected
                        ? st.tone === "green" ? "bg-emerald-500/20 text-emerald-200"
                          : st.tone === "amber" ? "bg-amber-500/20 text-amber-200"
                          : st.tone === "red" ? "bg-red-500/20 text-red-200"
                          : "bg-zinc-500/20 text-zinc-300"
                        : `border ${badgeClass(st.tone)}`
                    }`}>
                      {st.label}
                    </span>
                  </button>
                );
              })}
              {modules.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">
                  No modules yet.
                  <br />
                  <span className="text-xs">Click &quot;+ New module&quot; to get started.</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick add article */}
          {selectedModule && (
            <div>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Quick Add Article
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-white">
                <div className="max-h-[320px] overflow-auto divide-y divide-zinc-100">
                  {publishedArticles.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={busy}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                      onClick={() => void addArticle(a.id)}
                      title={`Add: ${a.title}`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] font-bold text-zinc-400">
                        +
                      </span>
                      <span className="min-w-0 flex-1 truncate text-zinc-700">{a.title}</span>
                    </button>
                  ))}
                  {publishedArticles.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-zinc-400">No published articles.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add taxonomy item */}
          {selectedModule && (
            <div>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Add Category / Series / Author
              </h2>
              <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
                <select
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                  value={newItemType}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewItemType(isItemType(v) ? v : "ARTICLE");
                    setNewItemSlug("");
                    setNewItemOverrideTitle("");
                  }}
                >
                  <option value="ARTICLE">Article (use list above)</option>
                  <option value="CATEGORY">Category</option>
                  <option value="SERIES">Series</option>
                  <option value="AUTHOR">Author</option>
                </select>

                <select
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm focus:border-zinc-400 focus:outline-none disabled:opacity-40"
                  value={newItemSlug}
                  onChange={(e) => setNewItemSlug(e.target.value)}
                  disabled={newItemType === "ARTICLE"}
                >
                  <option value="">Select…</option>
                  {(newItemType === "CATEGORY" ? categories : newItemType === "SERIES" ? series : authors).map((x) => (
                    <option key={x.slug} value={x.slug}>{x.name}</option>
                  ))}
                </select>

                <input
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-40"
                  value={newItemOverrideTitle}
                  onChange={(e) => setNewItemOverrideTitle(e.target.value)}
                  placeholder="Override title (optional)"
                  disabled={newItemType === "ARTICLE"}
                />

                <button
                  type="button"
                  className="w-full rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                  disabled={busy || !selectedModule || newItemType === "ARTICLE"}
                  onClick={() => void addTaxonomyItem()}
                >
                  + Add item
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* ── RIGHT: Module editor ── */}
        <section>
          {!selectedModule ? (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200">
              <div className="text-center">
                <div className="text-3xl text-zinc-200">📦</div>
                <p className="mt-2 text-sm text-zinc-400">Select a module from the left to start editing.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Module header bar */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-serif text-lg font-bold text-zinc-900">
                      {selectedModule.title || "Untitled Module"}
                    </h2>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(moduleStatus(selectedModule).tone)}`}>
                      {moduleStatus(selectedModule).label}
                    </span>
                  </div>
                  {selectedModule.subtitle && (
                    <p className="mt-0.5 text-sm text-zinc-500">{selectedModule.subtitle}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    {selectedModule.items?.length ?? 0} items · Order #{selectedModule.order}
                    {selectedModule.publish_at && ` · Publishes ${new Date(selectedModule.publish_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                    onClick={() => void duplicateSelectedModule()}
                    disabled={busy}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      moduleStatus(selectedModule).tone === "green"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                    }`}
                    onClick={() => {
                      if (moduleStatus(selectedModule).tone === "green") {
                        void expireNow();
                      } else {
                        void publishNow();
                      }
                    }}
                    disabled={busy}
                  >
                    {moduleStatus(selectedModule).tone === "green" ? "Expire now" : "Publish now"}
                  </button>
                </div>
              </div>

              {moduleWindowError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  ⚠ {moduleWindowError}
                </div>
              )}

              {/* Settings accordion */}
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                >
                  <span className="text-sm font-semibold text-zinc-700">⚙ Module Settings</span>
                  <span className="text-zinc-400 text-xs">{settingsOpen ? "▲ Hide" : "▼ Show"}</span>
                </button>

                {settingsOpen && (
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-zinc-500">Title</div>
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                          value={selectedModule.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, title: v } : m)));
                          }}
                          onBlur={(e) => void updateModule({ title: e.target.value })}
                          disabled={busy}
                        />
                      </label>

                      <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-zinc-500">Subtitle</div>
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                          value={selectedModule.subtitle}
                          onChange={(e) => {
                            const v = e.target.value;
                            setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, subtitle: v } : m)));
                          }}
                          onBlur={(e) => void updateModule({ subtitle: e.target.value })}
                          disabled={busy}
                        />
                      </label>

                      <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-zinc-500">Display Order</div>
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                          type="number"
                          value={selectedModule.order}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, order: v } : m)));
                          }}
                          onBlur={(e) => void updateModule({ order: Number(e.target.value) })}
                          disabled={busy}
                        />
                      </label>

                      <label className="flex items-center gap-2.5 self-end rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-100 transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                          checked={selectedModule.is_active}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, is_active: v } : m)));
                            void updateModule({ is_active: v });
                          }}
                          disabled={busy}
                        />
                        <span className="text-zinc-700 font-medium">Active</span>
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="text-sm">
                        <div className="mb-1 text-xs font-medium text-zinc-500">Publish at</div>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                            type="datetime-local"
                            value={toLocalInputValue(selectedModule.publish_at)}
                            onChange={(e) => {
                              const iso = fromLocalInputValue(e.target.value);
                              setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, publish_at: iso } : m)));
                            }}
                            onBlur={(e) => void updateModule({ publish_at: fromLocalInputValue(e.target.value) })}
                            disabled={busy}
                          />
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                            onClick={() => void updateModule({ publish_at: null })}
                            disabled={busy}
                            title="Clear publish date"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="mb-1 text-xs font-medium text-zinc-500">Expires at</div>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                            type="datetime-local"
                            value={toLocalInputValue(selectedModule.expires_at)}
                            onChange={(e) => {
                              const iso = fromLocalInputValue(e.target.value);
                              setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, expires_at: iso } : m)));
                            }}
                            onBlur={(e) => void updateModule({ expires_at: fromLocalInputValue(e.target.value) })}
                            disabled={busy}
                          />
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                            onClick={() => void updateModule({ expires_at: null })}
                            disabled={busy}
                            title="Clear expiry date"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tools accordion */}
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors"
                  onClick={() => setToolsOpen(!toolsOpen)}
                >
                  <span className="text-sm font-semibold text-zinc-700">🧰 Bulk Tools</span>
                  <span className="text-zinc-400 text-xs">{toolsOpen ? "▲ Hide" : "▼ Show"}</span>
                </button>

                {toolsOpen && (
                  <div className="border-t border-zinc-100 px-5 py-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Quick fill */}
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                        <div className="text-xs font-semibold text-zinc-600">Auto-fill articles</div>
                        <p className="mt-1 text-[11px] text-zinc-400">Add newest published articles not already in this module.</p>
                        <div className="mt-2 flex gap-2">
                          <input
                            className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-center focus:border-zinc-400 focus:outline-none"
                            type="number"
                            min={1}
                            max={20}
                            value={bulkAddCount}
                            onChange={(e) => setBulkAddCount(Number(e.target.value))}
                            disabled={busy}
                          />
                          <button
                            type="button"
                            className="flex-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                            disabled={busy || latestPublishedArticles.length === 0}
                            onClick={() => void appendLatestPublishedArticles(bulkAddCount)}
                          >
                            Fill
                          </button>
                        </div>
                      </div>

                      {/* Copy from */}
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                        <div className="text-xs font-semibold text-zinc-600">Copy from module</div>
                        <p className="mt-1 text-[11px] text-zinc-400">Replace items with another module&apos;s content.</p>
                        <div className="mt-2 flex gap-2">
                          <select
                            className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs focus:border-zinc-400 focus:outline-none"
                            value={copyFromModuleId ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCopyFromModuleId(v ? Number(v) : null);
                            }}
                          >
                            <option value="">Select…</option>
                            {modules
                              .filter((m) => m.id !== selectedModule.id)
                              .sort((a, b) => a.id - b.id)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.title || `#${m.id}`}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                            disabled={busy || !copyFromModuleId}
                            onClick={() => {
                              if (!copyFromModuleId) return;
                              void copyItemsFromModule(copyFromModuleId);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* Clear all */}
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                        <div className="text-xs font-semibold text-zinc-600">Clear all</div>
                        <p className="mt-1 text-[11px] text-zinc-400">Remove all items from this module.</p>
                        <div className="mt-2">
                          <button
                            type="button"
                            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                            disabled={busy || !selectedModule.items?.length}
                            onClick={() => void clearAllItems()}
                          >
                            Clear all items
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Items list ── */}
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                  <h3 className="text-sm font-semibold text-zinc-700">
                    Items
                    <span className="ml-1.5 text-zinc-400 font-normal">({selectedModule.items?.length ?? 0})</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">Changes save automatically. Use ↑↓ to reorder.</p>
                </div>

                {selectedModule.items?.length ? (
                  <ul className="divide-y divide-zinc-100">
                    {sortByOrder(selectedModule.items).map((it, idx) => {
                      const title =
                        it.override_title ||
                        (it.item_type === "ARTICLE" && it.article
                          ? it.article.title
                          : it.item_type === "CATEGORY" && it.category
                            ? it.category.name
                            : it.item_type === "SERIES" && it.series
                              ? it.series.name
                              : it.item_type === "AUTHOR" && it.author
                                ? it.author.name
                                : "(missing)");

                      const subtitle =
                        it.item_type === "ARTICLE" && it.article
                          ? `/${it.article.slug}`
                          : it.item_type === "CATEGORY" && it.category
                            ? `/categories/${it.category.slug}`
                            : it.item_type === "SERIES" && it.series
                              ? `/series/${it.series.slug}`
                              : it.item_type === "AUTHOR" && it.author
                                ? `/authors/${it.author.slug}`
                                : "";

                      return (
                        <li key={it.id} className="group px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                          <div className="flex items-start gap-4">
                            {/* Position number */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-400 group-hover:bg-zinc-200 transition-colors">
                              {idx + 1}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  it.item_type === "ARTICLE"
                                    ? "bg-blue-50 text-blue-600"
                                    : it.item_type === "CATEGORY"
                                      ? "bg-purple-50 text-purple-600"
                                      : it.item_type === "SERIES"
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-emerald-50 text-emerald-600"
                                }`}>
                                  {it.item_type}
                                </span>
                                <h4 className="truncate font-medium text-zinc-900 text-sm">{title}</h4>
                              </div>
                              {subtitle && <p className="mt-0.5 text-xs text-zinc-400 truncate">{subtitle}</p>}

                              {/* Inline override fields (compact) */}
                              <div className="mt-2 flex gap-2">
                                <input
                                  className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none"
                                  value={it.override_title || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setModules((prev) =>
                                      prev.map((m) =>
                                        m.id === selectedModule.id
                                          ? { ...m, items: m.items.map((x) => (x.id === it.id ? { ...x, override_title: v } : x)) }
                                          : m
                                      )
                                    );
                                  }}
                                  onBlur={(e) => void updateItemOverrides(it.id, { override_title: e.target.value })}
                                  placeholder="Custom title…"
                                  disabled={busy}
                                />
                                {it.item_type === "ARTICLE" && (
                                  <input
                                    className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none"
                                    value={it.override_dek || ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setModules((prev) =>
                                        prev.map((m) =>
                                          m.id === selectedModule.id
                                            ? { ...m, items: m.items.map((x) => (x.id === it.id ? { ...x, override_dek: v } : x)) }
                                            : m
                                        )
                                      );
                                    }}
                                    onBlur={(e) => void updateItemOverrides(it.id, { override_dek: e.target.value })}
                                    placeholder="Custom subtitle…"
                                    disabled={busy}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 transition-colors"
                                onClick={() => void moveItem(it.id, -1)}
                                disabled={busy}
                                title="Move up"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                type="button"
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 transition-colors"
                                onClick={() => void moveItem(it.id, 1)}
                                disabled={busy}
                                title="Move down"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              <button
                                type="button"
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                                onClick={() => void removeItem(it.id)}
                                disabled={busy}
                                title="Remove"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <div className="text-2xl text-zinc-200">📝</div>
                    <p className="mt-2 text-sm text-zinc-400">No items yet. Add articles from the sidebar to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
