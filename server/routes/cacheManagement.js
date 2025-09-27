// server/routes/cacheManagement.js
// Cache management endpoints for product database

const express = require('express');
const router = express.Router();
const productCacheBuilder = require('../services/productCacheBuilder');
const { authenticateUser } = require('../middleware/auth');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cache-management-routes' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware to check admin privileges (optional)
const requireAdmin = (req, res, next) => {
  // For now, just require authentication
  // In production, check for admin role
  if (!req.user) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }
  next();
};

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await productCacheBuilder.getCacheStats();

    res.json({
      success: true,
      stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics'
    });
  }
});

// Handle CORS preflight for search endpoint
router.options('/search', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.sendStatus(204);
});

// Search cached products (public endpoint)
router.get('/search', async (req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  try {
    const { query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const products = await productCacheBuilder.searchCachedProducts(query, parseInt(limit));

    res.json({
      success: true,
      products,
      count: products.length,
      cached: true
    });
  } catch (error) {
    logger.error('Cache search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Build complete cache (admin only, resource intensive)
router.post('/build', authenticateUser, requireAdmin, async (req, res) => {
  try {
    logger.info('Starting cache build requested by:', req.user.email);

    // Start build process asynchronously
    res.json({
      success: true,
      message: 'Cache build started. This will take some time.',
      note: 'Check /api/cache/stats for progress'
    });

    // Run build in background
    productCacheBuilder.buildCompleteCache()
      .then(stats => {
        logger.info('Cache build completed:', stats);
      })
      .catch(error => {
        logger.error('Cache build failed:', error);
      });
  } catch (error) {
    logger.error('Failed to start cache build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start cache build'
    });
  }
});

// Update popular products (lighter operation)
router.post('/update-popular', authenticateUser, async (req, res) => {
  try {
    logger.info('Updating popular products cache...');

    const updated = await productCacheBuilder.updatePopularProducts();

    res.json({
      success: true,
      message: `Updated ${updated} popular products`,
      updated
    });
  } catch (error) {
    logger.error('Failed to update popular products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update popular products'
    });
  }
});

// Build cache for specific category
router.post('/build/:category', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;

    logger.info(`Building cache for category: ${category}`);

    const count = await productCacheBuilder.buildCategoryCache(category);

    res.json({
      success: true,
      message: `Cached ${count} products in category: ${category}`,
      category,
      count
    });
  } catch (error) {
    logger.error(`Failed to build cache for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to build category cache'
    });
  }
});

// Clear cache (admin only, dangerous operation)
router.delete('/clear', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;

    logger.warn(`Cache clear requested by ${req.user.email} for category: ${category || 'all'}`);

    const deleted = await productCacheBuilder.clearCache(category);

    res.json({
      success: true,
      message: `Cleared ${deleted} products from cache`,
      deleted,
      category: category || 'all'
    });
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50 } = req.query;

    const products = await productCacheBuilder.searchCachedProducts(category, parseInt(limit));

    res.json({
      success: true,
      category,
      products,
      count: products.length
    });
  } catch (error) {
    logger.error(`Failed to get products for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category products'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'product-cache',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;