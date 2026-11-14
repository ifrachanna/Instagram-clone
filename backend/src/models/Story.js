import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Story owner is required'],
      index: true,
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
      index: { expires: '0s' }, // MongoDB TTL index: automatically deletes expired stories
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for counting total viewers
storySchema.virtual('viewersCount').get(function () {
  return this.viewers ? this.viewers.length : 0;
});

// Compound index to quickly fetch stories by followed users in descending order
storySchema.index({ user: 1, createdAt: -1 });

const Story = mongoose.model('Story', storySchema);

export default Story;
