import express from 'express';
import {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
  getUserById,
} from '../controllers/userController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadSingleMedia } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Search users by username or fullName
router.get('/search', optionalAuth, searchUsers);

// Get user profile by username
router.get('/profile/:username', optionalAuth, getUserProfile);

// Update user profile info & avatar image
router.put(
  '/profile',
  protect,
  uploadSingleMedia('avatar'),
  updateProfile
);

// Follow / Unfollow user
router.put('/:id/follow', protect, followUser);
router.put('/:id/unfollow', protect, unfollowUser);

// Followers & Following lists
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

// Get user basic details by ID
router.get('/:id', optionalAuth, getUserById);

export default router;
