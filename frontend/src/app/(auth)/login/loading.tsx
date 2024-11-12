export default function Loading() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }