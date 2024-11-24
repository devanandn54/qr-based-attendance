'use client';

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_COOKIES } from "@/lib/api";
import Image from 'next/image';
import { FiLogOut } from "react-icons/fi"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const role = typeof window !== 'undefined' 
    ? window.location.pathname.startsWith('/teacher') ? 'teacher' : 'student'
    : 'student';

  const { user, loading } = useAuth(role);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleLogout = () => {
    const cookieConfig = role === 'teacher' ? AUTH_COOKIES.TEACHER : AUTH_COOKIES.STUDENT;
    document.cookie = `${cookieConfig.token}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${cookieConfig.role}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    router.refresh();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Single header for all dashboard pages */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          
            <div className="flex items-center space-x-2">
            <Image
                src="/qurify.svg"
                alt="Qurify"
                width={90}
                height={90}
                className="mr-2"
              />
              <span className="text-xl font-semibold text-indigo-700">Attendance System</span>
            </div>
            {user && (
              <div
              className="relative flex items-center space-x-2 bg-indigo-700 text-white px-3 py-2 rounded-md hover:bg-indigo-800 transition-colors cursor-pointer"
              onClick={() => setShowLogout(!showLogout)}
            >
                <span className="text-sm font-medium">{user.username.charAt(0).toUpperCase()}</span>
                {showLogout && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md">
                    <button
                      className="flex items-center space-x-2 w-full hover:text-indigo-800"
                      onClick={handleLogout}
                    >
                      <FiLogOut />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          
        </div>
      </nav>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}