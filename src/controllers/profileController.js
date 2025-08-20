const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId)
      .select('fullName username email profilePic bio followers following createdAt')
      .populate('followers', 'username profilePic')
      .populate('following', 'username profilePic');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get post count
    const postCount = await Post.countDocuments({ author: userId });

    // Check follow status
    const isFollowing = user.followers.some(follower => 
      follower._id.toString() === currentUserId
    );
    const isFollowedBy = user.following.some(following => 
      following._id.toString() === currentUserId
    );

    const profileData = {
      ...user.toObject(),
      postCount,
      isFollowing,
      isFollowedBy,
      isOwnProfile: currentUserId === userId
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Edit user profile
const editProfile = async (req, res) => {
  try {
    const { fullName, username, bio } = req.body;
    const currentUserId = req.user.id;
    const profilePic = req.file ? req.file.path : undefined;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: currentUserId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePic) updateData.profilePic = profilePic;

    const user = await User.findByIdAndUpdate(
      currentUserId,
      updateData,
      { new: true, runValidators: true }
    ).select('fullName username email profilePic bio followers following createdAt');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// Follow user
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Already following this user'
      });
    }

    // Add to following list
    currentUser.following.push(userId);
    userToFollow.followers.push(currentUserId);

    await Promise.all([currentUser.save(), userToFollow.save()]);

    // Create notification
    await Notification.create({
      recipient: userId,
      sender: currentUserId,
      type: 'follow'
    });

    res.json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow user'
    });
  }
};

// Unfollow user
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot unfollow yourself'
      });
    }

    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if not following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Not following this user'
      });
    }

    // Remove from following list
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUserId
    );

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow user'
    });
  }
};

// Get user's followers
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const followers = await User.find({
      _id: { $in: user.followers }
    })
      .select('username profilePic bio')
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);

    const total = user.followers.length;

    res.json({
      success: true,
      data: followers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFollowers: total,
        hasNext: skip + followers.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch followers'
    });
  }
};

// Get user's following
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const following = await User.find({
      _id: { $in: user.following }
    })
      .select('username profilePic bio')
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);

    const total = user.following.length;

    res.json({
      success: true,
      data: following,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFollowing: total,
        hasNext: skip + following.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch following'
    });
  }
};

// Get current user's profile
const getCurrentProfile = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId)
      .select('fullName username email profilePic bio followers following createdAt')
      .populate('followers', 'username profilePic')
      .populate('following', 'username profilePic');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get post count
    const postCount = await Post.countDocuments({ author: currentUserId });

    const profileData = {
      ...user.toObject(),
      postCount
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Get current profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

module.exports = {
  getProfile,
  editProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getCurrentProfile
};
