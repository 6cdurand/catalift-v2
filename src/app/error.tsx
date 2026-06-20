'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
