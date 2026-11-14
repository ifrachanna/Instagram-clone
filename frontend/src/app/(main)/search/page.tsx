'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Loader2, UserCheck, Users } from 'lucide-react';
import api from '@/services/api';
import { IUser } from '@/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSearchResults(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchSearchResults = async (searchQuery: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-6 px-4 text-black dark:text-white transition-colors">
      {/* 1. Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by username or full name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-100 dark:bg-[#121212] border border-neutral-200 dark:border-[#262626] focus:border-neutral-400 dark:focus:border-neutral-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition-colors"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Search Results Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {query.trim() ? 'Search Results' : 'Suggested Accounts'}
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />}
      </div>

      {/* 3. Users List */}
      <div className="flex flex-col gap-1">
        {users.length > 0 ? (
          users.map((user) => (
            <Link
              key={user._id}
              href={`/profile/${user.username}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-[#121212] transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                  <img
                    src={user.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-black dark:text-white group-hover:underline">
                      {user.username}
                    </span>
                    {user.isVerified && (
                      <span className="text-[#0095F6] text-xs">●</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{user.fullName}</span>
                </div>
              </div>

              <span className="text-xs text-[#0095F6] font-semibold group-hover:underline">
                View
              </span>
            </Link>
          ))
        ) : !loading ? (
          <div className="py-16 text-center text-neutral-500 flex flex-col items-center gap-2">
            <Users className="w-10 h-10 stroke-1 text-neutral-400 dark:text-neutral-600 mb-1" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {query.trim() ? `No users found matching "${query}"` : 'No accounts to display'}
            </p>
            <p className="text-xs text-neutral-500">
              Try searching for a different username or full name.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
