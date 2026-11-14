import User from '../models/User.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Get user profile by username with posts & stats
 * @route   GET /api/users/profile/:username
 * @access  Public / Optional Auth
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername })
      .select('-password')
      .populate('followers', 'username fullName avatar isVerified')
      .populate('following', 'username fullName avatar isVerified');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    // Fetch user's non-flagged posts in reverse chronological order
    const posts = await Post.find({ author: user._id, isAiFlagged: false })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName avatar isVerified');

    // Determine relationship to requesting user
    let isFollowing = false;
    let isSelf = false;

    if (req.user) {
      isSelf = req.user._id.toString() === user._id.toString();
      isFollowing = user.followers.some(
        (follower) => (follower._id || follower).toString() === req.user._id.toString()
      );
    }

    res.status(200).json({
      status: 'success',
      profile: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: isSelf ? user.email : undefined,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        gender: isSelf ? user.gender : undefined,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: posts.length,
        isFollowing,
        isSelf,
        createdAt: user.createdAt,
      },
      posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search users by username or fullName
 * @route   GET /api/users/search
 * @access  Public / Optional Auth
 */
export const searchUsers = async (req, res, next) => {
  try {
    const query = (req.query.q || req.query.query || '').trim();

    const filter = query
      ? {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { fullName: { $regex: query, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .limit(20)
      .select('username fullName avatar isVerified bio followers following');

    res.status(200).json({
      status: 'success',
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user basic details by MongoDB ID
 * @route   GET /api/users/:id
 * @access  Public / Optional Auth
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username fullName avatar isVerified bio followers following'
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile (info & avatar)
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, bio, website, gender } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (website !== undefined) updateData.website = website.trim();
    if (gender && ['male', 'female', 'custom', 'prefer_not_to_say'].includes(gender)) {
      updateData.gender = gender;
    }

    // Update avatar if a new image was uploaded via Multer/Cloudinary or passed as base64/URL
    if (req.file) {
      updateData.avatar = req.file.path || req.file.secure_url || req.file.url;
    } else if (req.body.avatar) {
      if (req.body.avatar.startsWith('data:image')) {
        try {
          const uploadRes = await cloudinary.uploader.upload(req.body.avatar, {
            folder: 'instagram_clone/avatars',
          });
          updateData.avatar = uploadRes.secure_url;
        } catch (uploadErr) {
          console.error('Base64 Cloudinary upload failed:', uploadErr);
        }
      } else {
        updateData.avatar = req.body.avatar;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully!',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        website: updatedUser.website,
        gender: updatedUser.gender,
        followersCount: updatedUser.followersCount,
        followingCount: updatedUser.followingCount,
        isVerified: updatedUser.isVerified,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Follow another user
 * @route   PUT /api/users/:id/follow
 * @access  Private
 */
export const followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot follow yourself.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User to follow was not found.',
      });
    }

    const isAlreadyFollowing = (targetUser.followers || []).some(
      (id) => (id._id || id).toString() === currentUserId.toString()
    );

    if (isAlreadyFollowing) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already following this user.',
      });
    }

    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: targetUserId } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: currentUserId } },
        { new: true }
      ),
    ]);

    // Send notification
    const notification = await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'follow',
    });
    await notification.populate('sender', 'username fullName avatar isVerified');

    const io = req.app.get('io');
    if (io) {
      io.to(targetUserId.toString()).emit('new_notification', notification);
    }

    res.status(200).json({
      status: 'success',
      message: `You are now following ${targetUser.username}`,
      isFollowing: true,
      followersCount: updatedTargetUser.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unfollow a user
 * @route   PUT /api/users/:id/unfollow
 * @access  Private
 */
export const unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot unfollow yourself.',
      });
    }

    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        { $pull: { following: targetUserId } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        targetUserId,
        { $pull: { followers: currentUserId } },
        { new: true }
      ),
      Notification.findOneAndDelete({
        recipient: targetUserId,
        sender: currentUserId,
        type: 'follow',
      }),
    ]);

    if (!updatedTargetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User was not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: `You have unfollowed ${updatedTargetUser.username}`,
      isFollowing: false,
      followersCount: updatedTargetUser.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of followers for a user
 * @route   GET /api/users/:id/followers
 * @access  Public / Optional Auth
 */
export const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'followers',
      'username fullName avatar isVerified bio'
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      count: user.followers.length,
      followers: user.followers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of users followed by a user
 * @route   GET /api/users/:id/following
 * @access  Public / Optional Auth
 */
export const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'following',
      'username fullName avatar isVerified bio'
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      count: user.following.length,
      following: user.following,
    });
  } catch (error) {
    next(error);
  }
};
