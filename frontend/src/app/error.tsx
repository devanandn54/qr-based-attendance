'use client';

import { useEffect } from "react";

export default function Error({
    error, reset,
} : {
    error: Error & { digest?: string};
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong!</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    )
}