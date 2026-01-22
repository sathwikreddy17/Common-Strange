import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Author = {
  name: string;
  slug: string;
  bio: string;
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
  authors: Array<Author>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchAuthor(slug: string): Promise<Author | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/authors/?_=${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });

    if (!res.ok) return null;
    const items = (await res.json()) as Author[];
    return items.find((x) => x.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function fetchAuthorArticles(slug: string): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/authors/${encodeURIComponent(slug)}/articles/`, {
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
  const author = await fetchAuthor(slug);
  if (!author) return {};

  const canonical = `${SITE_URL}/authors/${encodeURIComponent(author.slug)}`;
  return {
    title: `${author.name} | Common Strange`,
    description: author.bio || undefined,
    alternates: { canonical },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const author = await fetchAuthor(slug);
  if (!author) notFound();

  const articles = await fetchAuthorArticles(author.slug);

  const canonicalUrl = `${SITE_URL}/authors/${encodeURIComponent(author.slug)}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Authors", item: `${SITE_URL}/authors` },
      { "@type": "ListItem", position: 3, name: author.name, item: canonicalUrl },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-10">
        <Link className="text-sm text-zinc-600 hover:underline" href="/authors">
          ← Back to Authors
        </Link>
      </div>

      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{author.name}</h1>
            {author.bio ? <p className="mt-2 max-w-2xl text-zinc-600">{author.bio}</p> : null}
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

      {articles.length === 0 ? (
        <p className="text-zinc-600">No published articles by this author yet.</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((a) => (
            <li key={a.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                {a.category ? (
                  <Link className="hover:underline" href={`/categories/${a.category.slug}`}>
                    {a.category.name}
                  </Link>
                ) : null}
                {a.category && a.series ? <span aria-hidden>·</span> : null}
                {a.series ? (
                  <Link className="hover:underline" href={`/series/${a.series.slug}`}>
                    {a.series.name}
                  </Link>
                ) : null}
                {(a.category || a.series) ? <span aria-hidden>·</span> : null}
                <span className="truncate">{author.name}</span>
              </div>

              <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                <Link className="hover:underline" href={`/${a.slug}`}>
                  {a.title}
                </Link>
              </h2>
              {a.dek ? <p className="mt-2 text-zinc-700">{a.dek}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
