// server/routes/instacartRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authMiddleware } = require('../middleware/authMiddleware');

// Instacart API configuration
const INSTACART_API_BASE = process.env.INSTACART_API_BASE || 'https://api.instacart.com';
const INSTACART_CLIENT_ID = process.env.INSTACART_CLIENT_ID;
const INSTACART_CLIENT_SECRET = process.env.INSTACART_CLIENT_SECRET;

// Helper function to get Instacart access token
const getInstacartAccessToken = async () => {
  try {
    const response = await axios.post(`${INSTACART_API_BASE}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: INSTACART_CLIENT_ID,
      client_secret: INSTACART_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Instacart access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Instacart API');
  }
};

// Helper function to make authenticated Instacart API calls
const instacartApiCall = async (endpoint, method = 'GET', data = null, accessToken = null) => {
  try {
    const token = accessToken || await getInstacartAccessToken();
    
    const config = {
      method,
      url: `${INSTACART_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making Instacart API call to ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// GET /api/instacart/retailers - Get available retailers for a location
router.get('/retailers', async (req, res) => {
  try {
    console.log('🏪 Fetching available retailers');
    
    const { zipCode } = req.query;
    
    // If we have real Instacart API access, use it
    if (INSTACART_CLIENT_ID && INSTACART_CLIENT_SECRET) {
      const retailers = await instacartApiCall(`/v3/retailers${zipCode ? `?zip_code=${zipCode}` : ''}`);
      res.json({ success: true, retailers: retailers.data || [] });
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
    
    // If we have real Instacart API access, use it
    if (INSTACART_CLIENT_ID && INSTACART_CLIENT_SECRET) {
      const searchParams = {
        query: query,
        retailer_id: retailerId,
        limit: 10
      };
      
      if (zipCode) searchParams.zip_code = zipCode;
      if (category) searchParams.category = category;
      
      const searchResults = await instacartApiCall('/v3/catalog/search', 'POST', searchParams);
      
      // Transform API response to our format
      const products = (searchResults.data || []).map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.pricing?.price || 0,
        size: product.package_size,
        brand: product.brand,
        image: product.image_url,
        availability: product.availability,
        confidence: calculateConfidence(originalItem, product)
      }));
      
      res.json({ success: true, products });
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
router.post('/cart/create', authMiddleware, async (req, res) => {
  try {
    const { retailerId, zipCode, items, userId, metadata } = req.body;
    
    console.log(`🛒 Creating Instacart cart for user ${userId} with ${items?.length || 0} items`);
    
    if (!retailerId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'RetailerId and items are required' 
      });
    }
    
    // If we have real Instacart API access, use it
    if (INSTACART_CLIENT_ID && INSTACART_CLIENT_SECRET) {
      // Step 1: Create cart
      const cartData = {
        retailer_id: retailerId,
        ...(zipCode && { zip_code: zipCode })
      };
      
      const cartResponse = await instacartApiCall('/v3/carts', 'POST', cartData);
      const cartId = cartResponse.data.id;
      
      console.log(`✅ Created cart: ${cartId}`);
      
      // Step 2: Add items to cart
      const cartItems = items.map(item => ({
        retailer_sku: item.retailer_sku,
        quantity: item.quantity
      }));
      
      const addItemsResponse = await instacartApiCall(
        `/v3/carts/${cartId}/items`, 
        'POST', 
        { items: cartItems }
      );
      
      console.log(`✅ Added ${cartItems.length} items to cart`);
      
      // Step 3: Get checkout URL
      const checkoutUrl = `${INSTACART_API_BASE}/checkout/${cartId}?source=CartSmash`;
      
      // Log successful integration
      if (metadata) {
        console.log('📊 Integration metadata:', metadata);
      }
      
      res.json({
        success: true,
        cartId,
        checkoutUrl,
        itemsAdded: cartItems.length,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          apiVersion: 'v3'
        }
      });
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
router.get('/cart/:cartId/status', authMiddleware, async (req, res) => {
  try {
    const { cartId } = req.params;
    
    console.log(`📊 Getting cart status: ${cartId}`);
    
    // If we have real Instacart API access, use it
    if (INSTACART_CLIENT_ID && INSTACART_CLIENT_SECRET) {
      const cartStatus = await instacartApiCall(`/v3/carts/${cartId}`);
      res.json({ success: true, cart: cartStatus.data });
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

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Instacart API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;