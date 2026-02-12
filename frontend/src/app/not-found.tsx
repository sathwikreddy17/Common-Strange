import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Badge */}
        <div className="mb-6">
          <span className="inline-block px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-sm font-mono rounded-full">
            404
          </span>
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-zinc-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/categories"
            className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Browse Categories
          </Link>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-zinc-800">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
            Looking for something specific?
          </p>
          <form action="/search" method="GET" className="flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              name="q"
              placeholder="Search articles..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 dark:bg-zinc-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-zinc-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
