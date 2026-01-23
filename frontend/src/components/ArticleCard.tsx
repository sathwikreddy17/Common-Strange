import Link from "next/link";

export type ArticleCardItem = {
  title: string;
  slug: string;
  dek?: string;
  category?: { name: string; slug: string } | null;
  series?: { name: string; slug: string } | null;
  authors?: Array<{ name: string; slug: string }>;
};

export default function ArticleCard({ a }: { a: ArticleCardItem }) {
  return (
    <li className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        {a.category ? (
          <Link className="hover:underline" href={`/categories/${a.category.slug}`}>
            {a.category.name}
          </Link>
        ) : null}
        {a.category && a.series ? <span aria-hidden>·</span> : null}
        {a.series ? (
          <Link className="hover:underline" href={`/series/${a.series.slug}`}>
            {a.series.name}
          </Link>
        ) : null}
        {(a.category || a.series) && a.authors?.length ? <span aria-hidden>·</span> : null}
        {a.authors?.length ? <span className="truncate">{a.authors.map((x) => x.name).join(", ")}</span> : null}
      </div>

      <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900">
        <Link className="hover:underline" href={`/${a.slug}`}>
          {a.title}
        </Link>
      </h3>

      {a.dek ? <p className="mt-2 text-sm leading-relaxed text-zinc-600">{a.dek}</p> : null}
    </li>
  );
}
