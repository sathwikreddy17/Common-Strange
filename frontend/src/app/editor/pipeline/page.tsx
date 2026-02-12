"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = "";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserData = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_staff: boolean;
};

type Article = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  status: "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED";
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
  category: { name: string; slug: string } | null;
  authors: Array<{ name: string; slug: string }>;
};

type PipelineData = {
  my_drafts: Article[];
  awaiting_review: Article[];
  approved: Article[];
  scheduled: Article[];
  recently_published: Article[];
};

/* ------------------------------------------------------------------ */
/*  API Helpers                                                        */
/* ------------------------------------------------------------------ */

async function fetchCurrentUser(): Promise<UserData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/me/`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch { return null; }
}

async function fetchPipeline(): Promise<PipelineData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/editor/pipeline/`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function getCSRF(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/csrf/`, { credentials: "include" });
    const data = await res.json();
    return data.csrfToken || "";
  } catch { return ""; }
}

async function pipelineAction(articleId: number, endpoint: string): Promise<boolean> {
  try {
    const csrf = await getCSRF();
    const res = await fetch(`${API_BASE}/v1/editor/articles/${articleId}/${endpoint}/`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
    });
    return res.ok;
  } catch { return false; }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Column colour config                                               */
/* ------------------------------------------------------------------ */

type ColumnTheme = {
  dot: string;
  countBg: string;
  border: string;
  emptyBg: string;
  cardHover: string;
  btnPrimary: string;
};

const COLUMN_THEMES: Record<string, ColumnTheme> = {
  draft: {
    dot: "bg-zinc-400",
    countBg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
    border: "border-t-zinc-400",
    emptyBg: "bg-zinc-50 dark:bg-zinc-800/40",
    cardHover: "hover:border-zinc-300 dark:hover:border-zinc-600",
    btnPrimary: "bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100",
  },
  review: {
    dot: "bg-amber-400",
    countBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
    border: "border-t-amber-400",
    emptyBg: "bg-amber-50/50 dark:bg-amber-950/20",
    cardHover: "hover:border-amber-300 dark:hover:border-amber-700",
    btnPrimary: "bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400",
  },
  approved: {
    dot: "bg-blue-500",
    countBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200",
    border: "border-t-blue-500",
    emptyBg: "bg-blue-50/50 dark:bg-blue-950/20",
    cardHover: "hover:border-blue-300 dark:hover:border-blue-700",
    btnPrimary: "bg-blue-600 text-white hover:bg-blue-500",
  },
  scheduled: {
    dot: "bg-purple-500",
    countBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200",
    border: "border-t-purple-500",
    emptyBg: "bg-purple-50/50 dark:bg-purple-950/20",
    cardHover: "hover:border-purple-300 dark:hover:border-purple-700",
    btnPrimary: "bg-purple-600 text-white hover:bg-purple-500",
  },
  published: {
    dot: "bg-emerald-500",
    countBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
    border: "border-t-emerald-500",
    emptyBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    cardHover: "hover:border-emerald-300 dark:hover:border-emerald-700",
    btnPrimary: "bg-emerald-600 text-white hover:bg-emerald-500",
  },
};

/* ------------------------------------------------------------------ */
/*  Article Card                                                       */
/* ------------------------------------------------------------------ */

function ArticleCard({
  article,
  theme,
  actions,
  onAction,
}: {
  article: Article;
  theme: ColumnTheme;
  actions: { label: string; action: string }[];
  onAction: (id: number, action: string) => void;
}) {
  return (
    <div className={`rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-3.5 transition-colors ${theme.cardHover}`}>
      <Link href={`/editor/articles/${article.id}`} className="font-medium text-sm text-zinc-900 dark:text-white hover:underline line-clamp-2 leading-snug">
        {article.title || "Untitled"}
      </Link>

      {article.dek && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1">{article.dek}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        {article.category && (
          <span className="rounded bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 text-zinc-500 dark:text-zinc-400">{article.category.name}</span>
        )}
        {article.authors?.length > 0 && (
          <span>{article.authors.map((a) => a.name).join(", ")}</span>
        )}
        <span className="ml-auto">{relTime(article.updated_at)}</span>
      </div>

      {actions.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {actions.map((act) => (
            <button
              key={act.action}
              onClick={() => onAction(article.id, act.action)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${theme.btnPrimary}`}
            >
              {act.label}
            </button>
          ))}
          <Link href={`/editor/articles/${article.id}`} className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Edit →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Column                                                    */
/* ------------------------------------------------------------------ */

function PipelineColumn({
  icon,
  title,
  articles,
  emptyMsg,
  themeKey,
  actions,
  onAction,
}: {
  icon: string;
  title: string;
  articles: Article[];
  emptyMsg: string;
  themeKey: string;
  actions: { label: string; action: string }[];
  onAction: (id: number, action: string) => void;
}) {
  const t = COLUMN_THEMES[themeKey] || COLUMN_THEMES.draft;

  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-700 border-t-4 ${t.border} bg-white dark:bg-zinc-900/60 flex flex-col`}>
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{icon} {title}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${t.countBg}`}>{articles.length}</span>
      </div>

      {/* content */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[60vh]">
        {articles.length === 0 ? (
          <div className={`rounded-lg ${t.emptyBg} py-8 text-center text-xs text-zinc-400 dark:text-zinc-500`}>
            {emptyMsg}
          </div>
        ) : (
          articles.map((a) => (
            <ArticleCard key={a.id} article={a} theme={t} actions={actions} onAction={onAction} />
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function PipelinePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [u, p] = await Promise.all([fetchCurrentUser(), fetchPipeline()]);
      if (!u) setError("Please log in to access the editorial pipeline.");
      else if (!p) setError("Failed to load pipeline data. You may not have editor permissions.");
      else { setUser(u); setPipeline(p); }
      setLoading(false);
    })();
  }, []);

  const handleAction = async (articleId: number, action: string) => {
    setBusy(articleId);
    const ep = action === "submit" ? "submit" : action === "approve" ? "approve" : "publish_now";
    const ok = await pipelineAction(articleId, ep);
    if (ok) {
      const p = await fetchPipeline();
      if (p) setPipeline(p);
    } else {
      alert(`Failed to ${action}. Please try again.`);
    }
    setBusy(null);
  };

  const isEditor = user && (user.role === "editor" || user.role === "publisher" || user.is_staff);
  const isPublisher = user && (user.role === "publisher" || user.is_staff);

  /* loading */
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-800 dark:border-t-white" />
        </div>
      </main>
    );
  }

  /* error */
  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-8 text-center">
          <p className="text-red-800 dark:text-red-300">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-sm text-red-600 dark:text-red-400 hover:underline">Log in →</Link>
        </div>
      </main>
    );
  }

  /* ---- stats ---- */
  const totalArticles = (pipeline?.my_drafts.length || 0) + (pipeline?.awaiting_review.length || 0) + (pipeline?.approved.length || 0) + (pipeline?.scheduled.length || 0) + (pipeline?.recently_published.length || 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* ---- busy overlay ---- */}
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/50">
          <div className="rounded-xl bg-white dark:bg-zinc-800 p-6 shadow-2xl text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-zinc-200 dark:border-zinc-600 border-t-zinc-800 dark:border-t-white mx-auto" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Processing…</p>
          </div>
        </div>
      )}

      {/* ---- header ---- */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Editorial Pipeline</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {totalArticles} article{totalArticles !== 1 ? "s" : ""} across all stages
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {(user.display_name || user.username).charAt(0).toUpperCase()}
                </span>
                {user.display_name || user.username}
              </span>
            )}
            <Link href="/editor/articles/new" className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">+ New Article</Link>
            <Link href="/editor" className="text-zinc-400 dark:text-zinc-500 hover:underline">← Dashboard</Link>
          </div>
        </div>

        {/* ---- workflow ribbon ---- */}
        <div className="mt-5 flex items-center gap-1 text-xs overflow-x-auto pb-1">
          {[
            { label: "Draft", count: pipeline?.my_drafts.length || 0, dot: "bg-zinc-400" },
            ...(isEditor ? [{ label: "Review", count: pipeline?.awaiting_review.length || 0, dot: "bg-amber-400" }] : []),
            ...(isPublisher ? [{ label: "Approved", count: pipeline?.approved.length || 0, dot: "bg-blue-500" }] : []),
            ...(isPublisher ? [{ label: "Scheduled", count: pipeline?.scheduled.length || 0, dot: "bg-purple-500" }] : []),
            { label: "Published", count: pipeline?.recently_published.length || 0, dot: "bg-emerald-500" },
          ].map((s, i, arr) => (
            <span key={s.label} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="font-medium text-zinc-600 dark:text-zinc-400">{s.label}</span>
              <span className="text-zinc-400 dark:text-zinc-600">{s.count}</span>
              {i < arr.length - 1 && (
                <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mx-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 5 7 7-7 7" /></svg>
              )}
            </span>
          ))}
        </div>
      </header>

      {/* ---- Kanban columns ---- */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${[true, isEditor, isPublisher, isPublisher, true].filter(Boolean).length}, minmax(0, 1fr))` }}>
        <PipelineColumn
          icon="📝"
          title="My Drafts"
          articles={pipeline?.my_drafts || []}
          emptyMsg="No drafts — start writing!"
          themeKey="draft"
          actions={[{ label: "Submit", action: "submit" }]}
          onAction={handleAction}
        />

        {isEditor && (
          <PipelineColumn
            icon="👀"
            title="In Review"
            articles={pipeline?.awaiting_review || []}
            emptyMsg="No articles to review"
            themeKey="review"
            actions={[{ label: "Approve", action: "approve" }]}
            onAction={handleAction}
          />
        )}

        {isPublisher && (
          <PipelineColumn
            icon="✅"
            title="Approved"
            articles={pipeline?.approved || []}
            emptyMsg="Nothing approved yet"
            themeKey="approved"
            actions={[{ label: "Publish", action: "publish" }]}
            onAction={handleAction}
          />
        )}

        {isPublisher && (
          <PipelineColumn
            icon="📅"
            title="Scheduled"
            articles={pipeline?.scheduled || []}
            emptyMsg="No scheduled articles"
            themeKey="scheduled"
            actions={[{ label: "Publish Now", action: "publish" }]}
            onAction={handleAction}
          />
        )}

        <PipelineColumn
          icon="🎉"
          title="Published"
          articles={pipeline?.recently_published || []}
          emptyMsg="No recent publications"
          themeKey="published"
          actions={[]}
          onAction={handleAction}
        />
      </div>

      {/* ---- Workflow guide ---- */}
      <section className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-5">
        <h3 className="font-medium text-zinc-700 dark:text-zinc-300 text-sm mb-3">Publishing Workflow</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: "Draft", bg: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300" },
            { label: "In Review", bg: "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200" },
            { label: "Approved", bg: "bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200" },
            { label: "Scheduled", bg: "bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200" },
            { label: "Published", bg: "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200" },
          ].map((step, i, arr) => (
            <span key={step.label} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-medium ${step.bg}`}>{step.label}</span>
              {i < arr.length - 1 && <span className="text-zinc-300 dark:text-zinc-600">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <strong>Writers</strong> create & submit · <strong>Editors</strong> review & approve · <strong>Publishers</strong> schedule & publish
        </p>
      </section>
    </main>
  );
}
