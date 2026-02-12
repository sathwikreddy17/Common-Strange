import Link from "next/link";

export type SeriesNavData = {
  series: { name: string; slug: string } | null;
  current_position: number;
  total_in_series: number;
  previous: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
};

export default function SeriesNavigation({ data }: { data: SeriesNavData }) {
  if (!data.series) return null;

  return (
    <nav className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/series/${data.series.slug}`}
          className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          Series: {data.series.name}
        </Link>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Part {data.current_position} of {data.total_in_series}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.previous ? (
          <Link
            href={`/${data.previous.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500"
          >
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Previous</div>
              <div className="mt-1 font-serif text-sm font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300 line-clamp-2 leading-snug">
                {data.previous.title}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {data.next ? (
          <Link
            href={`/${data.next.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-right transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 sm:justify-end"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Next</div>
              <div className="mt-1 font-serif text-sm font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300 line-clamp-2 leading-snug">
                {data.next.title}
              </div>
            </div>
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
}
