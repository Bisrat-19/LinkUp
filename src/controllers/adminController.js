const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');

// Admin Authentication (for users with admin roles)
const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// User Management
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') query.isActive = true;
    if (status === 'banned') query.isBanned = true;
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('followers', 'username fullName')
      .populate('following', 'username fullName');
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username fullName profilePic')
      .populate('following', 'username fullName profilePic');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's posts count
    const postsCount = await Post.countDocuments({ author: user._id });
    
    // Get user's comments count
    const commentsCount = await Comment.countDocuments({ author: user._id });
    
    res.json({
      ...user.toObject(),
      stats: {
        postsCount,
        commentsCount,
        followersCount: user.followers.length,
        followingCount: user.following.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

const banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = req.user.id;
    await user.save();
    
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isBanned = false;
    user.banReason = undefined;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    await user.save();
    
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
};

// Content Moderation
const getReportedContent = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '' } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { reported: true };
    let model = Post;
    
    if (type === 'comments') {
      model = Comment;
    }
    
    const content = await model.find(query)
      .populate('author', 'username fullName profilePic')
      .populate('reports.reportedBy', 'username fullName')
      .sort({ 'reports.length': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await model.countDocuments(query);
    
    res.json({
      content,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + content.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reported content' });
  }
};

const deleteContent = async (req, res) => {
  try {
    const { type, contentId } = req.params;
    let model = Post;
    
    if (type === 'comment') {
      model = Comment;
    }
    
    const content = await model.findById(contentId);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    await model.findByIdAndDelete(contentId);
    
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
};

const hideContent = async (req, res) => {
  try {
    const { type, contentId } = req.params;
    let model = Post;
    
    if (type === 'comment') {
      model = Comment;
    }
    
    const content = await model.findById(contentId);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    content.isHidden = true;
    content.hiddenBy = req.user.id;
    content.hiddenAt = new Date();
    await content.save();
    
    res.json({ message: 'Content hidden successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to hide content' });
  }
};

// Analytics Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: lastWeek } });
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: lastMonth } });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    
    // Post statistics
    const totalPosts = await Post.countDocuments();
    const postsThisWeek = await Post.countDocuments({ createdAt: { $gte: lastWeek } });
    const postsThisMonth = await Post.countDocuments({ createdAt: { $gte: lastMonth } });
    const reportedPosts = await Post.countDocuments({ reported: true });
    
    // Comment statistics
    const totalComments = await Comment.countDocuments();
    const commentsThisWeek = await Comment.countDocuments({ createdAt: { $gte: lastWeek } });
    const reportedComments = await Comment.countDocuments({ reported: true });
    
    // Activity trends
    const dailyStats = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        
        return Promise.all([
          User.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          Post.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          Comment.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
        ]);
      })
    );
    
    res.json({
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        banned: bannedUsers
      },
      posts: {
        total: totalPosts,
        thisWeek: postsThisWeek,
        thisMonth: postsThisMonth,
        reported: reportedPosts
      },
      comments: {
        total: totalComments,
        thisWeek: commentsThisWeek,
        reported: reportedComments
      },
      trends: {
        daily: dailyStats.reverse().map(([users, posts, comments], index) => ({
          date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          users,
          posts,
          comments
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// System Settings
const getSystemSettings = async (req, res) => {
  try {
    // This would typically come from a Settings model
    // For now, returning default settings
    res.json({
      maintenance: false,
      registrationEnabled: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      maxPostsPerDay: 50,
      maxCommentsPerPost: 100,
      autoModeration: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  getAllUsers,
  getUserDetails,
  banUser,
  unbanUser,
  getReportedContent,
  deleteContent,
  hideContent,
  getDashboardStats,
  getSystemSettings
};