"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = "";

type AnalyticsData = {
  articles: {
    published: number;
    drafts: number;
    in_review: number;
    scheduled: number;
  };
  pageviews: {
    today: number;
    last_7_days: number;
    last_30_days: number;
  };
  engagement: {
    reads_7d: number;
    avg_read_ratio: number;
  };
  pageviews_by_day: Array<{ date: string; count: number }>;
  top_articles: Array<{ id: number; slug: string; title: string; views: number }>;
  top_referrers: Array<{ referrer: string; count: number }>;
};

async function fetchAnalytics(): Promise<AnalyticsData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/editor/analytics/`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
      {subtext && <p className="mt-1 text-sm text-zinc-500">{subtext}</p>}
    </div>
  );
}

function MiniBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data.length) return <p className="text-sm text-zinc-500">No data available</p>;
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const height = Math.max((d.count / maxCount) * 100, 2);
        const dayLabel = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-zinc-800 rounded-t transition-all hover:bg-zinc-600" 
              style={{ height: `${height}%` }}
              title={`${d.count} views on ${d.date}`}
            />
            <span className="text-xs text-zinc-500">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await fetchAnalytics();
      if (!result) {
        setError("Failed to load analytics. Please make sure you're logged in.");
      } else {
        setData(result);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error || "Failed to load analytics"}</p>
          <Link href="/login" className="mt-4 inline-block text-sm text-red-600 hover:underline">
            Log in →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-2 text-zinc-600">Content performance overview</p>
          </div>
          <Link className="text-sm text-zinc-700 hover:underline" href="/editor">
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Overview Stats */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Pageviews
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard 
            label="Today" 
            value={formatNumber(data.pageviews.today)} 
          />
          <StatCard 
            label="Last 7 Days" 
            value={formatNumber(data.pageviews.last_7_days)} 
          />
          <StatCard 
            label="Last 30 Days" 
            value={formatNumber(data.pageviews.last_30_days)} 
          />
        </div>
      </section>

      {/* Content Stats */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard 
            label="Published" 
            value={data.articles.published} 
          />
          <StatCard 
            label="Drafts" 
            value={data.articles.drafts} 
          />
          <StatCard 
            label="In Review" 
            value={data.articles.in_review} 
          />
          <StatCard 
            label="Scheduled" 
            value={data.articles.scheduled} 
          />
        </div>
      </section>

      {/* Engagement */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Engagement (7 Days)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard 
            label="Completed Reads" 
            value={formatNumber(data.engagement.reads_7d)} 
            subtext="Readers who reached 50%+ of article"
          />
          <StatCard 
            label="Avg. Read Depth" 
            value={`${data.engagement.avg_read_ratio}%`} 
            subtext="How far readers scroll on average"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pageviews Chart */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Daily Pageviews (7 Days)
          </h2>
          <MiniBarChart data={data.pageviews_by_day} />
        </section>

        {/* Top Articles */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Top Articles (7 Days)
          </h2>
          {data.top_articles.length === 0 ? (
            <p className="text-sm text-zinc-500">No views recorded yet</p>
          ) : (
            <ul className="space-y-3">
              {data.top_articles.slice(0, 5).map((article, idx) => (
                <li key={article.id} className="flex items-center gap-3">
                  <span className="w-6 text-lg font-bold text-zinc-300">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/${article.slug}`}
                      className="text-sm font-medium text-zinc-900 hover:underline truncate block"
                    >
                      {article.title}
                    </Link>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">
                    {formatNumber(article.views)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top Referrers */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Top Referrers (7 Days)
          </h2>
          {data.top_referrers.length === 0 ? (
            <p className="text-sm text-zinc-500">No referrer data yet</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.top_referrers.slice(0, 6).map((ref, idx) => {
                // Clean up referrer URL for display
                let displayUrl = ref.referrer;
                try {
                  const url = new URL(ref.referrer);
                  displayUrl = url.hostname + (url.pathname !== "/" ? url.pathname.slice(0, 30) : "");
                } catch {
                  displayUrl = ref.referrer.slice(0, 50);
                }
                
                return (
                  <li key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2">
                    <span className="text-sm text-zinc-700 truncate">{displayUrl}</span>
                    <span className="text-sm font-medium text-zinc-500 whitespace-nowrap">
                      {formatNumber(ref.count)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
