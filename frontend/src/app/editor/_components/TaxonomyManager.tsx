"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, formatAuthHint, unwrapPaginated } from "../_shared";

type FieldSpec = {
  key: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "textarea";
};

type Props = {
  title: string;
  description?: string;
  listPath: string;
  detailPathPrefix: string;
  fields: FieldSpec[];
  icon?: string;
  accentColor?: string;
};

type Item = { slug: string } & Record<string, unknown>;

function buildInitialForm(fields: FieldSpec[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = "";
  return out;
}

/* Colourful avatar circle from name */
function ItemAvatar({ name }: { name: string }) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-white text-sm"
      style={{ backgroundColor: `hsl(${hue}, 50%, 55%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function TaxonomyManager(props: Props) {
  const { title, description, listPath, detailPathPrefix, fields, icon = "📋", accentColor = "zinc" } = props;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(fields));
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const requiredKeys = useMemo(() => fields.filter((f) => f.required !== false).map((f) => f.key), [fields]);
  const canSubmit = useMemo(() => requiredKeys.every((k) => String(form[k] ?? "").trim().length > 0), [form, requiredKeys]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Item[] | { results: Item[] }>(listPath);
      setItems(unwrapPaginated(data));
    } catch (e) {
      setItems([]);
      setError(formatAuthHint(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listPath]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      for (const f of fields) payload[f.key] = String(form[f.key] ?? "").trim();
      await apiPost(listPath, payload);
      setForm(buildInitialForm(fields));
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(formatAuthHint(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(slug: string) {
    if (!confirm(`Delete "${slug}"?`)) return;
    setError(null);
    try {
      await apiDelete(`${detailPathPrefix}${encodeURIComponent(slug)}/`);
      await load();
    } catch (e) {
      setError(formatAuthHint(e));
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) => {
      const name = String((it as Record<string, unknown>).name ?? it.slug).toLowerCase();
      const slug = it.slug.toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [items, search]);

  /* Accent colour map */
  const accents: Record<string, { badge: string; btn: string; ring: string }> = {
    cyan: { badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200", btn: "bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400", ring: "focus:ring-cyan-300 dark:focus:ring-cyan-700" },
    amber: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200", btn: "bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400", ring: "focus:ring-amber-300 dark:focus:ring-amber-700" },
    emerald: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400", ring: "focus:ring-emerald-300 dark:focus:ring-emerald-700" },
    violet: { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200", btn: "bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400", ring: "focus:ring-violet-300 dark:focus:ring-violet-700" },
    zinc: { badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300", btn: "bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100", ring: "focus:ring-zinc-300 dark:focus:ring-zinc-600" },
  };
  const ac = accents[accentColor] || accents.zinc;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">{icon}</span> {title}
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ac.badge}`}>{loading ? "…" : items.length}</span>
          </h1>
          {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${ac.btn}`}
        >
          {showCreate ? "Cancel" : `+ New ${title.replace(/s$/, "")}`}
        </button>
      </header>

      {/* ---- Error ---- */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* ---- Create form (collapsible) ---- */}
      {showCreate && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Create New</h2>
          <form onSubmit={onCreate} className="space-y-4">
            {fields.map((f) => (
              <label key={f.key} className="block">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {f.label ?? f.key}
                  {f.required !== false && <span className="text-red-500 ml-1">*</span>}
                </div>
                {f.type === "textarea" ? (
                  <textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={`mt-1 min-h-20 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${ac.ring}`}
                    placeholder={f.placeholder ?? f.label ?? f.key}
                  />
                ) : (
                  <input
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={`mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${ac.ring}`}
                    placeholder={f.placeholder ?? f.label ?? f.key}
                  />
                )}
              </label>
            ))}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${ac.btn}`}
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </form>
        </section>
      )}

      {/* ---- Search ---- */}
      {items.length > 3 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${ac.ring}`}
          />
        </div>
      )}

      {/* ---- List ---- */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
          No {title.toLowerCase()} yet.{" "}
          <button onClick={() => setShowCreate(true)} className="underline">Create one</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">No matches for &ldquo;{search}&rdquo;</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const name = String((it as Record<string, unknown>).name ?? it.slug);
            const desc = String((it as Record<string, unknown>).description ?? (it as Record<string, unknown>).bio ?? "");
            return (
              <div key={it.slug} className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-4 flex items-start gap-3 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                <ItemAvatar name={name} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-900 dark:text-white">{name}</div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{it.slug}</div>
                  {desc && <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{desc}</p>}
                </div>
                <button
                  onClick={() => void onDelete(it.slug)}
                  className="opacity-0 group-hover:opacity-100 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
