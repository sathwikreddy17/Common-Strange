import Link from "next/link";
import Image from "next/image";

type HeroImage = {
  id: number;
  thumb: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type RelatedArticle = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  published_at: string | null;
  category: { name: string; slug: string } | null;
  authors: Array<{ name: string; slug: string }>;
  hero_image?: HeroImage | null;
  reading_time_minutes?: number;
};

export default function RelatedArticles({ articles }: { articles: RelatedArticle[] }) {
  if (!articles.length) return null;

  return (
    <section className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-700">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-8">
        You might also like
      </h2>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => {
          const heroSrc = article.hero_image?.medium || article.hero_image?.thumb;
          return (
            <article key={article.id} className="group">
              <Link href={`/${article.slug}`} className="block overflow-hidden rounded-sm">
                {heroSrc ? (
                  <div className="relative aspect-[3/2]">
                    <Image
                      src={heroSrc}
                      alt={article.hero_image?.alt || article.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[3/2] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                    <span className="font-serif text-zinc-400 dark:text-zinc-500 text-sm">
                      No image
                    </span>
                  </div>
                )}
              </Link>
              <div className="mt-3">
                {article.category && (
                  <Link
                    href={`/categories/${article.category.slug}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                  >
                    {article.category.name}
                  </Link>
                )}
                <Link href={`/${article.slug}`} className="mt-1 block">
                  <h3 className="font-serif text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {article.authors?.length > 0 && (
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                      {article.authors[0].name}
                    </span>
                  )}
                  {article.reading_time_minutes && (
                    <>
                      <span>·</span>
                      <span>{article.reading_time_minutes} min</span>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
