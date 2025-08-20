const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // For nested comments
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  reported: {
    type: Boolean,
    default: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: ['spam', 'inappropriate', 'harassment', 'violence', 'other']
    },
    description: {
      type: String,
      maxlength: 500
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  hiddenAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtual fields are serialized
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Comment', commentSchema);
