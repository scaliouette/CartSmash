// server/middleware/adminAuth.js - Admin authentication middleware
const logger = require('../utils/logger');

// Admin email list
const ADMIN_EMAILS = [
  'scaliouette@gmail.com',
  'admin@cartsmash.com'
];

// Check if user is admin
const checkAdmin = async (req, res, next) => {
  try {
    // User should already be authenticated via authenticateUser middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user email is in admin list
    const userEmail = req.user.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      logger.warn(`Unauthorized admin access attempt by: ${userEmail}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // User is admin
    req.isAdmin = true;
    next();
  } catch (error) {
    logger.error('Admin auth check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Admin authorization failed'
    });
  }
};

module.exports = {
  checkAdmin,
  ADMIN_EMAILS
};