"use client";

import { useState } from "react";
import { apiPatch } from "../../_shared";

type Widget =
  | { type: "pull_quote"; text: string; attribution?: string | null }
  | { type: "related_card"; articleId: number }
  | { type: "youtube"; videoId: string; title?: string | null; caption?: string | null }
  | { type: "gallery"; mediaIds: number[]; title?: string | null; caption?: string | null }
  | { type: "image"; mediaId: number; altText?: string | null; caption?: string | null }
  | { type: "embed"; provider: string; url: string; title?: string | null; caption?: string | null }
  | { type: "callout"; variant: "note" | "tip" | "warning"; title?: string | null; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "divider" };

type Props = {
  id: number;
  widgets: Widget[];
};

function parseIdList(input: string): number[] {
  // Accept: "1,2,3" or "1 2 3" etc.
  const parts = input
    .split(/[^0-9]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
  const nums = parts.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  // Deduplicate preserving order
  const out: number[] = [];
  const seen = new Set<number>();
  for (const n of nums) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export default function WidgetsForm({ id, widgets }: Props) {
  const [form, setForm] = useState<Widget[]>(widgets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function moveWidget(from: number, to: number) {
    setForm((prev) => {
      if (from === to) return prev;
      if (from < 0 || from >= prev.length) return prev;
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  function widgetHeader(title: string, idx: number) {
    return (
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-medium">{title}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => moveWidget(idx, idx - 1)}
            disabled={idx === 0}
            aria-label="Move widget up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => moveWidget(idx, idx + 1)}
            disabled={idx === form.length - 1}
            aria-label="Move widget down"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            onClick={() => removeWidget(idx)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  function addPullQuote() {
    setForm((prev) => [...prev, { type: "pull_quote", text: "" }]);
  }
  function addRelatedCard() {
    setForm((prev) => [...prev, { type: "related_card", articleId: 0 }]);
  }
  function addYouTube() {
    setForm((prev) => [...prev, { type: "youtube", videoId: "" }]);
  }
  function addGallery() {
    setForm((prev) => [...prev, { type: "gallery", mediaIds: [] }]);
  }
  function addImage() {
    setForm((prev) => [...prev, { type: "image", mediaId: 0 }]);
  }
  function addEmbed() {
    setForm((prev) => [...prev, { type: "embed", provider: "youtube", url: "", title: "", caption: "" }]);
  }
  function addCallout() {
    setForm((prev) => [...prev, { type: "callout", variant: "note", title: "", text: "" }]);
  }
  function addHeading() {
    setForm((prev) => [...prev, { type: "heading", level: 2, text: "" }]);
  }
  function addDivider() {
    setForm((prev) => [...prev, { type: "divider" }]);
  }

  function removeWidget(idx: number) {
    setForm((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPatch(`/v1/editor/articles/${id}/`, {
        widgets_json: { widgets: form },
      });
      setSuccess(true);
    } catch {
      setError("Save failed. Check your permissions and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addPullQuote}
          >
            + Pull Quote
          </button>

          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addHeading}
          >
            + Heading
          </button>

          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addDivider}
          >
            + Divider
          </button>

          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addRelatedCard}
          >
            + Related Card
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addYouTube}
          >
            + YouTube
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addGallery}
          >
            + Gallery
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={addImage}
          >
            + Image
          </button>
          <button
            type="button"
            onClick={addEmbed}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            + Embed
          </button>
          <button
            type="button"
            onClick={addCallout}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            + Callout
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {form.map((w, idx) => {
            if (w.type === "heading") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Heading", idx)}

                  <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                    <select
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.level}
                      onChange={(e) => {
                        const level = Number(e.target.value) as 2 | 3 | 4;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, level } : ww)));
                      }}
                    >
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                      <option value={4}>H4</option>
                    </select>

                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, text } : ww)));
                      }}
                      placeholder="Heading text"
                    />
                  </div>
                </div>
              );
            }

            if (w.type === "divider") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Divider", idx)}
                   <div className="mt-3">
                     <hr className="border-zinc-200" />
                   </div>
                 </div>
               );
            }

            if (w.type === "pull_quote") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Pull Quote", idx)}

                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, text } : ww)));
                      }}
                      placeholder="Quote text"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.attribution ?? ""}
                      onChange={(e) => {
                        const attribution = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, attribution } : ww)));
                      }}
                      placeholder="Attribution (optional)"
                    />
                  </div>
                </div>
              );
            }

            if (w.type === "related_card") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Related Card", idx)}

                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    type="number"
                    value={w.articleId}
                    onChange={(e) => {
                      const articleId = Number(e.target.value);
                      setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, articleId } : ww)));
                    }}
                    placeholder="Related article ID"
                  />
                </div>
              );
            }

            if (w.type === "youtube") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("YouTube", idx)}

                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.videoId}
                      onChange={(e) => {
                        const videoId = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, videoId } : ww)));
                      }}
                      placeholder="YouTube videoId (e.g. dQw4w9WgXcQ)"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.title ?? ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, title } : ww)));
                      }}
                      placeholder="Title (optional)"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.caption ?? ""}
                      onChange={(e) => {
                        const caption = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, caption } : ww)));
                      }}
                      placeholder="Caption (optional)"
                    />
                  </div>
                </div>
              );
            }

            if (w.type === "gallery") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Gallery", idx)}

                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={(w.mediaIds ?? []).join(", ")}
                      onChange={(e) => {
                        const mediaIds = parseIdList(e.target.value);
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, mediaIds } : ww)));
                      }}
                      placeholder="Media IDs (comma-separated), e.g. 12, 34, 56"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.title ?? ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, title } : ww)));
                      }}
                      placeholder="Title (optional)"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.caption ?? ""}
                      onChange={(e) => {
                        const caption = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, caption } : ww)));
                      }}
                      placeholder="Caption (optional)"
                    />
                    <div className="text-xs text-zinc-500">
                      Tip: upload media in the Media section first, then paste the created IDs here.
                    </div>
                  </div>
                </div>
              );
            }

            if (w.type === "image") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Image", idx)}

                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={String(w.mediaId ?? "")}
                      onChange={(e) => {
                        const mediaId = Number(e.target.value);
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, mediaId } : ww)));
                      }}
                      placeholder="Media ID, e.g. 123"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.altText ?? ""}
                      onChange={(e) => {
                        const altText = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, altText } : ww)));
                      }}
                      placeholder="Alt text (optional)"
                    />
                    <input
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={w.caption ?? ""}
                      onChange={(e) => {
                        const caption = e.target.value;
                        setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, caption } : ww)));
                      }}
                      placeholder="Caption (optional)"
                    />
                    <div className="text-xs text-zinc-500">
                      Tip: upload media in the Media section first, then paste the created ID here.
                    </div>
                  </div>
                </div>
              );
            }

            if (w.type === "embed") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Embed", idx)}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Provider</div>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={w.provider}
                        onChange={(e) => {
                          const provider = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, provider } : ww)));
                        }}
                        placeholder="youtube"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">URL</div>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={w.url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, url } : ww)));
                        }}
                        placeholder="https://..."
                      />
                    </label>

                    <label className="text-sm">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Title (optional)</div>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={w.title ?? ""}
                        onChange={(e) => {
                          const title = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, title } : ww)));
                        }}
                      />
                    </label>

                    <label className="text-sm">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Caption (optional)</div>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={w.caption ?? ""}
                        onChange={(e) => {
                          const caption = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, caption } : ww)));
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            }

            if (w.type === "callout") {
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 p-4">
                  {widgetHeader("Callout", idx)}

                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-sm">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Variant</div>
                      <select
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={w.variant}
                        onChange={(e) => {
                          const variant = e.target.value as "note" | "tip" | "warning";
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, variant } : ww)));
                        }}
                      >
                        <option value="note">Note</option>
                        <option value="tip">Tip</option>
                        <option value="warning">Warning</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Title (optional)</div>
                      <input
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={w.title ?? ""}
                        onChange={(e) => {
                          const title = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, title } : ww)));
                        }}
                        placeholder="Optional title"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Text</div>
                      <textarea
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={w.text}
                        onChange={(e) => {
                          const text = e.target.value;
                          setForm((prev) => prev.map((ww, i) => (i === idx ? { ...ww, text } : ww)));
                        }}
                        placeholder="Callout text"
                        rows={4}
                      />
                    </label>
                  </div>
                </div>
              );
            }
          })}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            onClick={() => setForm(widgets)}
          >
            Reset
          </button>
          <button
            type="submit"
            className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-all hover:bg-blue-700"
            disabled={saving}
          >
            {saving && <span className="mr-2 h-4 w-4 animate-spin">⏳</span>}
            Save Changes
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">Changes saved successfully!</div>}
      </form>
    </section>
  );
}
