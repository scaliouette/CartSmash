// server/server.js - Updated to work with Firebase Auth
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Option 1: Using service account key file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    // Option 2: Using individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    // Option 3: Default credentials (for Google Cloud environments)
    else {
      console.log('⚠️ No Firebase credentials found in environment variables');
      console.log('Please set up your Firebase Admin SDK credentials');
      // For now, initialize without credentials to prevent crash
      admin.initializeApp();
    }

    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.log('The server will continue running but authentication will not work');
  }
};

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: admin.apps.length > 0 ? 'initialized' : 'not initialized'
  });
});

// Import routes - but check if they exist first
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart routes loaded');
} catch (error) {
  console.log('⚠️ Cart routes not found or error loading:', error.message);
}

try {
  const accountRoutes = require('./routes/account');
  app.use('/api/account', accountRoutes);
  console.log('✅ Account routes loaded');
} catch (error) {
  console.log('⚠️ Account routes not found or error loading:', error.message);
}

// Note: We're NOT loading the old auth.js routes anymore
// Authentication is now handled through Firebase on the client side
// and verified using Firebase Admin SDK in the middleware

// Basic cart endpoints if cart.js doesn't exist yet
if (!require.resolve('./routes/cart')) {
  // Fallback in-memory storage
  const carts = new Map();
  
  // Simple authentication middleware
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
          emailVerified: decodedToken.email_verified
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
  
  // Basic cart endpoint
  app.get('/api/cart', authenticateUser, (req, res) => {
    const userId = req.user.uid;
    const userCart = carts.get(userId) || [];
    
    res.json({
      success: true,
      items: userCart,
      count: userCart.length
    });
  });
  
  app.post('/api/cart/items', authenticateUser, (req, res) => {
    const userId = req.user.uid;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid items data' 
      });
    }
    
    let userCart = carts.get(userId) || [];
    
    const newItems = items.map(item => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      addedAt: new Date().toISOString()
    }));
    
    userCart = [...userCart, ...newItems];
    carts.set(userId, userCart);
    
    res.json({
      success: true,
      items: newItems,
      totalItems: userCart.length
    });
  });
  
  app.post('/api/cart/clear', authenticateUser, (req, res) => {
    const userId = req.user.uid;
    carts.set(userId, []);
    
    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  });
  
  console.log('✅ Basic cart endpoints created');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Firebase auth errors
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: err.message
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
    🚀 Server is running!
    🔊 Listening on port ${PORT}
    📝 Environment: ${process.env.NODE_ENV || 'development'}
    🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}
    🔥 Firebase: ${admin.apps.length > 0 ? 'Connected' : 'Not connected - check credentials'}
    
    Test the server:
    curl http://localhost:${PORT}/health
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});