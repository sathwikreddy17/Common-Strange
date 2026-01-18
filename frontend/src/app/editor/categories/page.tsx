import type { Metadata } from "next";
import Link from "next/link";
import TaxonomyManager from "../_components/TaxonomyManager";

export const metadata: Metadata = {
  title: "Editor · Categories",
};

type Category = {
  name: string;
  slug: string;
  description: string;
};

export default function EditorCategoriesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/editor">
          Back
        </Link>
      </div>

      <TaxonomyManager<Category>
        title="Categories"
        description="Create and delete categories (Editor-only)."
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
