"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export type UserData = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_staff: boolean;
};

export function Header({
  onSearchOpen,
  onMenuOpen,
  user,
}: {
  onSearchOpen: () => void;
  onMenuOpen: () => void;
  user: UserData | null;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuOpen}
            className="text-sm font-medium uppercase tracking-wide text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            aria-label="Open menu"
          >
            Menu
          </button>
          <span className="text-zinc-300 dark:text-zinc-600">/</span>
          <button
            onClick={onSearchOpen}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            aria-label="Open search"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {/* Center: Logo */}
        <Link href="/" className="text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
            Common Strange
          </h1>
        </Link>

        {/* Right: Navigation */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/categories" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            Categories
          </Link>
          <Link href="/series" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            Series
          </Link>
          <Link href="/authors" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            Authors
          </Link>
          <ThemeToggle />
          {user ? (
            <>
              {(user.role === "writer" ||
                user.role === "editor" ||
                user.role === "publisher" ||
                user.is_staff) && (
                <Link
                  href="/editor"
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors font-medium"
                >
                  ✏️ Write
                </Link>
              )}
              <Link
                href="/account"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
              >
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium dark:text-zinc-200">
                  {user.display_name?.charAt(0).toUpperCase() ||
                    user.username.charAt(0).toUpperCase()}
                </span>
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
