import Link from "next/link";
import { Metadata } from "next";
import { fetchList } from "@/lib/api";

export const metadata: Metadata = {
  title: "Series",
  description: "Explore article series on Common Strange. Follow a thread of stories over time.",
};

type Series = {
  name: string;
  slug: string;
  description: string;
};

async function fetchSeries(): Promise<Series[]> {
  return fetchList<Series>("/v1/series/", { next: { revalidate: 3600 } });
}

export default async function SeriesIndexPage() {
  const series = await fetchSeries();

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Series</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Follow a thread of stories over time.</p>
          </div>

          <nav className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link className="hover:underline" href="/categories">
              Categories
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/tags">
              Tags
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/authors">
              Authors
            </Link>
          </nav>
        </div>
      </header>

      {series.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No series yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <li key={s.slug} className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
              <Link className="text-lg font-semibold text-zinc-900 hover:underline dark:text-zinc-100" href={`/series/${s.slug}`}>
                {s.name}
              </Link>
              {s.description ? <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{s.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
