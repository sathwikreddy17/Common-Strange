import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "../../_shared";
import EditFormClient from "./EditFormClient";
import WorkflowButtons from "./workflow-buttons";

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
};

async function fetchArticle(id: string): Promise<EditorialArticleDetail | null> {
  try {
    return await apiGet<EditorialArticleDetail>(`/v1/editor/articles/${id}/`);
  } catch {
    return null;
  }
}

export default async function EditorArticleEditPage({ params }: { params: { id: string } }) {
  const article = await fetchArticle(params.id);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Edit Article</h1>
            <p className="mt-2 text-zinc-600">ID: {article.id} · Status: {article.status}</p>
          </div>

          <nav className="text-sm">
            <Link className="text-zinc-700 hover:underline" href="/editor/articles">
              Back to list
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
