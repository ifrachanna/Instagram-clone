'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Film, Layers, Hash, X } from 'lucide-react';
import api from '@/services/api';
import { IPost } from '@/types';
import PostCard from '@/components/posts/PostCard';
import { ExploreGridSkeleton } from '@/components/common/Skeletons';

export default function ExplorePage() {
  return (
    <React.Suspense fallback={<ExploreSkeletonFallback />}>
      <ExploreContent />
    </React.Suspense>
  );
}

function ExploreSkeletonFallback() {
  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-2 sm:px-4 text-white">
      <ExploreGridSkeleton />
    </div>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const tagParam = searchParams.get('tag');

  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<IPost | null>(null);

  useEffect(() => {
    fetchExplorePosts();
  }, [tagParam]);

  const fetchExplorePosts = async () => {
    try {
      setLoading(true);
      const url = tagParam
        ? `/posts/explore?tag=${encodeURIComponent(tagParam)}&limit=30`
        : '/posts/explore?limit=30';
      const { data } = await api.get(url);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load explore posts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-2 sm:px-4 text-black dark:text-white transition-colors">
      {/* Hashtag Header (if filtering by tag) */}
      {tagParam && (
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-200 dark:border-[#262626]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-black dark:text-white">
              <Hash className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black dark:text-white">#{tagParam}</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-xs text-[#0095F6] hover:underline font-semibold bg-neutral-100 dark:bg-[#1a1a1a] hover:bg-neutral-200 dark:hover:bg-[#262626] text-neutral-800 dark:text-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear filter</span>
          </Link>
        </div>
      )}

      {/* Grid of Posts or Skeletons */}
      {loading ? (
        <ExploreGridSkeleton />
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-3 md:gap-6">
          {posts.map((post) => {
            const mediaItem = post.media?.[0] || {
              url: (post as any).mediaUrl,
              mediaType: 'image',
            };
            const isMultiple = post.media && post.media.length > 1;

            return (
              <div
                key={post._id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-pointer rounded-sm"
              >
                {/* Media thumbnail */}
                {mediaItem.mediaType === 'video' ? (
                  <video src={mediaItem.url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={mediaItem.url}
                    alt={post.caption || 'Explore Post'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Media Type Icon Badge */}
                <div className="absolute top-2 right-2 text-white/90 drop-shadow">
                  {mediaItem.mediaType === 'video' ? (
                    <Film className="w-4 h-4" />
                  ) : isMultiple ? (
                    <Layers className="w-4 h-4" />
                  ) : null}
                </div>

                {/* Dark Hover Overlay with Likes & Comments Counts */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-5 h-5 fill-white stroke-white" />
                    <span>{post.likes ? post.likes.length : 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-5 h-5 fill-white stroke-white -rotate-90" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center text-neutral-400 flex flex-col items-center gap-3">
          <Hash className="w-12 h-12 stroke-1 text-neutral-600" />
          <h3 className="text-base font-semibold text-white">No Posts Found</h3>
          <p className="text-xs text-neutral-500 max-w-xs">
            {tagParam
              ? `There are no posts matching #${tagParam} yet.`
              : 'Explore is empty right now. Share something new!'}
          </p>
        </div>
      )}

      {/* Selected Post Modal Viewer */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="max-w-[470px] w-full">
            <PostCard
              post={selectedPost}
              onPostDeleted={(deletedId) => {
                setPosts((prev) => prev.filter((p) => p._id !== deletedId));
                setSelectedPost(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
