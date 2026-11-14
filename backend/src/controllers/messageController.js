import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * @desc    Send a direct message (supports text and media attachments)
 * @route   POST /api/messages/send/:recipientId
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { recipientId } = req.params;
    const { text, conversationId } = req.body;
    const senderId = req.user._id;

    if (!text && !req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot be empty. Please provide text or an attachment.',
      });
    }

    if (recipientId.toString() === senderId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot send a direct message to yourself.',
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipient user not found.',
      });
    }

    // Find existing conversation or create a new one
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId], $size: 2 },
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        unreadCounts: [
          { user: senderId, count: 0 },
          { user: recipientId, count: 0 },
        ],
      });
    }

    // Check media file upload (Multer/Cloudinary)
    let mediaUrl = '';
    let mediaType = 'none';

    if (req.file) {
      mediaUrl = req.file.path || req.file.secure_url;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    // Create the message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      text: text ? text.trim() : '',
      mediaUrl,
      mediaType,
      readBy: [senderId],
    });

    await message.populate('sender', 'username fullName avatar isVerified');

    // Update conversation's lastMessage and bump unread count for recipient
    conversation.lastMessage = message._id;
    const recipientUnread = conversation.unreadCounts.find(
      (u) => u.user.toString() === recipientId.toString()
    );
    if (recipientUnread) {
      recipientUnread.count += 1;
    } else {
      conversation.unreadCounts.push({ user: recipientId, count: 1 });
    }
    await conversation.save();

    // Real-time dispatch via Socket.io if mounted
    const io = req.app.get('io');
    if (io) {
      // Broadcast to active conversation room
      io.to(conversation._id.toString()).emit('receive_message', message);
      // Also broadcast to recipient personal room so inbox/notifications update immediately
      io.to(recipientId.toString()).emit('receive_message', message);
    }

    res.status(201).json({
      status: 'success',
      conversationId: conversation._id,
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations for logged-in user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username fullName avatar isVerified bio')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username fullName avatar',
        },
      });

    // Format conversations with clean display metadata
    const formattedConversations = conversations.map((conv) => {
      // Find the other participant in a 1-on-1 chat
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );

      // Find user's unread count for this conversation
      const unread = conv.unreadCounts.find(
        (u) => u.user.toString() === currentUserId.toString()
      );

      return {
        _id: conv._id,
        participant: otherParticipant || null,
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        unreadCount: unread ? unread.count : 0,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      count: formattedConversations.length,
      conversations: formattedConversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all messages of a specific conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    // Verify user is a participant of this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found or access denied.',
      });
    }

    // Retrieve messages in chronological order
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username fullName avatar isVerified');

    // Reset unread count for current user in this conversation
    const userUnread = conversation.unreadCounts.find(
      (u) => u.user.toString() === currentUserId.toString()
    );
    if (userUnread && userUnread.count > 0) {
      userUnread.count = 0;
      await conversation.save();
    }

    // Mark unread messages as read by current user
    await Message.updateMany(
      {
        conversation: conversationId,
        readBy: { $ne: currentUserId },
      },
      {
        $addToSet: { readBy: currentUserId },
      }
    );

    res.status(200).json({
      status: 'success',
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};
