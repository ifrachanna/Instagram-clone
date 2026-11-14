'use client';

import React from 'react';

/**
 * Skeleton for Stories bar at top of Home feed
 */
export const StoriesBarSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-black border-b border-neutral-200 dark:border-[#262626] py-3 px-2 sm:px-4 mb-4 select-none transition-colors">
      <div className="flex items-center gap-4 overflow-x-hidden py-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse p-[2px]">
              <div className="w-full h-full rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            </div>
            <div className="w-12 h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for Home feed post cards
 */
export const FeedPostSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-[470px] bg-white dark:bg-black border border-neutral-200 dark:border-[#262626] rounded-xl overflow-hidden mb-5 text-black dark:text-white shadow-sm dark:shadow-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="w-24 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="w-14 h-2 bg-neutral-200/70 dark:bg-neutral-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
      </div>

      {/* Media area */}
      <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-900 animate-pulse" />

      {/* Actions bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          </div>
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        </div>

        {/* Likes line */}
        <div className="w-20 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2.5" />

        {/* Caption lines */}
        <div className="space-y-1.5 mb-3">
          <div className="w-3/4 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="w-1/2 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>

        {/* Comments count */}
        <div className="w-28 h-2.5 bg-neutral-200/70 dark:bg-neutral-800/60 rounded animate-pulse" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Explore grid page
 */
export const ExploreGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-3 md:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/50 rounded-sm animate-pulse"
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for Profile posts grid
 */
export const ProfileGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-3 md:gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/50 rounded-sm animate-pulse"
        />
      ))}
    </div>
  );
};
