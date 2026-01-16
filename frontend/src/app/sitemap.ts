import type { MetadataRoute } from "next";

type PublicArticleListItem = {
  slug: string;
  updated_at: string;
  published_at: string | null;
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const articles = await fetchPublishedArticles();

  const pages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];

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
