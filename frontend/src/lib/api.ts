import { apiUrl } from "@/lib/urls";

/**
 * Paginated response type from DRF pagination
 */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * Extract results from a potentially paginated response.
 * Returns the results array if paginated, or the data itself if it's already an array.
 */
export function extractResults<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  return [];
}

export async function fetchJson<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T> {
  const url = await apiUrl(path);
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export async function fetchJsonOrNull<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T | null> {
  const url = await apiUrl(path);
  const res = await fetch(url, init);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Fetch a list endpoint that may be paginated, returning just the results array.
 */
export async function fetchList<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T[]> {
  try {
    const url = await apiUrl(path);
    const res = await fetch(url, init);
    if (!res.ok) return [];
    const data = (await res.json()) as T[] | PaginatedResponse<T>;
    return extractResults(data);
  } catch {
    return [];
  }
}
