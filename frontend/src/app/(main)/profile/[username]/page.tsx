'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Grid,
  Bookmark,
  Heart,
  MessageCircle,
  Settings,
  Camera,
  Loader2,
  X,
  Film,
  Layers,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IPost } from '@/types';
import PostCard from '@/components/posts/PostCard';
import { ProfileGridSkeleton } from '@/components/common/Skeletons';

interface ProfileData {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  avatar: string;
  bio: string;
  website: string;
  gender?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { user: currentUser, updateUser, refreshUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<IPost[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<IPost | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (activeTab === 'saved' && profile?.isSelf) {
      fetchSavedPosts();
    }
  }, [activeTab, profile?.isSelf]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/profile/${username}`);
      setProfile(data.profile);
      setPosts(data.posts || []);

      // Seed edit form
      setEditFullName(data.profile.fullName || '');
      setEditBio(data.profile.bio || '');
      setEditWebsite(data.profile.website || '');
      setAvatarPreview(data.profile.avatar || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPosts = async () => {
    try {
      setLoadingSaved(true);
      const { data } = await api.get('/posts/saved');
      setSavedPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load saved posts:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);

    const isCurrentlyFollowing = profile.isFollowing;
    // Optimistic UI update
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !isCurrentlyFollowing,
            followersCount: isCurrentlyFollowing
              ? Math.max(0, prev.followersCount - 1)
              : prev.followersCount + 1,
          }
        : null
    );

    try {
      if (isCurrentlyFollowing) {
        await api.put(`/users/${profile._id}/unfollow`);
      } else {
        await api.put(`/users/${profile._id}/follow`);
      }
    } catch (err) {
      // Revert on error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: isCurrentlyFollowing,
              followersCount: isCurrentlyFollowing
                ? prev.followersCount + 1
                : Math.max(0, prev.followersCount - 1),
            }
          : null
      );
      console.error('Follow action failed:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSavingProfile(true);
    const formData = new FormData();
    formData.append('fullName', editFullName);
    formData.append('bio', editBio);
    formData.append('website', editWebsite);

    if (editAvatarFile) {
      formData.append('avatar', editAvatarFile);
    }

    try {
      const { data } = await api.put('/users/profile', formData);

      if (data?.user) {
        setProfile((prev) =>
          prev ? { ...prev, ...data.user, avatar: data.user.avatar || prev.avatar } : null
        );
        updateUser(data.user);
        await refreshUser();
        await fetchProfile();
      }
      setIsEditModalOpen(false);
      setEditAvatarFile(null);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4 text-white">
        {/* Profile Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-14 mb-8 sm:mb-12 pb-6 border-b border-[#262626]">
          <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-full bg-neutral-900 border-2 border-neutral-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="w-36 h-5 bg-neutral-800 rounded animate-pulse" />
              <div className="w-24 h-7 bg-neutral-800 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-8">
              <div className="w-16 h-4 bg-neutral-800 rounded animate-pulse" />
              <div className="w-20 h-4 bg-neutral-800 rounded animate-pulse" />
              <div className="w-20 h-4 bg-neutral-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-28 h-3.5 bg-neutral-800 rounded animate-pulse" />
              <div className="w-48 h-3 bg-neutral-800/70 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Posts Grid Skeleton */}
        <ProfileGridSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-400 gap-2">
        <h2 className="text-xl font-bold text-white">Sorry, this page isn&apos;t available.</h2>
        <p className="text-xs">The link you followed may be broken, or the page may have been removed.</p>
        <Link href="/" className="mt-4 text-[#0095F6] text-sm font-semibold hover:underline">
          Go back to Instagram
        </Link>
      </div>
    );
  }

  const currentDisplayPosts = activeTab === 'posts' ? posts : savedPosts;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4 text-black dark:text-white transition-colors">
      {/* 1. Profile Header */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-14 mb-8 sm:mb-12 pb-6 border-b border-neutral-200 dark:border-[#262626]">
        {/* Avatar */}
        <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <img
            src={profile.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
            alt={profile.username}
            className="w-full h-full object-cover"
          />
        </div>

        {/* User Details & Actions */}
        <div className="flex-1 flex flex-col gap-4 text-center sm:text-left">
          {/* Username & Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-normal text-black dark:text-white">{profile.username}</h1>

            {profile.isSelf ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262626] dark:hover:bg-[#333333] text-black dark:text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white p-1 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`text-xs font-semibold px-5 py-1.5 rounded-lg transition-colors flex items-center justify-center ${
                    profile.isFollowing
                      ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262626] dark:hover:bg-[#333333] text-black dark:text-white'
                      : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                  }`}
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
                <Link
                  href={`/direct?recipient=${profile._id}`}
                  className="bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262626] dark:hover:bg-[#333333] text-black dark:text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Message
                </Link>
              </div>
            )}
          </div>

          {/* Stats Bar (Desktop) */}
          <div className="hidden sm:flex items-center gap-8 text-sm">
            <span>
              <strong className="text-black dark:text-white">{profile.postsCount}</strong> posts
            </span>
            <span>
              <strong className="text-black dark:text-white">{profile.followersCount}</strong> followers
            </span>
            <span>
              <strong className="text-black dark:text-white">{profile.followingCount}</strong> following
            </span>
          </div>

          {/* Bio & Links */}
          <div className="flex flex-col gap-1 text-xs sm:text-sm">
            <p className="font-semibold text-black dark:text-white">{profile.fullName}</p>
            {profile.bio && <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#0095F6] dark:text-[#E0F1FF] font-semibold hover:underline truncate max-w-xs"
              >
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar (Mobile) */}
      <div className="flex sm:hidden justify-around py-3 border-y border-neutral-200 dark:border-[#262626] text-xs text-center mb-4">
        <div>
          <strong className="block text-black dark:text-white text-sm">{profile.postsCount}</strong>
          <span className="text-neutral-500 dark:text-neutral-400">posts</span>
        </div>
        <div>
          <strong className="block text-black dark:text-white text-sm">{profile.followersCount}</strong>
          <span className="text-neutral-500 dark:text-neutral-400">followers</span>
        </div>
        <div>
          <strong className="block text-black dark:text-white text-sm">{profile.followingCount}</strong>
          <span className="text-neutral-500 dark:text-neutral-400">following</span>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex justify-center border-t border-neutral-200 dark:border-[#262626] text-xs font-semibold tracking-widest uppercase">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 py-3 border-t-2 -mt-[1px] transition-colors ${
            activeTab === 'posts'
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-neutral-400 dark:text-neutral-500'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Posts</span>
        </button>

        {profile.isSelf && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 py-3 border-t-2 -mt-[1px] ml-12 transition-colors ${
              activeTab === 'saved'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-neutral-400 dark:text-neutral-500'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved</span>
          </button>
        )}
      </div>

      {/* 3. Three-Column Posts Grid */}
      {loadingSaved && activeTab === 'saved' ? (
        <div className="mt-3">
          <ProfileGridSkeleton />
        </div>
      ) : currentDisplayPosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-4 md:gap-7 mt-3">
          {currentDisplayPosts.map((post) => {
            const mediaItem = post.media?.[0] || { url: (post as any).mediaUrl, mediaType: 'image' };
            const isMultiple = post.media && post.media.length > 1;

            return (
              <div
                key={post._id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square bg-neutral-900 overflow-hidden cursor-pointer"
              >
                {/* Media thumbnail */}
                {mediaItem.mediaType === 'video' ? (
                  <video src={mediaItem.url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={mediaItem.url}
                    alt={post.caption || 'Post'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Multi-media / Video Badge */}
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
        <div className="py-20 text-center flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-16 h-16 rounded-full border border-neutral-700 flex items-center justify-center">
            {activeTab === 'saved' ? <Bookmark className="w-8 h-8 stroke-1" /> : <Camera className="w-8 h-8 stroke-1" />}
          </div>
          <h3 className="text-xl font-bold text-white">
            {activeTab === 'saved' ? 'No Saved Posts' : 'No Posts Yet'}
          </h3>
          <p className="text-xs text-neutral-400">
            {activeTab === 'saved'
              ? 'Save photos and videos that you want to see again.'
              : profile.isSelf
              ? 'When you share photos, they will appear on your profile.'
              : 'This user has not posted anything yet.'}
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
                setSavedPosts((prev) => prev.filter((p) => p._id !== deletedId));
                setSelectedPost(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#262626] border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 flex flex-col gap-5 text-black dark:text-white transition-colors">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
              <h3 className="text-sm font-semibold">Edit Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar Change */}
            <div className="flex items-center gap-4 bg-neutral-100 dark:bg-[#1a1a1a] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 flex-shrink-0">
                <img
                  src={avatarPreview || profile.avatar}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold">{profile.username}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-[#0095F6] hover:underline"
                >
                  Change profile photo
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-[#121212] border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 block">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={150}
                  className="w-full bg-neutral-50 dark:bg-[#121212] border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-black dark:text-white outline-none resize-none focus:border-black dark:focus:border-white"
                  placeholder="Bio (maximum 150 characters)"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 block">Website</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full bg-neutral-50 dark:bg-[#121212] border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
