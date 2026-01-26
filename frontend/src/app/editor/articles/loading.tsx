export default function ArticlesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex gap-4">
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border-b border-gray-100 px-6 py-4 last:border-b-0"
            >
              <div className="flex gap-4 items-center">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
