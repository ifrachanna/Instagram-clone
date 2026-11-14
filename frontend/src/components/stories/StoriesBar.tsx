'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Eye,
  Trash2,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { StoriesBarSkeleton } from '@/components/common/Skeletons';

interface StoryViewer {
  user: {
    _id: string;
    username: string;
    fullName?: string;
    avatar: string;
    isVerified?: boolean;
  };
  viewedAt: string;
}

interface StoryItem {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  viewers?: StoryViewer[];
}

interface UserStoryGroup {
  user: {
    _id: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  stories: StoryItem[];
  hasUnseen: boolean;
  isSelf: boolean;
}

export const StoriesBar: React.FC = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Story Viewer State
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Story Viewers Modal State
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [viewersList, setViewersList] = useState<StoryViewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stories/feed');
      setStoryGroups(data.feed || []);
    } catch (err) {
      console.error('Failed to load stories feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    setUploading(true);
    try {
      await api.post('/stories', formData);
      await fetchStories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  const openStoryViewer = (groupIndex: number) => {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setShowViewersSheet(false);
    markCurrentStoryAsViewed(groupIndex, 0);
  };

  const markCurrentStoryAsViewed = async (groupIndex: number, storyIndex: number) => {
    const group = storyGroups[groupIndex];
    if (!group) return;
    const story = group.stories[storyIndex];
    if (story) {
      try {
        await api.put(`/stories/${story._id}/view`);
      } catch {
        // silent catch
      }
    }
  };

  const nextStory = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = storyGroups[activeGroupIndex];
    setShowViewersSheet(false);

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      const nextIndex = activeStoryIndex + 1;
      setActiveStoryIndex(nextIndex);
      markCurrentStoryAsViewed(activeGroupIndex, nextIndex);
    } else if (activeGroupIndex < storyGroups.length - 1) {
      const nextGroupIndex = activeGroupIndex + 1;
      setActiveGroupIndex(nextGroupIndex);
      setActiveStoryIndex(0);
      markCurrentStoryAsViewed(nextGroupIndex, 0);
    } else {
      closeStoryViewer();
    }
  };

  const prevStory = () => {
    if (activeGroupIndex === null) return;
    setShowViewersSheet(false);

    if (activeStoryIndex > 0) {
      const prevIndex = activeStoryIndex - 1;
      setActiveStoryIndex(prevIndex);
      markCurrentStoryAsViewed(activeGroupIndex, prevIndex);
    } else if (activeGroupIndex > 0) {
      const prevGroupIndex = activeGroupIndex - 1;
      const prevGroup = storyGroups[prevGroupIndex];
      setActiveGroupIndex(prevGroupIndex);
      setActiveStoryIndex(prevGroup.stories.length - 1);
      markCurrentStoryAsViewed(prevGroupIndex, prevGroup.stories.length - 1);
    }
  };

  const closeStoryViewer = () => {
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
    setShowViewersSheet(false);
    fetchStories();
  };

  // Open Viewers Sheet for current own story
  const handleOpenViewersSheet = async (storyId: string) => {
    setShowViewersSheet(true);
    try {
      setLoadingViewers(true);
      const { data } = await api.get(`/stories/${storyId}/viewers`);
      setViewersList(data.viewers || []);
    } catch (err) {
      console.error('Failed to load story viewers:', err);
      // Fallback to local group data if available
      const localStory = storyGroups[activeGroupIndex!]?.stories[activeStoryIndex];
      setViewersList(localStory?.viewers || []);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Delete current own story
  const handleDeleteCurrentStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      await api.delete(`/stories/${storyId}`);
      closeStoryViewer();
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  if (loading) {
    return <StoriesBarSkeleton />;
  }

  // Find own active story group if exists
  const ownGroup = storyGroups.find((g) => g.isSelf);
  const otherGroups = storyGroups.filter((g) => !g.isSelf);

  const activeGroup = activeGroupIndex !== null ? storyGroups[activeGroupIndex] : null;
  const currentStory = activeGroup ? activeGroup.stories[activeStoryIndex] : null;
  const isViewingSelf = activeGroup ? activeGroup.isSelf : false;
  const viewersCount = currentStory?.viewers?.length || 0;

  return (
    <>
      {/* Horizontal Story Bar */}
      <div className="w-full bg-black border-b border-[#262626] py-3 px-2 sm:px-4 mb-4 select-none">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1">
          {/* 1. Current User Story Item */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="relative">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleUploadStory}
                  className="hidden"
                  disabled={uploading}
                />
                <div
                  className={`w-16 h-16 rounded-full p-[2px] transition-transform group-hover:scale-105 ${
                    ownGroup && ownGroup.stories.length > 0
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                      : 'border border-neutral-700'
                  }`}
                  onClick={(e) => {
                    if (ownGroup && ownGroup.stories.length > 0) {
                      e.preventDefault();
                      const ownIndex = storyGroups.findIndex((g) => g.isSelf);
                      openStoryViewer(ownIndex);
                    }
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                    <img
                      src={user?.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                      alt="Your story"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </label>

              {/* Blue plus icon if uploading or to add new */}
              <label className="absolute bottom-0 right-0 bg-[#0095F6] hover:bg-[#1877F2] text-white p-1 rounded-full border-2 border-black cursor-pointer shadow-md">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleUploadStory}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3 stroke-[3]" />
                )}
              </label>
            </div>
            <span className="text-[11px] text-neutral-400 max-w-[70px] truncate text-center">
              Your story
            </span>
          </div>

          {/* 2. Followed Users Stories */}
          {otherGroups.map((group) => {
            const groupGlobalIndex = storyGroups.findIndex((g) => g.user._id === group.user._id);

            return (
              <div
                key={group.user._id}
                onClick={() => openStoryViewer(groupGlobalIndex)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div
                  className={`w-16 h-16 rounded-full p-[2.5px] transition-transform group-hover:scale-105 ${
                    group.hasUnseen
                      ? 'bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#C13584]'
                      : 'border border-neutral-800'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                    <img
                      src={group.user.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                      alt={group.user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-neutral-300 max-w-[70px] truncate text-center">
                  {group.user.username}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Instagram Story Playback Modal */}
      {activeGroup && currentStory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeStoryViewer}
            className="absolute top-5 right-5 text-white/80 hover:text-white z-50 p-2"
          >
            <X className="w-7 h-7" />
          </button>

          {/* Left Arrow */}
          <button
            onClick={prevStory}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-50 hidden sm:block"
          >
            <ChevronLeft className="w-9 h-9" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={nextStory}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-50 hidden sm:block"
          >
            <ChevronRight className="w-9 h-9" />
          </button>

          {/* Story Container Card */}
          <div className="relative w-full max-w-[420px] h-[90vh] bg-neutral-900 rounded-xl overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Top Progress Bars */}
            <div className="absolute top-2 left-0 right-0 px-3 z-30 flex gap-1">
              {activeGroup.stories.map((s, idx) => (
                <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < activeStoryIndex
                        ? 'w-full'
                        : idx === activeStoryIndex
                        ? 'w-full'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Story Header (Avatar, Username, Timestamp & Delete) */}
            <div className="absolute top-5 left-0 right-0 px-4 z-30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50">
                  <img
                    src={activeGroup.user.avatar}
                    alt={activeGroup.user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white drop-shadow">
                    {activeGroup.user.username}
                  </span>
                  <span className="text-[11px] text-white/70 drop-shadow">
                    {new Date(currentStory.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Owner Story Delete Button */}
              {isViewingSelf && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurrentStory(currentStory._id);
                  }}
                  className="text-white/80 hover:text-red-400 p-1.5 transition-colors drop-shadow"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Story Media Viewer */}
            <div
              className="w-full h-full flex items-center justify-center relative cursor-pointer"
              onClick={nextStory}
            >
              {currentStory.mediaType === 'video' ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onEnded={nextStory}
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Bottom Section: Viewers List trigger for own story */}
            {isViewingSelf && (
              <div className="absolute bottom-3 left-0 right-0 px-4 z-30 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenViewersSheet(currentStory._id);
                  }}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 flex items-center gap-2 text-white text-xs font-medium transition-all shadow-lg hover:scale-105"
                >
                  <Eye className="w-4 h-4 text-white" />
                  <span>
                    {viewersCount} {viewersCount === 1 ? 'Viewer' : 'Viewers'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            )}

            {/* Slide-up Viewers Sheet */}
            {showViewersSheet && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 max-h-[70%] bg-[#1c1c1c] border-t border-[#333] rounded-t-2xl z-40 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-white"
              >
                {/* Viewers Sheet Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#0095F6]" />
                    <h4 className="font-semibold text-xs">
                      Seen by {viewersList.length || viewersCount}
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowViewersSheet(false)}
                    className="text-neutral-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Viewers List */}
                <div className="flex-1 overflow-y-auto p-2 min-h-[160px] max-h-[280px]">
                  {loadingViewers ? (
                    <div className="flex items-center justify-center py-10 text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0095F6]" />
                    </div>
                  ) : viewersList.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {viewersList.map((viewer, idx) => (
                        <div
                          key={viewer.user?._id || idx}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#262626] transition-colors"
                        >
                          <Link
                            href={`/profile/${viewer.user?.username}`}
                            onClick={closeStoryViewer}
                            className="flex items-center gap-2.5 min-w-0 flex-1"
                          >
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-700 flex-shrink-0">
                              <img
                                src={
                                  viewer.user?.avatar ||
                                  'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                                }
                                alt={viewer.user?.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-xs font-semibold text-white truncate hover:underline">
                                {viewer.user?.username}
                              </p>
                              <p className="text-[10px] text-neutral-400 truncate">
                                {viewer.user?.fullName || viewer.user?.username}
                              </p>
                            </div>
                          </Link>

                          {viewer.viewedAt && (
                            <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-2">
                              {new Date(viewer.viewedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-neutral-500">
                      No viewers yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StoriesBar;
