import Link from "next/link";
import { Metadata } from "next";
import { fetchList } from "@/lib/api";

export const metadata: Metadata = {
  title: "Authors",
  description: "Meet the writers and contributors at Common Strange.",
};

type Author = {
  name: string;
  slug: string;
  bio: string;
};

async function fetchAuthors(): Promise<Author[]> {
  return fetchList<Author>("/v1/authors/", { next: { revalidate: 3600 } });
}

export default async function AuthorsIndexPage() {
  const authors = await fetchAuthors();

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Authors</h1>
            <p className="mt-2 text-zinc-600">Browse contributors.</p>
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
            <Link className="hover:underline" href="/series">
              Series
            </Link>
          </nav>
        </div>
      </header>

      {authors.length === 0 ? (
        <p className="text-zinc-600">No authors yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => (
            <li key={a.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Link className="text-lg font-semibold text-zinc-900 hover:underline" href={`/authors/${a.slug}`}>
                {a.name}
              </Link>
              {a.bio ? <p className="mt-2 text-sm leading-relaxed text-zinc-600">{a.bio}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
