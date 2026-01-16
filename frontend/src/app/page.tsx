import Link from "next/link";

type PublicArticleListItem = {
  title: string;
  slug: string;
  dek: string;
  updated_at: string;
  published_at: string | null;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchArticles(): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/articles/?status=published`, {
      // Revalidate frequently in PoC.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    return (await res.json()) as PublicArticleListItem[];
  } catch {
    // During `next build` the backend may not be reachable (e.g. in CI).
    return [];
  }
}

export default async function Home() {
  const articles = await fetchArticles();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Common Strange</h1>
        <p className="mt-2 text-zinc-600">PoC: list of published articles</p>
      </header>

      {articles.length === 0 ? (
        <p className="text-zinc-600">No published articles yet.</p>
      ) : (
        <ul className="space-y-6">
          {articles.map((a) => (
            <li key={a.slug} className="rounded-xl border border-zinc-200 p-5">
              <h2 className="text-xl font-medium">
                <Link className="hover:underline" href={`/${a.slug}`}>
                  {a.title}
                </Link>
              </h2>
              {a.dek ? <p className="mt-2 text-zinc-700">{a.dek}</p> : null}
              <div className="mt-3 text-sm text-zinc-500">
                {a.category ? (
                  <Link className="hover:underline" href={`/categories/${a.category.slug}`}>
                    {a.category.name}
                  </Link>
                ) : null}
                {a.category && a.authors.length ? <span> · </span> : null}
                {a.authors.length ? (
                  <span>{a.authors.map((x) => x.name).join(", ")}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
