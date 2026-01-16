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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-2 text-zinc-600">Browse all categories.</p>
      </header>

      {categories.length === 0 ? (
        <p className="text-zinc-600">No categories yet.</p>
      ) : (
        <ul className="space-y-4">
          {categories.map((c) => (
            <li key={c.slug} className="rounded-xl border border-zinc-200 p-5">
              <Link className="text-lg font-medium hover:underline" href={`/categories/${c.slug}`}>
                {c.name}
              </Link>
              {c.description ? <p className="mt-2 text-sm text-zinc-600">{c.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
