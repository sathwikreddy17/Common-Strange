"use client";

import Link from "next/link";
import type { UserData } from "./Header";

export function MobileMenu({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
}) {
  if (!isOpen) return null;

  const isStaff =
    user &&
    (user.role === "writer" ||
      user.role === "editor" ||
      user.role === "publisher" ||
      user.is_staff);

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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="px-6 py-8">
          {isStaff && (
            <div className="mb-6 pb-6 border-b border-zinc-200">
              <Link
                href="/editor"
                onClick={onClose}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                ✏️ Write / Editor Dashboard
              </Link>
            </div>
          )}

          <ul className="space-y-6">
            <li>
              <Link
                href="/categories"
                onClick={onClose}
                className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/series"
                onClick={onClose}
                className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
              >
                Series
              </Link>
            </li>
            <li>
              <Link
                href="/authors"
                onClick={onClose}
                className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
              >
                Authors
              </Link>
            </li>
            <li>
              <Link
                href="/tags"
                onClick={onClose}
                className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
              >
                Tags
              </Link>
            </li>
          </ul>

          <div className="mt-8 pt-6 border-t border-zinc-200">
            {user ? (
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 text-zinc-700 hover:text-zinc-900"
              >
                <span className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium">
                  {user.display_name?.charAt(0).toUpperCase() ||
                    user.username.charAt(0).toUpperCase()}
                </span>
                <span>{user.display_name || user.username}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
              >
                Sign in
              </Link>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8">
            <p className="text-xs uppercase tracking-wide text-zinc-500">About</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Common Strange explores ideas that expand your perspective. Long-form essays,
              thoughtful analysis, and stories that matter.
            </p>
          </div>
        </nav>
      </div>
    </div>
  );
}
