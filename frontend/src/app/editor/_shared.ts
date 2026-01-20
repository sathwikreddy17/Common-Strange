type Json = unknown;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function apiUrl(path: string) {
  if (API_BASE) return `${API_BASE}${path}`;
  return new URL(path, SITE_URL).toString();
}

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function readMaybeJson(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return undefined;
    }
  }
  try {
    return await res.text();
  } catch {
    return undefined;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const body = await readMaybeJson(res);
    throw new ApiError(`GET ${path} failed`, res.status, body);
  }

  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, data: Json): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data ?? {}),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const body = await readMaybeJson(res);
    throw new ApiError(`POST ${path} failed`, res.status, body);
  }

  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, data: Json): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data ?? {}),
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const body = await readMaybeJson(res);
    throw new ApiError(`PATCH ${path} failed`, res.status, body);
  }

  return (await res.json()) as T;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok && res.status !== 404) {
    const body = await readMaybeJson(res);
    throw new ApiError(`DELETE ${path} failed`, res.status, body);
  }
}

export function formatAuthHint(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Not authenticated (401). Log in via /admin/login/.";
    if (err.status === 403) return "Not authorized (403). Ensure you are in the Editor group.";
    return `Request failed (${err.status}).`;
  }
  return "Request failed.";
}
