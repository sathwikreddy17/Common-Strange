import { headers } from "next/headers";

export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export function absoluteUrl(origin: string, path: string): string {
  if (!path.startsWith("/")) return `${origin}/${path}`;
  return `${origin}${path}`;
}

export async function apiUrl(path: string): Promise<string> {
  const origin = await getRequestOrigin();
  return absoluteUrl(origin, path);
}
