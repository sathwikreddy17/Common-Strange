"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = "";

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

async function fetchCurrentUser(): Promise<UserData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/me/`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

async function fetchPipeline(): Promise<PipelineData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/editor/pipeline/`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function submitForReview(articleId: number): Promise<boolean> {
  try {
    const csrfRes = await fetch(`${API_BASE}/v1/auth/csrf/`, { credentials: "include" });
    const csrfData = await csrfRes.json();
    
    const res = await fetch(`${API_BASE}/v1/editor/articles/${articleId}/submit/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfData.csrfToken,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function approveArticle(articleId: number): Promise<boolean> {
  try {
    const csrfRes = await fetch(`${API_BASE}/v1/auth/csrf/`, { credentials: "include" });
    const csrfData = await csrfRes.json();
    
    const res = await fetch(`${API_BASE}/v1/editor/articles/${articleId}/approve/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfData.csrfToken,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function publishNow(articleId: number): Promise<boolean> {
  try {
    const csrfRes = await fetch(`${API_BASE}/v1/auth/csrf/`, { credentials: "include" });
    const csrfData = await csrfRes.json();
    
    const res = await fetch(`${API_BASE}/v1/editor/articles/${articleId}/publish_now/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfData.csrfToken,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PUBLISHED: "bg-green-100 text-green-800",
  };
  
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    IN_REVIEW: "In Review",
    SCHEDULED: "Scheduled",
    PUBLISHED: "Published",
  };
  
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-zinc-100 text-zinc-700"}`}>
      {labels[status] || status}
    </span>
  );
}

function ArticleCard({ 
  article, 
  actions,
  onAction,
}: { 
  article: Article; 
  actions: Array<{ label: string; action: string; style?: "primary" | "secondary" }>;
  onAction: (articleId: number, action: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/editor/articles/${article.id}`}
            className="font-medium text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1"
          >
            {article.title || "Untitled"}
          </Link>
          {article.dek && (
            <p className="mt-1 text-sm text-zinc-500 line-clamp-1">{article.dek}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <StatusBadge status={article.status} />
            {article.category && (
              <span className="text-zinc-400">• {article.category.name}</span>
            )}
            {article.authors?.length > 0 && (
              <span className="text-zinc-400">• {article.authors.map(a => a.name).join(", ")}</span>
            )}
            <span className="text-zinc-400">• Updated {formatDate(article.updated_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((act) => (
            <button
              key={act.action}
              onClick={() => onAction(article.id, act.action)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                act.style === "primary"
                  ? "bg-zinc-900 text-white hover:bg-zinc-700"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {act.label}
            </button>
          ))}
          <Link
            href={`/editor/articles/${article.id}`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

function PipelineSection({ 
  title, 
  description,
  articles, 
  emptyMessage,
  actions,
  onAction,
  accentColor = "zinc",
}: { 
  title: string;
  description: string;
  articles: Article[];
  emptyMessage: string;
  actions: Array<{ label: string; action: string; style?: "primary" | "secondary" }>;
  onAction: (articleId: number, action: string) => void;
  accentColor?: "zinc" | "yellow" | "blue" | "green";
}) {
  const borderColors: Record<string, string> = {
    zinc: "border-l-zinc-400",
    yellow: "border-l-yellow-400",
    blue: "border-l-blue-400",
    green: "border-l-green-400",
  };

  return (
    <section className={`rounded-lg border border-zinc-200 border-l-4 ${borderColors[accentColor]} bg-white overflow-hidden`}>
      <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900">{title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          </div>
          <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-sm font-medium text-zinc-700">
            {articles.length}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        {articles.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                actions={actions}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function PipelinePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [userData, pipelineData] = await Promise.all([
      fetchCurrentUser(),
      fetchPipeline(),
    ]);
    
    if (!userData) {
      setError("Please log in to access the editorial pipeline.");
    } else if (!pipelineData) {
      setError("Failed to load pipeline data. You may not have editor permissions.");
    } else {
      setUser(userData);
      setPipeline(pipelineData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (articleId: number, action: string) => {
    setActionLoading(articleId);
    
    let success = false;
    if (action === "submit") {
      success = await submitForReview(articleId);
    } else if (action === "approve") {
      success = await approveArticle(articleId);
    } else if (action === "publish") {
      success = await publishNow(articleId);
    }
    
    if (success) {
      // Reload pipeline data
      const pipelineData = await fetchPipeline();
      if (pipelineData) {
        setPipeline(pipelineData);
      }
    } else {
      alert(`Failed to ${action} article. Please try again.`);
    }
    
    setActionLoading(null);
  };

  const isEditor = user && (user.role === "editor" || user.role === "publisher" || user.is_staff);
  const isPublisher = user && (user.role === "publisher" || user.is_staff);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-sm text-red-600 hover:underline">
            Log in →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Editorial Pipeline</h1>
            <p className="mt-2 text-zinc-600">
              Manage article workflow from draft to publication
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/editor/articles/new"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              + New Article
            </Link>
            <Link href="/editor" className="text-sm text-zinc-600 hover:underline">
              ← Dashboard
            </Link>
          </div>
        </div>
        
        {user && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-zinc-500">Logged in as</span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700">
              {user.display_name || user.username}
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              user.role === "publisher" ? "bg-purple-100 text-purple-700" :
              user.role === "editor" ? "bg-blue-100 text-blue-700" :
              "bg-green-100 text-green-700"
            }`}>
              {user.role}
            </span>
          </div>
        )}
      </header>

      {actionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800 mx-auto" />
            <p className="mt-3 text-sm text-zinc-600">Processing...</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* My Drafts - All users */}
        <PipelineSection
          title="📝 My Drafts"
          description="Articles you're working on"
          articles={pipeline?.my_drafts || []}
          emptyMessage="No drafts. Start writing something new!"
          accentColor="zinc"
          actions={[
            { label: "Submit for Review", action: "submit", style: "primary" },
          ]}
          onAction={handleAction}
        />

        {/* Awaiting Review - Editors and Publishers only */}
        {isEditor && (
          <PipelineSection
            title="👀 Awaiting Review"
            description="Articles submitted by writers, ready for editorial review"
            articles={pipeline?.awaiting_review || []}
            emptyMessage="No articles awaiting review"
            accentColor="yellow"
            actions={[
              { label: "Approve", action: "approve", style: "primary" },
            ]}
            onAction={handleAction}
          />
        )}

        {/* Approved / Ready to Publish - Publishers only */}
        {isPublisher && (
          <PipelineSection
            title="✅ Approved"
            description="Reviewed and approved, ready for scheduling or immediate publish"
            articles={pipeline?.approved || []}
            emptyMessage="No articles ready to publish"
            accentColor="blue"
            actions={[
              { label: "Publish Now", action: "publish", style: "primary" },
            ]}
            onAction={handleAction}
          />
        )}

        {/* Scheduled - Publishers can see */}
        {isPublisher && (
          <PipelineSection
            title="📅 Scheduled"
            description="Queued for automatic publication"
            articles={pipeline?.scheduled || []}
            emptyMessage="No scheduled articles"
            accentColor="blue"
            actions={[
              { label: "Publish Now", action: "publish", style: "secondary" },
            ]}
            onAction={handleAction}
          />
        )}

        {/* Recently Published */}
        <PipelineSection
          title="🎉 Recently Published"
          description="Live articles published in the last 7 days"
          articles={pipeline?.recently_published || []}
          emptyMessage="No recent publications"
          accentColor="green"
          actions={[]}
          onAction={handleAction}
        />
      </div>

      {/* Workflow Guide */}
      <div className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="font-semibold text-zinc-900">📖 Publishing Workflow</h3>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-zinc-200 px-2 py-1 font-medium">Draft</span>
          <span className="text-zinc-400">→</span>
          <span className="text-zinc-600">Writer submits</span>
          <span className="text-zinc-400">→</span>
          <span className="rounded bg-yellow-200 px-2 py-1 font-medium">In Review</span>
          <span className="text-zinc-400">→</span>
          <span className="text-zinc-600">Editor approves</span>
          <span className="text-zinc-400">→</span>
          <span className="rounded bg-blue-200 px-2 py-1 font-medium">Scheduled</span>
          <span className="text-zinc-400">→</span>
          <span className="text-zinc-600">Publisher publishes</span>
          <span className="text-zinc-400">→</span>
          <span className="rounded bg-green-200 px-2 py-1 font-medium">Published</span>
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          <strong>Writers</strong> create and submit drafts • 
          <strong> Editors</strong> review and approve content • 
          <strong> Publishers</strong> schedule or publish immediately
        </p>
      </div>
    </main>
  );
}
