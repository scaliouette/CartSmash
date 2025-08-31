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
const config = require('./config');

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
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Configure Winston Logger for production
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

// Initialize AI Services
let openai, genAI;

if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    logger.info('OpenAI service initialized');
  } catch (error) {
    logger.warn('OpenAI initialization failed:', error.message);
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
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

// Apply rate limiting
app.use('/api/', createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'));
app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts'));
app.use('/api/ai/', createRateLimiter(60 * 1000, 10, 'Too many AI requests'));

// CORS Configuration for Production
// CORS Configuration for Production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://cart-smash.vercel.app',
      'https://cartsmash.vercel.app',
      'http://localhost:3000',  // Add for local development
      'http://localhost:3001',  // Add for local development
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.CLIENT_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview deployments
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
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
    'X-API-Key'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));

// Body Parser Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


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
      googleai: !!genAI
    },
    tokenStore: stats
  };
  
  const isHealthy = healthStatus.services.firebase && healthStatus.services.mongodb;
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// Kroger OAuth Endpoints
app.get('/api/auth/kroger/login', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'userId parameter is required' 
    });
  }
  
  logger.info(`Kroger OAuth login requested for user: ${userId}`);
  
  const state = Buffer.from(`${userId}-${Date.now()}-${Math.random()}`).toString('base64');
  const authUrl = new URL(`${process.env.KROGER_BASE_URL}/connect/oauth2/authorize`);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.KROGER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.KROGER_REDIRECT_URI);
  authUrl.searchParams.append('scope', process.env.KROGER_OAUTH_SCOPES || 'cart.basic:write profile.compact product.compact');
  authUrl.searchParams.append('state', state);
  
  res.redirect(authUrl.toString());
});

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
    const hasToken = await tokenStore.hasValidToken(userId);
    
    if (hasToken) {
      const tokenInfo = await tokenStore.getTokens(userId);
      res.json({
        success: true,
        userId: userId,
        authenticated: true,
        tokenInfo: {
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope
        }
      });
    } else {
      res.json({
        success: true,
        userId: userId,
        authenticated: false,
        tokenInfo: null,
        needsAuth: true
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
  
  if (error) {
    logger.error(`Kroger OAuth error: ${error}`);
    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>❌ Authentication Failed</h2>
          <p>${error}</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
  
  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>❌ Authentication Failed</h2>
          <p>Missing required parameters</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }

  try {
    const decoded = Buffer.from(state, 'base64').toString();
    const [userId, timestamp] = decoded.split('-');
    
    // Validate state freshness (5 minutes)
    if (Date.now() - parseInt(timestamp) > 300000) {
      throw new Error('State expired');
    }
    
    const credentials = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const tokenResponse = await axios.post(
      `${process.env.KROGER_BASE_URL}/connect/oauth2/token`,
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
    
    await tokenStore.setTokens(
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
    
    // Send HTML page with postMessage
    res.send(`
      <html>
        <head>
          <title>Kroger Authentication Success</title>
        </head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>✅ Successfully Connected to Kroger!</h2>
          <p>Your account has been linked. You can now send items to your Kroger cart.</p>
          <p>User ID: <strong>${userId}</strong></p>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px;">
            Close Window
          </button>
          <script>
            // Send message to parent window if opened as popup
            if (window.opener) {
              window.opener.postMessage({
                type: 'KROGER_AUTH_SUCCESS',
                userId: '${userId}'
              }, '${process.env.CLIENT_URL || 'https://cart-smash.vercel.app'}');
            }
            // Auto-close after 3 seconds
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    logger.error('Token exchange failed:', error.message);
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>❌ Authentication Failed</h2>
          <p>${error.message}</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
});


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

// Load route modules
const routes = [
  { path: '/api/cart', module: './routes/cart' },
  { path: '/api/ai', module: './routes/ai' },
  { path: '/api/kroger', module: './routes/kroger' },  // Add this
  { path: '/api/kroger-orders', module: './routes/kroger-orders' },
  { path: '/api/grocery', module: './routes/grocery' }
];

routes.forEach(route => {
  try {
    const routeModule = require(route.module);
    app.use(route.path, routeModule);
    logger.info(`${route.module} routes loaded`);
  } catch (error) {
    logger.error(`Failed to load ${route.module}:`, error.message);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 
      'Internal server error' : err.message,
    code: err.code || 'SERVER_ERROR'
  });
});

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
    logger.info(`
    ========================================
    🚀 CARTSMASH Server Started
    ========================================
    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    URL: https://cartsmash-api.onrender.com
    Client: ${process.env.CLIENT_URL}
    ========================================
    `);
  });
  
  app.set('server', server);
}

module.exports = app;