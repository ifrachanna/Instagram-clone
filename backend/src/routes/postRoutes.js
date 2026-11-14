import express from 'express';
import {
  createPost,
  getFeedPosts,
  getExplorePosts,
  getReelsPosts,
  getPostById,
  deletePost,
  toggleLikePost,
  toggleSavePost,
  getSavedPosts,
  getPostLikes,
} from '../controllers/postController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadPostMedia } from '../middlewares/uploadMiddleware.js';
import moderatePostContent from '../middlewares/aiModeration.js';

const router = express.Router();

// Feed posts (must be authenticated to see followed accounts' posts)
router.get('/feed', protect, getFeedPosts);

// Explore posts (public or authenticated)
router.get('/explore', getExplorePosts);

// Reels video posts (public or authenticated)
router.get('/reels', optionalAuth, getReelsPosts);

// Saved posts for current user
router.get('/saved', protect, getSavedPosts);

// Create a new post with multi-media upload and Gemini AI content moderation
router.post(
  '/',
  protect,
  uploadPostMedia('media', 10),
  moderatePostContent,
  createPost
);

// Single post operations
router.get('/:id', getPostById);
router.get('/:id/likes', optionalAuth, getPostLikes);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, toggleLikePost);
router.put('/:id/save', protect, toggleSavePost);

export default router;
