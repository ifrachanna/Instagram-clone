'use client';

import React, { useEffect, useState } from 'react';
import StoriesBar from '@/components/stories/StoriesBar';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IPost } from '@/types';
import { Loader2, PlusSquare } from 'lucide-react';
import { FeedPostSkeleton } from '@/components/common/Skeletons';

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeed();
    } else if (!authLoading) {
      fetchExploreFallback();
    }
  }, [isAuthenticated, authLoading]);

  // Listen for posts created from global sidebar/bottombar
  useEffect(() => {
    const handleNewGlobalPost = (e: any) => {
      if (e.detail) {
        setPosts((prev) => [e.detail, ...prev]);
      } else {
        fetchFeed();
      }
    };

    window.addEventListener('post-created', handleNewGlobalPost);
    return () => window.removeEventListener('post-created', handleNewGlobalPost);
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/posts/feed?limit=15');
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExploreFallback = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/posts/explore?limit=15');
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load explore feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  const handlePostCreated = (newPost: IPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      {/* 1. Horizontal Stories Bar */}
      <div className="w-full max-w-[630px]">
        <StoriesBar />
      </div>

      {/* 2. Main Posts Feed */}
      <div className="w-full max-w-[470px] flex flex-col items-center">
        {loading ? (
          <div className="w-full flex flex-col items-center">
            <FeedPostSkeleton />
            <FeedPostSkeleton />
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))
        ) : (
          <div className="w-full border border-neutral-200 dark:border-[#262626] rounded-xl p-8 my-8 text-center flex flex-col items-center gap-3 bg-neutral-50 dark:bg-[#121212]/40 text-black dark:text-white">
            <div className="w-12 h-12 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              <PlusSquare className="w-6 h-6 stroke-1" />
            </div>
            <h3 className="text-sm font-semibold text-black dark:text-white">No Posts in Your Feed Yet</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs leading-relaxed">
              Follow people or create your very first post with photos, videos, and captions.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Create Post
            </button>
          </div>
        )}
      </div>

      {/* 3. Global Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
