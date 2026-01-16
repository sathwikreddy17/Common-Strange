import Link from "next/link";

type Author = {
  name: string;
  slug: string;
  bio: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchAuthors(): Promise<Author[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/authors/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Author[];
  } catch {
    return [];
  }
}

export default async function AuthorsIndexPage() {
  const authors = await fetchAuthors();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Authors</h1>
        <p className="mt-2 text-zinc-600">Browse all authors.</p>
      </header>

      {authors.length === 0 ? (
        <p className="text-zinc-600">No authors yet.</p>
      ) : (
        <ul className="space-y-4">
          {authors.map((a) => (
            <li key={a.slug} className="rounded-xl border border-zinc-200 p-5">
              <Link className="text-lg font-medium hover:underline" href={`/authors/${a.slug}`}>
                {a.name}
              </Link>
              {a.bio ? <p className="mt-2 text-sm text-zinc-600">{a.bio}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
