'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, Heart, MessageCircle } from 'lucide-react';
import Sidebar from '@/components/navigation/Sidebar';
import BottomBar from '@/components/navigation/BottomBar';
import CreatePostModal from '@/components/posts/CreatePostModal';
import { useTheme } from '@/context/ThemeContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex transition-colors duration-150">
      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-[#262626] flex items-center justify-between px-4 z-40 text-black dark:text-white">
        <Link href="/" className="font-serif italic font-bold text-xl tracking-tight text-black dark:text-white">
          Instagram
        </Link>
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#1a1a1a] transition-colors"
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-700" />}
          </button>
          <Link href="/notifications" className="p-1 text-neutral-800 dark:text-neutral-200">
            <Heart className="w-5 h-5 stroke-2" />
          </Link>
        </div>
      </header>

      {/* Desktop Fixed Left Navigation */}
      <Sidebar onCreatePostClick={() => setIsCreateModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-20 xl:pl-64 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen flex justify-center">
        <div className="w-full max-w-4xl px-2 sm:px-4">{children}</div>
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomBar onCreatePostClick={() => setIsCreateModalOpen(true)} />

      {/* Global Post Creation Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={(post) => {
          window.dispatchEvent(new CustomEvent('post-created', { detail: post }));
        }}
      />
    </div>
  );
}
