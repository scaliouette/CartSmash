// server/server.js - COMPLETE FIXED VERSION
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try { 
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      console.log('⚠️ No Firebase credentials found');
      admin.initializeApp();
    }
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
};

initializeFirebase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: admin.apps.length > 0 ? 'initialized' : 'not initialized'
  });
});

// Cart routes
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart routes loaded');
} catch (error) {
  console.log('⚠️ Cart routes not found:', error.message);
}

// Account routes
try {
  const accountRoutes = require('./routes/account');
  app.use('/api/account', accountRoutes);
  console.log('✅ Account routes loaded');
} catch (error) {
  console.log('⚠️ Account routes not found:', error.message);
}

// AI routes
try {
  const aiRoutes = require('./routes/ai');
  app.use('/api/ai', aiRoutes);
  console.log('✅ AI routes loaded');
} catch (error) {
  console.log('⚠️ AI routes not found:', error.message);
}

// Recipe routes
try {
  const recipesRoutes = require('./routes/recipes');
  app.use('/api/recipes', recipesRoutes);
  console.log('✅ Recipes routes loaded');
} catch (error) {
  console.log('⚠️ Recipes routes not found:', error.message);
}  // <-- THIS CLOSING BRACE WAS MISSING!

// Kroger API routes - NOW OUTSIDE THE CATCH BLOCK
try {
  const krogerRoutes = require('./routes/kroger');
  app.use('/api/kroger', krogerRoutes);
  console.log('✅ Kroger API routes loaded');
} catch (error) {
  console.log('❌ Kroger API routes failed:', error.message);
}

// Kroger Order routes
try {
  const krogerOrderRoutes = require('./routes/kroger-orders');
  app.use('/api/kroger-orders', krogerOrderRoutes);
  console.log('✅ Kroger Order routes loaded');
} catch (error) {
  console.log('❌ Kroger Order routes failed:', error.message);
}

// Kroger OAuth endpoints
app.get('/api/auth/kroger/login', (req, res) => {
  const { userId } = req.query;
  
  console.log('🔐 Kroger OAuth login requested for user:', userId);
  
  if (!process.env.KROGER_CLIENT_ID) {
    return res.status(500).json({ 
      success: false, 
      error: 'Kroger OAuth not configured. Please set KROGER_CLIENT_ID in .env'
    });
  }
  
  const state = Buffer.from(`${userId || 'demo'}-${Date.now()}`).toString('base64');
  
  const authUrl = new URL('https://api-ce.kroger.com/v1/connect/oauth2/authorize');
  // FIX: OAuth URL for Production
  // const authUrl = new URL('https://api.kroger.com/v1/connect/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.KROGER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.KROGER_REDIRECT_URI || 'http://localhost:3001/api/auth/kroger/callback');
  
  // FIXED SCOPES - Only use what's available for Public API
  authUrl.searchParams.append('scope', 'cart.basic:write profile.compact product.compact');
  // REMOVED: order.basic:write (not available for public API)
  
  authUrl.searchParams.append('state', state);
  
  console.log('🔐 Redirecting to:', authUrl.toString());
  res.redirect(authUrl.toString());
});

app.get('/api/auth/kroger/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('❌ Kroger OAuth error:', error);
    return res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'KROGER_AUTH_ERROR', 
              error: '${error}' 
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  }
  
  console.log('✅ Kroger OAuth callback received');
  
  res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage({ 
            type: 'KROGER_AUTH_SUCCESS' 
          }, '*');
          window.close();
        </script>
      </body>
    </html>
  `);
});

app.get('/api/auth/kroger/status', (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
  
  res.json({
    success: true,
    authenticated: false,
    userId: userId,
    needsAuth: true
  });
});

app.get('/api/kroger/stores/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  
  res.json({
    success: true,
    stores: [
      {
        id: '01400943',
        name: 'Kroger - Zinfandel',
        address: '10075 Bruceville Rd, Elk Grove, CA 95757',
        distance: '2.1 miles',
        services: ['Pickup', 'Delivery']
      },
      {
        id: '01400376',
        name: 'Kroger - Elk Grove',
        address: '8465 Elk Grove Blvd, Elk Grove, CA 95758',
        distance: '3.5 miles',
        services: ['Pickup', 'Delivery']
      }
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`
    ========================================
    🚀 CARTSMASH Server Running
    ========================================
    Port: ${PORT}
    Kroger: ${process.env.KROGER_CLIENT_ID ? '✅' : '❌ Not configured'}
    
    Test: http://localhost:${PORT}/health
    ========================================
  `);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

module.exports = app;