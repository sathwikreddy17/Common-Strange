import Link from "next/link";

type Tag = {
  name: string;
  slug: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as Tag[];
  } catch {
    return [];
  }
}

export default async function TagsIndexPage() {
  const tags = await fetchTags();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Tags</h1>
        <p className="mt-2 text-zinc-600">Browse all tags.</p>
      </header>

      {tags.length === 0 ? (
        <p className="text-zinc-600">No tags yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.slug}>
              <Link
                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-800 hover:bg-zinc-50"
                href={`/tags/${t.slug}`}
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
