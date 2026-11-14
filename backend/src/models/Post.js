import mongoose from 'mongoose';

const mediaItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Media URL is required'],
    },
    publicId: {
      type: String, // Cloudinary asset public ID
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    caption: {
      type: String,
      default: '',
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      trim: true,
    },
    media: {
      type: [mediaItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A post must contain at least one media item (image/video)',
      },
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isAiFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    aiModerationDetails: {
      isAppropriate: {
        type: Boolean,
        default: true,
      },
      flaggedReason: {
        type: String,
        default: '',
      },
      confidenceScore: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for fast likes tally
postSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Compound indexes for timeline feeds, author profiles, and hashtag searches
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ caption: 'text' });

const Post = mongoose.model('Post', postSchema);

export default Post;
