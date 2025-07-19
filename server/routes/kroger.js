// server/routes/kroger.js - Kroger API integration routes
const express = require('express');
const router = express.Router();
const KrogerAPIService = require('../services/KrogerAPIService');

console.log('🏪 Loading Kroger API routes...');

// Initialize Kroger service
const krogerService = new KrogerAPIService();

// Health check for Kroger API service
router.get('/health', async (req, res) => {
  console.log('🏥 Kroger API health check requested');
  
  try {
    const health = krogerService.getServiceHealth();
    
    res.json({
      success: true,
      service: 'kroger',
      ...health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Kroger health check failed:', error);
    res.status(500).json({
      success: false,
      service: 'kroger',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search products
router.get('/products/search', async (req, res) => {
  const { q: query, locationId, limit = 10 } = req.query;
  
  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" is required and must be at least 2 characters'
    });
  }
  
  console.log(`🔍 Kroger product search: "${query}"`);
  
  try {
    const products = await krogerService.searchProducts(query, locationId, parseInt(limit));
    
    res.json({
      success: true,
      query: query,
      locationId: locationId || krogerService.defaultLocationId,
      products: products,
      count: products.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Product search failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Product search failed',
      message: error.message,
      query: query
    });
  }
});

// Get product details
router.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const { locationId } = req.query;
  
  console.log(`📦 Getting Kroger product details: ${productId}`);
  
  try {
    const product = await krogerService.getProductDetails(productId, locationId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        productId: productId
      });
    }
    
    res.json({
      success: true,
      product: product,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Product details failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get product details',
      message: error.message,
      productId: productId
    });
  }
});

// Validate a single grocery item
router.post('/validate/item', async (req, res) => {
  const { itemName, locationId, options = {} } = req.body;
  
  if (!itemName || typeof itemName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'itemName is required and must be a string'
    });
  }
  
  console.log(`✅ Validating item: "${itemName}"`);
  
  try {
    const validation = await krogerService.validateGroceryItem(itemName, {
      locationId,
      ...options
    });
    
    res.json({
      success: true,
      itemName: itemName,
      validation: validation,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Item validation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Item validation failed',
      message: error.message,
      itemName: itemName
    });
  }
});

// Batch validate multiple items
router.post('/validate/batch', async (req, res) => {
  const { items, locationId, options = {} } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'items must be a non-empty array'
    });
  }
  
  if (items.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 50 items allowed per batch validation'
    });
  }
  
  console.log(`🔍 Batch validating ${items.length} items`);
  
  try {
    const startTime = Date.now();
    
    const result = await krogerService.batchValidateItems(items, {
      locationId,
      ...options
    });
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      itemCount: items.length,
      results: result,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Batch validation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Batch validation failed',
      message: error.message,
      itemCount: items.length
    });
  }
});

// Get pricing for a product
router.get('/pricing', async (req, res) => {
  const { productName, locationId } = req.query;
  
  if (!productName) {
    return res.status(400).json({
      success: false,
      error: 'productName query parameter is required'
    });
  }
  
  console.log(`💰 Getting pricing for: "${productName}"`);
  
  try {
    const pricing = await krogerService.getProductPricing(productName, locationId);
    
    res.json({
      success: true,
      productName: productName,
      pricing: pricing,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Pricing lookup failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Pricing lookup failed',
      message: error.message,
      productName: productName
    });
  }
});

// Find stores near a location
router.get('/stores', async (req, res) => {
  const { zipCode, radius = 10, limit = 10 } = req.query;
  
  if (!zipCode) {
    return res.status(400).json({
      success: false,
      error: 'zipCode query parameter is required'
    });
  }
  
  console.log(`🏪 Finding stores near ${zipCode}`);
  
  try {
    const stores = await krogerService.findStores(zipCode, parseInt(radius), parseInt(limit));
    
    res.json({
      success: true,
      zipCode: zipCode,
      radius: parseInt(radius),
      stores: stores,
      count: stores.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Store search failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Store search failed',
      message: error.message,
      zipCode: zipCode
    });
  }
});

// Enhanced cart validation endpoint
router.post('/cart/validate', async (req, res) => {
  const { cart, locationId, enhanceWithPricing = true } = req.body;
  
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'cart must be a non-empty array'
    });
  }
  
  console.log(`🛒 Validating cart with ${cart.length} items`);
  
  try {
    const startTime = Date.now();
    
    // Extract item names from cart items
    const itemNames = cart.map(item => 
      item.productName || item.itemName || item.name || String(item)
    );
    
    // Batch validate all items
    const validation = await krogerService.batchValidateItems(itemNames, {
      locationId,
      includePricing: enhanceWithPricing,
      fuzzyMatch: true
    });
    
    // Enhance cart items with validation results
    const enhancedCart = cart.map((originalItem, index) => {
      const validationResult = validation.items[index];
      
      return {
        ...originalItem,
        krogerValidation: validationResult.validation,
        krogerProduct: validationResult.validation.product,
        isValidated: validationResult.validation.isValid,
        confidence: validationResult.validation.confidence,
        suggestions: validationResult.validation.alternatives || []
      };
    });
    
    // Calculate cart totals if pricing is available
    let cartTotal = 0;
    let validatedItems = 0;
    
    enhancedCart.forEach(item => {
      if (item.krogerProduct?.price) {
        const quantity = parseFloat(item.quantity) || 1;
        cartTotal += item.krogerProduct.price * quantity;
      }
      if (item.isValidated) {
        validatedItems++;
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      originalCartSize: cart.length,
      validatedItems: validatedItems,
      validationRate: (validatedItems / cart.length * 100).toFixed(1) + '%',
      cart: enhancedCart,
      summary: {
        totalItems: cart.length,
        validatedItems: validatedItems,
        averageConfidence: validation.summary.averageConfidence,
        estimatedTotal: cartTotal > 0 ? cartTotal.toFixed(2) : null
      },
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Cart validation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Cart validation failed',
      message: error.message,
      cartSize: cart.length
    });
  }
});

// Test endpoint for development
router.post('/test', async (req, res) => {
  const { action = 'search', query = 'milk', locationId } = req.body;
  
  console.log(`🧪 Kroger API test: ${action}`);
  
  try {
    let result;
    
    switch (action) {
      case 'search':
        result = await krogerService.searchProducts(query, locationId, 5);
        break;
        
      case 'validate':
        result = await krogerService.validateGroceryItem(query, { locationId });
        break;
        
      case 'pricing':
        result = await krogerService.getProductPricing(query, locationId);
        break;
        
      case 'stores':
        result = await krogerService.findStores('90210', 10, 5);
        break;
        
      case 'auth':
        result = await krogerService.authenticate();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: search, validate, pricing, stores, auth'
        });
    }
    
    res.json({
      success: true,
      action: action,
      query: query,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Kroger test failed: ${error.message}`);
    res.status(500).json({
      success: false,
      action: action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache management endpoints
router.post('/cache/clear', (req, res) => {
  console.log('🗑️ Clearing Kroger API cache');
  
  try {
    krogerService.clearExpiredCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Service statistics
router.get('/stats', (req, res) => {
  console.log('📊 Kroger API statistics requested');
  
  try {
    const health = krogerService.getServiceHealth();
    
    res.json({
      success: true,
      service: 'kroger',
      statistics: {
        ...health,
        uptime: Date.now() - (krogerService.tokenExpiry || Date.now()),
        endpoints: [
          'GET /health',
          'GET /products/search',
          'GET /products/:id',
          'POST /validate/item',
          'POST /validate/batch',
          'GET /pricing',
          'GET /stores',
          'POST /cart/validate'
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Stats request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

console.log('✅ Kroger API routes loaded successfully');
module.exports = router;