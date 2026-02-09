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

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Editor · Modules</h1>
          <p className="mt-2 text-zinc-600">
            Curate homepage and hub modules (Publisher-only). This drives the Aeon-like curated experience.
          </p>
        </div>

        <nav className="text-sm">
          <Link className="text-zinc-700 hover:underline" href="/editor">
            Back
          </Link>
        </nav>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mb-6 rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Placement</div>
            <select
              className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
          </label>

          {placement !== "HOME" ? (
            <label className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scope</div>
              <select
                className="mt-1 min-w-[240px] rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={scopeSlug}
                onChange={(e) => {
                  setScopeSlug(e.target.value);
                  setSelectedModuleId(null);
                }}
              >
                <option value="">Select</option>
                {scopeOptions.map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            className="ml-auto rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => void createModule()}
            disabled={busy || (placement !== "HOME" && !scopeSlug)}
            type="button"
          >
            + New {placementLabel} module
          </button>

          <button
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => void reload()}
            disabled={busy}
            type="button"
          >
            Refresh
          </button>
        </div>

        {placement !== "HOME" ? (
          <p className="mt-3 text-xs text-zinc-500">Tip: pick a scope to view/create modules for that hub.</p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{placementLabel} modules</h2>
            </div>

            <ul className="mt-3 space-y-2">
              {sortByOrder(modules).map((m) => {
                const st = moduleStatus(m);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                        selectedModuleId === m.id ? "border-zinc-400 bg-zinc-50" : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-zinc-900">{m.title || `Module ${m.id}`}</div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${badgeClass(st.tone)}`}>{st.label}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{m.items?.length ?? 0} items</div>
                    </button>
                  </li>
                );
              })}

              {modules.length === 0 ? <li className="text-sm text-zinc-600">No modules yet.</li> : null}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add article</h2>
            <p className="mt-2 text-xs text-zinc-500">Only published articles are listed.</p>

            <ul className="mt-3 max-h-[420px] space-y-2 overflow-auto">
              {publishedArticles.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!selectedModule || busy}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => void addArticle(a.id)}
                    title={a.slug}
                  >
                    <div className="font-medium text-zinc-900">{a.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">#{a.id}</div>
                  </button>
                </li>
              ))}
              {publishedArticles.length === 0 ? <li className="text-sm text-zinc-600">No published articles yet.</li> : null}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add item</h2>
            <p className="mt-2 text-xs text-zinc-500">Articles can be added from the picker above. Taxonomy items need IDs.</p>

            <div className="mt-3 space-y-2">
              <select
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={newItemType}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewItemType(isItemType(v) ? v : "ARTICLE");
                  setNewItemSlug("");
                  setNewItemOverrideTitle("");
                }}
              >
                <option value="ARTICLE">Article</option>
                <option value="CATEGORY">Category</option>
                <option value="SERIES">Series</option>
                <option value="AUTHOR">Author</option>
              </select>

              <select
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={newItemSlug}
                onChange={(e) => setNewItemSlug(e.target.value)}
                disabled={newItemType === "ARTICLE"}
              >
                <option value="">Select…</option>
                {(newItemType === "CATEGORY" ? categories : newItemType === "SERIES" ? series : authors).map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={newItemOverrideTitle}
                onChange={(e) => setNewItemOverrideTitle(e.target.value)}
                placeholder="Override title (optional)"
                disabled={newItemType === "ARTICLE"}
              />

              <button
                type="button"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                disabled={busy || !selectedModule || newItemType === "ARTICLE"}
                onClick={() => void addTaxonomyItem()}
              >
                + Add item
              </button>
            </div>
          </div>
        </aside>

        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">Selected module</h2>

          {!selectedModule ? (
            <p className="mt-2 text-sm text-zinc-600">Select a module to manage items.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-xs ${
                    badgeClass(moduleStatus(selectedModule).tone)
                  }`}
                >
                  {moduleStatus(selectedModule).label}
                </span>

                <button
                  type="button"
                  className="ml-auto rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  onClick={() => void duplicateSelectedModule()}
                  disabled={busy}
                >
                  Duplicate
                </button>
              </div>

              {moduleWindowError ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {moduleWindowError}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Title</div>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtitle</div>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</div>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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

                  <label className="flex items-end gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedModule.is_active}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, is_active: v } : m)));
                        void updateModule({ is_active: v });
                      }}
                      disabled={busy}
                    />
                    <span className="text-sm text-zinc-700">Active</span>
                  </label>

                  <label className="text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Publish at</div>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                      className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      onClick={() => void updateModule({ publish_at: null })}
                      disabled={busy}
                    >
                      Clear
                    </button>
                  </label>

                  <label className="text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expires at</div>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                      className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      onClick={() => void updateModule({ expires_at: null })}
                      disabled={busy}
                    >
                      Clear
                    </button>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => void publishNow()}
                    disabled={busy}
                  >
                    Publish now
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => void expireNow()}
                    disabled={busy}
                  >
                    Expire now
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm text-zinc-600">Items are saved immediately (replace semantics). Use ↑ ↓ to reorder.</p>

              <div className="mt-4">
                {selectedModule.items?.length ? (
                  <ul className="space-y-3">
                    {sortByOrder(selectedModule.items).map((it) => {
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
                          ? `/${it.article.slug} · Article #${it.article.id}`
                          : it.item_type === "CATEGORY" && it.category
                            ? `/categories/${it.category.slug}`
                            : it.item_type === "SERIES" && it.series
                              ? `/series/${it.series.slug}`
                              : it.item_type === "AUTHOR" && it.author
                                ? `/authors/${it.author.slug}`
                                : "";

                      return (
                        <li key={it.id} className="rounded-xl border border-zinc-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-[260px] flex-1">
                              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{it.item_type}</div>
                              <div className="mt-1 font-medium text-zinc-900">{title}</div>
                              {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}

                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Override title</div>
                                  <input
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                                    placeholder="(optional)"
                                    disabled={busy}
                                  />
                                </div>

                                {it.item_type === "ARTICLE" ? (
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Override dek</div>
                                    <input
                                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                                      placeholder="(optional)"
                                      disabled={busy}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                onClick={() => void moveItem(it.id, -1)}
                                disabled={busy}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                onClick={() => void moveItem(it.id, 1)}
                                disabled={busy}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                onClick={() => void removeItem(it.id)}
                                disabled={busy}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-600">No items yet. Add published articles from the left or add taxonomy items.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Selected module editor */}
      {selectedModule ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{placementLabel} module</h2>

            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              onClick={() => void duplicateSelectedModule()}
              disabled={busy}
            >
              Duplicate
            </button>
          </div>

          {moduleWindowError ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {moduleWindowError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Title</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtitle</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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

            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedModule.is_active}
                onChange={(e) => {
                  const v = e.target.checked;
                  setModules((prev) => prev.map((m) => (m.id === selectedModule.id ? { ...m, is_active: v } : m)));
                  void updateModule({ is_active: v });
                }}
                disabled={busy}
              />
              <span className="text-sm text-zinc-700">Active</span>
            </label>

            <label className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Publish at</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                onClick={() => void updateModule({ publish_at: null })}
                disabled={busy}
              >
                Clear
              </button>
            </label>

            <label className="text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expires at</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                className="mt-2 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                onClick={() => void updateModule({ expires_at: null })}
                disabled={busy}
              >
                Clear
              </button>
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">Bulk actions</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void clearAllItems()}
                >
                  Clear all items
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">Clears the module&apos;s item list (replace semantics).</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">Quick fill</div>
              <div className="mt-3 grid gap-2 md:grid-cols-[120px_auto]">
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  max={20}
                  value={bulkAddCount}
                  onChange={(e) => setBulkAddCount(Number(e.target.value))}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  disabled={busy || latestPublishedArticles.length === 0}
                  onClick={() => void appendLatestPublishedArticles(bulkAddCount)}
                >
                  Append latest published articles
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Appends up to 20 newest published articles that aren&apos;t already in this module.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-900">Copy items from…</div>
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={copyFromModuleId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setCopyFromModuleId(v ? Number(v) : null);
                }}
              >
                <option value="">Select a module…</option>
                {modules
                  .filter((m) => m.id !== selectedModule.id)
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} · {m.placement} · {m.title || "(untitled)"}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                disabled={busy || !copyFromModuleId}
                onClick={() => {
                  if (!copyFromModuleId) return;
                  void copyItemsFromModule(copyFromModuleId);
                }}
              >
                Copy
              </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Copies the current items (and overrides) from another module, then you can tweak ordering/overrides.
            </div>
          </div>

          <div className="mt-4">
            {selectedModule.items?.length ? (
              <ul className="space-y-3">
                {sortByOrder(selectedModule.items).map((it) => {
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
                      ? `/${it.article.slug} · Article #${it.article.id}`
                      : it.item_type === "CATEGORY" && it.category
                        ? `/categories/${it.category.slug}`
                        : it.item_type === "SERIES" && it.series
                          ? `/series/${it.series.slug}`
                          : it.item_type === "AUTHOR" && it.author
                            ? `/authors/${it.author.slug}`
                            : "";

                  return (
                    <li key={it.id} className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-[260px] flex-1">
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{it.item_type}</div>
                          <div className="mt-1 font-medium text-zinc-900">{title}</div>
                          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Override title</div>
                              <input
                                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                                placeholder="(optional)"
                                disabled={busy}
                              />
                            </div>

                            {it.item_type === "ARTICLE" ? (
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Override dek</div>
                                <input
                                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                                  placeholder="(optional)"
                                  disabled={busy}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            onClick={() => void moveItem(it.id, -1)}
                            disabled={busy}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            onClick={() => void moveItem(it.id, 1)}
                            disabled={busy}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => void removeItem(it.id)}
                            disabled={busy}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600">No items yet. Add published articles from the left or add taxonomy items.</p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
