import type { Metadata } from "next";
import Link from "next/link";
import TaxonomyManager from "../_components/TaxonomyManager";

export const metadata: Metadata = {
  title: "Editor · Tags",
};

export default function EditorTagsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/editor">
          Back
        </Link>
      </div>

      <TaxonomyManager
        title="Tags"
        description="Create and delete tags (Editor-only)."
        listPath="/v1/editor/tags/"
        detailPathPrefix="/v1/editor/tags/"
        fields={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
        ]}
      />
    </main>
  );
}
