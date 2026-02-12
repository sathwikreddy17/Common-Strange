import type { Metadata } from "next";
import Link from "next/link";
import TaxonomyManager from "../_components/TaxonomyManager";

export const metadata: Metadata = {
  title: "Editor · Categories",
};

export default function EditorCategoriesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" href="/editor">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Dashboard
        </Link>
      </div>

      <TaxonomyManager
        title="Categories"
        description="Organise content into sections (Editor-only)."
        icon="📂"
        accentColor="emerald"
        listPath="/v1/editor/categories/"
        detailPathPrefix="/v1/editor/categories/"
        fields={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Description", required: false, type: "textarea" },
        ]}
      />
    </main>
  );
}
