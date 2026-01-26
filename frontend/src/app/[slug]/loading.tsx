export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-10 w-3/4 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>

      {/* Hero image skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="aspect-video bg-gray-200 rounded-lg animate-pulse mb-8"></div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    </div>
  );
}
