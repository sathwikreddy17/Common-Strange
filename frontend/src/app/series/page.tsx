import Link from "next/link";

type Series = {
  name: string;
  slug: string;
  description: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchSeries(): Promise<Series[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/series/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Series[];
  } catch {
    return [];
  }
}

export default async function SeriesIndexPage() {
  const series = await fetchSeries();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Series</h1>
        <p className="mt-2 text-zinc-600">Browse all series.</p>
      </header>

      {series.length === 0 ? (
        <p className="text-zinc-600">No series yet.</p>
      ) : (
        <ul className="space-y-4">
          {series.map((s) => (
            <li key={s.slug} className="rounded-xl border border-zinc-200 p-5">
              <Link className="text-lg font-medium hover:underline" href={`/series/${s.slug}`}>
                {s.name}
              </Link>
              {s.description ? <p className="mt-2 text-sm text-zinc-600">{s.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
