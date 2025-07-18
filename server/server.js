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
      aiChatGPT: 'POST /api/ai/chatgpt'
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
      anthropic: !!process.env.ANTHROPIC_API_KEY
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
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
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
      'POST /api/ai/claude',
      'POST /api/ai/chatgpt'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Cart Smash server running!`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 APIs: ${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI, ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'} Anthropic`);
  console.log(`\n📋 Test these URLs:`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/debug/routes`);
  console.log(`   - http://localhost:${PORT}/api/ai/claude (POST)`);
  console.log(`   - http://localhost:${PORT}/api/ai/chatgpt (POST)\n`);
});

module.exports = app;