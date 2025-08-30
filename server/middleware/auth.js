// server/middleware/auth.js - Production Authentication Middleware
const admin = require('firebase-admin');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No valid auth token provided',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify with Firebase Admin SDK
      if (admin.apps.length === 0) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ 
          success: false, 
          error: 'Authentication service unavailable',
          code: 'AUTH_SERVICE_UNAVAILABLE'
        });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name || decodedToken.displayName || null,
        provider: decodedToken.firebase.sign_in_provider,
        metadata: {
          creationTime: decodedToken.auth_time,
          lastSignInTime: decodedToken.iat
        }
      };
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error.code);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      } else if (error.code === 'auth/id-token-revoked') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token has been revoked',
          code: 'AUTH_TOKEN_REVOKED'
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

const validateCartOperation = (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !req.user.emailVerified) {
    return res.status(403).json({ 
      success: false, 
      error: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }
  
  next();
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name || decodedToken.displayName || null
    };
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = { 
  authenticateUser, 
  validateCartOperation,
  optionalAuth
};