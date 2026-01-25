import { cookies } from "next/headers";

export type EditorialArticle = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  status: string;
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
};

export async function fetchEditorialArticles(): Promise<EditorialArticle[]> {
  // Get cookies from the incoming request to forward to the backend
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch("http://backend:8000/v1/editor/articles/", {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch articles: ${res.status}`);
  }

  const data = await res.json();
  // Handle paginated response
  if (data && typeof data === "object" && "results" in data) {
    return data.results;
  }
  return Array.isArray(data) ? data : [];
}
