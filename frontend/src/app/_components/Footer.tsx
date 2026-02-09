import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="font-serif text-2xl font-bold text-zinc-900">Common Strange</h2>
            <p className="mt-1 text-sm text-zinc-500">Ideas that expand your perspective.</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/categories" className="text-zinc-600 hover:text-zinc-900">
              Categories
            </Link>
            <Link href="/series" className="text-zinc-600 hover:text-zinc-900">
              Series
            </Link>
            <Link href="/authors" className="text-zinc-600 hover:text-zinc-900">
              Authors
            </Link>
            <Link href="/tags" className="text-zinc-600 hover:text-zinc-900">
              Tags
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-zinc-100 pt-8 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Common Strange. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
