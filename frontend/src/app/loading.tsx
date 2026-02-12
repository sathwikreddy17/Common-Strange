export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-zinc-950">
      <div className="text-center">
        {/* Spinner */}
        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4 dark:border-zinc-700 dark:border-t-blue-400"></div>
        <p className="text-gray-600 dark:text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
