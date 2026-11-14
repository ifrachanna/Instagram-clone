'use client';

import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, MapPin, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { IPost } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (newPost: IPost) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);

      const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviews(previewUrls);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);

      const previewUrls = droppedFiles.map((file) => URL.createObjectURL(file));
      setPreviews(previewUrls);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one photo or video to share.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('media', file);
    });
    formData.append('caption', caption.trim());
    formData.append('location', location.trim());

    try {
      const { data } = await api.post('/posts', formData);

      if (onPostCreated && data.post) {
        onPostCreated(data.post);
      }

      handleClose();
    } catch (err: any) {
      console.error('Create Post Error:', err);
      const serverMessage = err.response?.data?.message || err.response?.data?.reason;
      setError(
        serverMessage
          ? `Moderation / Upload Alert: ${serverMessage}`
          : 'Failed to create post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setPreviews([]);
    setCaption('');
    setLocation('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 text-white/80 hover:text-white p-2 z-50"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Modal Dialog Card */}
      <div className="bg-white dark:bg-[#262626] border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col text-black dark:text-white max-h-[90vh] transition-colors duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#262626]">
          <h2 className="text-sm font-semibold mx-auto">Create new post</h2>
          {previews.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-sm font-semibold text-[#0095F6] hover:text-[#1877F2] dark:hover:text-white disabled:opacity-40 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Share
            </button>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 text-xs px-4 py-2.5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
          {/* Left Column: Media Dropzone / Preview */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex-1 bg-neutral-50 dark:bg-black flex flex-col items-center justify-center relative p-4 min-h-[300px] border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800"
          >
            {previews.length > 0 ? (
              <div className="w-full h-full flex items-center justify-center relative">
                {files[0]?.type.startsWith('video/') ? (
                  <video
                    src={previews[0]}
                    controls
                    className="max-h-[380px] w-full object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={previews[0]}
                    alt="Preview"
                    className="max-h-[380px] w-full object-contain rounded-lg"
                  />
                )}
                {previews.length > 1 && (
                  <span className="absolute bottom-3 right-3 bg-black/70 text-xs px-2 py-1 rounded-md text-white">
                    +{previews.length - 1} more
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-3">
                <ImageIcon className="w-16 h-16 text-neutral-400 dark:text-neutral-500 stroke-1" />
                <p className="text-lg font-light text-neutral-700 dark:text-neutral-300">Drag photos and videos here</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer mt-2"
                >
                  Select from computer
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Metadata Form */}
          {previews.length > 0 && (
            <div className="w-full md:w-80 bg-neutral-50/70 dark:bg-[#1f1f1f] flex flex-col justify-between p-4 gap-4">
              <div className="flex flex-col gap-4">
                {/* Author Info */}
                {user && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700">
                      <img
                        src={user.avatar || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold">{user.username}</span>
                  </div>
                )}

                {/* Caption Textarea */}
                <textarea
                  placeholder="Write a caption... (e.g. #travel #sunset)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  rows={4}
                  className="w-full bg-transparent text-xs text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none resize-none border-b border-neutral-200 dark:border-neutral-800 pb-2"
                />

                {/* Location Input */}
                <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Add location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-xs text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
                  />
                </div>
              </div>

              {/* Gemini AI Moderation Notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  Posts are screened by <strong className="text-neutral-800 dark:text-neutral-200">Gemini AI</strong> for safety before publishing.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
