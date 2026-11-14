import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Add a comment (or reply) to a post
 * @route   POST /api/comments/:postId
 * @access  Private
 */
export const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { text, parentComment } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment text cannot be empty.',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.',
      });
    }

    // Check parent comment if this is a nested reply
    let parent = null;
    if (parentComment) {
      parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent comment not found.',
        });
      }
    }

    // Create the comment (model hook increments Post.commentsCount automatically)
    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      text: text.trim(),
      parentComment: parent ? parent._id : null,
    });

    await comment.populate('author', 'username fullName avatar isVerified');

    // Create notification
    const io = req.app.get('io');
    if (parent) {
      // Notify the author of the comment being replied to
      if (parent.author.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: parent.author,
          sender: req.user._id,
          type: 'reply',
          post: post._id,
          comment: comment._id,
          text: text.trim().slice(0, 100),
        });
        await notification.populate('sender', 'username fullName avatar isVerified');
        await notification.populate('post', 'media caption');
        if (io) {
          io.to(parent.author.toString()).emit('new_notification', notification);
        }
      }
    } else {
      // Notify the post owner
      if (post.author.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'comment',
          post: post._id,
          comment: comment._id,
          text: text.trim().slice(0, 100),
        });
        await notification.populate('sender', 'username fullName avatar isVerified');
        await notification.populate('post', 'media caption');
        if (io) {
          io.to(post.author.toString()).emit('new_notification', notification);
        }
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully.',
      comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all comments for a post
 * @route   GET /api/comments/:postId
 * @access  Public / Optional Auth
 */
export const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate('author', 'username fullName avatar isVerified')
      .populate({
        path: 'likes',
        select: 'username fullName avatar',
      });

    res.status(200).json({
      status: 'success',
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a comment (Allowed for comment author OR post owner)
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId).populate('post', 'author');
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found.',
      });
    }

    const isCommentAuthor =
      comment.author.toString() === req.user._id.toString();
    const isPostOwner =
      comment.post &&
      comment.post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this comment.',
      });
    }

    // findOneAndDelete fires the post-delete hook to decrement commentsCount and delete child replies
    await Comment.findOneAndDelete({ _id: commentId });

    // Clean up notifications related to this comment
    await Notification.deleteMany({ comment: commentId });

    res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
