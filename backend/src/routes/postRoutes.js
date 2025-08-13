const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { uploadMultiple } = require('../middlewares/fileUpload');
const {
  createPost,
  getPosts,
  getUserPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  searchPosts
} = require('../controllers/postController');

// Public routes
router.get('/', getPosts); // Get all posts (global feed)
router.get('/search', searchPosts); // Search posts
router.get('/:postId', getPost); // Get single post

// Protected routes (require authentication)
router.use(auth);

router.post('/', uploadMultiple('media', 5), createPost); // Create post
router.get('/user/:userId', getUserPosts); // Get posts by specific user
router.put('/:postId', updatePost); // Update post
router.delete('/:postId', deletePost); // Delete post
router.post('/:postId/like', toggleLike); // Like/unlike post

module.exports = router;
