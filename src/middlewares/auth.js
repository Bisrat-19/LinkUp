const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Access denied. No role found.' });
    }
    
    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    
    next();
  };
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  return requireRole('admin')(req, res, next);
};

// Check if user is admin or user (for general access)
const requireUser = (req, res, next) => {
  return requireRole(['user', 'admin'])(req, res, next);
};

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireUser
};