const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteAllRead
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(auth);

router.get('/', getNotifications); // Get all notifications
router.get('/unread-count', getUnreadCount); // Get unread count
router.put('/:notificationId/read', markAsRead); // Mark notification as read
router.put('/mark-all-read', markAllAsRead); // Mark all notifications as read
router.put('/:notificationId/unread', markAsUnread); // Mark notification as unread
router.delete('/:notificationId', deleteNotification); // Delete notification
router.delete('/delete-read', deleteAllRead); // Delete all read notifications

module.exports = router;
