const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  searchUsers,
  searchPosts,
  getTrendingHashtags,
  getSuggestedUsers
} = require('../controllers/searchController');

// Public routes
router.get('/hashtags/trending', getTrendingHashtags); // Get trending hashtags

// Protected routes (require authentication)
router.use(auth);

router.get('/users', searchUsers); // Search users
router.get('/posts', searchPosts); // Search posts
router.get('/users/suggested', getSuggestedUsers); // Get suggested users to follow

module.exports = router;
