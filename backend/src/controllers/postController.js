import Post from '../models/Post.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Create a new post (supports multi-image/video carousel)
 * @route   POST /api/posts
 * @access  Private
 */
export const createPost = async (req, res, next) => {
  try {
    const { caption, location } = req.body;
    const files = req.files || (req.file ? [req.file] : []);

    // 1. Validate that at least one media file was uploaded
    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A post must contain at least one photo or video.',
      });
    }

    // 2. Build media items array from Multer/Cloudinary upload results
    const media = files.map((file) => ({
      url: file.path || file.secure_url,
      publicId: file.filename || '',
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
    }));

    // 3. Extract hashtags from caption (e.g., #nature #photography)
    const tags = caption
      ? (caption.match(/#[a-zA-Z0-9_]+/g) || []).map((tag) =>
          tag.slice(1).toLowerCase()
        )
      : [];

    // 4. Retrieve Gemini AI moderation analysis attached by aiModeration middleware
    const aiModeration = req.aiModeration || {
      isAppropriate: true,
      flaggedReason: '',
      confidenceScore: 1.0,
    };

    // 5. Create post in database
    const post = await Post.create({
      author: req.user._id,
      caption: caption || '',
      location: location || '',
      media,
      tags,
      isAiFlagged: !aiModeration.isAppropriate,
      aiModerationDetails: aiModeration,
    });

    // 6. Populate author info for immediate UI rendering
    await post.populate('author', 'username fullName avatar isVerified');

    res.status(201).json({
      status: 'success',
      message: 'Post created successfully!',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get home feed posts (from followed users + logged-in user's own posts)
 * @route   GET /api/posts/feed
 * @access  Private
 */
export const getFeedPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Feed includes followed users and user's own posts
    const followingIds = req.user.following || [];
    const feedAuthors = [...followingIds, req.user._id];

    const filter = {
      author: { $in: feedAuthors },
      isAiFlagged: false, // Hide posts flagged as unsafe by AI
    };

    const [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username fullName avatar isVerified')
        .populate({
          path: 'likes',
          select: 'username fullName avatar',
        }),
      Post.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      status: 'success',
      page,
      limit,
      totalPages,
      totalPosts,
      hasMore: page < totalPages,
      posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public posts for the Explore grid
 * @route   GET /api/posts/explore
 * @access  Public / Optional Auth
 */
export const getExplorePosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 18));
    const skip = (page - 1) * limit;
    const tag = req.query.tag ? req.query.tag.trim().toLowerCase().replace(/^#/, '') : null;

    // Filter out posts authored by current user if authenticated (unless browsing a specific tag)
    const filter = {
      isAiFlagged: false,
    };

    if (tag) {
      filter.$or = [
        { tags: tag },
        { caption: { $regex: `#${tag}\\b`, $options: 'i' } },
      ];
    } else if (req.user) {
      filter.author = { $ne: req.user._id };
    }

    const [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username fullName avatar isVerified'),
      Post.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      status: 'success',
      page,
      limit,
      totalPages,
      totalPosts,
      hasMore: page < totalPages,
      posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single post by ID
 * @route   GET /api/posts/:id
 * @access  Public / Optional Auth
 */
export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username fullName avatar isVerified followersCount')
      .populate({
        path: 'likes',
        select: 'username fullName avatar isVerified',
      });

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete post (Owner only)
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    // Check authorization: only the author can delete
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this post.',
      });
    }

    // 1. Delete media assets from Cloudinary
    for (const item of post.media) {
      if (item.publicId) {
        await cloudinary.uploader
          .destroy(item.publicId, { resource_type: item.mediaType })
          .catch((err) =>
            console.error(`Failed to delete Cloudinary asset ${item.publicId}:`, err)
          );
      }
    }

    // 2. Cascade delete associated comments and notifications
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Notification.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Post and associated data deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle like / unlike on a post
 * @route   PUT /api/posts/:id/like
 * @access  Private
 */
export const toggleLikePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    const userId = req.user._id;
    const isLiked = post.likes.some(
      (likeId) => (likeId._id || likeId).toString() === userId.toString()
    );

    if (isLiked) {
      // Unlike post
      post.likes = post.likes.filter(
        (likeId) => (likeId._id || likeId).toString() !== userId.toString()
      );

      // Remove notification if previously created
      await Notification.findOneAndDelete({
        recipient: post.author,
        sender: userId,
        type: 'like_post',
        post: post._id,
      });
    } else {
      // Like post
      post.likes.push(userId);

      // Create notification if the user is not liking their own post
      if (post.author.toString() !== userId.toString()) {
        const notification = await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like_post',
          post: post._id,
        });

        await notification.populate('sender', 'username fullName avatar isVerified');
        await notification.populate('post', 'media caption');

        const io = req.app.get('io');
        if (io) {
          io.to(post.author.toString()).emit('new_notification', notification);
        }
      }
    }

    await post.save();

    res.status(200).json({
      status: 'success',
      isLiked: !isLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of users who liked a post
 * @route   GET /api/posts/:id/likes
 * @access  Public / Optional Auth
 */
export const getPostLikes = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('likes', 'username fullName avatar isVerified bio');

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      count: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle save / bookmark on a post
 * @route   PUT /api/posts/:id/save
 * @access  Private
 */
export const toggleSavePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    const user = await User.findById(req.user._id);
    const isSaved = (user.savedPosts || []).some(
      (savedId) => (savedId._id || savedId).toString() === post._id.toString()
    );

    let updatedUser;
    if (isSaved) {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { savedPosts: post._id } },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { savedPosts: post._id } },
        { new: true }
      );
    }

    res.status(200).json({
      status: 'success',
      isSaved: !isSaved,
      savedPosts: updatedUser.savedPosts,
      message: !isSaved ? 'Post saved to collection' : 'Post removed from saved',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all saved posts for logged-in user
 * @route   GET /api/posts/saved
 * @access  Private
 */
export const getSavedPosts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const savedPostIds = user.savedPosts || [];

    const posts = await Post.find({ _id: { $in: savedPostIds } })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName avatar isVerified')
      .populate('likes', 'username fullName avatar');

    res.status(200).json({
      status: 'success',
      count: posts.length,
      posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get video reels for full-height reels feed
 * @route   GET /api/posts/reels
 * @access  Public / Optional Auth
 */
export const getReelsPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {
      isAiFlagged: false,
      'media.mediaType': 'video',
    };

    let [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username fullName avatar isVerified')
        .populate('likes', 'username fullName avatar'),
      Post.countDocuments(filter),
    ]);

    // If no video reels exist yet, return public posts as fallback
    if (posts.length === 0) {
      posts = await Post.find({ isAiFlagged: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('author', 'username fullName avatar isVerified')
        .populate('likes', 'username fullName avatar');
      totalPosts = posts.length;
    }

    res.status(200).json({
      status: 'success',
      page,
      limit,
      totalPosts,
      posts,
    });
  } catch (error) {
    next(error);
  }
};

