import type { Metadata } from "next";
import Link from "next/link";
import TaxonomyManager from "../_components/TaxonomyManager";

export const metadata: Metadata = {
  title: "Editor · Series",
};

type Series = {
  name: string;
  slug: string;
  description: string;
};

export default function EditorSeriesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/editor">
          Back
        </Link>
      </div>

      <TaxonomyManager<Series>
        title="Series"
        description="Create and delete series (Editor-only)."
        listPath="/v1/editor/series/"
        detailPathPrefix="/v1/editor/series/"
        fields={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Description", required: false, type: "textarea" },
        ]}
      />
    </main>
  );
}
