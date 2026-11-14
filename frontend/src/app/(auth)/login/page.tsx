'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ identifier, password });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid credentials. Please check your username/email and password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-4 relative transition-colors duration-150">
      {/* Top Right Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:scale-105 transition-all shadow-sm"
        title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      >
        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-700" />}
      </button>

      <div className="w-full max-w-[350px] flex flex-col gap-3">
        {/* Main Login Card */}
        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-[#262626] rounded-sm px-10 py-10 flex flex-col items-center shadow-sm dark:shadow-none">
          {/* Instagram Wordmark */}
          <h1 className="text-4xl font-bold font-serif italic text-black dark:text-white mb-8 tracking-tight select-none">
            Instagram
          </h1>

          {/* Error Alert */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs text-center rounded-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
            {/* Identifier input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Phone number, username, or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-[#121212] border border-neutral-200 dark:border-[#262626] focus:border-neutral-400 dark:focus:border-neutral-500 rounded-[3px] text-xs px-2.5 py-2.5 text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-colors"
                autoComplete="username"
                required
              />
            </div>

            {/* Password input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-[#121212] border border-neutral-200 dark:border-[#262626] focus:border-neutral-400 dark:focus:border-neutral-500 rounded-[3px] text-xs px-2.5 py-2.5 text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none pr-10 transition-colors"
                autoComplete="current-password"
                required
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !identifier || !password}
              className="mt-2 w-full bg-[#0095F6] hover:bg-[#1877F2] disabled:opacity-40 disabled:hover:bg-[#0095F6] text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
            </button>
          </form>

          {/* OR Divider */}
          <div className="w-full flex items-center my-5">
            <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-[#262626]"></div>
            <span className="px-4 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider">
              OR
            </span>
            <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-[#262626]"></div>
          </div>

          {/* Demo helper */}
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
            Sign in with your registered username or email address.
          </p>
        </div>

        {/* Switch to Sign Up Card */}
        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-[#262626] rounded-sm py-5 text-center text-xs text-neutral-600 dark:text-neutral-300 shadow-sm dark:shadow-none">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#0095F6] font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
