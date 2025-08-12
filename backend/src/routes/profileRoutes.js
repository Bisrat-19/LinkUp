const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/fileUpload');
const {
  getProfile,
  editProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getCurrentProfile
} = require('../controllers/profileController');

// Public routes
router.get('/:userId', getProfile); // Get user profile
router.get('/:userId/followers', getFollowers); // Get user's followers
router.get('/:userId/following', getFollowing); // Get user's following

// Protected routes (require authentication)
router.use(auth);

router.get('/me/current', getCurrentProfile); // Get current user's profile
router.put('/me', uploadSingle('profilePic'), editProfile); // Edit current user's profile
router.post('/:userId/follow', followUser); // Follow user
router.delete('/:userId/follow', unfollowUser); // Unfollow user

module.exports = router;
