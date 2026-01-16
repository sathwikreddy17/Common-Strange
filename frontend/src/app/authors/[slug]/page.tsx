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
      { "@type": "ListItem", position: 2, name: author.name, item: canonicalUrl },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/authors">
          Back
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">{author.name}</h1>
        {author.bio ? <p className="mt-2 text-zinc-600">{author.bio}</p> : null}
      </header>

      {articles.length === 0 ? (
        <p className="text-zinc-600">No published articles by this author yet.</p>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
