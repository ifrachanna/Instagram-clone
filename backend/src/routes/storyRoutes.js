import express from 'express';
import {
  createStory,
  getStoriesFeed,
  viewStory,
  deleteStory,
  getStoryViewers,
} from '../controllers/storyController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadSingleMedia } from '../middlewares/uploadMiddleware.js';
import moderatePostContent from '../middlewares/aiModeration.js';

const router = express.Router();

// Get active stories feed from followed accounts & own stories
router.get('/feed', protect, getStoriesFeed);

// Create a new 24-hour story with media upload & AI safety moderation
router.post(
  '/',
  protect,
  uploadSingleMedia('media'),
  moderatePostContent,
  createStory
);

// Mark story as viewed
router.put('/:id/view', protect, viewStory);

// Get story viewers list (author only)
router.get('/:id/viewers', protect, getStoryViewers);

// Delete story
router.delete('/:id', protect, deleteStory);

export default router;
