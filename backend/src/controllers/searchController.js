const User = require('../models/User');
const Post = require('../models/Post');

// Search users by username
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Create regex pattern for case-insensitive search
    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $or: [
        { username: searchRegex },
        { bio: searchRegex }
      ],
      _id: { $ne: currentUserId } // Exclude current user
    })
      .select('username profilePic bio followers following')
      .sort({ followers: -1, username: 1 }) // Sort by popularity then alphabetically
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      $or: [
        { username: searchRegex },
        { bio: searchRegex }
      ],
      _id: { $ne: currentUserId }
    });

    // Add follow status for each user
    const currentUser = await User.findById(currentUserId).select('following');
    const usersWithFollowStatus = users.map(user => {
      const userObj = user.toObject();
      userObj.isFollowing = currentUser.following.includes(user._id);
      userObj.isFollowedBy = user.followers.includes(currentUserId);
      return userObj;
    });

    res.json({
      success: true,
      data: usersWithFollowStatus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
};

// Search posts by keywords/hashtags
const searchPosts = async (req, res) => {
  try {
    const { q, hashtag, author } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const currentUserId = req.user.id;

    if (!q && !hashtag && !author) {
      return res.status(400).json({
        success: false,
        error: 'Search query, hashtag, or author is required'
      });
    }

    let query = { isPublic: true };

    if (hashtag) {
      query.hashtags = { $in: [hashtag] };
    } else if (q) {
      query.$text = { $search: q };
    }

    if (author) {
      // Check if author exists
      const authorUser = await User.findOne({ username: author });
      if (!authorUser) {
        return res.status(404).json({
          success: false,
          error: 'Author not found'
        });
      }
      query.author = authorUser._id;
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

// Get trending hashtags
const getTrendingHashtags = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Aggregate to get hashtag counts from recent posts
    const trendingHashtags = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit },
          hashtags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$hashtags'
      },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          posts: { $push: '$_id' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      }
    ]);

    res.json({
      success: true,
      data: trendingHashtags
    });
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending hashtags'
    });
  }
};

// Get suggested users to follow
const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Get current user's following list
    const currentUser = await User.findById(currentUserId).select('following');
    
    // Find users not in following list
    const suggestedUsers = await User.find({
      _id: { 
        $nin: [...currentUser.following, currentUserId] 
      }
    })
      .select('username profilePic bio followers')
      .sort({ followers: -1 })
      .limit(limit);

    // Add follow status
    const usersWithFollowStatus = suggestedUsers.map(user => {
      const userObj = user.toObject();
      userObj.isFollowing = false;
      userObj.isFollowedBy = user.followers.includes(currentUserId);
      return userObj;
    });

    res.json({
      success: true,
      data: usersWithFollowStatus
    });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggested users'
    });
  }
};

module.exports = {
  searchUsers,
  searchPosts,
  getTrendingHashtags,
  getSuggestedUsers
};
