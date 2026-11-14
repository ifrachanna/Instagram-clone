import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['none', 'image', 'video'],
      default: 'none',
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Chronological message lookup for a conversation
messageSchema.index({ conversation: 1, createdAt: 1 });

// Update Conversation lastMessage on message creation
messageSchema.post('save', async function (doc, next) {
  try {
    await mongoose.model('Conversation').findByIdAndUpdate(doc.conversation, {
      lastMessage: doc._id,
      updatedAt: new Date(),
    });
    next();
  } catch (error) {
    next(error);
  }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
