// server/middleware/auth.js - Server-side Authentication Middleware ONLY
const admin = require('firebase-admin');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No valid auth token provided' 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name || decodedToken.displayName
      };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

const validateCartOperation = (req, res, next) => {
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

module.exports = { 
  authenticateUser, 
  validateCartOperation 
};