'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Film, MessageCircle, PlusSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface BottomBarProps {
  onCreatePostClick?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ onCreatePostClick }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-black border-t border-neutral-200 dark:border-[#262626] flex items-center justify-around px-2 z-40 select-none text-black dark:text-white transition-colors duration-150">
      {/* Home */}
      <Link href="/" className="p-2 text-black dark:text-white">
        <Home
          className={`w-6 h-6 ${
            pathname === '/'
              ? 'stroke-[2.5]'
              : 'stroke-2 text-neutral-500 dark:text-neutral-400'
          }`}
        />
      </Link>

      {/* Explore */}
      <Link href="/explore" className="p-2 text-black dark:text-white">
        <Compass
          className={`w-6 h-6 ${
            pathname === '/explore'
              ? 'stroke-[2.5]'
              : 'stroke-2 text-neutral-500 dark:text-neutral-400'
          }`}
        />
      </Link>

      {/* Create */}
      <button
        onClick={onCreatePostClick}
        type="button"
        className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
      >
        <PlusSquare className="w-6 h-6 stroke-2" />
      </button>

      {/* Reels */}
      <Link href="/reels" className="p-2 text-black dark:text-white">
        <Film
          className={`w-6 h-6 ${
            pathname === '/reels'
              ? 'stroke-[2.5]'
              : 'stroke-2 text-neutral-500 dark:text-neutral-400'
          }`}
        />
      </Link>

      {/* Messages */}
      <Link href="/direct" className="p-2 text-black dark:text-white">
        <MessageCircle
          className={`w-6 h-6 ${
            pathname === '/direct'
              ? 'stroke-[2.5]'
              : 'stroke-2 text-neutral-500 dark:text-neutral-400'
          }`}
        />
      </Link>

      {/* Profile */}
      {user && (
        <Link href={`/profile/${user.username}`} className="p-2">
          <div
            className={`w-6 h-6 rounded-full overflow-hidden border ${
              pathname === `/profile/${user.username}`
                ? 'border-black dark:border-white ring-1 ring-black dark:ring-white'
                : 'border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <img
              src={user.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
      )}
    </nav>
  );
};

export default BottomBar;
