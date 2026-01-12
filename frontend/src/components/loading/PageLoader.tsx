interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="relative">
        {/* Spinner */}
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
      </div>
      <p className="mt-4 text-gray-600 animate-pulse">{message}</p>
    </div>
  );
}
