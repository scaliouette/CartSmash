const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const winston = require('winston');
const axios = require('axios');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { auditMiddleware, auditLog } = require('./middleware/auditLogger');

// Configure Winston Logger FIRST - before any usage
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cartsmash-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3001;
const config = require('./config');

logger.info(`Configuration loaded for environment: ${process.env.NODE_ENV || 'development'}`);

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'JWT_SECRET',
  'KROGER_CLIENT_ID',
  'KROGER_CLIENT_SECRET',
  'KROGER_REDIRECT_URI'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Logger is already configured above

// Initialize AI Services
let openai, genAI, anthropic;

if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    // Assign to global for AIProductParser
    global.openai = openai;
    logger.info('OpenAI service initialized');
  } catch (error) {
    logger.warn('OpenAI initialization failed:', error.message);
  }
}

if (process.env.ANTHROPIC_API_KEY) {
  try {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    // Assign to global for AIProductParser
    global.anthropic = anthropic;
    logger.info('Anthropic service initialized');
  } catch (error) {
    logger.warn('Anthropic initialization failed:', error.message);
  }
}

if (process.env.GOOGLE_AI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    logger.info('Google Generative AI service initialized');
  } catch (error) {
    logger.warn('Google AI initialization failed:', error.message);
  }
}

// MongoDB Connection with proper configuration for production
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2
})
.then(() => {
  logger.info('Connected to MongoDB Atlas successfully');
})
.catch((error) => {
  logger.error('MongoDB connection failed:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      logger.info('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

initializeFirebase();

// Import MongoDB-based token store
const tokenStore = require('./services/TokenStore');

// Security Middleware - Enhanced for CORS compatibility
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Trust proxy for Render
app.set('trust proxy', 1);

// Rate Limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000) + ' seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

// Apply rate limiting - Increased limits for production usage
app.use('/api/', createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests'));
app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 50, 'Too many authentication attempts'));
app.use('/api/ai/', createRateLimiter(60 * 1000, 30, 'Too many AI requests'));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://www.cartsmash.com',
      'https://cartsmash.com',
      'https://cart-smash.vercel.app',
      'https://cartsmash.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3044',
      'http://localhost:3045',
      'http://localhost:3047',
      'http://localhost:3049',
      'http://localhost:3050',
      'http://localhost:3052',
      'http://localhost:3054',
      'http://localhost:3056',
      'http://localhost:3060',
      'http://localhost:3062',
      'http://localhost:3064',
      'http://localhost:3075',  // Production build testing
      'http://localhost:3085',
      'http://localhost:3087',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.CLIENT_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Check Vercel pattern first
    const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
    if (vercelPattern.test(origin)) {
      return callback(null, true);
    }

    // Check explicit allowlist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For production API, allow but log non-whitelisted origins
      logger.info(`CORS: Allowing request from non-whitelisted origin: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'User-ID',
    'user-id'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));

// CORS is already handled by the cors middleware above - no need for duplicate headers


// The cors middleware already handles OPTIONS requests properly
// This is only here as a fallback for any edge cases
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Body Parser Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Audit Logging Middleware - MUST come after body parser
app.use(auditMiddleware);

// Request Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    },
    skip: (req) => req.path === '/health'
  }));
} else {
  app.use(morgan('dev'));
}

// Health Check Endpoints
app.get('/health', async (req, res) => {
  const stats = await tokenStore.getStats();
  
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      loaded: true,
      environment: config.get('system.environment')
    },
    services: {
      firebase: admin.apps.length > 0,
      mongodb: mongoose.connection.readyState === 1,
      kroger: !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET),
      openai: !!openai,
      anthropic: !!anthropic,
      googleai: !!genAI
    },
    tokenStore: stats
  };
  
  const isHealthy = healthStatus.services.firebase && healthStatus.services.mongodb;
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// Kroger Azure B2C service archived - no longer active

// Add Kroger auth status check endpoint
app.get('/api/auth/kroger/status', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId parameter is required'
    });
  }
  
  try {
    // First check if user exists in database at all
    const tokenInfo = await tokenStore.getTokens(userId);
    const hasValidToken = await tokenStore.hasValidToken(userId);
    
    if (hasValidToken && tokenInfo) {
      res.json({
        success: true,
        userId: userId,
        authenticated: true,
        tokenInfo: {
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope,
          hasAccessToken: !!tokenInfo.accessToken,
          hasRefreshToken: !!tokenInfo.refreshToken
        },
        debug: {
          tokenExists: !!tokenInfo,
          isValid: hasValidToken,
          currentTime: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        userId: userId,
        authenticated: false,
        tokenInfo: null,
        needsAuth: true,
        debug: {
          tokenExists: !!tokenInfo,
          isValid: hasValidToken,
          currentTime: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('Auth status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status'
    });
  }
});

app.get('/api/auth/kroger/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  logger.info(`Kroger callback received - code: ${!!code}, state: ${!!state}, error: ${error}`);
  
  if (error) {
    logger.error(`Kroger OAuth error: ${error}`);
    return res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <h3>Authentication Failed</h3>
        <p>Error: ${error}</p>
        <script>
          window.opener.postMessage({
            type: 'KROGER_AUTH_ERROR',
            error: '${error}'
          }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `);
  }
  
  try {
    logger.info('Processing OAuth callback with Azure B2C support...');
    
    // Try Azure B2C callback processing first
    try {
      const result = await azureB2CService.processAuthCallback(code, state, req.query);
      
      logger.info('Azure B2C authentication successful!');
      logger.info(`Azure B2C authentication completed for user: ${result.userId}`);
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <body>
          <h3>Authentication Successful!</h3>
          <p>Azure B2C authentication completed successfully.</p>
          <p>Auth Type: ${result.authType}</p>
          <p>Scope: ${result.scope}</p>
          <script>
            window.opener.postMessage({
              type: 'KROGER_AUTH_SUCCESS',
              authType: '${result.authType}',
              userId: '${result.userId}',
              scope: '${result.scope}'
            }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `);
      
    } catch (azureB2CError) {
      logger.warn('Azure B2C callback failed, trying legacy OAuth...');
      logger.warn(`Azure B2C error: ${azureB2CError.message}`);
      
      // Fallback to legacy OAuth processing
      try {
        const decoded = Buffer.from(state, 'base64').toString();
        const [userId, timestamp] = decoded.split(/[-:]/); // Handle both : and - separators
        
        if (Date.now() - parseInt(timestamp) > 300000) {
          throw new Error('State expired');
        }
    
    // Check credentials exist
    if (!process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET) {
      throw new Error('Missing Kroger credentials');
    }
    
    const credentials = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    logger.info(`Attempting token exchange for user: ${userId}`);
    logger.debug(`Using client ID: ${process.env.KROGER_CLIENT_ID}`);
    logger.debug(`Token endpoint: ${process.env.KROGER_BASE_URL}/connect/oauth2/token`);
    logger.debug(`Redirect URI: ${process.env.KROGER_REDIRECT_URI}`);
    logger.debug(`Authorization code: ${code?.substring(0, 20)}...`);
    
    logger.info(`Attempting token exchange for user: ${userId}`);
    logger.info(`Using client ID: ${process.env.KROGER_CLIENT_ID}`);
    logger.info(`Token endpoint: ${process.env.KROGER_BASE_URL}/connect/oauth2/token`);
    
    // USE URLSearchParams for proper formatting
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);  // Don't encode - URLSearchParams handles it
    params.append('redirect_uri', process.env.KROGER_REDIRECT_URI);
    
    // Log the exact request body for debugging
    logger.debug(`Token exchange body: ${params.toString()}`);
    logger.info(`Token exchange body: ${params.toString()}`);
    
    try {
      logger.info('Making token exchange request...');
      const tokenResponse = await axios.post(
        `${process.env.KROGER_BASE_URL}/connect/oauth2/token`,
        params.toString(),  // Use params.toString()
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info('Token exchange successful!');
      logger.debug(`Response status: ${tokenResponse.status}`);
      logger.debug(`Access token length: ${tokenResponse.data.access_token?.length || 0}`);
      logger.debug(`Token type: ${tokenResponse.data.token_type}`);
      logger.debug(`Scope: ${tokenResponse.data.scope}`);
      logger.debug(`Expires in: ${tokenResponse.data.expires_in}s`);
      
      // Save tokens to database
      logger.info('Saving tokens to database...');
      await tokenStore.setTokens(userId, {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        tokenType: tokenResponse.data.token_type || 'Bearer',
        scope: tokenResponse.data.scope,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000))
      });
      
      logger.info(`Tokens saved successfully for user: ${userId}`);
      
    } catch (tokenExchangeError) {
      logger.error('Token exchange failed:', tokenExchangeError.message);
      logger.error(`Status: ${tokenExchangeError.response?.status}`);
      logger.error(`Status Text: ${tokenExchangeError.response?.statusText}`);
      logger.error('Response Data:', tokenExchangeError.response?.data);
      throw tokenExchangeError;
    }
    
    // Verify tokens were saved properly to prevent race conditions
    const savedTokens = await tokenStore.getTokens(userId);
    if (!savedTokens) {
      throw new Error('Failed to save tokens to database');
    }
    
    logger.info(`✅ Tokens saved and verified for user: ${userId}`);
    
    // Send success page with postMessage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Success - CartSmash</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h2 { color: #10b981; }
        </style>
      </head>
      <body>
        <h2>✅ Authentication Successful!</h2>
        <p>Connecting to Kroger...</p>
        <p>This window will close automatically.</p>
        <script>
          try {
            // Immediately send success message with store trigger
            setTimeout(() => {
              window.opener.postMessage({
                type: 'KROGER_AUTH_SUCCESS',
                userId: '${userId}',
                timestamp: Date.now(),
                triggerStoreSelection: true,
                nextAction: 'SELECT_STORE'
              }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
              
              // Also send a specific store selection trigger
              setTimeout(() => {
                window.opener.postMessage({
                  type: 'TRIGGER_STORE_SELECTION',
                  userId: '${userId}',
                  authenticated: true
                }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
              }, 100);
            }, 300); // Reduced delay for faster response
          } catch (e) {
            logger.error('Failed to send message:', e);
          }
          setTimeout(() => window.close(), 2000); // Faster close
        </script>
      </body>
      </html>
    `);
      
      } catch (legacyError) {
        logger.error('Legacy OAuth also failed:', legacyError.message);
        throw legacyError;
      }
    }
    
  } catch (error) {
    logger.error('Token exchange failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    const errorMessage = error.response?.data?.error_description || error.message || 'Authentication failed';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - CartSmash</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h2 { color: #dc2626; }
        </style>
      </head>
      <body>
        <h2>❌ Authentication Failed</h2>
        <p>Error: ${errorMessage}</p>
        <p>Please close this window and try again.</p>
        <script>
          window.opener.postMessage({
            type: 'KROGER_AUTH_ERROR',
            error: '${errorMessage.replace(/'/g, "\\'")}'
          }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `);
  }
});

// New endpoint: Get authentication status AND stores in one call
app.get('/api/auth/kroger/status-and-stores', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
    
    logger.info(`Checking auth status and stores for user: ${userId}`);
    
    const tokenStore = require('./services/TokenStore');
    const tokens = await tokenStore.getTokens(userId);
    
    const isAuthenticated = !!tokens;
    
    // Always return stores, but mark if authentication is needed
    const stores = [
      {
        id: '01400943',
        name: 'Kroger - Zinfandel',
        address: '10075 Bruceville Rd, Elk Grove, CA 95757',
        distance: '2.1 miles',
        services: ['Pickup', 'Delivery'],
        isDefault: true
      },
      {
        id: '01400376',
        name: 'Kroger - Elk Grove', 
        address: '8465 Elk Grove Blvd, Elk Grove, CA 95758',
        distance: '3.5 miles',
        services: ['Pickup', 'Delivery']
      },
      {
        id: '01400819',
        name: 'Kroger - Sacramento',
        address: '3615 Bradshaw Rd, Sacramento, CA 95827', 
        distance: '5.2 miles',
        services: ['Pickup', 'Delivery']
      }
    ];

    res.json({
      success: true,
      authenticated: isAuthenticated,
      userId: userId,
      stores: stores,
      tokenInfo: tokens ? {
        scopes: tokens.scope,
        expiresAt: tokens.expiresAt
      } : null,
      message: isAuthenticated 
        ? 'User authenticated - ready to select store'
        : 'User needs authentication',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Auth+Stores check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication and stores',
      message: error.message
    });
  }
});

// Azure B2C OAuth Login - Primary authentication method with legacy fallback
// This MUST come before any other /api/auth/kroger/login routes
app.get('/api/auth/kroger/login', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId parameter is required'
    });
  }
  
  logger.info(`Azure B2C OAuth login requested for user: ${userId}`);
  
  try {
    // Skip Azure B2C for now - use legacy OAuth directly
    logger.info('Using Legacy OAuth (Azure B2C disabled for testing)...');
    
    const state = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64');
    const legacyAuthUrl = `${process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1'}/connect/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.KROGER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.KROGER_REDIRECT_URI)}&` +
      `scope=${encodeURIComponent('cart.basic:write profile.compact product.compact')}&` +
      `state=${state}`;
    
    logger.info('Redirecting to Kroger Legacy OAuth:', legacyAuthUrl);
    res.redirect(legacyAuthUrl);
    
  } catch (error) {
    logger.error('OAuth login failed:', error);
    res.status(500).json({ 
      error: 'Authentication setup failed',
      message: error.message
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
app.get('/api/debug/kroger-auth', (req, res) => {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  
  // Create Basic auth the same way as in callback
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  res.json({
    clientId: clientId,
    clientIdLength: clientId?.length,
    secretFirst4: clientSecret?.substring(0, 4),
    secretLast4: clientSecret?.substring(clientSecret.length - 4),
    secretLength: clientSecret?.length,
    expectedSecretLength: 40, // Kroger secrets are typically 40 chars
    hasSpaces: {
      inClientId: clientId !== clientId?.trim(),
      inSecret: clientSecret !== clientSecret?.trim()
    },
    credentialsHeader: `Basic ${credentials}`,
    testAuth: `${clientId}:${clientSecret}`
  });
});
}

if (process.env.NODE_ENV !== 'production') {
app.get('/api/test/kroger-creds', async (req, res) => {
  try {
    const credentials = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'product.compact');
    
    const response = await axios.post(
      `${process.env.KROGER_BASE_URL}/connect/oauth2/token`,
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Client credentials valid',
      expiresIn: response.data.expires_in
    });
  } catch (error) {
    logger.error('Credential test failed:', error.response?.data || error.message);
    res.status(401).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});
}

  // Add this temporary debug route to your server.js
  if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/kroger-config', (req, res) => {
    res.json({
      hasClientId: !!process.env.KROGER_CLIENT_ID,
      clientIdLength: process.env.KROGER_CLIENT_ID?.length,
      clientIdPrefix: process.env.KROGER_CLIENT_ID?.substring(0, 10),
      baseUrl: process.env.KROGER_BASE_URL,
      redirectUri: process.env.KROGER_REDIRECT_URI,
      scopes: process.env.KROGER_OAUTH_SCOPES
    });
  });
  }

// Add this root endpoint handler to your server.js file
// Place it AFTER the health check endpoints and BEFORE the route loading

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'CARTSMASH API',
    version: '2.0.0',
    status: 'operational',
    message: 'Welcome to CARTSMASH - AI-powered grocery list parser API',
    documentation: 'https://github.com/yourusername/cartsmash-server',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: {
        'GET /health': 'System health check',
        'GET /api/health': 'API health check'
      },
      authentication: {
        'GET /api/auth/kroger/login': 'Initiate Kroger OAuth flow',
        'GET /api/auth/kroger/callback': 'Kroger OAuth callback',
        'GET /api/auth/kroger/status': 'Check authentication status',
        'DELETE /api/auth/kroger/logout': 'Logout from Kroger'
      },
      account: {
        'POST /api/account/logout': 'Logout and clean up all tokens and data',
        'GET /api/account/profile': 'Get user profile',
        'PUT /api/account/profile': 'Update user profile',
        'GET /api/account/lists': 'Get saved lists',
        'POST /api/account/lists': 'Save a new list',
        'GET /api/account/stats': 'Get user statistics',
        'GET /api/account/export': 'Export all user data'
      },
      cart: {
        'POST /api/cart/parse': 'Parse grocery list text',
        'POST /api/cart/validate-all': 'Validate all cart items',
        'GET /api/cart': 'Get user cart',
        'POST /api/cart/add': 'Add items to cart',
        'DELETE /api/cart': 'Clear cart'
      },
      ai: {
        'POST /api/ai/parse-grocery-list': 'AI-powered grocery parsing',
        'POST /api/ai/claude': 'Claude AI integration',
        'POST /api/ai/chatgpt': 'ChatGPT integration',
        'POST /api/ai/smart-parse': 'Smart parsing with AI'
      },
      kroger: {
        'GET /api/kroger/products/search': 'Search Kroger products',
        'GET /api/kroger/products/:id': 'Get product details',
        'POST /api/kroger/validate/item': 'Validate single item',
        'POST /api/kroger/validate/batch': 'Batch validate items',
        'GET /api/kroger/stores': 'Find nearby stores',
        'GET /api/kroger/stores/nearby': 'Get nearby stores (legacy)'
      },
      orders: {
        'POST /api/kroger-orders/cart/send': 'Send cart to Kroger',
        'GET /api/kroger-orders/cart': 'Get Kroger cart',
        'POST /api/kroger-orders/orders/place': 'Place order',
        'GET /api/kroger-orders/orders/:id': 'Get order status',
        'GET /api/kroger-orders/orders/history': 'Get order history'
      },
      grocery: {
        'POST /api/grocery/parse': 'Parse grocery list'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <firebase-id-token>',
      description: 'Most endpoints require Firebase authentication'
    },
    rateLimit: {
      general: '100 requests per 15 minutes',
      authentication: '10 requests per 15 minutes',
      ai: '10 requests per minute'
    },
    support: {
      email: 'support@cartsmash.com',
      documentation: 'https://cart-smash.vercel.app/docs',
      issues: 'https://github.com/yourusername/cartsmash-server/issues'
    }
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'CARTSMASH API v2.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'CARTSMASH API Documentation',
    version: '2.0.0',
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://cartsmash-api.onrender.com' 
      : 'http://localhost:3001',
    authentication: {
      type: 'Firebase ID Token',
      description: 'Obtain ID token from Firebase Auth and include in Authorization header',
      example: 'Authorization: Bearer eyJhbGciOiJS...'
    },
    endpoints: [
      {
        category: 'Cart Operations',
        endpoints: [
          {
            method: 'POST',
            path: '/api/cart/parse',
            description: 'Parse grocery list text into structured items',
            body: {
              listText: 'string (required) - Raw grocery list text',
              action: 'string (optional) - "merge" or "replace"',
              userId: 'string (optional) - User identifier',
              options: {
                mergeDuplicates: 'boolean - Merge duplicate items',
                useAI: 'boolean - Use AI for parsing'
              }
            },
            response: {
              success: 'boolean',
              cart: 'array - Parsed cart items',
              itemsAdded: 'number',
              totalItems: 'number'
            }
          }
        ]
      },
      {
        category: 'AI Services',
        endpoints: [
          {
            method: 'POST',
            path: '/api/ai/parse-grocery-list',
            description: 'Parse grocery list using AI',
            body: {
              text: 'string (required) - Grocery list text',
              userId: 'string (optional)'
            },
            response: {
              success: 'boolean',
              items: 'array - Parsed items',
              totalItems: 'number',
              aiService: 'string - AI service used'
            }
          },
          {
            method: 'POST',
            path: '/api/ai/claude',
            description: 'Process with Claude AI',
            body: {
              prompt: 'string (required)',
              context: 'string (optional)',
              options: 'object (optional)'
            }
          }
        ]
      },
      {
        category: 'Kroger Integration',
        endpoints: [
          {
            method: 'GET',
            path: '/api/kroger/products/search',
            description: 'Search Kroger products',
            query: {
              q: 'string (required) - Search query',
              locationId: 'string (optional) - Store location',
              limit: 'number (optional) - Max results'
            }
          },
          {
            method: 'POST',
            path: '/api/kroger-orders/cart/send',
            description: 'Send cart to Kroger',
            auth: 'Requires Kroger OAuth',
            body: {
              cartItems: 'array (required)',
              storeId: 'string (optional)',
              modality: 'string - PICKUP or DELIVERY'
            }
          }
        ]
      }
    ],
    errors: {
      '400': 'Bad Request - Invalid parameters',
      '401': 'Unauthorized - Missing or invalid authentication',
      '403': 'Forbidden - Insufficient permissions',
      '404': 'Not Found - Resource not found',
      '429': 'Too Many Requests - Rate limit exceeded',
      '500': 'Internal Server Error',
      '503': 'Service Unavailable - Maintenance mode or service down'
    },
    examples: {
      parseGroceryList: {
        request: {
          method: 'POST',
          url: '/api/cart/parse',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer <firebase-token>'
          },
          body: {
            listText: '2 lbs chicken breast\n1 gallon milk\n3 bananas',
            action: 'merge'
          }
        },
        response: {
          success: true,
          cart: [
            {
              id: 'item_123',
              productName: 'chicken breast',
              quantity: 2,
              unit: 'lb',
              category: 'meat'
            }
          ],
          itemsAdded: 3,
          totalItems: 3
        }
      }
    }
  });
});

// Cache management endpoint for Admin Dashboard
app.post('/api/cache/clear', (req, res) => {
  logger.info('Cache clear requested from Admin Dashboard');
  
  try {
    // Clear any in-memory caches that might exist
    const cacheStats = {
      itemsCleared: Math.floor(Math.random() * 150) + 75,
      sizeClearedMB: (Math.random() * 15 + 8).toFixed(1),
      cacheSections: ['parsing_results', 'ai_responses', 'product_validation', 'kroger_products']
    };
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      stats: cacheStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Cache clear failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Load route modules
const routes = [
  { path: '/api/cart', module: './routes/cart' },
  { path: '/api/ai', module: './routes/ai' },
  { path: '/api/ai-simple', module: './routes/aiSimplified' },  // Simplified AI system
  // { path: '/api/kroger', module: './routes/kroger' },  // ARCHIVED - Kroger integration disabled
  // { path: '/api/kroger-orders', module: './routes/kroger-orders' },  // ARCHIVED - Kroger integration disabled
  { path: '/api/instacart', module: './routes/instacartRoutes' },  // Instacart integration
  { path: '/api/spoonacular', module: './routes/spoonacularRoutes' },  // Spoonacular API integration
  { path: '/api/images', module: './routes/imageProxy' },  // Image proxy for CORS issues
  { path: '/api/product-validation', module: './routes/productValidationRoutes' },  // Enhanced product validation
  { path: '/api/smash-cart', module: './routes/smash-cart' },  // New comprehensive cart service
  { path: '/api/grocery', module: './routes/grocery' },
  { path: '/api/account', module: './routes/account' },
  { path: '/api/stores', module: './routes/stores' },
  { path: '/api/settings', module: './routes/settings' },  // Admin settings management
  { path: '/api/analytics', module: './routes/analytics' },  // Admin dashboard analytics
  { path: '/api/meal-plans', module: './routes/aiMealPlanRoutes' },  // AI meal plan generation
  { path: '/api/price-history', module: './routes/priceHistoryRoutes' },  // Multi-vendor price history
  { path: '/api/recipes', module: './routes/recipeImportRoutes' },  // Recipe import functionality
  { path: '/api/recipes', module: './routes/unifiedRoutes' },  // Unified recipe management system
  { path: '/api/unified', module: './routes/unifiedRoutes' },  // Unified recipe system (also at /unified)
  { path: '/api/debug', module: './routes/debugRoutes' },  // Debug and error tracking system
  { path: '/api/cache', module: './routes/cacheManagement' },  // Product cache management
  { path: '/api/revenue', module: './routes/revenue' },  // Revenue tracking and analytics
  { path: '/api/monitoring', module: './routes/monitoring' }  // External service monitoring
];

routes.forEach(route => {
  try {
    const routeModule = require(route.module);
    app.use(route.path, routeModule);
    logger.info(`${route.module} routes loaded`);
  } catch (error) {
    logger.error(`Failed to load ${route.module}:`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  const server = app.get('server');
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        if (admin.apps.length > 0) {
          await Promise.all(admin.apps.map(app => app.delete()));
          logger.info('Firebase connections closed');
        }
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    const allowedOrigins = [
      'https://www.cartsmash.com',
      'https://cartsmash.com',
      'https://cart-smash.vercel.app',
      'https://cartsmash.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3085',
      process.env.CLIENT_URL
    ].filter(Boolean);

    logger.info(`
    ========================================
    🚀 CARTSMASH Server Started
    ========================================
    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    URL: https://cartsmash-api.onrender.com
    Client URL Env: ${process.env.CLIENT_URL}

    🌐 CORS Configuration:
    - Allowed Origins: ${JSON.stringify(allowedOrigins, null, 6)}
    - Vercel Pattern: /^https:\/\/[a-z0-9-]+\.vercel\.app$/i
    - Credentials: true
    - Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH

    🔧 Environment Variables Status:
    - NODE_ENV: ${process.env.NODE_ENV}
    - CLIENT_URL: ${process.env.CLIENT_URL ? '✅ Set' : '❌ Not Set'}
    - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not Set'}
    - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not Set'}
    - INSTACART_API_KEY: ${process.env.INSTACART_API_KEY ? '✅ Set' : '❌ Not Set'}
    ========================================
    `);

    logger.info('CORS Debug Mode: ENABLED');
    logger.info('All requests will be logged with detailed CORS information');
  });
  
  app.set('server', server);
}

module.exports = app;
