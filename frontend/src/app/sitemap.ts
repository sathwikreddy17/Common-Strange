import type { MetadataRoute } from "next";

type PublicArticleListItem = {
  slug: string;
  updated_at: string;
  published_at: string | null;
};

type Category = {
  name: string;
  slug: string;
  description: string;
};

type Author = {
  name: string;
  slug: string;
  bio: string;
};

type Series = {
  name: string;
  slug: string;
  description: string;
};

type Tag = {
  name: string;
  slug: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchPublishedArticles(): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/articles/?status=published`, {
      // Sitemap can be cached a bit; regenerate periodically.
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    return (await res.json()) as PublicArticleListItem[];
  } catch {
    // During `next build` the backend may not be reachable (e.g. in CI).
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/categories/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

async function fetchAuthors(): Promise<Author[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/authors/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as Author[];
  } catch {
    return [];
  }
}

async function fetchSeries(): Promise<Series[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/series/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as Series[];
  } catch {
    return [];
  }
}

async function fetchTags(): Promise<Tag[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/tags/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as Tag[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [articles, categories, authors, series, tags] = await Promise.all([
    fetchPublishedArticles(),
    fetchCategories(),
    fetchAuthors(),
    fetchSeries(),
    fetchTags(),
  ]);

  const pages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${siteUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/authors`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/series`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.35,
    },
  ];

  for (const c of categories) {
    pages.push({
      url: `${siteUrl}/categories/${encodeURIComponent(c.slug)}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    });
  }

  for (const a of authors) {
    pages.push({
      url: `${siteUrl}/authors/${encodeURIComponent(a.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  for (const s of series) {
    pages.push({
      url: `${siteUrl}/series/${encodeURIComponent(s.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  for (const t of tags) {
    pages.push({
      url: `${siteUrl}/tags/${encodeURIComponent(t.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.35,
    });
  }

  for (const a of articles) {
    const last = a.updated_at || a.published_at;
    pages.push({
      url: `${siteUrl}/${encodeURIComponent(a.slug)}`,
      lastModified: last ? new Date(last) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return pages;
}
