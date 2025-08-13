const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const {
  createComment,
  getPostComments,
  getComment,
  updateComment,
  deleteComment,
  toggleCommentLike
} = require('../controllers/commentController');

// Public routes
router.get('/post/:postId', getPostComments); // Get comments for a post
router.get('/:commentId', getComment); // Get single comment

// Protected routes (require authentication)
router.use(auth);

router.post('/post/:postId', createComment); // Create comment
router.put('/:commentId', updateComment); // Update comment
router.delete('/:commentId', deleteComment); // Delete comment
router.post('/:commentId/like', toggleCommentLike); // Like/unlike comment

module.exports = router;
