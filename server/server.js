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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      handleExceptions: true,
      handleRejections: true
    })
  ]
});

// Initialize AI Services
let openai, genAI;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    logger.info('OpenAI service initialized');
  }
} catch (error) {
  logger.warn('OpenAI initialization failed:', error.message);
}

try {
  if (process.env.GOOGLE_AI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    logger.info('Google Generative AI service initialized');
  }
} catch (error) {
  logger.warn('Google AI initialization failed:', error.message);
}

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    logger.info('Connected to MongoDB successfully');
  })
  .catch((error) => {
    logger.error('MongoDB connection failed:', error);
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      const firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseURL: process.env.FIREBASE_DATABASE_URL
      };

      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        firebaseConfig.credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
      }

      admin.initializeApp(firebaseConfig);
      logger.info('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
  }
};

initializeFirebase();

// Token Store with persistent storage capability
class TokenStore {
  constructor() {
    this.tokens = new Map();
    this.refreshTokens = new Map();
    this.loadTokens();
  }

  loadTokens() {
    try {
      if (mongoose.connection.readyState === 1) {
        // Load from database if MongoDB is connected
        logger.info('Token store ready with database persistence');
      } else {
        // Use in-memory storage
        logger.info('Token store using in-memory storage');
      }
    } catch (error) {
      logger.warn('Token store initialization:', error.message);
    }
  }

  setTokens(userId, tokenData, refreshToken = null) {
    this.tokens.set(userId, {
      ...tokenData,
      createdAt: Date.now(),
      lastUsed: Date.now()
    });
    
    if (refreshToken) {
      this.refreshTokens.set(userId, refreshToken);
    }
    
    logger.info(`Tokens stored for user: ${userId}`);
  }

  getTokens(userId) {
    const tokens = this.tokens.get(userId);
    if (tokens) {
      // Update last used timestamp
      tokens.lastUsed = Date.now();
      this.tokens.set(userId, tokens);
    }
    return tokens;
  }

  getRefreshToken(userId) {
    return this.refreshTokens.get(userId);
  }

  removeTokens(userId) {
    this.tokens.delete(userId);
    this.refreshTokens.delete(userId);
    logger.info(`Tokens removed for user: ${userId}`);
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [userId, tokenData] of this.tokens.entries()) {
      if (tokenData.expiresAt && tokenData.expiresAt < now) {
        this.removeTokens(userId);
      }
    }
  }

  getStats() {
    return {
      totalUsers: this.tokens.size,
      activeTokens: Array.from(this.tokens.values()).filter(t => t.expiresAt > Date.now()).length,
      expiredTokens: Array.from(this.tokens.values()).filter(t => t.expiresAt <= Date.now()).length
    };
  }
}

const tokenStore = new TokenStore();

// Cleanup expired tokens every hour
setInterval(() => {
  tokenStore.cleanupExpiredTokens();
}, 3600000);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

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
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later');
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later');
const aiLimiter = createRateLimiter(60 * 1000, 10, 'Too many AI requests, please try again in a minute');

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiLimiter);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://cart-smash-git-main-shawn-caliouettes-projects.vercel.app',
      'https://cart-smash-pstuhsccd-shawn-caliouettes-projects.vercel.app',
      'https://cartsmash.vercel.app',
      'https://cartsmash.com',
      process.env.CORS_ORIGIN,
      process.env.CLIENT_URL
    ].filter(Boolean);

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
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
    'User-ID',
    'X-API-Key',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Body Parser Middleware
app.use(bodyParser.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(bodyParser.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 50000
}));

// Additional Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging with Morgan and Winston
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks in production
    return process.env.NODE_ENV === 'production' && req.path === '/health';
  }
}));

// Request ID middleware
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    services: {
      firebase: admin.apps.length > 0,
      mongodb: mongoose.connection.readyState === 1,
      kroger: !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET),
      openai: !!openai,
      googleai: !!genAI
    },
    tokenStore: tokenStore.getStats(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
  
  const overallHealthy = Object.values(healthStatus.services).some(service => service === true);
  
  res.status(overallHealthy ? 200 : 503).json(healthStatus);
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API operational',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/health',
      '/api/auth/kroger/*',
      '/api/cart/*',
      '/api/ai/*',
      '/api/kroger/*',
      '/api/recipes/*'
    ]
  });
});

// Kroger OAuth Endpoints
app.get('/api/auth/kroger/login', (req, res) => {
  const { userId } = req.query;
  
  logger.info(`Kroger OAuth login requested for user: ${userId}`);
  
  if (!process.env.KROGER_CLIENT_ID) {
    return res.status(500).json({ 
      success: false, 
      error: 'Kroger OAuth not configured. Please set KROGER_CLIENT_ID in environment variables'
    });
  }
  
  const state = Buffer.from(`${userId || 'demo'}-${Date.now()}-${Math.random()}`).toString('base64');
  const baseURL = process.env.KROGER_BASE_URL || 'https://api-ce.kroger.com/v1';
  
  const authUrl = new URL(`${baseURL}/connect/oauth2/authorize`);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.KROGER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.KROGER_REDIRECT_URI);
  authUrl.searchParams.append('scope', process.env.KROGER_OAUTH_SCOPES || 'cart.basic:write profile.compact product.compact');
  authUrl.searchParams.append('state', state);
  
  logger.info(`Redirecting to Kroger OAuth: ${authUrl.toString()}`);
  res.redirect(authUrl.toString());
});

app.get('/api/auth/kroger/callback', async (req, res) => {
  const { code, state, error } = req.query;

  logger.info(`OAuth Callback - Code: ${!!code}, State: ${!!state}, Error: ${error}`);
  
  if (error) {
    logger.error(`Kroger OAuth error: ${error}`);
    return res.send(generateOAuthErrorPage(error));
  }
  
  if (!code) {
    return res.status(400).send(generateOAuthErrorPage('Missing authorization code'));
  }

  try {
    const decoded = Buffer.from(state, 'base64').toString();
    const [userId] = decoded.split('-');
    
    logger.info(`Exchanging code for token for user: ${userId}`);
    
    const credentials = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const baseURL = process.env.KROGER_BASE_URL || 'https://api-ce.kroger.com/v1';
    
    const tokenResponse = await axios.post(
      `${baseURL}/connect/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.KROGER_REDIRECT_URI
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    tokenStore.setTokens(
      userId,
      {
        accessToken: tokenResponse.data.access_token,
        tokenType: tokenResponse.data.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
        scope: tokenResponse.data.scope
      },
      tokenResponse.data.refresh_token
    );
    
    logger.info(`Token exchange successful for user: ${userId}`);
    
    res.send(generateOAuthSuccessPage(userId));
    
  } catch (error) {
    logger.error('Token exchange failed:', error.response?.data || error.message);
    res.send(generateOAuthErrorPage(error.response?.data?.error_description || error.message));
  }
});

app.get('/api/auth/kroger/status', async (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
  
  try {
    const tokenInfo = tokenStore.getTokens(userId);
    const isAuthenticated = !!tokenInfo && tokenInfo.expiresAt > Date.now();
    
    logger.info(`Auth status check for ${userId}: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
    
    res.json({
      success: true,
      authenticated: isAuthenticated,
      userId: userId,
      needsAuth: !isAuthenticated,
      tokenExpiry: tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt).toISOString() : null,
      scope: tokenInfo?.scope,
      lastUsed: tokenInfo?.lastUsed ? new Date(tokenInfo.lastUsed).toISOString() : null
    });
  } catch (error) {
    logger.error(`Auth status check failed for ${userId}:`, error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: error.message
    });
  }
});

app.delete('/api/auth/kroger/logout', (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId || 'demo-user';
  
  tokenStore.removeTokens(userId);
  logger.info(`User ${userId} logged out from Kroger`);
  
  res.json({
    success: true,
    message: 'Successfully logged out from Kroger'
  });
});

// Mock Kroger stores endpoint
app.get('/api/kroger/stores/nearby', async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  
  try {
    // Mock store data - in production, this would call actual Kroger API
    const stores = [
      {
        id: '01400943',
        name: 'Kroger - Zinfandel',
        address: '10075 Bruceville Rd, Elk Grove, CA 95757',
        distance: '2.1 miles',
        services: ['Pickup', 'Delivery'],
        hours: {
          open: '06:00',
          close: '24:00'
        },
        phone: '(916) 686-9101'
      },
      {
        id: '01400376',
        name: 'Kroger - Elk Grove',
        address: '8465 Elk Grove Blvd, Elk Grove, CA 95758',
        distance: '3.5 miles',
        services: ['Pickup', 'Delivery'],
        hours: {
          open: '06:00',
          close: '23:00'
        },
        phone: '(916) 685-0439'
      },
      {
        id: '01400512',
        name: 'Kroger - Rancho Cordova',
        address: '2715 E Bidwell St, Folsom, CA 95630',
        distance: '8.2 miles',
        services: ['Pickup'],
        hours: {
          open: '06:00',
          close: '23:00'
        },
        phone: '(916) 932-3195'
      }
    ];
    
    res.json({
      success: true,
      stores: stores,
      searchParams: { lat, lng, radius },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch nearby stores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby stores'
    });
  }
});

// AI Endpoint for grocery list parsing
app.post('/api/ai/parse-grocery-list', async (req, res) => {
  const { text, userId = 'anonymous' } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No text provided for parsing'
    });
  }
  
  try {
    logger.info(`AI parsing request from user: ${userId}`);
    
    let parsedItems = [];
    
    if (openai) {
      // Use OpenAI for parsing
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "Parse the following grocery list into structured data. Return a JSON array of objects with properties: itemName, quantity, unit, category, confidence (0-1). Categories should be: produce, dairy, meat, pantry, bakery, frozen, other."
        }, {
          role: "user",
          content: text
        }],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      try {
        parsedItems = JSON.parse(completion.choices[0].message.content);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response:', parseError);
        parsedItems = fallbackParsing(text);
      }
    } else if (genAI) {
      // Use Google Generative AI as fallback
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Parse this grocery list into JSON format with itemName, quantity, unit, category, confidence: ${text}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      try {
        parsedItems = JSON.parse(response.text());
      } catch (parseError) {
        logger.error('Failed to parse Google AI response:', parseError);
        parsedItems = fallbackParsing(text);
      }
    } else {
      // Fallback to simple parsing
      parsedItems = fallbackParsing(text);
    }
    
    res.json({
      success: true,
      items: parsedItems,
      totalItems: parsedItems.length,
      aiService: openai ? 'openai' : genAI ? 'google' : 'fallback',
      processingTime: Date.now() - req.startTime,
      userId: userId
    });
    
  } catch (error) {
    logger.error('AI parsing failed:', error);
    
    // Return fallback parsing on error
    const fallbackItems = fallbackParsing(text);
    
    res.json({
      success: true,
      items: fallbackItems,
      totalItems: fallbackItems.length,
      aiService: 'fallback',
      warning: 'AI service unavailable, using fallback parsing',
      userId: userId
    });
  }
});

// Fallback parsing function
function fallbackParsing(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return lines.map((line, index) => {
    const trimmed = line.trim();
    const quantityMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.+)/);
    
    let itemName, quantity = 1, unit = '';
    
    if (quantityMatch) {
      quantity = parseFloat(quantityMatch[1]);
      itemName = quantityMatch[2].trim();
    } else {
      itemName = trimmed;
    }
    
    // Simple category guessing
    let category = 'other';
    const lowerItem = itemName.toLowerCase();
    
    if (lowerItem.includes('milk') || lowerItem.includes('cheese') || lowerItem.includes('yogurt')) {
      category = 'dairy';
    } else if (lowerItem.includes('apple') || lowerItem.includes('banana') || lowerItem.includes('lettuce')) {
      category = 'produce';
    } else if (lowerItem.includes('bread') || lowerItem.includes('bagel')) {
      category = 'bakery';
    } else if (lowerItem.includes('chicken') || lowerItem.includes('beef') || lowerItem.includes('fish')) {
      category = 'meat';
    }
    
    return {
      id: `item_${index}_${Date.now()}`,
      itemName,
      quantity,
      unit,
      category,
      confidence: 0.7,
      originalText: trimmed
    };
  });
}

// Load route modules with comprehensive error handling
const routes = [
  { path: '/api/cart', module: './routes/cart', name: 'Cart' },
  { path: '/api/account', module: './routes/account', name: 'Account' },
  { path: '/api/recipes', module: './routes/recipes', name: 'Recipes' },
  { path: '/api/kroger', module: './routes/kroger', name: 'Kroger API' },
  { path: '/api/kroger-orders', module: './routes/kroger-orders', name: 'Kroger Orders' },
  { path: '/api/analytics', module: './routes/analytics', name: 'Analytics' },
  { path: '/api/users', module: './routes/users', name: 'Users' }
];

routes.forEach(route => {
  try {
    const routeModule = require(route.module);
    app.use(route.path, routeModule);
    logger.info(`${route.name} routes loaded successfully`);
  } catch (error) {
    logger.warn(`${route.name} routes not found or failed to load: ${error.message}`);
  }
});

// OAuth helper functions
function generateOAuthSuccessPage(userId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authentication Successful - CartSmash</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 20px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 90%;
        }
        .success-icon {
          font-size: 80px;
          margin-bottom: 1.5rem;
          animation: bounceIn 0.6s ease-out;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        p {
          font-size: 16px;
          margin-bottom: 1rem;
          opacity: 0.9;
          line-height: 1.5;
        }
        .status {
          background: rgba(255, 255, 255, 0.2);
          padding: 1rem;
          border-radius: 10px;
          margin: 1.5rem 0;
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>Successfully Connected!</h1>
        <p>Your Kroger account has been linked to CartSmash.</p>
        <div class="status">
          <p><strong>Status:</strong> Authentication Complete</p>
          <p><strong>User ID:</strong> ${userId}</p>
        </div>
        <p style="font-size: 14px; opacity: 0.7;">This window will close automatically in 3 seconds...</p>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'KROGER_AUTH_SUCCESS',
            userId: '${userId}',
            timestamp: new Date().toISOString()
          }, '*');
        }
        setTimeout(() => window.close(), 3000);
      </script>
    </body>
    </html>
  `;
}

function generateOAuthErrorPage(errorMessage) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authentication Error - CartSmash</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 20px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 90%;
        }
        .error-icon {
          font-size: 80px;
          margin-bottom: 1.5rem;
          animation: shake 0.5s ease-in-out;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        .error-detail {
          background: rgba(0, 0, 0, 0.2);
          padding: 1.5rem;
          border-radius: 10px;
          margin: 1.5rem 0;
          font-family: monospace;
          font-size: 14px;
          word-break: break-word;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">❌</div>
        <h1>Authentication Failed</h1>
        <p>Unable to connect your Kroger account.</p>
        <div class="error-detail">
          <strong>Error:</strong> ${errorMessage}
        </div>
        <p style="font-size: 14px; opacity: 0.7;">This window will close automatically in 5 seconds...</p>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'KROGER_AUTH_ERROR', 
            error: '${errorMessage}',
            timestamp: new Date().toISOString()
          }, '*');
        }
        setTimeout(() => window.close(), 5000);
      </script>
    </body>
    </html>
  `;
}

// 404 Handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path} from ${req.ip}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    requestId: req.id,
    availableEndpoints: [
      'GET /health',
      'GET /api/health',
      'GET /api/auth/kroger/login',
      'GET /api/auth/kroger/callback',
      'GET /api/auth/kroger/status',
      'DELETE /api/auth/kroger/logout',
      'GET /api/kroger/stores/nearby',
      'POST /api/ai/parse-grocery-list'
    ]
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.error('Global error handler:', {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    errorId: errorId,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful Shutdown Handlers
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  const server = app.get('server');
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      // Close database connections
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
      
      // Close Firebase connections
      if (admin.apps.length > 0) {
        await Promise.all(admin.apps.map(app => app.delete()));
        logger.info('Firebase connections closed');
      }
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force close server after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`
    ========================================
    🚀 CARTSMASH Server Started Successfully
    ========================================
    Port: ${PORT}
    Environment: ${process.env.NODE_ENV || 'development'}
    Firebase: ${admin.apps.length > 0 ? '✅ Connected' : '⚠️  Limited'}
    MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️  Disconnected'}
    Kroger: ${process.env.KROGER_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}
    OpenAI: ${openai ? '✅ Available' : '❌ Not configured'}
    Google AI: ${genAI ? '✅ Available' : '❌ Not configured'}
    
    Health Check: http://localhost:${PORT}/health
    API Health: http://localhost:${PORT}/api/health
    
    Process ID: ${process.pid}
    Node Version: ${process.version}
    Platform: ${process.platform}
    Architecture: ${process.arch}
    ========================================
    `);
  });
  
  // Store server reference for graceful shutdown
  app.set('server', server);
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    
    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
    
    switch (error.code) {
      case 'EACCES':
        logger.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
}

module.exports = app;