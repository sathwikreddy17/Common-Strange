"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

// Use a same-origin proxy so this works both in Docker and non-Docker.
const API_BASE = "";

// Date formatting helper (like "January 24, 2026")
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    });
  } catch {
    return "";
  }
}

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

type PublicArticleListItem = {
  id: number;
  title: string;
  slug: string;
  dek: string;
  updated_at: string;
  published_at: string | null;
  category: { name: string; slug: string; description: string } | null;
  series: { name: string; slug: string; description: string } | null;
  authors: Array<{ name: string; slug: string; bio: string }>;
  hero_image?: HeroImage | null;
  reading_time_minutes?: number;
};

type TrendingItem = {
  id: number;
  slug: string;
  title: string;
  dek?: string;
  category?: { name: string; slug: string } | null;
  authors?: Array<{ name: string; slug: string }>;
  published_at?: string | null;
};

async function fetchArticles(): Promise<PublicArticleListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/articles?status=published`);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (data && typeof data === "object" && "results" in data) {
      return (data as { results: PublicArticleListItem[] }).results;
    }
    return Array.isArray(data) ? (data as PublicArticleListItem[]) : [];
  } catch (err) {
    console.error("Error fetching articles:", err);
    return [];
  }
}

async function fetchTrending(): Promise<TrendingItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/trending?limit=10`);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as TrendingItem[]) : [];
  } catch {
    return [];
  }
}

// ----- Components -----

type UserData = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_staff: boolean;
};

function Header({ onSearchOpen, onMenuOpen, user }: { onSearchOpen: () => void; onMenuOpen: () => void; user: UserData | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuOpen}
            className="text-sm font-medium uppercase tracking-wide text-zinc-600 hover:text-zinc-900 transition-colors"
            aria-label="Open menu"
          >
            Menu
          </button>
          <span className="text-zinc-300">/</span>
          <button 
            onClick={onSearchOpen}
            className="text-zinc-500 hover:text-zinc-900 transition-colors"
            aria-label="Open search"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Center: Logo */}
        <Link href="/" className="text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Common Strange
          </h1>
        </Link>

        {/* Right: Navigation */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/categories" className="text-zinc-600 hover:text-zinc-900 transition-colors">Categories</Link>
          <Link href="/series" className="text-zinc-600 hover:text-zinc-900 transition-colors">Series</Link>
          <Link href="/authors" className="text-zinc-600 hover:text-zinc-900 transition-colors">Authors</Link>
          {user ? (
            <Link href="/account" className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium">
                {user.display_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link href="/login" className="text-zinc-600 hover:text-zinc-900 transition-colors">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

// Mobile Menu Overlay
function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Menu Panel */}
      <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <span className="font-serif text-xl font-bold text-zinc-900">Menu</span>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="px-6 py-8">
          <ul className="space-y-6">
            <li>
              <Link href="/categories" onClick={onClose} className="text-lg font-medium text-zinc-900 hover:text-zinc-600">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/series" onClick={onClose} className="text-lg font-medium text-zinc-900 hover:text-zinc-600">
                Series
              </Link>
            </li>
            <li>
              <Link href="/authors" onClick={onClose} className="text-lg font-medium text-zinc-900 hover:text-zinc-600">
                Authors
              </Link>
            </li>
            <li>
              <Link href="/tags" onClick={onClose} className="text-lg font-medium text-zinc-900 hover:text-zinc-600">
                Tags
              </Link>
            </li>
          </ul>
          
          <div className="mt-12 border-t border-zinc-200 pt-8">
            <p className="text-xs uppercase tracking-wide text-zinc-500">About</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Common Strange explores ideas that expand your perspective. Long-form essays, thoughtful analysis, and stories that matter.
            </p>
          </div>
        </nav>
      </div>
    </div>
  );
}

// Search Overlay
function SearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : (data.results || []));
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  }
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Search Panel */}
      <div className="absolute inset-x-0 top-0 bg-white shadow-xl">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Search</span>
            <button 
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-900"
              aria-label="Close search"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full border-b-2 border-zinc-900 bg-transparent py-4 font-serif text-2xl outline-none placeholder:text-zinc-400"
            />
          </form>
          
          {loading && (
            <p className="mt-6 text-sm text-zinc-500">Searching...</p>
          )}
          
          {results.length > 0 && (
            <ul className="mt-6 max-h-[50vh] overflow-y-auto space-y-4">
              {results.map((article) => (
                <li key={article.id}>
                  <Link 
                    href={`/${article.slug}`} 
                    onClick={onClose}
                    className="block rounded-lg p-4 hover:bg-zinc-50 transition-colors"
                  >
                    <h3 className="font-serif text-lg font-bold text-zinc-900">{article.title}</h3>
                    {article.dek && (
                      <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{article.dek}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                      {article.category && <span>{article.category.name}</span>}
                      {article.reading_time_minutes && (
                        <>
                          <span>·</span>
                          <span>{article.reading_time_minutes} min read</span>
                        </>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          
          {query && !loading && results.length === 0 && (
            <p className="mt-6 text-sm text-zinc-500">No results found for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSection({ article }: { article: PublicArticleListItem }) {
  const imageUrl = article.hero_image?.large || article.hero_image?.medium || article.hero_image?.original;
  
  return (
    <section className="relative">
      {/* Background Image */}
      <div className="relative h-[70vh] min-h-[500px] w-full bg-zinc-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.hero_image?.alt || article.title}
            fill
            className="object-cover opacity-80"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-4xl px-6 pb-16 text-center">
            <Link href={`/${article.slug}`} className="group">
              <h2 className="font-serif text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {article.title}
              </h2>
            </Link>
            
            {article.dek && (
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-200 md:text-xl">
                {article.dek}
              </p>
            )}
            
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-zinc-300">
              {article.category && (
                <Link href={`/categories/${article.category.slug}`} className="hover:text-white">
                  {article.category.name}
                </Link>
              )}
              {article.authors?.length > 0 && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span>{article.authors.map(a => a.name).join(", ")}</span>
                </>
              )}
              {article.reading_time_minutes && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span>{article.reading_time_minutes} min read</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article, featured = false, showDate = false }: { article: PublicArticleListItem; featured?: boolean; showDate?: boolean }) {
  const imageUrl = article.hero_image?.medium || article.hero_image?.thumb || article.hero_image?.original;
  const pubDate = formatDate(article.published_at);
  
  return (
    <article className="group">
      {/* Image */}
      <Link href={`/${article.slug}`} className="relative block aspect-[16/10] overflow-hidden rounded-sm bg-zinc-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.hero_image?.alt || article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300">
            <span className="text-4xl text-zinc-400">📄</span>
          </div>
        )}
      </Link>
      
      {/* Content */}
      <div className="mt-4">
        {/* Category Badge */}
        {article.category && (
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <Link 
              href={`/categories/${article.category.slug}`} 
              className="rounded bg-zinc-100 px-2 py-0.5 hover:bg-zinc-200 transition-colors"
            >
              {article.category.name}
            </Link>
          </div>
        )}
        
        {/* Title */}
        <h3 className={`mt-2 font-serif font-bold leading-snug text-zinc-900 ${featured ? "text-2xl" : "text-xl"}`}>
          <Link href={`/${article.slug}`} className="hover:text-zinc-600 transition-colors">
            {article.title}
          </Link>
        </h3>
        
        {/* Dek */}
        {article.dek && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 line-clamp-3">
            {article.dek}
          </p>
        )}
        
        {/* Author + Date + Reading Time */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
          {article.authors?.length > 0 && (
            <Link 
              href={`/authors/${article.authors[0].slug}`}
              className="font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              {article.authors.map(a => a.name).join(", ")}
            </Link>
          )}
          {showDate && pubDate && (
            <>
              {article.authors?.length > 0 && <span className="text-zinc-300">·</span>}
              <span>{pubDate}</span>
            </>
          )}
          {article.reading_time_minutes && (
            <>
              <span className="text-zinc-300">·</span>
              <span>{article.reading_time_minutes} min read</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
          View all →
        </Link>
      )}
    </div>
  );
}

function NewsletterCTA() {
  const [email, setEmail] = useState("");
  
  return (
    <section className="bg-zinc-100 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-serif text-2xl font-bold text-zinc-900 md:text-3xl">
          Join our newsletter
        </h2>
        <p className="mt-3 text-zinc-600">
          Ideas that expand your perspective. Delivered weekly.
        </p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-sm border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-500 sm:w-80"
          />
          <button
            type="submit"
            className="rounded-sm bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

function TrendingSidebar({ items }: { items: TrendingItem[] }) {
  if (!items.length) return null;
  
  return (
    <aside className="rounded-sm border border-zinc-200 bg-white p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Popular This Week
      </h3>
      <ul className="mt-6 space-y-6">
        {items.slice(0, 5).map((item, idx) => (
          <li key={item.id} className="flex gap-4 group">
            <span className="font-serif text-2xl font-bold text-zinc-200 group-hover:text-zinc-400 transition-colors">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <Link href={`/${item.slug}`} className="font-serif font-semibold text-zinc-900 hover:text-zinc-600 transition-colors leading-snug block">
                {item.title}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                {item.authors && item.authors.length > 0 && (
                  <span className="font-medium text-zinc-600">{item.authors[0].name}</span>
                )}
                {item.category && (
                  <>
                    {item.authors && item.authors.length > 0 && <span>·</span>}
                    <span>{item.category.name}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <Link 
        href="/categories" 
        className="mt-6 block text-center text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        View all articles →
      </Link>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="font-serif text-2xl font-bold text-zinc-900">Common Strange</h2>
            <p className="mt-1 text-sm text-zinc-500">Ideas that expand your perspective.</p>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/categories" className="text-zinc-600 hover:text-zinc-900">Categories</Link>
            <Link href="/series" className="text-zinc-600 hover:text-zinc-900">Series</Link>
            <Link href="/authors" className="text-zinc-600 hover:text-zinc-900">Authors</Link>
            <Link href="/tags" className="text-zinc-600 hover:text-zinc-900">Tags</Link>
          </nav>
        </div>
        
        <div className="mt-8 border-t border-zinc-100 pt-8 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Common Strange. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// ----- Main Page -----

async function fetchCurrentUser(): Promise<UserData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/me/`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [articles, setArticles] = useState<PublicArticleListItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError((prev) => prev ?? "Request timed out while loading articles.");
      }
    }, 8000);

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [data, trendingData, userData] = await Promise.all([
          fetchArticles(),
          fetchTrending(),
          fetchCurrentUser(),
        ]);

        if (cancelled) return;
        setArticles(Array.isArray(data) ? data : []);
        setTrending(Array.isArray(trendingData) ? trendingData : []);
        setUser(userData);
      } catch (err) {
        if (cancelled) return;
        console.error("Home fetch error:", err);
        setError("Failed to load content. Please check your backend/API connection.");
        setArticles([]);
        setTrending([]);
      } finally {
        if (cancelled) return;
        clearTimeout(t);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // Split articles: first for hero, rest for grid
  const heroArticle = articles[0];
  const featuredArticles = articles.slice(1, 4);
  const latestArticles = articles.slice(4, 10);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
          <p className="mt-4 text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!articles.length) {
    return (
      <>
        <Header onMenuOpen={() => setMenuOpen(true)} onSearchOpen={() => setSearchOpen(true)} user={user} />
        <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <main className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-zinc-900">No articles yet</h2>
            <p className="mt-2 text-zinc-600">Check back soon for new content.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onMenuOpen={() => setMenuOpen(true)} onSearchOpen={() => setSearchOpen(true)} user={user} />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      
      {/* Hero Section */}
      {heroArticle && <HeroSection article={heroArticle} />}
      
      {/* Featured Articles Grid */}
      {featuredArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeader title="Featured" />
          <div className="grid gap-8 md:grid-cols-3">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} featured />
            ))}
          </div>
        </section>
      )}
      
      {/* Newsletter CTA */}
      <NewsletterCTA />
      
      {/* Latest + Trending */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* Latest Articles */}
          <div>
            <SectionHeader title="Latest" href="/categories" />
            <div className="grid gap-8 sm:grid-cols-2">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} showDate />
              ))}
            </div>
            
            {articles.length > 10 && (
              <div className="mt-10 text-center">
                <Link
                  href="/categories"
                  className="inline-block rounded-sm border border-zinc-300 px-8 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                >
                  Browse all articles
                </Link>
              </div>
            )}
          </div>
          
          {/* Trending Sidebar */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <TrendingSidebar items={trending} />
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
