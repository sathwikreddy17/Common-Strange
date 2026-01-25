import Link from "next/link";
import { fetchList } from "@/lib/api";

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
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Series</h1>
            <p className="mt-2 text-zinc-600">Follow a thread of stories over time.</p>
          </div>

          <nav className="text-sm text-zinc-600">
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
        <p className="text-zinc-600">No series yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <li key={s.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Link className="text-lg font-semibold text-zinc-900 hover:underline" href={`/series/${s.slug}`}>
                {s.name}
              </Link>
              {s.description ? <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
