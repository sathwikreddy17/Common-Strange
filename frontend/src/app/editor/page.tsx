import Link from "next/link";

export default function EditorHomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-2 text-zinc-600">
          Minimal editorial dashboard (session-auth APIs). Manage taxonomy and content.
        </p>

        <div className="mt-4">
          <a
            className="inline-flex rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            href="/admin/login/"
          >
            Log in (Django Admin)
          </a>
        </div>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">Articles</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/articles">
                Create draft (PoC)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">Taxonomy</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/categories">
                Categories
              </Link>
            </li>
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/authors">
                Authors
              </Link>
            </li>
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/series">
                Series
              </Link>
            </li>
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/tags">
                Tags
              </Link>
            </li>
          </ul>
        </div>

        <p className="text-sm text-zinc-500">
          Note: These pages assume you are logged into the Django admin (session cookie present).
        </p>
      </section>
    </main>
  );
}
