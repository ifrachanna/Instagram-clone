'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IPost, IComment } from '@/types';
import LikesModal from './LikesModal';

interface PostCardProps {
  post: IPost;
  onPostDeleted?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted }) => {
  const { user, updateUser } = useAuth();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Likes state
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    return Array.isArray(post.likes) && user
      ? post.likes.some((l: any) => (typeof l === 'string' ? l === user._id : l._id === user._id))
      : false;
  });
  const [likesCount, setLikesCount] = useState<number>(post.likes ? post.likes.length : 0);

  // Saved / Bookmark state
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    return Array.isArray(user?.savedPosts)
      ? user.savedPosts.some((s: any) => (s._id || s).toString() === post._id.toString())
      : false;
  });

  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<IComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Helper to format captions & comments with clickable #hashtags
  const renderTextWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <Link
            key={index}
            href={`/explore?tag=${encodeURIComponent(tag.toLowerCase())}`}
            className="text-[#0095F6] hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isOwner = user && post.author?._id === user._id;
  const mediaList = post.media && post.media.length > 0 ? post.media : [{ url: (post as any).mediaUrl, mediaType: (post as any).mediaType || 'image' }];

  // Toggle Like API Call
  const handleLikeToggle = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const { data } = await api.put(`/posts/${post._id}/like`);
      if (data?.likesCount !== undefined) {
        setLikesCount(data.likesCount);
      }
      if (data?.isLiked !== undefined) {
        setIsLiked(data.isLiked);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      console.error('Failed to toggle like:', err);
    }
  };

  // Toggle Save / Bookmark API Call
  const handleSaveToggle = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      const { data } = await api.put(`/posts/${post._id}/save`);
      if (data?.isSaved !== undefined) {
        setIsSaved(data.isSaved);
      }
      if (data?.savedPosts && user) {
        updateUser({ savedPosts: data.savedPosts });
      }
    } catch (err) {
      setIsSaved(!nextState);
      console.error('Failed to save post:', err);
    }
  };

  // Double tap on media to like
  const handleDoubleTap = () => {
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 800);
    if (!isLiked) {
      handleLikeToggle();
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      if (onPostDeleted) onPostDeleted(post._id);
    } catch (err) {
      alert('Failed to delete post.');
    }
  };

  // Toggle comments section and load comments if needed
  const toggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && commentsList.length === 0) {
      setLoadingComments(true);
      try {
        const { data } = await api.get(`/comments/${post._id}`);
        setCommentsList(data.comments || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    if (!user) {
      window.location.href = '/login';
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { data } = await api.post(`/comments/${post._id}`, { text: commentText.trim() });
      setCommentsCount((prev) => prev + 1);
      if (data.comment) {
        setCommentsList((prev) => [...prev, data.comment]);
      }
      setCommentText('');
      setShowComments(true);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      setDeletingCommentId(commentId);
      await api.delete(`/comments/${commentId}`);
      setCommentsList((prev) => prev.filter((c) => c._id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex < mediaList.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1);
    }
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1);
    }
  };

  return (
    <article className="w-full max-w-[470px] bg-white dark:bg-black border border-neutral-200 dark:border-[#262626] rounded-xl overflow-hidden mb-5 text-black dark:text-white shadow-sm dark:shadow-none transition-colors duration-150">
      {/* 1. Header (Author Avatar & Username) */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-100 dark:border-[#262626]">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author?.username}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 flex-shrink-0">
              <img
                src={post.author?.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                alt={post.author?.username}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${post.author?.username}`}
                className="text-xs font-semibold text-black dark:text-white hover:underline"
              >
                {post.author?.username}
              </Link>
              {post.author?.isVerified && (
                <span className="text-[#0095F6] text-[10px]">●</span>
              )}
              <span className="text-neutral-500 text-xs">• 1d</span>
            </div>
            {post.location && (
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{post.location}</span>
            )}
          </div>
        </div>

        {/* 3-dots more menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && isOwner && (
            <div className="absolute right-0 top-8 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-[#262626] rounded-lg shadow-xl py-1 w-32 z-30">
              <button
                onClick={handleDeletePost}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-neutral-100 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Media Carousel Slider */}
      <div
        className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center overflow-hidden cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        {mediaList[currentMediaIndex]?.mediaType === 'video' ? (
          <video
            src={mediaList[currentMediaIndex]?.url}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={mediaList[currentMediaIndex]?.url}
            alt={post.caption || 'Instagram Post'}
            className="w-full h-full object-cover"
          />
        )}

        {/* Double-tap animated heart */}
        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl opacity-90" />
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {mediaList.length > 1 && (
          <>
            {currentMediaIndex > 0 && (
              <button
                onClick={prevMedia}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentMediaIndex < mediaList.length - 1 && (
              <button
                onClick={nextMedia}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
              {mediaList.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentMediaIndex ? 'bg-[#0095F6] w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Action Buttons Bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleLikeToggle}
              className="text-black dark:text-white hover:opacity-70 transition-transform active:scale-125"
              title="Like"
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked ? 'text-red-500 fill-red-500 stroke-red-500' : 'stroke-2'
                }`}
              />
            </button>

            {/* Comment Button */}
            <button
              onClick={toggleComments}
              className="text-black dark:text-white hover:opacity-70 transition-opacity"
              title="Comments"
            >
              <MessageCircle className="w-6 h-6 stroke-2 -rotate-90" />
            </button>

            {/* Share Button */}
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.origin + `/p/${post._id}`);
                  alert('Post link copied to clipboard!');
                }
              }}
              className="text-black dark:text-white hover:opacity-70 transition-opacity"
              title="Share"
            >
              <Send className="w-6 h-6 stroke-2" />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleSaveToggle}
            className="text-black dark:text-white hover:opacity-70 transition-opacity"
            title={isSaved ? 'Saved' : 'Save'}
          >
            <Bookmark className={`w-6 h-6 stroke-2 ${isSaved ? 'fill-black dark:fill-white text-black dark:text-white' : ''}`} />
          </button>
        </div>

        {/* 4. Likes Count (Clickable to view Likes list) */}
        {likesCount > 0 ? (
          <button
            type="button"
            onClick={() => setIsLikesModalOpen(true)}
            className="text-xs font-semibold text-black dark:text-white mb-2 hover:underline focus:outline-none text-left cursor-pointer transition-opacity hover:opacity-90"
          >
            {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
          </button>
        ) : (
          <p className="text-xs text-neutral-500 mb-2">Be the first to like this</p>
        )}

        {/* 5. Caption with Clickable Hashtags */}
        {post.caption && (
          <div className="text-xs text-neutral-800 dark:text-neutral-200 mb-2 leading-relaxed">
            <Link
              href={`/profile/${post.author?.username}`}
              className="font-semibold text-black dark:text-white mr-2 hover:underline"
            >
              {post.author?.username}
            </Link>
            <span>
              {isExpanded || post.caption.length <= 90
                ? renderTextWithHashtags(post.caption)
                : (
                    <>
                      {renderTextWithHashtags(`${post.caption.slice(0, 90)}... `)}
                    </>
                  )}
            </span>
            {post.caption.length > 90 && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white font-medium ml-1"
              >
                more
              </button>
            )}
          </div>
        )}

        {/* 6. Comments Preview / Toggle Button */}
        {commentsCount > 0 && (
          <button
            onClick={toggleComments}
            className="text-xs text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white mb-2.5 block text-left"
          >
            {showComments ? 'Hide comments' : `View all ${commentsCount} comments`}
          </button>
        )}

        {/* 7. Comments Section (Visible when opened) */}
        {showComments && (
          <div className="border-t border-neutral-100 dark:border-[#262626] py-3 mb-2 flex flex-col gap-3 max-h-60 overflow-y-auto">
            {loadingComments ? (
              <div className="flex items-center justify-center py-4 text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />
              </div>
            ) : commentsList.length > 0 ? (
              commentsList.map((c) => {
                const canDelete =
                  user &&
                  (c.author?._id === user._id || post.author?._id === user._id);
                const isDeleting = deletingCommentId === c._id;

                return (
                  <div key={c._id} className="flex items-start justify-between gap-2.5 text-xs group/comment">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <Link href={`/profile/${c.author?.username}`}>
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 flex-shrink-0 mt-0.5">
                          <img
                            src={c.author?.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                            alt={c.author?.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                      <div className="leading-relaxed flex-1 min-w-0">
                        <Link
                          href={`/profile/${c.author?.username}`}
                          className="font-semibold text-black dark:text-white mr-1.5 hover:underline"
                        >
                          {c.author?.username}
                        </Link>
                        <span className="text-neutral-800 dark:text-neutral-200 break-words">{renderTextWithHashtags(c.text)}</span>
                        <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c._id)}
                        disabled={isDeleting}
                        className="text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 p-1 flex-shrink-0 transition-colors"
                        title="Delete comment"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 py-2 text-center">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}

        {/* 8. Comment Input Form */}
        <form
          onSubmit={handleAddComment}
          className="flex items-center justify-between border-t border-neutral-100 dark:border-[#262626] pt-2.5 mt-2 gap-2"
        >
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-transparent text-xs text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none pr-2"
          />
          <button
            type="submit"
            disabled={isSubmittingComment || !commentText.trim()}
            className="text-xs font-semibold text-[#0095F6] hover:text-[#1877F2] dark:hover:text-white disabled:opacity-40 disabled:hover:text-[#0095F6] transition-colors flex items-center gap-1"
          >
            {isSubmittingComment && <Loader2 className="w-3 h-3 animate-spin" />}
            Post
          </button>
        </form>
      </div>

      {/* Likes List Modal */}
      <LikesModal
        isOpen={isLikesModalOpen}
        onClose={() => setIsLikesModalOpen(false)}
        postId={post._id}
      />
    </article>
  );
};

export default PostCard;
