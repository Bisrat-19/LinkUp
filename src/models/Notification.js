const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'message', 'mention'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: false
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: false
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Virtual for notification text
notificationSchema.virtual('notificationText').get(function() {
  switch (this.type) {
    case 'like':
      return `${this.sender.username} liked your post`;
    case 'comment':
      return `${this.sender.username} commented on your post`;
    case 'follow':
      return `${this.sender.username} started following you`;
    case 'message':
      return `${this.sender.username} sent you a message`;
    case 'mention':
      return `${this.sender.username} mentioned you in a comment`;
    default:
      return 'New notification';
  }
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
