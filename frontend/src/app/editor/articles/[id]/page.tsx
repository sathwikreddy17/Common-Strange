import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import EditFormClient from "./EditFormClient";
import WorkflowButtons from "./workflow-buttons";

type HeroImage = {
  id: number;
  thumb: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type EditorialArticleDetail = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  body_md: string;
  widgets_json: unknown;
  status: string;
  updated_at: string;
  published_at: string | null;
  publish_at: string | null;
  category: unknown;
  series: unknown;
  authors: unknown[];
  tags?: unknown[];
  og_image_key: string;
  hero_image?: HeroImage | null;
};

async function fetchArticle(id: string): Promise<EditorialArticleDetail | null> {
  try {
    // Get cookies from the incoming request to forward to the backend
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const res = await fetch(`http://backend:8000/v1/editor/articles/${id}/`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
      },
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function EditorArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Edit Article</h1>
            <p className="mt-2 text-zinc-600">ID: {article.id} · Status: {article.status}</p>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link className="text-zinc-700 hover:underline" href="/editor/articles">
              Back to list
            </Link>
            <Link className="text-zinc-700 hover:underline" href="/">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 p-5">
        <EditFormClient article={article} />
        <div className="mt-8">
          <WorkflowButtons id={article.id} status={article.status} />
        </div>
      </section>

      <section className="mt-8 text-sm text-zinc-500">
        Next: add workflow buttons (submit/approve/schedule/publish), taxonomy assignment, widgets editing.
      </section>
    </main>
  );
}
