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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link 
              className="text-zinc-500 hover:text-zinc-700 transition-colors" 
              href="/editor/pipeline"
              title="Back to Pipeline"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Edit Article</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-zinc-500">ID: {article.id}</span>
                <span className="text-zinc-300">·</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  article.status === 'published' ? 'bg-green-100 text-green-700' :
                  article.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                  article.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-zinc-100 text-zinc-600'
                }`}>
                  {article.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-zinc-500 hover:text-zinc-700 hover:underline" href="/editor/articles">
              All articles
            </Link>
            <Link className="text-zinc-500 hover:text-zinc-700 hover:underline" href="/editor">
              Dashboard
            </Link>
            {article.status === 'published' && (
              <Link 
                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors" 
                href={`/${article.slug}`}
                target="_blank"
              >
                View Live →
              </Link>
            )}
          </nav>
        </div>
      </header>

      <EditFormClient article={article} />
      
      <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
        <WorkflowButtons id={article.id} status={article.status} />
      </div>
    </main>
  );
}
