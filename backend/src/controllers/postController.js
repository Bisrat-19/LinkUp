const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// Create a new post
const createPost = async (req, res) => {
  try {
    const { content, hashtags, isPublic } = req.body;
    const mediaFiles = req.files ? req.files.map(file => file.path) : [];
    
    // Determine media type
    let mediaType = 'none';
    if (mediaFiles.length > 0) {
      const firstFile = mediaFiles[0];
      if (firstFile.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        mediaType = 'image';
      } else if (firstFile.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
        mediaType = 'video';
      }
    }

    // Extract hashtags from content if not provided
    let extractedHashtags = hashtags || [];
    if (!hashtags && content) {
      const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
      extractedHashtags = content.match(hashtagRegex) || [];
    }

    const post = new Post({
      author: req.user.id,
      content,
      media: mediaFiles,
      mediaType,
      hashtags: extractedHashtags,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await post.save();
    
    // Populate author details
    await post.populate('author', 'username profilePic');
    
    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
};

// Get all posts (global feed with pagination)
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isPublic: true })
      .populate('author', 'username profilePic')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ isPublic: true });

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: skip + posts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
};

// Get posts by specific user
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if requesting user is following the target user or if it's their own posts
    let query = { author: userId };
    if (req.user.id !== userId) {
      // Only show public posts to non-followers
      query.isPublic = true;
    }

    const posts = await Post.find(query)
      .populate('author', 'username profilePic')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: skip + posts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user posts'
    });
  }
};

// Get single post by ID
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId)
      .populate('author', 'username profilePic bio')
      .populate('likes', 'username profilePic')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username profilePic'
        }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if post is public or if user is the author
    if (!post.isPublic && post.author._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, hashtags, isPublic } = req.body;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own posts'
      });
    }

    // Update fields
    if (content !== undefined) post.content = content;
    if (hashtags !== undefined) post.hashtags = hashtags;
    if (isPublic !== undefined) post.isPublic = isPublic;

    await post.save();
    
    await post.populate('author', 'username profilePic');
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post'
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own posts'
      });
    }

    // Delete associated comments
    await Comment.deleteMany({ post: postId });
    
    // Delete the post
    await Post.findByIdAndDelete(postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post'
    });
  }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      post.likes.push(userId);
      
      // Create notification if not liking own post
      if (post.author.toString() !== userId) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          post: postId
        });
      }
    }

    await post.save();
    
    await post.populate('author', 'username profilePic');
    await post.populate('likes', 'username');

    res.json({
      success: true,
      data: post,
      message: isLiked ? 'Post unliked' : 'Post liked'
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like'
    });
  }
};

// Search posts by keywords/hashtags
const searchPosts = async (req, res) => {
  try {
    const { q, hashtag } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { isPublic: true };
    
    if (hashtag) {
      query.hashtags = { $in: [hashtag] };
    } else if (q) {
      query.$text = { $search: q };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Search query or hashtag is required'
      });
    }

    const posts = await Post.find(query)
      .populate('author', 'username profilePic')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: skip + posts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search posts'
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getUserPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  searchPosts
};
