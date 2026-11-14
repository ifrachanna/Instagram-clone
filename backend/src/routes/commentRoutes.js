import express from 'express';
import {
  addComment,
  getPostComments,
  deleteComment,
} from '../controllers/commentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get all comments for a post
router.get('/:postId', getPostComments);

// Add a comment to a post (requires auth)
router.post('/:postId', protect, addComment);

// Delete a comment by ID (requires auth: author or post owner)
router.delete('/:commentId', protect, deleteComment);

export default router;
