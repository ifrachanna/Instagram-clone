import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text cannot be empty'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    isAiFlagged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for likes count
commentSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Indexes for chronological retrieval of comments and replies
commentSchema.index({ post: 1, createdAt: 1 });

// Increment Post commentsCount on new comment
commentSchema.post('save', async function (doc, next) {
  try {
    await mongoose.model('Post').findByIdAndUpdate(doc.post, {
      $inc: { commentsCount: 1 },
    });
    next();
  } catch (error) {
    next(error);
  }
});

// Decrement Post commentsCount on comment deletion
commentSchema.post('findOneAndDelete', async function (doc, next) {
  if (doc) {
    try {
      await mongoose.model('Post').findByIdAndUpdate(doc.post, {
        $inc: { commentsCount: -1 },
      });
      // Also delete any child replies
      await mongoose.model('Comment').deleteMany({ parentComment: doc._id });
    } catch (error) {
      console.error('Error updating comment count:', error);
    }
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
