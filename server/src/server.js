// server/server.js - Debug version
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Cart Smash server...');
console.log('📁 Current directory:', __dirname);

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

// Basic health check (before route imports)
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apis: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  });
});

// Try to load routes with error handling
console.log('📦 Loading routes...');

try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load cart routes:', error.message);
  console.error('📁 Make sure ./routes/cart.js exists');
}

try {
  const aiRoutes = require('./routes/ai');
  app.use('/api/ai', aiRoutes);
  console.log('✅ AI routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AI routes:', error.message);
  console.error('📁 Make sure ./routes/ai.js exists');
}

// API status endpoint
app.get('/api/status', (req, res) => {
  console.log('📊 API status requested');
  res.json({
    service: 'Cart Smash API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    routes: {
      health: 'GET /health',
      status: 'GET /api/status',
      cart: [
        'POST /api/cart/parse',
        'GET /api/cart/current', 
        'POST /api/cart/clear',
        'DELETE /api/cart/item/:id',
        'PUT /api/cart/item/:id',
        'GET /api/cart/stats'
      ],
      ai: [
        'POST /api/ai/claude',
        'POST /api/ai/chatgpt',
        'GET /api/ai/health'
      ]
    }
  });
});

// List all registered routes (for debugging)
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach(function(middleware) {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(function(handler) {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
            baseUrl: middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^', '')
          });
        }
      });
    }
  });
  
  res.json({ routes });
});

// Error handling middleware
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
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'GET /api/status',
      'GET /debug/routes',
      'POST /api/cart/parse',
      'GET /api/cart/current'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Cart Smash server running!`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 APIs: ${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI, ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'} Anthropic`);
  console.log(`\n📋 Test these URLs:`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/api/status`);
  console.log(`   - http://localhost:${PORT}/debug/routes`);
  console.log(`   - http://localhost:${PORT}/api/cart/current\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;