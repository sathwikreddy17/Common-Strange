import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Tag = {
  name: string;
  slug: string;
};

type PublicArticleListItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  updated_at: string;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
  tags: Tag[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchTag(slug: string): Promise<Tag | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const items = (await res.json()) as Tag[];
    return items.find((x) => x.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function fetchTagArticles(slug: string): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/${encodeURIComponent(slug)}/articles/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PublicArticleListItem[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await fetchTag(slug);
  if (!tag) return {};

  const canonical = `${SITE_URL}/tags/${encodeURIComponent(tag.slug)}`;
  return {
    title: `#${tag.name} | Common Strange`,
    alternates: { canonical },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tag = await fetchTag(slug);
  if (!tag) notFound();

  const articles = await fetchTagArticles(tag.slug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/tags">
          Back
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">#{tag.name}</h1>
      </header>

      {articles.length === 0 ? (
        <p className="text-zinc-600">No published articles with this tag yet.</p>
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
                {a.category ? <span>{a.category.name}</span> : null}
                {a.category && a.authors.length ? <span> · </span> : null}
                {a.authors.length ? <span>{a.authors.map((x) => x.name).join(", ")}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
