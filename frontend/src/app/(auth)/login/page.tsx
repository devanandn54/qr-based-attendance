'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, LoginResponse } from '@/types';
import { fetchApi, setAuthCookies } from '@/lib/api';
import Image from 'next/image';
;

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
        setErrors({});
        
        console.log('Submitting login request...');
        
        const response = await fetchApi<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData),
        });
        
        console.log('Login response:', response);
        
        if (!response.token || !response.role) {
            throw new Error('Invalid response from server');
        }

        const normalizedRole = response.role.toLowerCase() as 'teacher' | 'student';
        console.log('normalizedRole', normalizedRole);
        
        // Set cookies first
        setAuthCookies(response.token, normalizedRole);

        
        
        // Determine redirect path
        const redirectPath = normalizedRole === 'teacher' ? '/teacher' : '/student';
        console.log('Redirecting to:', redirectPath);
        
        // Add a small delay to ensure cookies are set
        router.refresh(); // Clear router cache
        await router.push(redirectPath); // Navigate to the target page  
        
  
        
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-800 flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/qurify.svg"
            alt="Qurify"
            width={180}
            height={150}
            className="mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Qurify</h1>
          <p className="text-gray-600 text-lg">Verifying Presence with Precision</p>
        </div>
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className={`mt-2 block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-500">{errors.username}</p>
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
              className={`mt-2 block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )

}