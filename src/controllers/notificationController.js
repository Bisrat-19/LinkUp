const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all notifications for current user
const getNotifications = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { unreadOnly } = req.query;

    let query = { recipient: currentUserId };
    
    // Filter by read status if requested
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'username profilePic')
      .populate('post', 'content')
      .populate('comment', 'content')
      .populate('chat')
      .populate('message', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNext: skip + notifications.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const count = await Notification.countDocuments({
      recipient: currentUserId,
      isRead: false
    });

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const currentUserId = req.user.id;

    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Check if user is the recipient
    if (notification.recipient.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    await Notification.updateMany(
      { 
        recipient: currentUserId, 
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
};

// Mark notification as unread
const markAsUnread = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const currentUserId = req.user.id;

    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Check if user is the recipient
    if (notification.recipient.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    notification.isRead = false;
    notification.readAt = null;
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as unread error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as unread'
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const currentUserId = req.user.id;

    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Check if user is the recipient
    if (notification.recipient.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
};

// Delete all read notifications
const deleteAllRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await Notification.deleteMany({
      recipient: currentUserId,
      isRead: true
    });

    res.json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`
    });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete read notifications'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteAllRead
};
