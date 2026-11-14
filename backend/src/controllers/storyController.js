import Story from '../models/Story.js';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Create a new 24-hour expiring story
 * @route   POST /api/stories
 * @access  Private
 */
export const createStory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'A photo or video is required to create a story.',
      });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaUrl = req.file.path || req.file.secure_url;

    // Create story (24-hour expiration handled by schema default)
    const story = await Story.create({
      user: req.user._id,
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await story.populate('user', 'username fullName avatar isVerified');

    res.status(201).json({
      status: 'success',
      message: 'Story created successfully!',
      story,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active stories feed from followed users + own stories (grouped by user)
 * @route   GET /api/stories/feed
 * @access  Private
 */
export const getStoriesFeed = async (req, res, next) => {
  try {
    const followingIds = req.user.following || [];
    const storyUserIds = [...followingIds, req.user._id];

    // Query active stories that haven't expired
    const activeStories = await Story.find({
      user: { $in: storyUserIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'username fullName avatar isVerified')
      .populate('viewers.user', 'username fullName avatar');

    // Group stories by user for Instagram-style story circles
    const storyMap = new Map();

    for (const story of activeStories) {
      const userId = story.user._id.toString();

      if (!storyMap.has(userId)) {
        storyMap.set(userId, {
          user: story.user,
          stories: [],
          hasUnseen: false,
          isSelf: userId === req.user._id.toString(),
        });
      }

      const userGroup = storyMap.get(userId);
      userGroup.stories.push(story);

      // Check if logged-in user has viewed this story
      const hasViewed = story.viewers.some(
        (viewer) => viewer.user?._id?.toString() === req.user._id.toString()
      );

      if (!hasViewed && !userGroup.isSelf) {
        userGroup.hasUnseen = true;
      }
    }

    // Convert map to array: own story first, then unseen stories, then seen stories
    const formattedFeed = Array.from(storyMap.values()).sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });

    res.status(200).json({
      status: 'success',
      count: formattedFeed.length,
      feed: formattedFeed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a story as viewed by current user
 * @route   PUT /api/stories/:id/view
 * @access  Private
 */
export const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        status: 'error',
        message: 'Story not found or has expired.',
      });
    }

    const currentUserId = req.user._id;

    // Check if user has already viewed the story
    const alreadyViewed = story.viewers.some(
      (v) => v.user.toString() === currentUserId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: currentUserId,
        viewedAt: new Date(),
      });
      await story.save();
    }

    res.status(200).json({
      status: 'success',
      viewed: true,
      viewersCount: story.viewers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a story (Owner only)
 * @route   DELETE /api/stories/:id
 * @access  Private
 */
export const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        status: 'error',
        message: 'Story not found.',
      });
    }

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this story.',
      });
    }

    await story.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Story deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of viewers for a specific story (Owner only)
 * @route   GET /api/stories/:id/viewers
 * @access  Private
 */
export const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('viewers.user', 'username fullName avatar isVerified');

    if (!story) {
      return res.status(404).json({
        status: 'error',
        message: 'Story not found or has expired.',
      });
    }

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the story author can view the viewers list.',
      });
    }

    res.status(200).json({
      status: 'success',
      count: story.viewers.length,
      viewers: story.viewers,
    });
  } catch (error) {
    next(error);
  }
};
