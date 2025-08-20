const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middlewares/auth');
const { adminLoginValidation, banUserValidation, validate } = require('../utils/validators/adminValidators');
const {
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
} = require('../controllers/adminController');

// Public admin routes
router.post('/login', adminLoginValidation, validate, adminLogin);

// Protected admin routes
router.use(auth);

// Admin profile
router.get('/profile', requireAdmin, getAdminProfile);

// Dashboard & Analytics
router.get('/dashboard', requireAdmin, getDashboardStats);
router.get('/settings', requireAdmin, getSystemSettings);

// User Management
router.get('/users', requireAdmin, getAllUsers);
router.get('/users/:userId', requireAdmin, getUserDetails);
router.post('/users/:userId/ban', requireAdmin, banUserValidation, validate, banUser);
router.post('/users/:userId/unban', requireAdmin, unbanUser);

// Content Moderation
router.get('/reported-content', requireAdmin, getReportedContent);
router.delete('/content/:type/:contentId', requireAdmin, deleteContent);
router.post('/content/:type/:contentId/hide', requireAdmin, hideContent);

module.exports = router;
