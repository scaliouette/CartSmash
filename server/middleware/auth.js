// server/middleware/auth.js - Flexible Authentication Middleware
const admin = require('firebase-admin');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Allow demo mode without auth for development/testing
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development, allow with demo user
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_MODE === 'true') {
        req.user = {
          uid: req.headers['user-id'] || 'demo-user',
          email: 'demo@example.com',
          emailVerified: true,
          displayName: 'Demo User'
        };
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'No valid auth token provided' 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Only verify with Firebase if admin is initialized
      if (admin.apps.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          displayName: decodedToken.name || decodedToken.displayName
        };
      } else {
        // Firebase not initialized, use demo mode
        console.warn('Firebase Admin not initialized, using demo mode');
        req.user = {
          uid: 'demo-user',
          email: 'demo@example.com',
          emailVerified: true,
          displayName: 'Demo User'
        };
      }
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      // In development, allow with demo user
      if (process.env.NODE_ENV !== 'production') {
        req.user = {
          uid: 'demo-user',
          email: 'demo@example.com',
          emailVerified: true,
          displayName: 'Demo User'
        };
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // In development, allow with demo user
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        uid: 'demo-user',
        email: 'demo@example.com',
        emailVerified: true,
        displayName: 'Demo User'
      };
      return next();
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

const validateCartOperation = (req, res, next) => {
  // In demo mode, always allow
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_MODE === 'true') {
    if (!req.user) {
      req.user = {
        uid: 'demo-user',
        email: 'demo@example.com',
        emailVerified: true,
        displayName: 'Demo User'
      };
    }
    return next();
  }
  
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated' 
    });
  }
  
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !req.user.emailVerified) {
    return res.status(403).json({ 
      success: false, 
      error: 'Email verification required' 
    });
  }
  
  next();
};

// Simple auth middleware for backwards compatibility
const authMiddleware = (req, res, next) => {
  // For simple auth, just ensure user exists
  if (!req.user) {
    req.user = {
      id: req.headers['user-id'] || 'demo-user',
      uid: req.headers['user-id'] || 'demo-user',
      email: 'demo@example.com',
      displayName: 'Demo User'
    };
  }
  next();
};

module.exports = { 
  authenticateUser, 
  validateCartOperation,
  authMiddleware
};

// Export default for compatibility
module.exports.default = authMiddleware;