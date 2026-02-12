"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserData = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_staff: boolean;
};

async function fetchCurrentUser(): Promise<UserData | null> {
  try {
    const res = await fetch("/v1/auth/me/", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

/* ---- tiny helpers ---- */
const ROLE_COLORS: Record<string, string> = {
  publisher: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
  editor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  writer: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  reader: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---- Navigation tiles ---- */
type Tile = { href: string; icon: string; title: string; desc: string; accent: string; roles?: string[] };

const TILES: Tile[] = [
  { href: "/editor/pipeline", icon: "📋", title: "Pipeline", desc: "Draft → Review → Publish", accent: "group-hover:border-zinc-900 dark:group-hover:border-white" },
  { href: "/editor/articles/new", icon: "✍️", title: "New Article", desc: "Start writing", accent: "group-hover:border-emerald-500" },
  { href: "/editor/articles", icon: "📄", title: "All Articles", desc: "Browse & manage", accent: "group-hover:border-amber-500" },
  { href: "/editor/analytics", icon: "📊", title: "Analytics", desc: "Traffic & engagement", accent: "group-hover:border-blue-500" },
  { href: "/editor/modules", icon: "🧩", title: "Curation", desc: "Homepage modules", accent: "group-hover:border-purple-500", roles: ["publisher"] },
  { href: "/editor/media", icon: "🖼️", title: "Media", desc: "Images & files", accent: "group-hover:border-pink-500" },
  { href: "/editor/categories", icon: "📂", title: "Categories", desc: "Organise content", accent: "group-hover:border-teal-500" },
  { href: "/editor/authors", icon: "👤", title: "Authors", desc: "Contributor profiles", accent: "group-hover:border-cyan-500" },
  { href: "/editor/series", icon: "📚", title: "Series", desc: "Multi-part stories", accent: "group-hover:border-orange-500" },
  { href: "/editor/tags", icon: "🏷️", title: "Tags", desc: "Topic labels", accent: "group-hover:border-lime-500" },
  { href: "/editor/users", icon: "👥", title: "Users", desc: "Manage accounts", accent: "group-hover:border-rose-500", roles: ["publisher"] },
];

export default function EditorHomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setUser(await fetchCurrentUser());
      setLoading(false);
    })();
  }, []);

  const displayName = user?.display_name || user?.username || "";
  const visibleTiles = TILES.filter((t) => !t.roles || (user && t.roles.includes(user.role)));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* ---- Hero header ---- */}
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {loading ? (
            <div className="h-20" />
          ) : user ? (
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {greet()}, {displayName} 👋
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.reader}`}>
                  {user.role}
                </span>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">Editor</h1>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">Log in to access the editorial tools.</p>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <Link href="/account" className="text-zinc-500 dark:text-zinc-400 hover:underline">My Account</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">Log in</Link>
                <Link href="/signup" className="text-zinc-500 dark:text-zinc-400 hover:underline">Sign up</Link>
              </>
            )}
            <Link href="/" className="text-zinc-400 dark:text-zinc-500 hover:underline">← Home</Link>
          </div>
        </div>
      </header>

      {/* ---- Quick actions (top row, larger) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: "/editor/pipeline", icon: "📋", title: "Pipeline", desc: "Manage the editorial workflow from draft to publication", accent: "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" },
          { href: "/editor/articles/new", icon: "✍️", title: "New Article", desc: "Start a new draft and begin writing", accent: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200" },
          { href: "/editor/analytics", icon: "📊", title: "Analytics", desc: "See how your content is performing", accent: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className={`group rounded-2xl border-2 p-5 transition-all hover:shadow-md hover:scale-[1.02] ${q.accent}`}>
            <div className="text-2xl mb-2">{q.icon}</div>
            <div className="font-semibold">{q.title}</div>
            <div className="mt-1 text-sm opacity-70">{q.desc}</div>
          </Link>
        ))}
      </div>

      {/* ---- Navigation grid ---- */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">All Tools</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleTiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`group rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-4 transition-all hover:shadow-sm ${tile.accent}`}
          >
            <div className="text-xl mb-1.5">{tile.icon}</div>
            <div className="font-medium text-zinc-900 dark:text-white text-sm">{tile.title}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{tile.desc}</div>
          </Link>
        ))}
      </div>

      {/* ---- Workflow guide ---- */}
      <section className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-5">
        <h3 className="font-medium text-zinc-700 dark:text-zinc-300 text-sm mb-3">Publishing Workflow</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: "Draft", bg: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300" },
            { label: "In Review", bg: "bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200" },
            { label: "Approved", bg: "bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200" },
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
