import Link from "next/link";

type Category = {
  name: string;
  slug: string;
  description: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/categories/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

export default async function CategoriesIndexPage() {
  const categories = await fetchCategories();

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Categories</h1>
            <p className="mt-2 text-zinc-600">Browse the site by section.</p>
          </div>

          <nav className="text-sm text-zinc-600">
            <Link className="hover:underline" href="/tags">
              Tags
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/series">
              Series
            </Link>
            <span className="px-2">·</span>
            <Link className="hover:underline" href="/authors">
              Authors
            </Link>
          </nav>
        </div>
      </header>

      {categories.length === 0 ? (
        <p className="text-zinc-600">No categories yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Link className="text-lg font-semibold text-zinc-900 hover:underline" href={`/categories/${c.slug}`}>
                {c.name}
              </Link>
              {c.description ? <p className="mt-2 text-sm leading-relaxed text-zinc-600">{c.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
