'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import api from '@/services/api';
import { useSocket } from '@/context/SocketContext';

interface NotificationItem {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    avatar: string;
    isVerified?: boolean;
  };
  type: 'like_post' | 'like_comment' | 'comment' | 'reply' | 'follow';
  post?: {
    _id: string;
    media?: Array<{ url: string; mediaType: string }>;
  };
  comment?: {
    _id: string;
    text: string;
  };
  text?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationText = (item: NotificationItem) => {
    switch (item.type) {
      case 'like_post':
        return 'liked your post.';
      case 'like_comment':
        return 'liked your comment.';
      case 'comment':
        return `commented: "${item.text || 'on your post'}"`;
      case 'reply':
        return `replied to your comment: "${item.text || ''}"`;
      case 'follow':
        return 'started following you.';
      default:
        return 'interacted with your profile.';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-3.5 h-3.5 fill-blue-500 text-blue-500 -rotate-90" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-[#0095F6]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-6 px-4 text-black dark:text-white transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-[#262626]">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-[#0095F6] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 text-xs text-[#0095F6] hover:underline font-semibold"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#0095F6]" />
          <span className="text-xs">Loading notifications...</span>
        </div>
      ) : notifications.length > 0 ? (
        <div className="flex flex-col gap-1">
          {notifications.map((item) => {
            const postThumbnail = item.post?.media?.[0]?.url;

            return (
              <div
                key={item._id}
                onClick={() => handleMarkAsRead(item._id)}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-neutral-50 dark:hover:bg-[#121212] ${
                  !item.isRead ? 'bg-neutral-100/80 dark:bg-[#181818]/60' : ''
                }`}
              >
                {/* Left: Avatar + Badge + Text */}
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  {/* Sender Avatar with Type Badge */}
                  <div className="relative flex-shrink-0">
                    <Link href={`/profile/${item.sender?.username}`}>
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={item.sender?.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                          alt={item.sender?.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black p-0.5 rounded-full shadow">
                      {getNotificationIcon(item.type)}
                    </div>
                  </div>

                  {/* Notification text */}
                  <div className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                    <Link
                      href={`/profile/${item.sender?.username}`}
                      className="font-semibold text-black dark:text-white mr-1 hover:underline"
                    >
                      {item.sender?.username}
                    </Link>
                    <span>{getNotificationText(item)}</span>
                    <span className="text-neutral-400 dark:text-neutral-500 text-[10px] block mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Right: Post thumbnail or Unread Dot */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {postThumbnail ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                      <img src={postThumbnail} alt="Post" className="w-full h-full object-cover" />
                    </div>
                  ) : item.type === 'follow' ? (
                    <Link
                      href={`/profile/${item.sender?.username}`}
                      className="bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Follow
                    </Link>
                  ) : null}

                  {!item.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#0095F6]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 flex flex-col items-center gap-2">
          <Bell className="w-10 h-10 stroke-1 text-neutral-400 dark:text-neutral-600 mb-1" />
          <h3 className="text-sm font-semibold text-black dark:text-white">No Notifications Yet</h3>
          <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
            When you get likes, comments, or new followers, they will show up here.
          </p>
        </div>
      )}
    </div>
  );
}
