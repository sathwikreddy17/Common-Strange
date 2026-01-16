import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Category = {
  name: string;
  slug: string;
  description: string;
};

type PublicArticleListItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  updated_at: string;
  category: Category | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchCategory(slug: string): Promise<Category | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/categories/`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const items = (await res.json()) as Category[];
    return items.find((x) => x.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function fetchCategoryArticles(slug: string): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/categories/${encodeURIComponent(slug)}/articles/`, {
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
  const category = await fetchCategory(slug);
  if (!category) return {};

  const canonical = `${SITE_URL}/categories/${encodeURIComponent(category.slug)}`;
  return {
    title: `${category.name} | Common Strange`,
    description: category.description || undefined,
    alternates: {
      canonical,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const category = await fetchCategory(slug);
  if (!category) notFound();

  const articles = await fetchCategoryArticles(slug);

  const canonicalUrl = `${SITE_URL}/categories/${encodeURIComponent(category.slug)}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: category.name, item: canonicalUrl },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/">
          Back
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        {category.description ? <p className="mt-2 text-zinc-600">{category.description}</p> : null}
      </header>

      {articles.length === 0 ? (
        <p className="text-zinc-600">No articles in this category yet.</p>
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
                {a.authors.length ? <span>{a.authors.map((x) => x.name).join(", ")}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
