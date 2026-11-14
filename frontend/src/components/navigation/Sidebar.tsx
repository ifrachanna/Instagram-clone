'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Compass,
  Film,
  MessageCircle,
  Heart,
  PlusSquare,
  Menu,
  LogOut,
  Instagram,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

interface SidebarProps {
  onCreatePostClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCreatePostClick }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark, theme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Reels', href: '/reels', icon: Film },
    { label: 'Messages', href: '/direct', icon: MessageCircle },
    { label: 'Notifications', href: '/notifications', icon: Heart },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between fixed top-0 left-0 h-screen border-r border-neutral-200 dark:border-[#262626] bg-white dark:bg-black text-black dark:text-white z-40 md:w-20 xl:w-64 px-3 py-6 select-none transition-colors duration-150">
      {/* Top Section: Logo & Navigation */}
      <div className="flex flex-col gap-6">
        {/* Instagram Brand / Logo */}
        <Link href="/" className="px-3 pt-2 pb-4 flex items-center">
          <div className="xl:hidden flex items-center justify-center w-full">
            <Instagram className="w-7 h-7 text-black dark:text-white hover:scale-105 transition-transform" />
          </div>
          <span className="hidden xl:block text-2xl font-bold tracking-tight font-serif italic text-black dark:text-white">
            Instagram
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#121212] transition-colors group ${
                  isActive
                    ? 'font-bold text-black dark:text-white'
                    : 'font-normal text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform group-hover:scale-105 ${
                    isActive ? 'stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                <span className="hidden xl:inline text-sm">{item.label}</span>
              </Link>
            );
          })}

          {/* Create Post Button */}
          <button
            onClick={onCreatePostClick}
            type="button"
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#121212] transition-colors group text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white text-left w-full"
          >
            <PlusSquare className="w-6 h-6 stroke-2 group-hover:scale-105 transition-transform" />
            <span className="hidden xl:inline text-sm font-normal">Create</span>
          </button>

          {/* Theme Toggle Button in Nav */}
          <button
            onClick={toggleTheme}
            type="button"
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#121212] transition-colors group text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white text-left w-full"
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {isDark ? (
              <Sun className="w-6 h-6 stroke-2 text-amber-400 group-hover:scale-105 transition-transform" />
            ) : (
              <Moon className="w-6 h-6 stroke-2 text-neutral-700 group-hover:scale-105 transition-transform" />
            )}
            <span className="hidden xl:inline text-sm font-normal">
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* Profile Link */}
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className={`flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#121212] transition-colors group ${
                pathname === `/profile/${user.username}`
                  ? 'font-bold text-black dark:text-white'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 flex-shrink-0">
                <img
                  src={user.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden xl:inline text-sm">Profile</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Bottom Section: More / Settings Dropdown */}
      <div className="relative">
        {showMoreMenu && (
          <div className="absolute bottom-16 left-0 w-60 bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[#262626] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-black dark:text-white animate-in fade-in zoom-in-95 duration-100">
            {/* Switch appearance */}
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex items-center justify-between w-full px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#262626] rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-neutral-700" />
                )}
                <span>Switch appearance</span>
              </div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                {theme}
              </span>
            </button>

            <div className="border-t border-neutral-200 dark:border-[#262626] my-1" />

            {/* Log out */}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-neutral-100 dark:hover:bg-[#262626] rounded-lg transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#121212] transition-colors group text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white w-full"
        >
          <Menu className="w-6 h-6 stroke-2 group-hover:scale-105 transition-transform" />
          <span className="hidden xl:inline text-sm font-normal">More</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
