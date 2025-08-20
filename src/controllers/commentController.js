const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if parent comment exists (for replies)
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
    }

    const comment = new Comment({
      author: req.user.id,
      post: postId,
      content,
      parentComment: parentCommentId || null
    });

    await comment.save();
    
    // Add comment to post
    post.comments.push(comment._id);
    await post.save();
    
    // Populate author details
    await comment.populate('author', 'username profilePic');
    
    // Create notification if not commenting on own post
    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: postId,
        comment: comment._id
      });
    }

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
};

// Get comments for a post
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const comments = await Comment.find({ 
      post: postId, 
      parentComment: null // Only top-level comments
    })
      .populate('author', 'username profilePic')
      .populate('likes', 'username')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username profilePic'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({ 
      post: postId, 
      parentComment: null 
    });

    res.json({
      success: true,
      data: comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalComments: total,
        hasNext: skip + comments.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
};

// Get single comment
const getComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId)
      .populate('author', 'username profilePic')
      .populate('likes', 'username')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username profilePic'
        }
      });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comment'
    });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments'
      });
    }

    comment.content = content;
    await comment.save();
    
    await comment.populate('author', 'username profilePic');
    
    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments'
      });
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: commentId }
    });

    // Delete the comment and all its replies
    await Comment.deleteMany({
      $or: [
        { _id: commentId },
        { parentComment: commentId }
      ]
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
};

// Like/Unlike comment
const toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    const isLiked = comment.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await comment.save();
    
    await comment.populate('author', 'username profilePic');
    await comment.populate('likes', 'username');

    res.json({
      success: true,
      data: comment,
      message: isLiked ? 'Comment unliked' : 'Comment liked'
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle comment like'
    });
  }
};

module.exports = {
  createComment,
  getPostComments,
  getComment,
  updateComment,
  deleteComment,
  toggleCommentLike
};
