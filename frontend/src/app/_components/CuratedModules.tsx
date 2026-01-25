import Link from "next/link";

export type CuratedModuleItem = {
  id: number;
  order: number;
  item_type: "ARTICLE" | "CATEGORY" | "SERIES" | "AUTHOR";
  override_title: string;
  override_dek: string;
  article: { id: number; title: string; slug: string; dek: string } | null;
  category: { name: string; slug: string; description?: string } | null;
  series: { name: string; slug: string; description?: string } | null;
  author: { name: string; slug: string; bio?: string } | null;
};

export type CuratedModule = {
  id: number;
  placement: "HOME" | "CATEGORY" | "SERIES" | "AUTHOR";
  title: string;
  subtitle: string;
  order: number;
  publish_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  items: CuratedModuleItem[];
};

function sortByOrder<T extends { order: number }>(xs: T[]): T[] {
  return xs.slice().sort((a, b) => a.order - b.order);
}

export function CuratedModules({ modules }: { modules: CuratedModule[] }) {
  const curated = modules.filter((m) => m.is_active).slice().sort((a, b) => a.order - b.order);
  if (!curated.length) return null;

  return (
    <div className="mb-10 space-y-6">
      {curated.map((m) => (
        <section key={m.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{m.title || "Module"}</h2>
            {m.subtitle ? <p className="mt-2 text-sm text-zinc-600">{m.subtitle}</p> : null}
          </div>

          {m.items?.length ? (
            <ul className="mt-4 space-y-3">
              {sortByOrder(m.items).map((it) => {
                if (it.item_type === "ARTICLE" && it.article) {
                  const title = it.override_title || it.article.title;
                  const dek = it.override_dek || it.article.dek;
                  return (
                    <li key={it.id} className="text-sm">
                      <Link className="font-medium text-zinc-900 hover:underline" href={`/${it.article.slug}`}>
                        {title}
                      </Link>
                      {dek ? <div className="mt-1 text-xs text-zinc-500">{dek}</div> : null}
                    </li>
                  );
                }

                if (it.item_type === "CATEGORY" && it.category) {
                  return (
                    <li key={it.id} className="text-sm">
                      <Link className="font-medium text-zinc-900 hover:underline" href={`/categories/${it.category.slug}`}>
                        {it.override_title || it.category.name}
                      </Link>
                    </li>
                  );
                }

                if (it.item_type === "SERIES" && it.series) {
                  return (
                    <li key={it.id} className="text-sm">
                      <Link className="font-medium text-zinc-900 hover:underline" href={`/series/${it.series.slug}`}>
                        {it.override_title || it.series.name}
                      </Link>
                    </li>
                  );
                }

                if (it.item_type === "AUTHOR" && it.author) {
                  return (
                    <li key={it.id} className="text-sm">
                      <Link className="font-medium text-zinc-900 hover:underline" href={`/authors/${it.author.slug}`}>
                        {it.override_title || it.author.name}
                      </Link>
                    </li>
                  );
                }

                return null;
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No items configured.</p>
          )}
        </section>
      ))}
    </div>
  );
}
