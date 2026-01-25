import Link from "next/link";

export default function EditorHomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-2 text-zinc-600">
          Editorial dashboard for content management.
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            href="/signup"
          >
            Create Account
          </Link>
        </div>
      </header>

      <section className="space-y-6">
        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">Articles</h2>
          <p className="mt-1 text-sm text-zinc-500">Create and manage articles</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link className="text-zinc-700 hover:underline flex items-center gap-2" href="/editor/articles/new">
                <span className="text-lg">+</span> Create New Article
              </Link>
            </li>
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/articles">
                View All Articles
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">Curation</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage homepage and featured content</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/modules">
                Homepage Modules (Publisher)
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">Taxonomy</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage categories, authors, and tags</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
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

        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">Media</h2>
          <p className="mt-1 text-sm text-zinc-500">Upload and manage images</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/media">
                Media Library
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-medium">User Management</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage staff accounts (Publisher only)</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link className="text-zinc-700 hover:underline" href="/editor/users">
                Manage Users
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
