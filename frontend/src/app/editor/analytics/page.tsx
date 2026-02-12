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

/* ── Sparkline-style bar chart ── */
function SparkChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data.length)
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
        No pageview data yet
      </div>
    );

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[6px] h-40 px-1">
      {data.map((d, i) => {
        const pct = Math.max((d.count / maxCount) * 100, 3);
        const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short",
        });
        const dateLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            {/* Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-zinc-600 whitespace-nowrap">
              {d.count}
            </div>
            <div
              className="w-full rounded-md bg-gradient-to-t from-zinc-800 to-zinc-600 group-hover:from-emerald-600 group-hover:to-emerald-400 transition-all duration-200 cursor-default"
              style={{ height: `${pct}%` }}
              title={`${d.count} views · ${dateLabel}`}
            />
            <span className="text-[10px] text-zinc-400 font-medium">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Circular progress ring ── */
function ProgressRing({ value, size = 80, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-zinc-100"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-700"
      />
    </svg>
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-800" />
          <p className="text-sm text-zinc-400">Loading analytics…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="mt-3 font-medium text-red-800">{error || "Failed to load analytics"}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Log in →
          </Link>
        </div>
      </main>
    );
  }

  const totalArticles =
    data.articles.published + data.articles.drafts + data.articles.in_review + data.articles.scheduled;
  const topArticleMax = Math.max(...data.top_articles.map((a) => a.views), 1);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-900">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Content performance at a glance</p>
        </div>
        <Link
          href="/editor"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          ← Back to Editor
        </Link>
      </div>

      {/* ── Hero stats strip ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Pageviews — large highlight */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 rounded-2xl bg-zinc-900 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Today</p>
          <p className="mt-2 font-serif text-4xl font-bold">{formatNumber(data.pageviews.today)}</p>
          <p className="mt-1 text-xs text-zinc-500">pageviews</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium text-zinc-400">7 Days</p>
          <p className="mt-2 font-serif text-3xl font-bold text-zinc-900">{formatNumber(data.pageviews.last_7_days)}</p>
          <p className="mt-1 text-xs text-zinc-400">pageviews</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium text-zinc-400">30 Days</p>
          <p className="mt-2 font-serif text-3xl font-bold text-zinc-900">{formatNumber(data.pageviews.last_30_days)}</p>
          <p className="mt-1 text-xs text-zinc-400">pageviews</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium text-zinc-400">Completed Reads</p>
          <p className="mt-2 font-serif text-3xl font-bold text-zinc-900">{formatNumber(data.engagement.reads_7d)}</p>
          <p className="mt-1 text-xs text-zinc-400">past 7 days</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-200 bg-white p-5 flex items-center gap-4">
          <ProgressRing value={data.engagement.avg_read_ratio} size={64} stroke={5} />
          <div>
            <p className="font-serif text-2xl font-bold text-zinc-900">{data.engagement.avg_read_ratio}%</p>
            <p className="text-xs text-zinc-400">avg. read depth</p>
          </div>
        </div>
      </div>

      {/* ── Content pipeline ── */}
      <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Content Pipeline</h2>
        <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-zinc-100">
          {[
            { label: "Published", value: data.articles.published, color: "bg-emerald-50 text-emerald-700", accent: "bg-emerald-500" },
            { label: "Drafts", value: data.articles.drafts, color: "bg-amber-50 text-amber-700", accent: "bg-amber-500" },
            { label: "In Review", value: data.articles.in_review, color: "bg-blue-50 text-blue-700", accent: "bg-blue-500" },
            { label: "Scheduled", value: data.articles.scheduled, color: "bg-purple-50 text-purple-700", accent: "bg-purple-500" },
          ].map((item) => (
            <div key={item.label} className="bg-white p-4 text-center">
              <div className={`mx-auto mb-2 h-1.5 rounded-full ${item.accent}`} style={{ width: totalArticles > 0 ? `${Math.max((item.value / totalArticles) * 100, 8)}%` : "8%" }} />
              <p className="font-serif text-2xl font-bold text-zinc-900">{item.value}</p>
              <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.color}`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart + Top Articles row ── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Pageviews chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Daily Pageviews
            </h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              Last 7 days
            </span>
          </div>
          <SparkChart data={data.pageviews_by_day} />
        </div>

        {/* Top articles */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              Top Articles
            </h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              Last 7 days
            </span>
          </div>

          {data.top_articles.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
              No views recorded yet
            </div>
          ) : (
            <ul className="space-y-3">
              {data.top_articles.slice(0, 5).map((article, idx) => {
                const barWidth = Math.max((article.views / topArticleMax) * 100, 4);
                return (
                  <li key={article.id} className="group">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0
                            ? "bg-zinc-900 text-white"
                            : idx === 1
                              ? "bg-zinc-200 text-zinc-700"
                              : idx === 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-zinc-100 text-zinc-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${article.slug}`}
                          className="block truncate text-sm font-medium text-zinc-800 group-hover:text-zinc-600 transition-colors"
                        >
                          {article.title}
                        </Link>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-zinc-700 to-zinc-500 group-hover:from-emerald-500 group-hover:to-emerald-400 transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-500">
                        {formatNumber(article.views)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Referrers ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Top Referrers
          </h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
            Last 7 days
          </span>
        </div>

        {data.top_referrers.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-zinc-400">
            No referrer data yet
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.top_referrers.slice(0, 6).map((ref, idx) => {
              let displayUrl = ref.referrer;
              let domain = "";
              try {
                const url = new URL(ref.referrer);
                domain = url.hostname;
                displayUrl =
                  url.hostname + (url.pathname !== "/" ? url.pathname.slice(0, 30) : "");
              } catch {
                displayUrl = ref.referrer.slice(0, 50);
                domain = ref.referrer;
              }

              const maxRef = Math.max(...data.top_referrers.map((r) => r.count), 1);
              const barPct = Math.max((ref.count / maxRef) * 100, 4);

              return (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-lg border border-zinc-100 px-3 py-2.5"
                >
                  {/* Background bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-zinc-50"
                    style={{ width: `${barPct}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                        alt=""
                        width={16}
                        height={16}
                        className="shrink-0 rounded-sm"
                      />
                      <span className="truncate text-sm text-zinc-700">{displayUrl}</span>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-500">
                      {formatNumber(ref.count)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
