// server/routes/instacartRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');

// Instacart API configuration - UPDATED 2025
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Updated API endpoint configurations for 2025
const API_ENDPOINTS = {
  DEVELOPMENT: 'https://connect.dev.instacart.tools/idp/v1',
  PRODUCTION: 'https://connect.instacart.com/idp/v1'
};

const BASE_URL = NODE_ENV === 'production' ? API_ENDPOINTS.PRODUCTION : API_ENDPOINTS.DEVELOPMENT;

// Helper function to make authenticated Instacart API calls with updated 2025 format
const instacartApiCall = async (endpoint, method = 'GET', data = null) => {
  try {
    // Ensure endpoint starts with / but don't double it
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const config = {
      method,
      url: `${BASE_URL}${cleanEndpoint}`,
      headers: {
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'User-Agent': 'CartSmash/1.0 (https://cartsmash.com)'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`📡 Making ${method} request to: ${config.url}`);
    console.log(`🔑 Using API key: ${INSTACART_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error making Instacart API call to ${endpoint}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: `${BASE_URL}${endpoint}`
    });
    throw error;
  }
};

// Helper function to validate API key on startup
const validateApiKeys = () => {
  if (INSTACART_API_KEY && INSTACART_API_KEY !== 'your_api_key_here') {
    console.log(`✅ Instacart API key configured for ${NODE_ENV} environment`);
    console.log(`🔗 Base URL: ${BASE_URL}`);
    return true;
  } else {
    console.log(`⚠️ Instacart API key missing or invalid`);
    console.log(`📝 Please set INSTACART_API_KEY environment variable`);
    console.log(`🔗 Using base URL: ${BASE_URL} (will fall back to mock data)`);
    return false;
  }
};

// GET /api/instacart/retailers - Get available retailers for a location
router.get('/retailers', async (req, res) => {
  try {
    console.log('🏪 Fetching available retailers');
    
    const { postalCode, zipCode, countryCode = 'US' } = req.query;
    
    // Support both postalCode (official) and zipCode (legacy) parameters
    const postal = postalCode || zipCode || '95670'; // Default postal code
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Use official Connect API parameters: postal_code and country_code
        const endpoint = `/retailers?postal_code=${postal}&country_code=${countryCode}`;
        const retailers = await instacartApiCall(endpoint, 'GET', null);
        
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
        return;
      } catch (error) {
        console.log('⚠️ Real API failed, falling back to mock data');
        // Fall through to mock data section
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
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
        const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams);
        
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
        return;
      } catch (error) {
        console.log('⚠️ Catalog API failed, falling back to mock data');
        // Fall through to mock data section
      }
    }
    
    // Mock search results for development (both when no API keys or when API fails)
    const mockProducts = generateMockProducts(query, originalItem, retailerId);
    res.json({ success: true, products: mockProducts });
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
// Remove authentication for development to allow easy testing
router.post('/cart/create', async (req, res) => {
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
        
        const cartResponse = await instacartApiCall('/carts', 'POST', cartData);
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
          { items: cartItems }
        );
        
        console.log(`✅ Added ${cartItems.length} items to cart`);
        
        // Step 3: Generate checkout URL
        const checkoutUrl = `https://www.instacart.com/store/checkout_v3/${cartId}?partner=CartSmash&utm_source=CartSmash&utm_medium=api`;
        
        // Get cart totals if available
        let cartTotals = null;
        try {
          const cartDetails = await instacartApiCall(`/carts/${cartId}`, 'GET', null);
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
        return;
      } catch (error) {
        console.log('⚠️ Connect API failed, falling back to mock cart');
        // Fall through to mock data section
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
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
        const cartStatus = await instacartApiCall(`/carts/${cartId}`, 'GET', null);
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
        return;
      } catch (error) {
        console.log('⚠️ Cart status API failed, returning mock data');
        // Fall through to mock data section
      }
    }
    
    // Mock response (both when no API keys or when API fails)
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
      environment: NODE_ENV,
      baseUrl: BASE_URL,
      endpoints: {
        development: API_ENDPOINTS.DEVELOPMENT,
        production: API_ENDPOINTS.PRODUCTION
      },
      timestamp: new Date().toISOString()
    };
    
    // Try to make a simple API call to test connectivity
    if (testResults.apiKeys) {
      try {
        await instacartApiCall('/retailers?limit=1', 'GET', null);
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
            const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams);
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

// POST /api/instacart/recipe/create - Create recipe page using Instacart Developer Platform API
router.post('/recipe/create', async (req, res) => {
  try {
    const { 
      title, 
      imageUrl, 
      instructions, 
      ingredients, 
      partnerUrl, 
      enablePantryItems,
      retailerKey 
    } = req.body;
    
    console.log(`🍳 Creating Instacart recipe: "${title}"`);
    
    if (!title || !instructions || !ingredients || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title, instructions, and ingredients are required'
      });
    }
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Transform ingredients to Instacart format
        const formattedIngredients = ingredients.map(ingredient => {
          const formatted = {
            name: ingredient.name || ingredient.item,
            display_text: ingredient.displayText || ingredient.name || ingredient.item
          };
          
          // Add measurements if provided
          if (ingredient.quantity && ingredient.unit) {
            formatted.measurements = [{
              quantity: parseFloat(ingredient.quantity) || 1,
              unit: ingredient.unit
            }];
          } else if (ingredient.amount) {
            // Parse amount like "2 cups" or "1 large"
            const match = ingredient.amount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
            if (match) {
              formatted.measurements = [{
                quantity: parseFloat(match[1]),
                unit: match[2]
              }];
            }
          }
          
          // Add filters if provided
          if (ingredient.brandFilters || ingredient.healthFilters) {
            formatted.filters = {};
            if (ingredient.brandFilters) {
              formatted.filters.brand_filters = Array.isArray(ingredient.brandFilters) 
                ? ingredient.brandFilters 
                : [ingredient.brandFilters];
            }
            if (ingredient.healthFilters) {
              formatted.filters.health_filters = Array.isArray(ingredient.healthFilters) 
                ? ingredient.healthFilters 
                : [ingredient.healthFilters];
            }
          }
          
          return formatted;
        });
        
        // Build recipe payload
        const recipePayload = {
          title,
          image_url: imageUrl || 'https://via.placeholder.com/400x300/4CAF50/white?text=CartSmash+Recipe',
          link_type: 'recipe',
          instructions: Array.isArray(instructions) ? instructions : [instructions],
          ingredients: formattedIngredients,
          landing_page_configuration: {
            partner_linkback_url: partnerUrl || 'https://cartsmash.com',
            enable_pantry_items: enablePantryItems !== false
          }
        };
        
        console.log('📤 Creating recipe with payload:', JSON.stringify(recipePayload, null, 2));
        
        const response = await instacartApiCall('/products/recipe', 'POST', recipePayload);
        
        console.log('✅ Recipe created successfully:', response);
        
        // Format response
        const result = {
          success: true,
          recipeId: response.products_link_url?.match(/recipes\/(\d+)/)?.[1],
          instacartUrl: response.products_link_url,
          title,
          ingredientsCount: formattedIngredients.length,
          createdAt: new Date().toISOString()
        };
        
        // Add retailer key to URL if provided
        if (retailerKey && result.instacartUrl) {
          const separator = result.instacartUrl.includes('?') ? '&' : '?';
          result.instacartUrl += `${separator}retailer_key=${retailerKey}`;
        }
        
        res.json(result);
        return;
      } catch (error) {
        console.log('⚠️ Recipe API failed, falling back to mock data');
        // Fall through to mock response
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
    const mockRecipeId = Math.floor(Math.random() * 1000000);
    const mockUrl = `https://www.instacart.com/store/recipes/${mockRecipeId}`;
    
    console.log(`✅ Mock recipe created: ${mockRecipeId}`);
    
    res.json({
      success: true,
      recipeId: mockRecipeId,
      instacartUrl: retailerKey ? `${mockUrl}?retailer_key=${retailerKey}` : mockUrl,
      title,
      ingredientsCount: ingredients.length,
      createdAt: new Date().toISOString(),
      mockMode: true
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recipe',
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