"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, formatAuthHint } from "../_shared";

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
  /** e.g. "/v1/editor/tags/" -> detail is "/v1/editor/tags/<slug>/" */
  detailPathPrefix: string;
  fields: FieldSpec[];
};

type Item = { slug: string } & Record<string, unknown>;

function buildInitialForm(fields: FieldSpec[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = "";
  return out;
}

export default function TaxonomyManager(props: Props) {
  const { title, description, listPath, detailPathPrefix, fields } = props;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(fields));
  const [submitting, setSubmitting] = useState(false);

  const requiredKeys = useMemo(() => fields.filter((f) => f.required !== false).map((f) => f.key), [fields]);

  const canSubmit = useMemo(() => {
    return requiredKeys.every((k) => String(form[k] ?? "").trim().length > 0);
  }, [form, requiredKeys]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Item[]>(listPath);
      setItems(data);
    } catch (e) {
      setItems([]);
      setError(formatAuthHint(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath]);

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
      await load();
    } catch (e) {
      setError(formatAuthHint(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(slug: string) {
    if (!confirm(`Delete ${slug}?`)) return;

    setError(null);
    try {
      const detailPath = `${detailPathPrefix}${encodeURIComponent(slug)}/`;
      await apiDelete(detailPath);
      await load();
    } catch (e) {
      setError(formatAuthHint(e));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-zinc-600">{description}</p> : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-medium">Create</h2>
        <form onSubmit={onCreate} className="mt-4 space-y-4">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <div className="text-sm font-medium text-zinc-700">{f.label ?? f.key}</div>
              {f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder={f.placeholder ?? f.key}
                />
              ) : (
                <input
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder={f.placeholder ?? f.key}
                />
              )}
            </label>
          ))}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">List</h2>
        {loading ? (
          <p className="mt-3 text-zinc-600">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-zinc-600">No items (or you are not authenticated/authorized).</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((it) => (
              <li key={it.slug} className="rounded-xl border border-zinc-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{("name" in it ? String((it as unknown as { name?: unknown }).name ?? it.slug) : it.slug)}</div>
                    <div className="mt-1 text-sm text-zinc-500 break-words">{it.slug}</div>
                    {"description" in it && (it as unknown as { description?: unknown }).description ? (
                      <p className="mt-3 text-sm text-zinc-700">{String((it as unknown as { description?: unknown }).description)}</p>
                    ) : null}
                    {"bio" in it && (it as unknown as { bio?: unknown }).bio ? (
                      <p className="mt-3 text-sm text-zinc-700">{String((it as unknown as { bio?: unknown }).bio)}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => void onDelete(it.slug)}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
