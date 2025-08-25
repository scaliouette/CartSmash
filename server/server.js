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
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.KROGER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.KROGER_REDIRECT_URI || 'http://localhost:3001/api/auth/kroger/callback');
  authUrl.searchParams.append('scope', 'cart.basic:write profile.compact product.compact');
  authUrl.searchParams.append('state', state);
  
  console.log('🔐 Redirecting to:', authUrl.toString());
  res.redirect(authUrl.toString());
});

app.get('/api/auth/kroger/callback', async (req, res) => {
  const { code, state, error } = req.query;

  console.log('🔐 OAuth Callback received:', {
    hasCode: !!code,
    hasState: !!state,
    error: error
  });
  
  if (error) {
    console.error('❌ Kroger OAuth error:', error);
    return res.send(`
      <html><body>
        <h2 style="color: red; text-align: center; margin-top: 50px;">
          Authentication Error: ${error}
        </h2>
        <script>
          window.opener.postMessage({ 
            type: 'KROGER_AUTH_ERROR', 
            error: '${error}' 
          }, '*');
          setTimeout(() => window.close(), 3000);
        </script>
      </body></html>
    `);
  }
  
  if (code) {
    try {
      // Extract userId from state
      const decoded = Buffer.from(state, 'base64').toString();
      const [userId] = decoded.split('-');
      
      console.log('🔄 Exchanging code for token...');
      console.log('   User ID:', userId);
      
      // Create credentials for token exchange
      const credentials = Buffer.from(
        `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
      ).toString('base64');
      
      // Exchange code for token
      const axios = require('axios');
      const tokenResponse = await axios.post(
        'https://api-ce.kroger.com/v1/connect/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.KROGER_REDIRECT_URI || 'http://localhost:3001/api/auth/kroger/callback'
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('✅ Token exchange successful!');
      console.log('   Expires in:', tokenResponse.data.expires_in, 'seconds');
      
      // Store tokens using persistent TokenStore
      const tokenStore = require('./services/TokenStore');
      tokenStore.setTokens(
        userId,
        {
          accessToken: tokenResponse.data.access_token,
          expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
          scope: tokenResponse.data.scope
        },
        tokenResponse.data.refresh_token
      );
      
      // Also update KrogerOrderService for immediate use
      const KrogerOrderService = require('./services/KrogerOrderService');
      const orderService = new KrogerOrderService();
      orderService.tokens.set(userId, {
        accessToken: tokenResponse.data.access_token,
        expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
        scope: tokenResponse.data.scope
      });

      // Store tokens PERSISTENTLY using TokenStore
      const tokenStore = require('./services/TokenStore');
      tokenStore.setTokens(
        userId,
        {
          accessToken: tokenResponse.data.access_token,
          expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
          scope: tokenResponse.data.scope
        },
        tokenResponse.data.refresh_token
      );

      // Also update in-memory for immediate use
      orderService.tokens.set(userId, {
        accessToken: tokenResponse.data.access_token,
        expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
        scope: tokenResponse.data.scope
      });

      console.log('✅ Tokens stored PERSISTENTLY for user:', userId);
            
      
      
    
      
      // Success page with better styling
      res.send(`
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .success-container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            h2 { color: #10b981; margin-bottom: 15px; }
            p { color: #666; margin: 10px 0; }
            .checkmark {
              width: 60px;
              height: 60px;
              margin: 0 auto 20px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: scaleIn 0.3s ease-in-out;
            }
            .checkmark svg {
              width: 30px;
              height: 30px;
              fill: white;
            }
            @keyframes scaleIn {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="checkmark">
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2>Successfully Connected!</h2>
            <p>Your Kroger account has been linked.</p>
            <p style="font-size: 14px; color: #999;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'KROGER_AUTH_SUCCESS',
                userId: '${userId}'
              }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Token exchange failed:', error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.error_description || error.message;
      res.send(`
        <html><body>
          <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h2 style="color: #ef4444;">❌ Authentication Failed</h2>
            <p style="color: #666;">${errorMessage}</p>
            <p style="color: #999; font-size: 14px;">This window will close automatically...</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'KROGER_AUTH_ERROR', 
              error: '${errorMessage}' 
            }, '*');
            setTimeout(() => window.close(), 4000);
          </script>
        </body></html>
      `);
    }
  } else {
    res.status(400).send('Missing authorization code');
  }
});

app.get('/api/auth/kroger/status', (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
  
  // Check PERSISTENT token store (not just memory)
  const tokenStore = require('./services/TokenStore');
  const tokenInfo = tokenStore.getTokens(userId);
  const isAuthenticated = !!tokenInfo;
  
  console.log(`🔍 Auth check for ${userId}: ${isAuthenticated ? '✅' : '❌'}`);
  if (tokenInfo) {
    console.log(`   Token expires: ${new Date(tokenInfo.expiresAt).toLocaleTimeString()}`);
  }
  
  res.json({
    success: true,
    authenticated: isAuthenticated,
    userId: userId,
    needsAuth: !isAuthenticated,
    tokenExpiry: tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt).toISOString() : null
  });
});

app.get('/api/auth/kroger/status', (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
  
  // Check if user has valid token
  const KrogerOrderService = require('./services/KrogerOrderService');
  const orderService = new KrogerOrderService();
  
    // Check persistent token store
  const tokenStore = require('./services/TokenStore');
  const tokenInfo = tokenStore.get(userId);
  const isAuthenticated = !!tokenInfo;
  
  res.json({
    success: true,
    authenticated: isAuthenticated,
    userId: userId,
    needsAuth: !isAuthenticated,
    tokenExpiry: tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt).toISOString() : null
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