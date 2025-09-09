// server/routes/instacartRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');

// Instacart API configuration
const INSTACART_API_BASE = process.env.INSTACART_API_BASE || 'https://connect.instacart.com';
const INSTACART_CONNECT_KEY = process.env.INSTACART_CONNECT_KEY || 'keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ';
const INSTACART_CATALOG_KEY = process.env.INSTACART_CATALOG_KEY || 'keys.eRRq-GgY2ri6Yp6x8LTS9sCqlW16LqkEMFZ7jYZ9A74';
const INSTACART_DEVELOPER_KEY = process.env.INSTACART_DEVELOPER_KEY || 'keys.l02AgO_0upmAHr_0NYQ8y_ejdYrBepMw55HqcUeePBU';

// API endpoint configurations
const API_ENDPOINTS = {
  CONNECT: 'https://connect.instacart.com',
  CATALOG: 'https://api.instacart.com/v2',
  DEVELOPER: 'https://developer.instacart.com/api/v1'
};

// Helper function to make authenticated Instacart API calls with API keys
const instacartApiCall = async (endpoint, method = 'GET', data = null, apiType = 'CONNECT') => {
  try {
    // Select appropriate API key and base URL
    let apiKey, baseUrl;
    switch (apiType) {
      case 'CONNECT':
        apiKey = INSTACART_CONNECT_KEY;
        baseUrl = API_ENDPOINTS.CONNECT;
        break;
      case 'CATALOG':
        apiKey = INSTACART_CATALOG_KEY;
        baseUrl = API_ENDPOINTS.CATALOG;
        break;
      case 'DEVELOPER':
        apiKey = INSTACART_DEVELOPER_KEY;
        baseUrl = API_ENDPOINTS.DEVELOPER;
        break;
      default:
        apiKey = INSTACART_CONNECT_KEY;
        baseUrl = API_ENDPOINTS.CONNECT;
    }
    
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CartSmash/1.0 (https://cart-smash.vercel.app)'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`📡 Making ${method} request to: ${config.url}`);
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error making ${apiType} API call to ${endpoint}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// Helper function to validate API keys on startup
const validateApiKeys = () => {
  const keys = {
    CONNECT: INSTACART_CONNECT_KEY,
    CATALOG: INSTACART_CATALOG_KEY,
    DEVELOPER: INSTACART_DEVELOPER_KEY
  };
  
  let hasValidKeys = false;
  for (const [type, key] of Object.entries(keys)) {
    if (key && key.startsWith('keys.')) {
      console.log(`✅ ${type} API key configured`);
      hasValidKeys = true;
    } else {
      console.log(`⚠️ ${type} API key missing or invalid`);
    }
  }
  
  return hasValidKeys;
};

// GET /api/instacart/retailers - Get available retailers for a location
router.get('/retailers', async (req, res) => {
  try {
    console.log('🏪 Fetching available retailers');
    
    const { zipCode } = req.query;
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Use Connect API to get available retailers
        const endpoint = zipCode ? `/retailers?zip_code=${zipCode}` : '/retailers';
        const retailers = await instacartApiCall(endpoint, 'GET', null, 'CONNECT');
        
        // Transform response to match our expected format
        const formattedRetailers = (retailers.retailers || retailers.data || []).map(retailer => ({
          id: retailer.id || retailer.retailer_id,
          name: retailer.name,
          logo: retailer.logo_url || '🏪',
          estimatedDelivery: retailer.estimated_delivery || '2-4 hours',
          available: retailer.available !== false,
          service_fee: retailer.service_fee || 3.99,
          delivery_fee: retailer.delivery_fee || 5.99,
          minimum_order: retailer.minimum_order || 35.00
        }));
        
        res.json({ 
          success: true, 
          retailers: formattedRetailers,
          count: formattedRetailers.length
        });
      } catch (error) {
        console.log('⚠️ Real API failed, falling back to mock data');
        // Fall back to mock data if API fails
        throw error;
      }
    } else {
      // Mock response for development
      const mockRetailers = [
        { 
          id: 'safeway', 
          name: 'Safeway', 
          logo: '🏪', 
          estimatedDelivery: '2 hours',
          available: true,
          service_fee: 3.99,
          delivery_fee: 5.99
        },
        { 
          id: 'whole_foods', 
          name: 'Whole Foods', 
          logo: '🥬', 
          estimatedDelivery: '1-2 hours',
          available: true,
          service_fee: 3.99,
          delivery_fee: 7.99
        },
        { 
          id: 'costco', 
          name: 'Costco', 
          logo: '📦', 
          estimatedDelivery: 'Same day',
          available: true,
          service_fee: 4.99,
          delivery_fee: 10.99
        },
        { 
          id: 'kroger', 
          name: 'Kroger', 
          logo: '🛒', 
          estimatedDelivery: '2-3 hours',
          available: true,
          service_fee: 2.99,
          delivery_fee: 4.99
        },
        { 
          id: 'target', 
          name: 'Target', 
          logo: '🎯', 
          estimatedDelivery: '2 hours',
          available: true,
          service_fee: 3.99,
          delivery_fee: 5.99
        }
      ];
      
      res.json({ success: true, retailers: mockRetailers });
    }
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch retailers',
      message: error.message 
    });
  }
});

// POST /api/instacart/search - Search for products
router.post('/search', async (req, res) => {
  try {
    const { query, retailerId, zipCode, quantity, category, originalItem } = req.body;
    
    console.log(`🔍 Searching for products: "${query}" at ${retailerId}`);
    
    if (!query || !retailerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query and retailerId are required' 
      });
    }
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Use Catalog API to search for products
        const searchParams = {
          q: query,
          retailer_id: retailerId,
          limit: 10
        };
        
        if (zipCode) searchParams.zip_code = zipCode;
        if (category) searchParams.category = category;
        
        console.log('🔍 Searching with params:', searchParams);
        
        // Use catalog API for product search
        const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams, 'CATALOG');
        
        // Transform API response to our format
        const products = (searchResults.items || searchResults.data || []).map(product => ({
          id: product.id || product.product_id,
          sku: product.sku || product.retailer_sku,
          name: product.name || product.display_name,
          price: product.price || product.pricing?.price || 0,
          size: product.size || product.package_size,
          brand: product.brand || product.brand_name,
          image: product.image_url || product.images?.[0]?.url,
          availability: product.availability || 'available',
          confidence: calculateConfidence(originalItem, product),
          retailer_id: retailerId,
          unit_price: product.unit_price,
          description: product.description
        }));
        
        console.log(`✅ Found ${products.length} products`);
        
        res.json({ 
          success: true, 
          products,
          query: query,
          retailer: retailerId,
          count: products.length
        });
      } catch (error) {
        console.log('⚠️ Catalog API failed, falling back to mock data');
        // Fall back to mock data if API fails
        throw error;
      }
    } else {
      // Mock search results for development
      const mockProducts = generateMockProducts(query, originalItem, retailerId);
      res.json({ success: true, products: mockProducts });
    }
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search products',
      message: error.message 
    });
  }
});

// POST /api/instacart/cart/create - Create cart and add items
router.post('/cart/create', authenticateUser, async (req, res) => {
  try {
    const { retailerId, zipCode, items, userId, metadata } = req.body;
    
    console.log(`🛒 Creating Instacart cart for user ${userId} with ${items?.length || 0} items`);
    
    if (!retailerId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'RetailerId and items are required' 
      });
    }
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Step 1: Create cart using Connect API
        const cartData = {
          retailer_id: retailerId,
          partner_id: 'CartSmash',
          ...(zipCode && { delivery_address: { zip_code: zipCode } })
        };
        
        console.log('🛒 Creating cart with data:', cartData);
        
        const cartResponse = await instacartApiCall('/carts', 'POST', cartData, 'CONNECT');
        const cartId = cartResponse.id || cartResponse.cart_id;
        
        console.log(`✅ Created cart: ${cartId}`);
        
        // Step 2: Add items to cart
        const cartItems = items.map(item => ({
          product_id: item.product_id || item.id,
          retailer_sku: item.retailer_sku || item.sku,
          quantity: item.quantity || 1,
          ...(item.variant_id && { variant_id: item.variant_id })
        }));
        
        console.log('📦 Adding items to cart:', cartItems);
        
        const addItemsResponse = await instacartApiCall(
          `/carts/${cartId}/items`, 
          'POST', 
          { items: cartItems },
          'CONNECT'
        );
        
        console.log(`✅ Added ${cartItems.length} items to cart`);
        
        // Step 3: Generate checkout URL
        const checkoutUrl = `https://www.instacart.com/store/checkout_v3/${cartId}?partner=CartSmash&utm_source=CartSmash&utm_medium=api`;
        
        // Get cart totals if available
        let cartTotals = null;
        try {
          const cartDetails = await instacartApiCall(`/carts/${cartId}`, 'GET', null, 'CONNECT');
          cartTotals = {
            subtotal: cartDetails.subtotal,
            total: cartDetails.total,
            item_count: cartDetails.item_count
          };
        } catch (e) {
          console.log('⚠️ Could not fetch cart totals:', e.message);
        }
        
        // Log successful integration
        if (metadata) {
          console.log('📊 Integration metadata:', metadata);
        }
        
        res.json({
          success: true,
          cartId,
          checkoutUrl,
          itemsAdded: cartItems.length,
          totals: cartTotals,
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
            apiVersion: 'connect',
            retailer: retailerId
          }
        });
      } catch (error) {
        console.log('⚠️ Connect API failed, falling back to mock cart');
        throw error;
      }
    } else {
      // Mock response for development
      const mockCartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockCheckoutUrl = `https://www.instacart.com/checkout?cart_id=${mockCartId}&retailer=${retailerId}&source=CartSmash`;
      
      console.log(`✅ Mock cart created: ${mockCartId}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({
        success: true,
        cartId: mockCartId,
        checkoutUrl: mockCheckoutUrl,
        itemsAdded: items.length,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          apiVersion: 'mock',
          mockMode: true
        }
      });
    }
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create cart',
      message: error.message 
    });
  }
});

// Helper function to calculate confidence score
function calculateConfidence(originalItem, instacartProduct) {
  let confidence = 0;
  
  if (!originalItem || !instacartProduct) return 0.5;
  
  const originalName = (originalItem.name || '').toLowerCase();
  const productName = (instacartProduct.name || '').toLowerCase();
  
  // Exact name match
  if (originalName === productName) {
    confidence += 0.4;
  }
  // Partial name match
  else if (productName.includes(originalName) || originalName.includes(productName)) {
    confidence += 0.3;
  }
  // Word overlap
  else {
    const originalWords = originalName.split(/\s+/);
    const productWords = productName.split(/\s+/);
    const overlap = originalWords.filter(word => productWords.includes(word)).length;
    confidence += (overlap / Math.max(originalWords.length, productWords.length)) * 0.2;
  }
  
  // Brand match bonus
  if (originalItem.brand && instacartProduct.brand && 
      originalItem.brand.toLowerCase() === instacartProduct.brand.toLowerCase()) {
    confidence += 0.2;
  }
  
  // Category match bonus
  if (originalItem.category && instacartProduct.category && 
      originalItem.category.toLowerCase() === instacartProduct.category.toLowerCase()) {
    confidence += 0.15;
  }
  
  // Size/package match bonus
  if (originalItem.amount && instacartProduct.package_size) {
    const originalSize = originalItem.amount.toLowerCase();
    const productSize = instacartProduct.package_size.toLowerCase();
    if (originalSize.includes(productSize) || productSize.includes(originalSize)) {
      confidence += 0.1;
    }
  }
  
  // Availability penalty
  if (instacartProduct.availability === 'out_of_stock') {
    confidence -= 0.2;
  }
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

// Helper function to generate mock products for development
function generateMockProducts(query, originalItem, retailerId) {
  const queryLower = query.toLowerCase();
  
  // Common product mappings
  const productTemplates = {
    'chicken': [
      { name: 'Fresh Chicken Breast', basePrice: 6.99, confidence: 0.95 },
      { name: 'Organic Chicken Breast', basePrice: 9.99, confidence: 0.75 },
      { name: 'Chicken Thighs', basePrice: 4.99, confidence: 0.60 }
    ],
    'milk': [
      { name: 'Whole Milk, 1 Gallon', basePrice: 3.99, confidence: 0.90 },
      { name: 'Organic Milk, 1 Gallon', basePrice: 6.99, confidence: 0.85 },
      { name: '2% Milk, 1 Gallon', basePrice: 3.79, confidence: 0.70 }
    ],
    'banana': [
      { name: 'Bananas, per lb', basePrice: 0.68, confidence: 0.95 },
      { name: 'Organic Bananas, per lb', basePrice: 0.99, confidence: 0.80 },
      { name: 'Baby Bananas, 2 lb bag', basePrice: 2.99, confidence: 0.60 }
    ],
    'bread': [
      { name: 'Whole Wheat Bread', basePrice: 2.99, confidence: 0.90 },
      { name: 'White Bread', basePrice: 2.49, confidence: 0.75 },
      { name: 'Sourdough Bread', basePrice: 3.99, confidence: 0.65 }
    ],
    'egg': [
      { name: 'Large Eggs, 12 count', basePrice: 2.99, confidence: 0.95 },
      { name: 'Organic Eggs, 12 count', basePrice: 4.99, confidence: 0.85 },
      { name: 'Free Range Eggs, 12 count', basePrice: 5.99, confidence: 0.80 }
    ]
  };
  
  // Find matching template
  let templates = [];
  for (const [key, values] of Object.entries(productTemplates)) {
    if (queryLower.includes(key)) {
      templates = values;
      break;
    }
  }
  
  // Generate generic products if no specific template found
  if (templates.length === 0) {
    templates = [
      { name: `${query} - Store Brand`, basePrice: 3.99, confidence: 0.70 },
      { name: `${query} - Premium`, basePrice: 6.99, confidence: 0.65 },
      { name: `${query} - Value Pack`, basePrice: 8.99, confidence: 0.60 }
    ];
  }
  
  // Generate products with retailer-specific pricing
  const retailerPriceMultiplier = {
    'safeway': 1.0,
    'whole_foods': 1.3,
    'costco': 0.9,
    'kroger': 0.95,
    'target': 1.05
  };
  
  const multiplier = retailerPriceMultiplier[retailerId] || 1.0;
  
  return templates.map((template, index) => ({
    id: `sku_${retailerId}_${Date.now()}_${index}`,
    sku: `${retailerId.toUpperCase()}_${Math.random().toString(36).substr(2, 8)}`,
    name: template.name,
    price: Math.round(template.basePrice * multiplier * 100) / 100,
    size: originalItem?.amount || '1 unit',
    brand: index === 0 ? 'Store Brand' : (index === 1 ? 'Premium Brand' : 'Value Brand'),
    image: null, // In real implementation, this would be the product image URL
    availability: 'in_stock',
    confidence: template.confidence,
    category: originalItem?.category || 'other'
  }));
}

// GET /api/instacart/cart/:cartId/status - Get cart status (for webhook/polling)
router.get('/cart/:cartId/status', authenticateUser, async (req, res) => {
  try {
    const { cartId } = req.params;
    
    console.log(`📊 Getting cart status: ${cartId}`);
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        const cartStatus = await instacartApiCall(`/carts/${cartId}`, 'GET', null, 'CONNECT');
        res.json({ 
          success: true, 
          cart: {
            id: cartStatus.id,
            status: cartStatus.status,
            item_count: cartStatus.item_count,
            subtotal: cartStatus.subtotal,
            total: cartStatus.total,
            created_at: cartStatus.created_at,
            retailer: cartStatus.retailer
          }
        });
      } catch (error) {
        console.log('⚠️ Cart status API failed, returning mock data');
        throw error;
      }
    } else {
      // Mock response
      res.json({
        success: true,
        cart: {
          id: cartId,
          status: 'created',
          total_items: 5,
          subtotal: 45.67,
          total: 52.34,
          created_at: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error getting cart status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cart status',
      message: error.message 
    });
  }
});

// GET /api/instacart/test - Test API connectivity
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Instacart API connectivity');
    
    const testResults = {
      apiKeys: validateApiKeys(),
      endpoints: {
        connect: API_ENDPOINTS.CONNECT,
        catalog: API_ENDPOINTS.CATALOG,
        developer: API_ENDPOINTS.DEVELOPER
      },
      timestamp: new Date().toISOString()
    };
    
    // Try to make a simple API call to test connectivity
    if (testResults.apiKeys) {
      try {
        await instacartApiCall('/retailers?limit=1', 'GET', null, 'CONNECT');
        testResults.connectivity = 'success';
      } catch (error) {
        testResults.connectivity = 'failed';
        testResults.error = error.message;
      }
    } else {
      testResults.connectivity = 'no-keys';
    }
    
    res.json({
      success: true,
      test: testResults
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
});

// POST /api/instacart/batch-search - Search for multiple items at once
router.post('/batch-search', async (req, res) => {
  try {
    const { items, retailerId, zipCode } = req.body;
    
    console.log(`🔍 Batch searching ${items?.length || 0} items at ${retailerId}`);
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        const searchParams = {
          q: item.name || item.query,
          retailer_id: retailerId,
          limit: 3
        };
        
        if (zipCode) searchParams.zip_code = zipCode;
        
        let products = [];
        
        if (validateApiKeys()) {
          try {
            const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams, 'CATALOG');
            products = (searchResults.items || searchResults.data || []).slice(0, 3).map(product => ({
              id: product.id || product.product_id,
              sku: product.sku || product.retailer_sku,
              name: product.name || product.display_name,
              price: product.price || product.pricing?.price || 0,
              confidence: calculateConfidence(item, product)
            }));
          } catch (apiError) {
            console.log(`⚠️ API search failed for "${item.name}", using mock data`);
            products = generateMockProducts(item.name, item, retailerId).slice(0, 3);
          }
        } else {
          products = generateMockProducts(item.name, item, retailerId).slice(0, 3);
        }
        
        results.push({
          originalItem: item,
          matches: products,
          bestMatch: products[0] || null
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error searching for item "${item.name}":`, error);
        results.push({
          originalItem: item,
          matches: [],
          bestMatch: null,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Batch search completed: ${results.length} items processed`);
    
    res.json({
      success: true,
      results,
      summary: {
        totalItems: items.length,
        itemsWithMatches: results.filter(r => r.matches.length > 0).length,
        itemsWithErrors: results.filter(r => r.error).length
      }
    });
    
  } catch (error) {
    console.error('Batch search error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch search failed',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Instacart API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize API on module load
console.log('🚀 Initializing Instacart API routes...');
validateApiKeys();

module.exports = router;