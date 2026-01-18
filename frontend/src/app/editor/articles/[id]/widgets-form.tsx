"use client";

import { useState } from "react";
import { apiPatch } from "../../_shared";

type Widget =
  | { type: "pull_quote"; text: string; attribution?: string | null }
  | { type: "related_card"; articleId: number };

type Props = {
  id: number;
  widgets: Widget[];
};

export default function WidgetsForm({ id, widgets }: Props) {
  const [form, setForm] = useState<Widget[]>(widgets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addPullQuote() {
    setForm((prev) => [...prev, { type: "pull_quote", text: "" }]);
  }
  function addRelatedCard() {
    setForm((prev) => [...prev, { type: "related_card", articleId: 0 }]);
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
    } catch (e) {
      setError("Save failed. Check your permissions and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex gap-2">
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
          onClick={addRelatedCard}
        >
          + Related Card
        </button>
      </div>
      <ul className="space-y-4">
        {form.map((w, idx) => (
          <li key={idx} className="rounded-xl border border-zinc-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{w.type}</div>
              <button
                type="button"
                className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                onClick={() => removeWidget(idx)}
              >
                Remove
              </button>
            </div>
            {w.type === "pull_quote" ? (
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={w.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    setForm((prev) =>
                      prev.map((ww, i) => (i === idx ? { ...ww, text } : ww)),
                    );
                  }}
                  placeholder="Quote text"
                />
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={w.attribution ?? ""}
                  onChange={(e) => {
                    const attribution = e.target.value;
                    setForm((prev) =>
                      prev.map((ww, i) => (i === idx ? { ...ww, attribution } : ww)),
                    );
                  }}
                  placeholder="Attribution (optional)"
                />
              </div>
            ) : w.type === "related_card" ? (
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                type="number"
                value={w.articleId}
                onChange={(e) => {
                  const articleId = Number(e.target.value);
                  setForm((prev) =>
                    prev.map((ww, i) => (i === idx ? { ...ww, articleId } : ww)),
                  );
                }}
                placeholder="Related article ID"
              />
            ) : null}
          </li>
        ))}
      </ul>
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
