// Map of currently online users: Map<userId, socketId>
const onlineUsers = new Map();

/**
 * Get active socket ID of a user by their MongoDB _id
 * @param {string} userId
 * @returns {string|undefined}
 */
export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId?.toString());
};

/**
 * Initialize all Socket.io event listeners and real-time handlers
 * @param {import('socket.io').Server} io
 */
export const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    /**
     * 1. User Online Status Tracking
     * Client emits 'setup' with their userId upon login / connection
     */
    socket.on('setup', (userId) => {
      if (!userId) return;

      const userStr = userId.toString();
      onlineUsers.set(userStr, socket.id);
      socket.userId = userStr;

      // Join a personal room keyed by their userId for direct notifications & messages
      socket.join(userStr);

      console.log(`[Socket.io] User online: ${userStr}`);

      // Broadcast updated online user list to all connected clients
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    /**
     * 2. Join a Conversation Chat Room
     */
    socket.on('join_chat', (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
      console.log(`[Socket.io] Socket ${socket.id} joined chat room: ${conversationId}`);
    });

    /**
     * 3. Leave a Conversation Chat Room
     */
    socket.on('leave_chat', (conversationId) => {
      if (!conversationId) return;
      socket.leave(conversationId);
      console.log(`[Socket.io] Socket ${socket.id} left chat room: ${conversationId}`);
    });

    /**
     * 4. Typing Indicator Events
     */
    socket.on('typing', ({ conversationId, userId, username }) => {
      if (!conversationId) return;
      socket.to(conversationId).emit('user_typing', {
        conversationId,
        userId,
        username,
      });
    });

    socket.on('stop_typing', ({ conversationId, userId }) => {
      if (!conversationId) return;
      socket.to(conversationId).emit('user_stop_typing', {
        conversationId,
        userId,
      });
    });

    /**
     * 5. Send Real-Time Message
     */
    socket.on('send_message', (message) => {
      if (!message || !message.conversation) return;

      const conversationId = message.conversation.toString();

      // Emit to everyone in the chat room except the sender
      socket.to(conversationId).emit('receive_message', message);
    });

    /**
     * 6. Real-Time Notification Dispatch
     */
    socket.on('send_notification', ({ recipientId, notification }) => {
      if (!recipientId || !notification) return;

      // Emit directly to recipient's personal room
      io.to(recipientId.toString()).emit('new_notification', notification);
    });

    /**
     * 7. Disconnection Handler
     */
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log(`[Socket.io] User offline: ${socket.userId}`);

        // Broadcast updated online user list
        io.emit('online_users', Array.from(onlineUsers.keys()));
      }
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

export default initSocketHandler;
