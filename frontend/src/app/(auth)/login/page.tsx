'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, LoginResponse } from '@/types';
import { fetchApi } from '@/lib/api';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginForm>({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginForm> & { general?: string }>({});
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Partial<LoginForm> = {};
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginForm]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setErrors({}); // Clear any previous errors
      
      console.log('Submitting login request...'); // Debug log
      
      const response = await fetchApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      console.log('Login response:', response); // Debug log
      
      if (!response.token || !response.role) {
        throw new Error('Invalid response from server');
      }

      const normalizedRole = response.role.toLowerCase() as 'teacher' | 'student';
      console.log('normalizedRole', normalizedRole);
      
      // Store auth data
      document.cookie = `token=${response.token}; path=/;`;
      document.cookie = `role=${normalizedRole}; path=/;`;
      
      // Determine redirect path
      const redirectPath = normalizedRole === 'teacher' ? '/teacher' : '/student';
      
      console.log('Redirecting to:', redirectPath); // Debug log
      
      // Force a hard navigation instead of client-side routing
      // window.location.href = redirectPath;
      router.refresh();
      router.push(redirectPath);
      
    } catch (error) {
      console.error('Login error:', error); // Debug log
      
      if (error instanceof ApiError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ 
          general: error instanceof Error ? error.message : 'An unexpected error occurred' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Login</h1>
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-500">{errors.username}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}