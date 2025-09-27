// server/middleware/adminAuth.js - Admin authentication middleware
const winston = require('winston');

// Create logger (same configuration as server.js)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin-auth' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

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