'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Send,
  SquarePen,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
  ArrowLeft,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { IMessage } from '@/types';

interface Participant {
  _id: string;
  username: string;
  fullName: string;
  avatar: string;
  isVerified?: boolean;
}

interface ConversationItem {
  _id: string;
  participant: Participant;
  lastMessage?: {
    text: string;
    sender: any;
    createdAt: string;
  };
  unreadCount: number;
}

export default function DirectMessagesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-[80vh] text-neutral-500 text-xs">
          Loading direct messages...
        </div>
      }
    >
      <DirectMessagesContent />
    </React.Suspense>
  );
}

function DirectMessagesContent() {
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();
  const directRecipientParam = searchParams.get('recipient');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  // New message modal state
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // When recipient param changes or conversations finish loading, handle auto-selection
  useEffect(() => {
    if (!directRecipientParam || loadingConversations) return;

    // Check if an existing conversation matches this recipient
    const existing = conversations.find(
      (c) => c.participant?._id === directRecipientParam
    );

    if (existing) {
      selectChat(existing);
    } else {
      // User has no previous conversation yet with this person.
      // Fetch their profile and open a provisional 'new' chat window!
      fetchRecipientUser(directRecipientParam);
    }
  }, [directRecipientParam, conversations.length, loadingConversations]);

  // Fetch recipient user details when starting a fresh chat
  const fetchRecipientUser = async (recipientId: string) => {
    try {
      setLoadingMessages(true);
      const { data } = await api.get(`/users/${recipientId}`);
      if (data?.user) {
        const provisionalConv: ConversationItem = {
          _id: 'new',
          participant: {
            _id: data.user._id,
            username: data.user.username,
            fullName: data.user.fullName,
            avatar: data.user.avatar,
            isVerified: data.user.isVerified,
          },
          unreadCount: 0,
        };
        setSelectedConversation(provisionalConv);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load recipient details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage: IMessage) => {
      const incomingConvId = (
        newMessage.conversation?._id ||
        newMessage.conversation ||
        newMessage.conversationId
      )?.toString();

      const currentConvId = selectedConversation?._id?.toString();
      const currentRecipientId = selectedConversation?.participant?._id?.toString();
      const senderId = (typeof newMessage.sender === 'string' ? newMessage.sender : newMessage.sender?._id)?.toString();

      // Check if this message belongs to the current open window
      const isCurrentChat =
        (currentConvId && currentConvId !== 'new' && incomingConvId === currentConvId) ||
        (currentConvId === 'new' && senderId === currentRecipientId);

      if (isCurrentChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });

        // If it was a 'new' conversation, transition to the real ID
        if (selectedConversation?._id === 'new' && incomingConvId) {
          setSelectedConversation((prev) =>
            prev ? { ...prev, _id: incomingConvId } : null
          );
        }
      }

      // Refresh conversations list to update preview and last message
      fetchConversations();
    };

    const handleUserTyping = (data: { conversationId: string; userId: string }) => {
      if (
        selectedConversation &&
        (selectedConversation._id === data.conversationId ||
          selectedConversation.participant?._id === data.userId)
      ) {
        setOtherIsTyping(true);
      }
    };

    const handleUserStopTyping = (data: { conversationId: string; userId: string }) => {
      if (
        selectedConversation &&
        (selectedConversation._id === data.conversationId ||
          selectedConversation.participant?._id === data.userId)
      ) {
        setOtherIsTyping(false);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, selectedConversation]);

  // Scroll down when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherIsTyping]);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const { data } = await api.get('/messages/conversations');
      const convList: ConversationItem[] = data.conversations || [];
      setConversations(convList);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectChat = async (conv: ConversationItem) => {
    setSelectedConversation(conv);
    setLoadingMessages(true);
    setOtherIsTyping(false);

    if (socket && conv._id !== 'new') {
      socket.emit('join_chat', conv._id);
    }

    try {
      if (conv._id !== 'new') {
        const { data } = await api.get(`/messages/${conv._id}`);
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || !selectedConversation || selectedConversation._id === 'new') return;

    socket.emit('typing', {
      conversationId: selectedConversation._id,
      userId: currentUser?._id,
      username: currentUser?.username,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversationId: selectedConversation._id,
        userId: currentUser?._id,
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    if (socket && selectedConversation._id !== 'new') {
      socket.emit('stop_typing', {
        conversationId: selectedConversation._id,
        userId: currentUser?._id,
      });
    }

    try {
      const recipientId = selectedConversation.participant._id;
      const isNew = selectedConversation._id === 'new';

      const payload: { text: string; conversationId?: string } = {
        text: messageText,
      };

      if (!isNew) {
        payload.conversationId = selectedConversation._id;
      }

      const { data } = await api.post(`/messages/send/${recipientId}`, payload);

      const createdMsg = data.message;
      const createdConvId = data.conversationId;

      setMessages((prev) => [...prev, createdMsg]);

      // If this was a new conversation, update state and join room
      if (isNew && createdConvId) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, _id: createdConvId } : null
        );
        if (socket) {
          socket.emit('join_chat', createdConvId);
        }
      }

      // Emit real-time message through Socket.io
      if (socket) {
        socket.emit('send_message', createdMsg);
      }

      // Re-fetch conversations to keep sidebar in sync
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Search users for New Message modal
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const filtered = (data.users || []).filter(
          (u: any) => u._id !== currentUser?._id
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?._id]);

  const startChatWithUser = (user: Participant) => {
    setIsNewMessageModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    const existing = conversations.find((c) => c.participant?._id === user._id);
    if (existing) {
      selectChat(existing);
    } else {
      setSelectedConversation({
        _id: 'new',
        participant: user,
        unreadCount: 0,
      });
      setMessages([]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-[85vh] my-4 border border-neutral-200 dark:border-[#262626] rounded-xl overflow-hidden flex bg-white dark:bg-black text-black dark:text-white shadow-xl dark:shadow-2xl relative transition-colors duration-150">
      {/* Left Pane: Conversations List */}
      <div
        className={`w-full md:w-80 border-r border-neutral-200 dark:border-[#262626] flex flex-col bg-white dark:bg-black ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header: Username + New Message Button */}
        <div className="p-4 border-b border-neutral-200 dark:border-[#262626] flex items-center justify-between">
          <h2 className="font-bold text-base truncate text-black dark:text-white">{currentUser?.username || 'Direct'}</h2>
          <button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors text-black dark:text-white"
            title="New message"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => {
              const isOnline = onlineUsers.includes(conv.participant?._id);
              const isSelected = selectedConversation?._id === conv._id;

              return (
                <div
                  key={conv._id}
                  onClick={() => selectChat(conv)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-[#121212] transition-colors ${
                    isSelected ? 'bg-neutral-100 dark:bg-[#1a1a1a]' : ''
                  }`}
                >
                  {/* Avatar + Online Indicator */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img
                        src={
                          conv.participant?.avatar ||
                          'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                        }
                        alt={conv.participant?.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full" />
                    )}
                  </div>

                  {/* Preview Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-black dark:text-white">
                      {conv.participant?.username}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {conv.lastMessage?.text || 'Started a conversation'}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#0095F6] flex-shrink-0" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
              <p>No messages yet.</p>
              <button
                onClick={() => setIsNewMessageModalOpen(true)}
                className="text-[#0095F6] hover:underline font-semibold text-xs"
              >
                Send a message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Window or Empty State */}
      <div
        className={`flex-1 flex flex-col bg-white dark:bg-black ${
          !selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 border-b border-neutral-200 dark:border-[#262626] flex items-center justify-between bg-white dark:bg-black">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden text-black dark:text-white p-1 hover:bg-neutral-100 dark:hover:bg-[#1a1a1a] rounded-lg mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                  <img
                    src={
                      selectedConversation.participant?.avatar ||
                      'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                    }
                    alt={selectedConversation.participant?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-black dark:text-white">
                    {selectedConversation.participant?.username}
                  </h3>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {onlineUsers.includes(selectedConversation.participant?._id)
                      ? 'Active now'
                      : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0095F6]" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isSentByMe =
                    (typeof msg.sender === 'string' ? msg.sender : msg.sender?._id) ===
                    currentUser?._id;

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isSentByMe
                            ? 'bg-[#3797F0] text-white rounded-br-sm'
                            : 'bg-neutral-100 dark:bg-[#262626] text-black dark:text-white rounded-bl-sm'
                        }`}
                      >
                        {msg.mediaUrl && (
                          <img
                            src={msg.mediaUrl}
                            alt="Attachment"
                            className="max-h-60 rounded-lg mb-1.5 object-cover"
                          />
                        )}
                        {msg.text && <p>{msg.text}</p>}
                      </div>
                      <span className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500 gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 mb-2">
                    <img
                      src={
                        selectedConversation.participant?.avatar ||
                        'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                      }
                      alt={selectedConversation.participant?.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-sm font-semibold text-black dark:text-white">
                    {selectedConversation.participant?.fullName ||
                      selectedConversation.participant?.username}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    @{selectedConversation.participant?.username}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 max-w-xs">
                    No messages yet. Send a greeting to start the conversation!
                  </p>
                </div>
              )}

              {/* Typing indicator */}
              {otherIsTyping && (
                <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs italic px-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] ml-1">typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Field (always rendered whenever conversation is selected) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-neutral-200 dark:border-[#262626] flex items-center gap-2 bg-white dark:bg-black"
            >
              <input
                type="text"
                placeholder="Message..."
                value={inputText}
                onChange={handleInputChange}
                autoFocus
                className="flex-1 bg-neutral-100 dark:bg-[#121212] border border-neutral-200 dark:border-[#262626] rounded-full px-4 py-2.5 text-xs text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="text-xs font-semibold text-[#0095F6] hover:text-[#1877F2] disabled:opacity-30 disabled:hover:text-[#0095F6] px-3 py-2 transition-colors flex items-center gap-1"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />
                ) : (
                  <span>Send</span>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 dark:text-neutral-400 gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
              <Send className="w-10 h-10 stroke-1 -rotate-45" />
            </div>
            <h2 className="text-xl font-medium text-black dark:text-white">Your messages</h2>
            <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
              Send private photos, videos, and messages to a friend or group.
            </p>
            <button
              onClick={() => setIsNewMessageModalOpen(true)}
              className="mt-2 bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Send message
            </button>
          </div>
        )}
      </div>

      {/* New Message Search Modal */}
      {isNewMessageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[#262626] rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-black dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-[#262626]">
              <h3 className="font-semibold text-sm text-black dark:text-white">New message</h3>
              <button
                onClick={() => {
                  setIsNewMessageModalOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-neutral-200 dark:border-[#262626] flex items-center gap-2">
              <span className="text-xs font-semibold text-black dark:text-white pl-1">To:</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent text-xs text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none px-2 py-1"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[220px]">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0095F6]" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => startChatWithUser(user)}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#262626] cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                        <img
                          src={
                            user.avatar ||
                            'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'
                          }
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-black dark:text-white truncate">
                          {user.username}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {user.fullName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center py-10 text-xs text-neutral-500">
                  No account found.
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-neutral-500">
                  Search for a user by username or full name.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}