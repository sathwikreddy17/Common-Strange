import type { Metadata } from "next";
import Link from "next/link";
import TaxonomyManager from "../_components/TaxonomyManager";

export const metadata: Metadata = {
  title: "Editor · Authors",
};

export default function EditorAuthorsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <Link className="text-sm text-zinc-600 hover:underline" href="/editor">
          Back
        </Link>
      </div>

      <TaxonomyManager
        title="Authors"
        description="Create and delete authors (Editor-only)."
        listPath="/v1/editor/authors/"
        detailPathPrefix="/v1/editor/authors/"
        fields={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "bio", label: "Bio", required: false, type: "textarea" },
        ]}
      />
    </main>
  );
}
