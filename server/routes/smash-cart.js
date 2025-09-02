// SmashCart Routes - Comprehensive Kroger Cart Management
// GET, POST, PUT, DELETE operations with store location and detailed cart information

const express = require('express');
const router = express.Router();
const KrogerSmashCartService = require('../services/KrogerSmashCartService');

// Initialize cart service
const cartService = new KrogerSmashCartService();

/**
 * GET /api/smash-cart/:userId
 * Retrieve comprehensive cart information with store location
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      includeStoreInfo = 'true', 
      includeProductDetails = 'true' 
    } = req.query;
    
    console.log(`🛒 [GET CART API] Request for user: ${userId}`);
    
    const options = {
      includeStoreInfo: includeStoreInfo === 'true',
      includeProductDetails: includeProductDetails === 'true'
    };
    
    const result = await cartService.getCart(userId, options);
    
    res.status(result.success ? 200 : 500).json({
      ...result,
      timestamp: new Date().toISOString(),
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ [GET CART API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/smash-cart/:userId
 * Create cart or add items with comprehensive options
 */
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      items = [], 
      storeId, 
      modality = 'PICKUP', 
      clearExisting = false 
    } = req.body;
    
    console.log(`🛒 [POST CART API] Request for user: ${userId}`);
    console.log(`   Items: ${items.length}, Store: ${storeId}, Modality: ${modality}`);
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }
    
    const options = {
      storeId,
      modality,
      clearExisting
    };
    
    const result = await cartService.postCart(userId, items, options);
    
    res.status(result.success ? 200 : 500).json({
      ...result,
      timestamp: new Date().toISOString(),
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ [POST CART API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/smash-cart/:userId
 * Update existing cart items
 */
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    console.log(`🛒 [PUT CART API] Request for user: ${userId}`);
    console.log(`   Updates: ${JSON.stringify(updates, null, 2)}`);
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await cartService.putCart(userId, updates);
    
    res.status(result.success ? 200 : 500).json({
      ...result,
      timestamp: new Date().toISOString(),
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ [PUT CART API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/smash-cart/:userId
 * Clear or completely remove cart
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { removeCompletely = false } = req.query;
    
    console.log(`🛒 [DELETE CART API] Request for user: ${userId}`);
    console.log(`   Remove completely: ${removeCompletely}`);
    
    const options = {
      removeCompletely: removeCompletely === 'true'
    };
    
    const result = await cartService.deleteCart(userId, options);
    
    res.status(result.success ? 200 : 500).json({
      ...result,
      timestamp: new Date().toISOString(),
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ [DELETE CART API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/smash-cart/:userId/store/:storeId
 * Get detailed store information
 */
router.get('/:userId/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    console.log(`🏪 [STORE INFO API] Request for store: ${storeId}`);
    
    const storeInfo = await cartService.getStoreInfo(storeId);
    
    res.json({
      success: true,
      store: storeInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [STORE INFO API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/smash-cart/health
 * Service health check
 */
router.get('/health', (req, res) => {
  try {
    const health = cartService.getServiceHealth();
    
    res.json({
      ...health,
      status: 'operational'
    });
    
  } catch (error) {
    res.status(500).json({
      service: 'kroger_smash_cart',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/smash-cart/:userId/search
 * Search for products to add to cart
 */
router.post('/:userId/search', async (req, res) => {
  try {
    const { userId } = req.params;
    const { searchTerm, storeId, limit = 10 } = req.body;
    
    console.log(`🔍 [PRODUCT SEARCH API] User: ${userId}, Term: "${searchTerm}"`);
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'searchTerm is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user authentication for product search
    const tokenInfo = await cartService.validateUserAuth(userId);
    
    // Search for products
    const products = await cartService.searchProduct(
      tokenInfo, 
      searchTerm, 
      storeId || cartService.defaultStore
    );
    
    res.json({
      success: true,
      searchTerm,
      storeId: storeId || cartService.defaultStore,
      products: products.slice(0, limit),
      count: products.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [PRODUCT SEARCH API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/smash-cart/:userId/quick-add
 * Quick add items to cart (simplified interface)
 */
router.post('/:userId/quick-add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { productNames = [], storeId } = req.body;
    
    console.log(`⚡ [QUICK ADD API] User: ${userId}, Products: ${productNames.length}`);
    
    if (!Array.isArray(productNames) || productNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'productNames array is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Convert product names to cart items
    const items = productNames.map(name => ({
      productName: name,
      quantity: 1
    }));
    
    const result = await cartService.postCart(userId, items, { storeId });
    
    res.json({
      ...result,
      method: 'quick-add',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [QUICK ADD API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/smash-cart/:userId/summary
 * Get cart summary with analytics
 */
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 [CART SUMMARY API] Request for user: ${userId}`);
    
    const cartResult = await cartService.getCart(userId, { 
      includeStoreInfo: true, 
      includeProductDetails: true 
    });
    
    if (!cartResult.success) {
      return res.status(500).json(cartResult);
    }
    
    const cart = cartResult.cart;
    
    // Generate analytics
    const analytics = {
      itemCount: cart.itemCount,
      estimatedTotal: cart.summary.estimatedTotal,
      categories: {},
      topItems: [],
      storeInfo: cart.store ? {
        name: cart.store.name,
        address: cart.store.address,
        services: cart.store.services
      } : null
    };
    
    // Analyze cart items
    if (cart.items && cart.items.length > 0) {
      cart.items.forEach(item => {
        // Category analysis
        const category = item.productDetails?.categories?.[0] || 'Other';
        analytics.categories[category] = (analytics.categories[category] || 0) + 1;
        
        // Top items by quantity
        analytics.topItems.push({
          name: item.productDetails?.description || item.description || 'Unknown',
          quantity: item.quantity,
          price: item.price?.regular || 0
        });
      });
      
      // Sort top items by quantity
      analytics.topItems.sort((a, b) => b.quantity - a.quantity);
      analytics.topItems = analytics.topItems.slice(0, 5);
    }
    
    res.json({
      success: true,
      userId: userId,
      summary: cart.summary,
      analytics: analytics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CART SUMMARY API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;