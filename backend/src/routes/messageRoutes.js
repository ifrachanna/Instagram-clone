import express from 'express';
import {
  sendMessage,
  getConversations,
  getMessages,
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadSingleMedia } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Get all active conversation threads
router.get('/conversations', protect, getConversations);

// Send message to recipient (supports text and media attachments)
router.post(
  '/send/:recipientId',
  protect,
  uploadSingleMedia('media'),
  sendMessage
);

// Get messages for a specific conversation
router.get('/:conversationId', protect, getMessages);

export default router;
