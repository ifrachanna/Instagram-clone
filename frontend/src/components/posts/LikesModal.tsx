'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IUser } from '@/types';

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const LikesModal: React.FC<LikesModalProps> = ({ isOpen, onClose, postId }) => {
  const { user: currentUser } = useAuth();
  const [likes, setLikes] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikes();
    } else {
      setLikes([]);
    }
  }, [isOpen, postId]);

  const fetchLikes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/posts/${postId}/likes`);
      const userList: IUser[] = data.likes || [];
      setLikes(userList);

      // Initialize following status based on currentUser's following list
      if (currentUser?.following) {
        const initialMap: Record<string, boolean> = {};
        userList.forEach((u) => {
          initialMap[u._id] = (currentUser.following || []).some(
            (fId: any) => (fId._id || fId).toString() === u._id.toString()
          );
        });
        setFollowingMap(initialMap);
      }
    } catch (err) {
      console.error('Failed to fetch post likes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser || followLoadingMap[targetUserId]) return;

    const isFollowing = !!followingMap[targetUserId];
    setFollowingMap((prev) => ({ ...prev, [targetUserId]: !isFollowing }));
    setFollowLoadingMap((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      if (isFollowing) {
        await api.put(`/users/${targetUserId}/unfollow`);
      } else {
        await api.put(`/users/${targetUserId}/follow`);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      // Revert on error
      setFollowingMap((prev) => ({ ...prev, [targetUserId]: isFollowing }));
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#262626] border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-black dark:text-white max-h-[70vh] transition-colors duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="w-5" />
          <h3 className="font-semibold text-sm text-center">Likes</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Likes List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[180px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0095F6]" />
            </div>
          ) : likes.length > 0 ? (
            <div className="flex flex-col gap-1">
              {likes.map((likeUser) => {
                const isSelf = currentUser?._id === likeUser._id;
                const isFollowing = !!followingMap[likeUser._id];
                const isLoadingFollow = !!followLoadingMap[likeUser._id];

                return (
                  <div
                    key={likeUser._id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <Link
                      href={`/profile/${likeUser.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                        <img
                          src={
                            likeUser.avatar ||
                            'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                          }
                          alt={likeUser.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-black dark:text-white truncate hover:underline">
                          {likeUser.username}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {likeUser.fullName || likeUser.username}
                        </p>
                      </div>
                    </Link>

                    {currentUser && !isSelf && (
                      <button
                        onClick={() => handleToggleFollow(likeUser._id)}
                        disabled={isLoadingFollow}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          isFollowing
                            ? 'bg-neutral-200 hover:bg-neutral-300 text-black dark:bg-[#363636] dark:hover:bg-[#262626] dark:text-white'
                            : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-500">
              No likes yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikesModal;
