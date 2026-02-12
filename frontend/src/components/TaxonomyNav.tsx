import Link from "next/link";

export default function TaxonomyNav() {
  return (
    <nav className="text-sm text-zinc-600 dark:text-zinc-400">
      <Link className="hover:underline" href="/categories">
        Categories
      </Link>
      <span className="px-2">·</span>
      <Link className="hover:underline" href="/tags">
        Tags
      </Link>
      <span className="px-2">·</span>
      <Link className="hover:underline" href="/series">
        Series
      </Link>
      <span className="px-2">·</span>
      <Link className="hover:underline" href="/authors">
        Authors
      </Link>
    </nav>
  );
}
