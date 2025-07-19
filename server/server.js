require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Cart Smash server...');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Cart Smash API is running! 💥',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      cartParse: 'POST /api/cart/parse',
      cartCurrent: 'GET /api/cart/current',
      aiClaude: 'POST /api/ai/claude',
      aiChatGPT: 'POST /api/ai/chatgpt',
      analytics: 'GET /api/analytics/parsing',
      // NEW: OAuth endpoints
      krogerAuth: 'POST /api/auth/kroger/login',
      krogerCallback: 'GET /api/auth/kroger/callback',
      krogerOrders: 'POST /api/kroger-orders/workflow/complete'
    }
  });
});

app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apis: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      // NEW: Kroger API status
      kroger: !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET)
    }
  });
});

// Load routes with proper error handling
console.log('📦 Loading routes...');

// Cart routes
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load cart routes:', error.message);
}

// AI routes  
try {
  const aiRoutes = require('./routes/ai');
  app.use('/api/ai', aiRoutes);
  console.log('✅ AI routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AI routes:', error.message);
  console.error('📁 Make sure ./routes/ai.js exists and exports a router');
}

// Analytics routes
try {
  const analyticsRoutes = require('./routes/analytics');
  app.use('/api/analytics', analyticsRoutes);
  console.log('✅ Analytics routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load analytics routes:', error.message);
  console.error('📁 Make sure ./routes/analytics.js exists and exports a router');
}

// Settings routes
try {
  const settingsRoutes = require('./routes/settings');
  app.use('/api/settings', settingsRoutes);
  console.log('✅ Settings routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load settings routes:', error.message);
  console.error('📁 Make sure ./routes/settings.js exists and exports a router');
}

// 🔐 NEW: Authentication routes (OAuth2)
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Authentication routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load authentication routes:', error.message);
  console.error('📁 Make sure ./routes/auth.js exists and exports a router');
  console.error('💡 Create ./routes/auth.js from the OAuth2 implementation');
}

// Kroger API routes (existing)
try {
  const krogerRoutes = require('./routes/kroger');
  app.use('/api/kroger', krogerRoutes);
  console.log('✅ Kroger API routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Kroger routes:', error.message);
}

// 🛍️ NEW: Kroger Order routes (OAuth-enabled ordering)
try {
  const krogerOrderRoutes = require('./routes/kroger-orders');
  app.use('/api/kroger-orders', krogerOrderRoutes);
  console.log('✅ Kroger Order routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Kroger Order routes:', error.message);
  console.error('📁 Make sure ./routes/kroger-orders.js exists and exports a router');
  console.error('💡 Create ./routes/kroger-orders.js from the order service implementation');
}

// Enhanced grocery parsing function (moved from old server.js)
function parseGroceryItem(line) {
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[a-z]\)\s*/i, '')
    .trim();

  // Simple quantity extraction
  const quantityMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(.+)/);
  let quantity = null;
  let itemName = cleaned;
  
  if (quantityMatch) {
    quantity = quantityMatch[1];
    itemName = quantityMatch[2];
  }

  // Simple category determination
  let category = 'other';
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
  else if (itemLower.match(/bread|bagel|muffin|cake|cookie/)) category = 'bakery';
  else if (itemLower.match(/apple|banana|orange|fruit|vegetable|carrot|lettuce|tomato|potato|onion/)) category = 'produce';
  else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat/)) category = 'meat';
  else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce/)) category = 'pantry';
  else if (itemLower.match(/frozen|ice cream/)) category = 'frozen';

  return {
    original: line.trim(),
    itemName: itemName.trim(),
    quantity: quantity,
    category: category
  };
}

// Fallback routes (if cart routes fail to load)
app.post('/api/cart/parse', (req, res) => {
  console.log('📝 Fallback cart parse request');
  try {
    const { listText, action = 'replace' } = req.body;
    
    if (!listText) {
      return res.status(400).json({ error: 'listText required' });
    }
    
    const items = listText.split('\n')
      .filter(line => line.trim())
      .map((line, index) => ({
        id: `item_${Date.now()}_${index}`,
        ...parseGroceryItem(line),
        timestamp: new Date().toISOString()
      }));
    
    console.log(`✅ Parsed ${items.length} items`);
    
    res.json({
      success: true,
      cart: items,
      action: action,
      itemsAdded: items.length,
      totalItems: items.length
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse grocery list' 
    });
  }
});

// Fallback analytics route (if analytics routes fail to load)
app.get('/api/analytics/parsing', (req, res) => {
  console.log('📊 Fallback analytics request');
  try {
    const mockAnalytics = {
      overview: {
        totalLists: 1247,
        totalItems: 8934,
        accuracyRate: 89.4,
        avgConfidence: 0.847,
        topCategory: 'produce',
        improvementTrend: '+12.3%'
      },
      parsing: {
        intelligentParsing: {
          used: 1156,
          accuracy: 91.2,
          avgProcessingTime: 1.8,
          filteringEfficiency: '87.3%'
        },
        fallbackParsing: {
          used: 91,
          accuracy: 67.8,
          avgProcessingTime: 0.3,
          filteringEfficiency: '43.2%'
        }
      },
      confidence: {
        high: { count: 6723, percentage: 75.3 },
        medium: { count: 1587, percentage: 17.8 },
        low: { count: 624, percentage: 6.9 }
      },
      categories: {
        produce: { count: 2145, accuracy: 94.2 },
        dairy: { count: 1567, accuracy: 92.8 },
        meat: { count: 1234, accuracy: 88.9 },
        pantry: { count: 2089, accuracy: 87.3 },
        beverages: { count: 892, accuracy: 85.1 },
        other: { count: 1007, accuracy: 79.4 }
      },
      userFeedback: {
        accepted: 7834,
        edited: 645,
        rejected: 455,
        satisfactionScore: 4.6
      },
      performance: {
        avgResponseTime: 2.1,
        apiUptime: 99.7,
        errorRate: 0.8,
        cachehitRate: 67.3
      },
      trends: {
        daily: [
          { date: '2024-01-15', accuracy: 87.2, items: 234 },
          { date: '2024-01-16', accuracy: 88.1, items: 267 },
          { date: '2024-01-17', accuracy: 89.4, items: 289 },
          { date: '2024-01-18', accuracy: 90.1, items: 245 },
          { date: '2024-01-19', accuracy: 91.3, items: 298 },
          { date: '2024-01-20', accuracy: 89.7, items: 312 },
          { date: '2024-01-21', accuracy: 92.1, items: 334 }
        ]
      }
    };

    res.json({
      success: true,
      ...mockAnalytics,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fallback analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate analytics data' 
    });
  }
});

// Fallback settings route
app.get('/api/settings/:section?', (req, res) => {
  console.log('⚙️ Fallback settings request');
  const { section } = req.params;
  
  const defaultSettings = {
    aiParsing: {
      strictMode: true,
      confidenceThreshold: 0.6,
      enableAIValidation: true,
      preferredAI: 'claude'
    },
    system: {
      environment: 'development',
      logLevel: 'info'
    }
  };

  if (section && defaultSettings[section]) {
    res.json({
      success: true,
      section: section,
      settings: defaultSettings[section],
      fallback: true
    });
  } else if (!section) {
    res.json({
      success: true,
      settings: defaultSettings,
      fallback: true
    });
  } else {
    res.status(404).json({
      success: false,
      error: `Settings section '${section}' not found`,
      availableSections: Object.keys(defaultSettings)
    });
  }
});

// 🧪 NEW: Auth testing fallback (if auth routes fail to load)
app.post('/api/auth/kroger/login', (req, res) => {
  console.log('🔐 Fallback auth login request');
  res.status(503).json({
    success: false,
    error: 'Authentication service not configured',
    message: 'Please create ./routes/auth.js and ./services/KrogerAuthService.js',
    setup: {
      files: [
        'server/routes/auth.js',
        'server/services/KrogerAuthService.js'
      ],
      env: [
        'KROGER_CLIENT_ID',
        'KROGER_CLIENT_SECRET', 
        'KROGER_REDIRECT_URI',
        'JWT_SECRET'
      ]
    }
  });
});

// Debug route to see all registered routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach(function(middleware) {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(function(handler) {
        if (handler.route) {
          const basePath = middleware.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace('^', '')
            .replace('\\', '');
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ 
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    // NEW: OAuth status
    oauth: {
      authRoutesLoaded: routes.some(r => r.path.includes('/api/auth/')),
      orderRoutesLoaded: routes.some(r => r.path.includes('/api/kroger-orders/')),
      envConfigured: !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET)
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /debug/routes',
      'POST /api/cart/parse',
      'GET /api/cart/current',
      'POST /api/ai/claude',
      'POST /api/ai/chatgpt',
      'GET /api/analytics/parsing',
      'GET /api/settings',
      // NEW: OAuth endpoints
      'POST /api/auth/kroger/login',
      'GET /api/auth/kroger/callback',
      'GET /api/auth/kroger/status',
      'POST /api/kroger-orders/cart/send',
      'POST /api/kroger-orders/workflow/complete'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Cart Smash server running!`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 APIs: ${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI, ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'} Anthropic`);
  // NEW: OAuth status
  console.log(`🔐 OAuth: ${process.env.KROGER_CLIENT_ID ? '✅' : '❌'} Kroger configured`);
  console.log(`\n📋 Test these URLs:`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/debug/routes`);
  console.log(`   - http://localhost:${PORT}/api/analytics/parsing`);
  console.log(`   - http://localhost:${PORT}/api/settings`);
  console.log(`   - http://localhost:${PORT}/api/ai/claude (POST)`);
  console.log(`   - http://localhost:${PORT}/api/ai/chatgpt (POST)`);
  // NEW: OAuth test URLs
  console.log(`\n🔐 OAuth Test URLs:`);
  console.log(`   - http://localhost:${PORT}/api/auth/kroger/login (POST)`);
  console.log(`   - http://localhost:${PORT}/api/auth/kroger/status (GET)`);
  console.log(`   - http://localhost:${PORT}/api/kroger-orders/health (GET)\n`);
});

module.exports = app;