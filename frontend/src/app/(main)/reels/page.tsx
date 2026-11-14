'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Music2,
  Loader2,
  Film,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IPost } from '@/types';

export default function ReelsPage() {
  const { user: currentUser } = useAuth();
  const [reels, setReels] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/posts/reels?limit=20');
      setReels(data.posts || []);
    } catch (err) {
      console.error('Failed to load reels:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-2 sm:py-6 text-black dark:text-white transition-colors">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-neutral-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0095F6]" />
          <span className="text-xs">Loading Reels...</span>
        </div>
      ) : reels.length > 0 ? (
        <div className="w-full max-w-[420px] h-[88vh] overflow-y-scroll snap-y snap-mandatory scrollbar-none rounded-2xl flex flex-col gap-6">
          {reels.map((reel) => (
            <ReelCard
              key={reel._id}
              reel={reel}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((prev) => !prev)}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
            <Film className="w-8 h-8 stroke-1 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-black dark:text-white">No Reels Yet</h3>
          <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
            Upload videos via Create Post to watch them appear in the Reels feed.
          </p>
        </div>
      )}
    </div>
  );
}

function ReelCard({
  reel,
  isMuted,
  onToggleMute,
}: {
  reel: IPost;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    return Array.isArray(reel.likes) && user
      ? reel.likes.some((l: any) => (typeof l === 'string' ? l === user._id : l._id === user._id))
      : false;
  });
  const [likesCount, setLikesCount] = useState<number>(reel.likes ? reel.likes.length : 0);
  const [isSaved, setIsSaved] = useState(false);

  const mediaItem = reel.media?.[0] || { url: (reel as any).mediaUrl, mediaType: 'video' };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await api.put(`/posts/${reel._id}/like`);
    } catch {
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  return (
    <div className="relative w-full h-[88vh] snap-start bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center flex-shrink-0 border border-[#262626]">
      {/* Video or Image Fallback */}
      {mediaItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          src={mediaItem.url}
          loop
          autoPlay
          muted={isMuted}
          playsInline
          onClick={handleTogglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />
      ) : (
        <img
          src={mediaItem.url}
          alt={reel.caption || 'Reel'}
          className="w-full h-full object-cover"
        />
      )}

      {/* Play/Pause Overlay indicator */}
      {!isPlaying && (
        <div
          onClick={handleTogglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto cursor-pointer"
        >
          <Play className="w-16 h-16 text-white/80 fill-white/80" />
        </div>
      )}

      {/* Top Controls: Sound Toggle */}
      <button
        onClick={onToggleMute}
        className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur transition-colors z-20"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Right Action Icons Column */}
      <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={handleLikeToggle} className="flex flex-col items-center gap-1 group">
          <Heart
            className={`w-7 h-7 drop-shadow-lg transition-transform group-active:scale-125 ${
              isLiked ? 'text-red-500 fill-red-500 stroke-red-500' : 'text-white stroke-2'
            }`}
          />
          <span className="text-[11px] font-semibold text-white drop-shadow">
            {likesCount}
          </span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white stroke-2 -rotate-90 drop-shadow-lg" />
          <span className="text-[11px] font-semibold text-white drop-shadow">
            {reel.commentsCount || 0}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.origin + `/p/${reel._id}`);
              alert('Reel link copied to clipboard!');
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <Send className="w-7 h-7 text-white stroke-2 drop-shadow-lg" />
        </button>

        {/* Save */}
        <button onClick={() => setIsSaved(!isSaved)}>
          <Bookmark className={`w-7 h-7 text-white drop-shadow-lg ${isSaved ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-4 left-4 right-16 z-20 flex flex-col gap-2.5 text-white drop-shadow-md">
        {/* Author info */}
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${reel.author?.username}`}>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/60">
              <img
                src={reel.author?.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                alt={reel.author?.username}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
          <Link
            href={`/profile/${reel.author?.username}`}
            className="text-xs font-semibold hover:underline"
          >
            {reel.author?.username}
          </Link>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-xs text-neutral-100 line-clamp-2 leading-relaxed">
            {reel.caption}
          </p>
        )}

        {/* Audio tag */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-300">
          <Music2 className="w-3.5 h-3.5" />
          <span className="truncate">Original audio - {reel.author?.username}</span>
        </div>
      </div>
    </div>
  );
}
