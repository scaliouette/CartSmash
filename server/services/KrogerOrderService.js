// server/services/KrogerOrderService.js - Complete Kroger ordering system

const axios = require('axios');
const tokenStore = require('./TokenStore');  // ADD THIS AT TOP

class KrogerOrderService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api-ce.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    
    this.scopes = {
      products: 'product.compact',
      cart: 'cart.basic:write',
      profile: 'profile.compact'
    };
    
    // CHANGE: Use TokenStore's maps instead of creating new ones
    this.tokens = tokenStore.tokens;  // Use shared tokens
    this.refreshTokens = tokenStore.refreshTokens;  // Use shared refresh tokens
    
    console.log('🛒 Kroger Order Service initialized');
    console.log(`   Active users: ${this.tokens.size}`);
  }

  /**
   * Get authorization URL for user to authenticate with Kroger
   */
  getAuthURL(userId, requiredScopes = ['cart.basic:write', 'profile.compact']) {
  // REMOVED 'order.basic:write' from default scopes
  const state = this.generateState(userId);
  const scope = requiredScopes.join(' ')
  
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scope,
      state: state
    });
    
    const authURL = `${this.baseURL}/connect/oauth2/authorize?${params.toString()}`;
    
    console.log(`🔐 Generated auth URL for user ${userId}`);
    return {
      authURL: authURL,
      state: state,
      expiresIn: 300 // 5 minutes to complete auth
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, state, userId) {
    try {
      console.log(`🔄 Exchanging auth code for tokens - User: ${userId}`);
      
      // Verify state matches
      if (!this.verifyState(state, userId)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }
      
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.baseURL}/connect/oauth2/token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const tokenData = response.data;
      
      // Store tokens securely
      this.tokens.set(userId, {
        accessToken: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope
      });
      
      if (tokenData.refresh_token) {
        this.refreshTokens.set(userId, tokenData.refresh_token);
      }
      
      console.log(`✅ Token exchange successful for user ${userId}`);
      return {
        success: true,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      };
      
    } catch (error) {
      console.error('❌ Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Kroger');
    }
  }

  /**
   * Check if user has valid authentication
   */
 async ensureUserAuth(userId) {
  // REMOVE THIS LINE - tokenStore already imported at top
  // const tokenStore = require('./TokenStore');
  
  let tokenInfo = tokenStore.getTokens(userId);  // Just use it directly
  
  // If found in persistent store, update memory cache
  if (tokenInfo && !this.tokens.has(userId)) {
    this.tokens.set(userId, tokenInfo);
    const refreshToken = tokenStore.getRefreshToken(userId);
    if (refreshToken) {
      this.refreshTokens.set(userId, refreshToken);
    }
  }
  
  // Now check memory cache
  tokenInfo = this.tokens.get(userId);
  
  if (!tokenInfo) {
    return { 
      authenticated: false, 
      reason: 'No tokens found - user needs to complete OAuth flow' 
    };
  }
  
  if (Date.now() >= tokenInfo.expiresAt) {
    // Try to refresh token
    const refreshed = await this.refreshUserToken(userId);
    if (!refreshed) {
      return { 
        authenticated: false, 
        reason: 'Token expired and refresh failed' 
      };
    }
    tokenInfo = this.tokens.get(userId);
  }
  
  return { 
    authenticated: true, 
    tokenInfo: tokenInfo
  };
}

  /**
   * Refresh user's access token
   */
  async refreshUserToken(userId) {
    const refreshToken = this.refreshTokens.get(userId);
    
    if (!refreshToken) {
      console.log(`⚠️ No refresh token for user ${userId}`);
      return false;
    }
    
    try {
      console.log(`🔄 Refreshing token for user ${userId}`);
      
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.baseURL}/connect/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const tokenData = response.data;
      
      // Update stored tokens
      this.tokens.set(userId, {
        accessToken: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope
      });
      
      if (tokenData.refresh_token) {
        this.refreshTokens.set(userId, tokenData.refresh_token);
      }
      
      console.log(`✅ Token refreshed for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Token refresh failed for user ${userId}:`, error.response?.data || error.message);
      this.tokens.delete(userId);
      this.refreshTokens.delete(userId);
      return false;
    }
  }

  /**
   * Make authenticated API request for a specific user
   */
  async makeUserRequest(userId, method, endpoint, data = null) {
  console.log(`📡 Making API request for user: "${userId}"`);
  console.log(`   Method: ${method} ${endpoint}`);
  
  const authCheck = await this.ensureUserAuth(userId);
  
  if (!authCheck.authenticated) {
    console.log(`❌ User not authenticated: ${authCheck.reason}`);
    throw new Error(`User not authenticated: ${authCheck.reason}`);
  }
  
  console.log(`✅ User authenticated, token exists`);
  console.log(`   Token (first 20 chars): ${authCheck.tokenInfo.accessToken.substring(0, 20)}...`);
  
  const config = {
    method: method,
    url: `${this.baseURL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authCheck.tokenInfo.accessToken}`,
      'Accept': 'application/json'
    }
  };
  
  console.log(`   Full URL: ${config.url}`);
  console.log(`   Auth header set: ${config.headers.Authorization.substring(0, 30)}...`);
  
  if (data) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    console.log(`✅ API request successful`);
    return response.data;
  } catch (error) {
    console.error(`❌ API request failed [${method} ${endpoint}]:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

  /**
   * Get user's Kroger cart
   */
  async getUserCart(userId) {
    try {
      console.log(`🛒 Getting Kroger cart for user ${userId}`);
      const cartData = await this.makeUserRequest(userId, 'GET', '/cart');
      return cartData;
    } catch (error) {
      if (error.response?.status === 404) {
        // No cart exists, return empty cart
        return { data: { items: [] } };
      }
      throw error;
    }
  }

  /**
   * Add items to user's Kroger cart
   */

async addItemsToCart(userId, items) {
  try {
    console.log(`➕ Adding ${items.length} items to Kroger cart for user ${userId}`);
    
    // Remove duplicates first
    const uniqueItems = [];
    const seenUPCs = new Set();
    
    for (const item of items) {
      if (!seenUPCs.has(item.upc)) {
        seenUPCs.add(item.upc);
        uniqueItems.push({
          upc: item.upc,
          quantity: parseInt(item.quantity) || 1,
          modality: item.modality || 'PICKUP'
        });
      } else {
        // If duplicate, increase quantity of existing item
        const existing = uniqueItems.find(i => i.upc === item.upc);
        if (existing) {
          existing.quantity += parseInt(item.quantity) || 1;
        }
      }
    }
    
    console.log(`📦 Sending ${uniqueItems.length} unique items to cart`);
    
    // First, try to get the existing cart
    let cartExists = false;
    try {
      const existingCart = await this.makeUserRequest(userId, 'GET', '/cart');
      cartExists = true;
      console.log('✅ Cart exists, will add items to it');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('📦 No cart exists, will create new one');
        cartExists = false;
      } else {
        throw error;
      }
    }
    
    // Kroger API typically uses PUT for cart operations
    // Try PUT first, then fall back to POST if needed
    let result;
    try {
      result = await this.makeUserRequest(
        userId, 
        'PUT',  // Changed to PUT - Kroger typically uses PUT for cart updates
        '/cart',  // FIXED: Removed extra spaces
        { items: uniqueItems }
      );
      console.log(`✅ Successfully added items to cart using PUT`);
    } catch (putError) {
      // If PUT fails, try POST
      if (putError.response?.status === 405 || putError.response?.status === 404) {
        console.log('⚠️ PUT failed, trying POST method...');
        try {
          result = await this.makeUserRequest(
            userId, 
            'POST',
            '/cart',  // No spaces!
            { items: uniqueItems }
          );
          console.log(`✅ Successfully added items to cart using POST`);
        } catch (postError) {
          // If both fail, try the /cart/add endpoint
          console.log('⚠️ POST to /cart failed, trying /cart/add endpoint...');
          result = await this.makeUserRequest(
            userId,
            'PUT',
            '/cart/add',  // Alternative endpoint
            { items: uniqueItems }
          );
          console.log(`✅ Successfully added items using /cart/add endpoint`);
        }
      } else {
        throw putError;
      }
    }
    
    console.log(`✅ Successfully added ${uniqueItems.length} items to cart for user ${userId}`);
    return result;
    
  } catch (error) {
    // Log detailed error information
    console.error(`❌ Failed to add items to cart: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error(`   Status code: ${error.response.status}`);
    }
    throw error;
  }
}



  /**
   * Convert Cart Smash items to Kroger cart format
   */
async prepareCartItems(smartCartItems, storeId, userId) {
  console.log(`🔄 Preparing ${smartCartItems.length} Cart Smash items for Kroger`);
  console.log(`📍 Using user token for: ${userId}`);
  
  const preparedItems = [];
  const failedItems = [];
  
  // Process items in smaller batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < smartCartItems.length; i += batchSize) {
    const batch = smartCartItems.slice(i, Math.min(i + batchSize, smartCartItems.length));
    
    await Promise.all(batch.map(async (item) => {
      try {
        // If item already has UPC from previous Kroger validation, use it
        if (item.upc) {
          preparedItems.push({
            upc: item.upc,
            quantity: parseInt(item.quantity) || 1,
            originalItem: item,
            modality: 'PICKUP'
          });
          return;
        }
        
        // If no UPC, search for the product using the USER'S token
        const searchTerm = item.productName || item.itemName || item.name;
        
        if (!searchTerm) {
          failedItems.push({
            item: item,
            reason: 'No product name available'
          });
          return;
        }
        
        console.log(`🔍 Searching for: "${searchTerm}" with user token`);
        
        try {
          // Build the search URL
          const searchParams = new URLSearchParams({
            'filter.term': searchTerm,
            'filter.locationId': storeId || '01400943',
            'filter.limit': '5'
          });
          
          // Use the user's authenticated token to search
          const searchResults = await this.makeUserRequest(
            userId,
            'GET',
            `/products?${searchParams.toString()}`
          );
          
          const products = searchResults.data || [];
          
          if (products.length > 0) {
            const product = products[0]; // Take the first/best match
            
            // Extract UPC - Kroger uses different field names
            let upc = null;
            
            // Try different possible UPC locations in Kroger's response
            if (product.upc) {
              upc = product.upc;
            } else if (product.upcs && product.upcs.length > 0) {
              upc = product.upcs[0];
            } else if (product.items && product.items[0]?.upc) {
              upc = product.items[0].upc;
            } else if (product.productId) {
              // Fall back to productId if no UPC found
              upc = product.productId;
              console.log(`⚠️ Using productId as UPC for ${product.description}`);
            }
            
            if (upc) {
              preparedItems.push({
                upc: upc,
                quantity: parseInt(item.quantity) || 1,
                originalItem: item,
                modality: 'PICKUP',
                foundProduct: {
                  id: product.productId,
                  name: product.description || product.brand,
                  brand: product.brand,
                  size: product.items?.[0]?.size,
                  price: product.items?.[0]?.price?.regular || product.items?.[0]?.price?.promo
                }
              });
              
              console.log(`✅ Found: ${product.description || searchTerm} (UPC: ${upc})`);
            } else {
              console.log(`⚠️ No UPC found for product: ${product.description}`);
              failedItems.push({
                item: item,
                reason: 'Product found but no UPC available',
                product: product.description
              });
            }
          } else {
            console.log(`❌ No products found for: "${searchTerm}"`);
            failedItems.push({
              item: item,
              reason: 'Product not found in Kroger catalog',
              searchTerm: searchTerm
            });
          }
        } catch (searchError) {
          // Handle specific error cases
          if (searchError.response?.status === 401) {
            console.error(`🔐 User token expired or invalid for ${userId}`);
            throw new Error('User authentication expired. Please re-authenticate with Kroger.');
          }
          
          console.log(`❌ Search failed for "${searchTerm}":`, searchError.message);
          failedItems.push({
            item: item,
            reason: `Search error: ${searchError.message}`,
            searchTerm: searchTerm
          });
        }
      } catch (error) {
        console.error(`❌ Error processing item:`, error.message);
        failedItems.push({
          item: item,
          reason: error.message
        });
      }
    }));
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < smartCartItems.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Prepared ${preparedItems.length} items, ${failedItems.length} failed`);
  
  // Log detailed failure reasons
  if (failedItems.length > 0) {
    console.log('📋 Failed items summary:');
    const reasonCounts = {};
    failedItems.forEach(f => {
      reasonCounts[f.reason] = (reasonCounts[f.reason] || 0) + 1;
    });
    Object.entries(reasonCounts).forEach(([reason, count]) => {
      console.log(`   - ${reason}: ${count} items`);
    });
  }
  
  return {
    preparedItems: preparedItems,
    failedItems: failedItems,
    summary: {
      total: smartCartItems.length,
      prepared: preparedItems.length,
      failed: failedItems.length,
      successRate: smartCartItems.length > 0 
        ? (preparedItems.length / smartCartItems.length * 100).toFixed(1) + '%'
        : '0%'
    }
  };
}

// Add this diagnostic method to KrogerOrderService.js to test cart endpoints

async diagnoseCartEndpoints(userId) {
  console.log('🔬 Running cart endpoint diagnostics...\n');
  
  const testItem = {
    upc: "0001111097139", // Use a valid UPC from your successful searches
    quantity: 1,
    modality: "PICKUP"
  };
  
  const endpoints = [
    // GET endpoints to check cart existence
    { method: 'GET', path: '/cart', description: 'Get current cart' },
    { method: 'GET', path: '/carts', description: 'Get all carts' },
    { method: 'GET', path: '/cart/items', description: 'Get cart items' },
    
    // POST endpoints for cart creation
    { method: 'POST', path: '/cart', body: { items: [testItem] }, description: 'Create cart with items' },
    { method: 'POST', path: '/carts', body: {}, description: 'Create empty cart' },
    
    // PUT endpoints for adding items
    { method: 'PUT', path: '/cart', body: { items: [testItem] }, description: 'Update cart with items' },
    { method: 'PUT', path: '/cart/add', body: { items: [testItem] }, description: 'Add items to cart' },
    { method: 'PUT', path: '/cart/items', body: { items: [testItem] }, description: 'Update cart items' },
    
    // PATCH endpoints as alternative
    { method: 'PATCH', path: '/cart', body: { items: [testItem] }, description: 'Patch cart with items' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await this.makeUserRequest(
        userId, 
        endpoint.method, 
        endpoint.path,
        endpoint.body || null
      );
      
      const result = {
        success: true,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        description: endpoint.description,
        status: response.status || 200,
        hasData: !!response.data,
        cartId: response.data?.id || response.data?.cartId || null
      };
      
      results.push(result);
      console.log(`✅ ${endpoint.method} ${endpoint.path}: SUCCESS`);
      console.log(`   ${endpoint.description}`);
      if (result.cartId) console.log(`   Cart ID: ${result.cartId}`);
      
    } catch (error) {
      const result = {
        success: false,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        description: endpoint.description,
        status: error.response?.status || 'Network Error',
        error: error.response?.data?.message || error.message
      };
      
      results.push(result);
      console.log(`❌ ${endpoint.method} ${endpoint.path}: ${result.status}`);
      if (error.response?.data?.message) {
        console.log(`   Error: ${error.response.data.message}`);
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Analyze results
  console.log('\n📊 Diagnostic Summary:');
  console.log('=' .repeat(50));
  
  const workingEndpoints = results.filter(r => r.success);
  const failedEndpoints = results.filter(r => !r.success);
  
  console.log(`✅ Working endpoints: ${workingEndpoints.length}`);
  workingEndpoints.forEach(r => {
    console.log(`   - ${r.endpoint}: ${r.description}`);
  });
  
  console.log(`\n❌ Failed endpoints: ${failedEndpoints.length}`);
  const errorGroups = {};
  failedEndpoints.forEach(r => {
    if (!errorGroups[r.status]) errorGroups[r.status] = [];
    errorGroups[r.status].push(r.endpoint);
  });
  
  Object.entries(errorGroups).forEach(([status, endpoints]) => {
    console.log(`   ${status}: ${endpoints.join(', ')}`);
  });
  
  // Recommend best approach
  console.log('\n💡 Recommended approach:');
  if (workingEndpoints.find(e => e.endpoint === 'PUT /cart')) {
    console.log('   Use PUT /cart to add items');
  } else if (workingEndpoints.find(e => e.endpoint === 'POST /cart')) {
    console.log('   Use POST /cart to add items');
  } else if (workingEndpoints.find(e => e.endpoint === 'PUT /cart/add')) {
    console.log('   Use PUT /cart/add to add items');
  } else {
    console.log('   No standard cart endpoint found - check Kroger API documentation');
  }
  
  return {
    summary: {
      totalTested: endpoints.length,
      successful: workingEndpoints.length,
      failed: failedEndpoints.length
    },
    workingEndpoints,
    failedEndpoints,
    recommendations: this.getCartRecommendations(workingEndpoints)
  };
}

// Helper method for recommendations
getCartRecommendations(workingEndpoints) {
  const recommendations = [];
  
  if (workingEndpoints.find(e => e.endpoint.includes('GET /cart'))) {
    recommendations.push('Cart retrieval is working');
  }
  
  const addMethods = ['PUT /cart', 'POST /cart', 'PUT /cart/add', 'PUT /cart/items'];
  const workingAdd = workingEndpoints.find(e => addMethods.includes(e.endpoint));
  
  if (workingAdd) {
    recommendations.push(`Use ${workingAdd.endpoint} to add items to cart`);
  } else {
    recommendations.push('No working method found for adding items - check API docs');
  }
  
  return recommendations;
}

// Add this to your routes to test it:
// In kroger-orders.js, add a test endpoint:
/*
router.get('/test-cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await krogerOrderService.diagnoseCartEndpoints(userId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/


  
  /**
 * Send complete Cart Smash to Kroger
 */
async sendCartToKroger(userId, smartCartItems, options = {}) {
  try {
    const {
      storeId = process.env.KROGER_DEFAULT_STORE || '01400943',
      modality = 'PICKUP', // PICKUP or DELIVERY
      clearExistingCart = false
    } = options;
    
    console.log(`🚀 Sending Cart Smash to Kroger for user ${userId}`);
    console.log(`📍 Store: ${storeId}, Modality: ${modality}`);
    
    // Step 1: Prepare Cart Smash items for Kroger - PASS userId HERE
    const preparation = await this.prepareCartItems(smartCartItems, storeId, userId);
    
    if (preparation.preparedItems.length === 0) {
      // If no items could be prepared, provide helpful error message
      console.error('❌ No items could be prepared. Possible causes:');
      console.error('   1. User token may have expired - try re-authenticating');
      console.error('   2. Items not found in Kroger catalog');
      console.error('   3. Network or API issues');
      
      throw new Error('No items could be prepared for Kroger cart. Please check authentication and try again.');
    }
    
    // Step 2: Clear existing cart if requested
    if (clearExistingCart) {
      try {
        await this.makeUserRequest(userId, 'DELETE', '/cart');
        console.log('🗑️ Cleared existing Kroger cart');
      } catch (error) {
        console.warn('⚠️ Could not clear existing cart:', error.message);
      }
    }
    
    // Step 3: Add items to Kroger cart
    const addResult = await this.addItemsToCart(userId, preparation.preparedItems);
    
    // Step 4: Get updated cart to verify
    const updatedCart = await this.getUserCart(userId);
    
    const result = {
      success: true,
      krogerCartId: updatedCart.data?.id,
      itemsAdded: preparation.preparedItems.length,
      itemsFailed: preparation.failedItems.length,
      totalItems: updatedCart.data?.items?.length || 0,
      preparation: preparation,
      krogerCart: updatedCart.data,
      storeId: storeId,
      modality: modality,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Cart sent to Kroger successfully: ${result.itemsAdded}/${smartCartItems.length} items`);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send cart to Kroger:', error);
    throw error;
  }
}

  /**
   * Place order (checkout) with Kroger
   */
  async placeOrder(userId, orderDetails = {}) {
    try {
      console.log(`🛍️ Placing order with Kroger for user ${userId}`);
      
      const {
        storeId = process.env.KROGER_DEFAULT_STORE,
        modality = 'PICKUP',
        paymentMethod,
        pickupTime,
        deliveryAddress
      } = orderDetails;
      
      // Construct order payload based on Kroger's API requirements
      const orderPayload = {
        items: [], // Items should already be in cart
        fulfillment: {
          modality: modality,
          locationId: storeId
        }
      };
      
      // Add pickup-specific details
      if (modality === 'PICKUP' && pickupTime) {
        orderPayload.fulfillment.pickupTime = pickupTime;
      }
      
      // Add delivery-specific details
      if (modality === 'DELIVERY' && deliveryAddress) {
        orderPayload.fulfillment.deliveryAddress = deliveryAddress;
      }
      
      // Add payment method if provided
      if (paymentMethod) {
        orderPayload.payment = paymentMethod;
      }
      
      const orderResult = await this.makeUserRequest(userId, 'POST', '/orders', orderPayload);
      
      console.log(`✅ Order placed successfully: ${orderResult.data?.orderId}`);
      
      return {
        success: true,
        orderId: orderResult.data?.orderId,
        orderNumber: orderResult.data?.orderNumber,
        status: orderResult.data?.status,
        total: orderResult.data?.total,
        estimatedTime: orderResult.data?.estimatedTime,
        storeInfo: orderResult.data?.store,
        orderDetails: orderResult.data,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Order placement failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error('Invalid order details: ' + (error.response.data?.message || 'Bad request'));
      } else if (error.response?.status === 402) {
        throw new Error('Payment required or payment method invalid');
      } else if (error.response?.status === 409) {
        throw new Error('Order conflict - cart may be empty or items unavailable');
      }
      
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(userId, orderId) {
    try {
      console.log(`📋 Getting order status: ${orderId} for user ${userId}`);
      
      const orderData = await this.makeUserRequest(userId, 'GET', `/orders/${orderId}`);
      
      return {
        orderId: orderId,
        status: orderData.data?.status,
        items: orderData.data?.items,
        total: orderData.data?.total,
        estimatedTime: orderData.data?.estimatedTime,
        trackingInfo: orderData.data?.tracking,
        lastUpdated: orderData.data?.lastUpdated,
        storeInfo: orderData.data?.store
      };
      
    } catch (error) {
      console.error(`❌ Failed to get order status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's order history
   */
  async getOrderHistory(userId, limit = 10) {
    try {
      console.log(`📜 Getting order history for user ${userId}`);
      
      const ordersData = await this.makeUserRequest(userId, 'GET', `/orders?limit=${limit}`);
      
      return {
        orders: ordersData.data || [],
        count: ordersData.data?.length || 0,
        hasMore: ordersData.pagination?.hasNext || false
      };
      
    } catch (error) {
      console.error(`❌ Failed to get order history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId, orderId, reason = 'Customer request') {
    try {
      console.log(`❌ Cancelling order: ${orderId} for user ${userId}`);
      
      const cancelData = {
        reason: reason,
        timestamp: new Date().toISOString()
      };
      
      const result = await this.makeUserRequest(userId, 'POST', `/orders/${orderId}/cancel`, cancelData);
      
      console.log(`✅ Order cancelled successfully: ${orderId}`);
      
      return {
        success: true,
        orderId: orderId,
        status: 'CANCELLED',
        reason: reason,
        refundInfo: result.data?.refund,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Order cancellation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  generateState(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return Buffer.from(`${userId}-${timestamp}-${random}`).toString('base64');
  }

  verifyState(state, userId) {
    try {
      const decoded = Buffer.from(state, 'base64').toString();
      const [stateUserId, timestamp] = decoded.split('-');
      
      // Check if state is for the correct user and not too old (5 minutes)
      if (stateUserId !== userId) return false;
      if (Date.now() - parseInt(timestamp) > 300000) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service health and user authentication status
   */
  getServiceHealth(userId = null) {
    const health = {
      service: 'kroger_orders',
      configured: !!(this.clientId && this.clientSecret && this.redirectUri),
      activeUsers: this.tokens.size,
      baseURL: this.baseURL
    };
    
    if (userId) {
      const tokenInfo = this.tokens.get(userId);
      health.userAuth = {
        authenticated: !!tokenInfo && Date.now() < tokenInfo.expiresAt,
        expiresAt: tokenInfo?.expiresAt,
        scope: tokenInfo?.scope,
        hasRefreshToken: this.refreshTokens.has(userId)
      };
    }
    
    return health;
  }

  /**
   * Clear user tokens (logout)
   */
  clearUserTokens(userId) {
    this.tokens.delete(userId);
    this.refreshTokens.delete(userId);
    console.log(`🚪 Cleared tokens for user ${userId}`);
  }
}

module.exports = KrogerOrderService;