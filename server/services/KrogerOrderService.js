// server/services/KrogerOrderService.js - Complete Kroger ordering system
const axios = require('axios');

class KrogerOrderService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api-ce.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    
    // Different scopes for different operations
    this.scopes = {
  products: 'product.compact',
  cart: 'cart.basic:write',
  // orders: 'order.basic:write',  // COMMENT OUT - not available for public API
  profile: 'profile.compact'
};
    
    // Token storage (in production, use proper session management)
    this.tokens = new Map();
    this.refreshTokens = new Map();
    
    console.log('🛒 Kroger Order Service initialized');
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
    const tokenInfo = this.tokens.get(userId);
    
    if (!tokenInfo) {
      return { authenticated: false, reason: 'No tokens found' };
    }
    
    if (Date.now() >= tokenInfo.expiresAt) {
      // Try to refresh token
      const refreshed = await this.refreshUserToken(userId);
      if (!refreshed) {
        return { authenticated: false, reason: 'Token expired and refresh failed' };
      }
    }
    
    return { authenticated: true, tokenInfo: this.tokens.get(userId) };
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
    const authCheck = await this.ensureUserAuth(userId);
    
    if (!authCheck.authenticated) {
      throw new Error(`User not authenticated: ${authCheck.reason}`);
    }
    
    const config = {
      method: method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authCheck.tokenInfo.accessToken}`,
        'Accept': 'application/json'
      }
    };
    
    if (data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ API request failed [${method} ${endpoint}]:`, error.response?.data || error.message);
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
      
      const cartItems = items.map(item => ({
        upc: item.upc,
        quantity: item.quantity || 1,
        modality: item.modality || 'PICKUP' // PICKUP or DELIVERY
      }));
      
      const requestData = {
        items: cartItems
      };
      
      const result = await this.makeUserRequest(userId, 'PUT', '/cart/add', requestData);
      console.log(`✅ Successfully added items to cart for user ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to add items to cart: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert Cart Smash items to Kroger cart format
   */
  async prepareCartItems(smartCartItems, storeId) {
    console.log(`🔄 Preparing ${smartCartItems.length} Cart Smash items for Kroger`);
    
    const preparedItems = [];
    const failedItems = [];
    
    for (const item of smartCartItems) {
      try {
        // If item has UPC from previous Kroger validation, use it
        if (item.upc) {
          preparedItems.push({
            upc: item.upc,
            quantity: item.quantity || 1,
            originalItem: item,
            modality: 'PICKUP'
          });
          continue;
        }
        
        // If no UPC, try to find the product
        if (!item.krogerProduct && (item.productName || item.itemName)) {
          // Search for the product to get UPC
          const KrogerAPIService = require('./KrogerAPIService');
          const krogerService = new KrogerAPIService();
          
          const searchResults = await krogerService.searchProducts(
            item.productName || item.itemName, 
            storeId, 
            1
          );
          
          if (searchResults.length > 0) {
            const product = searchResults[0];
            preparedItems.push({
              upc: product.upc,
              quantity: item.quantity || 1,
              originalItem: item,
              modality: 'PICKUP',
              foundProduct: product
            });
          } else {
            failedItems.push({
              item: item,
              reason: 'Product not found in Kroger catalog'
            });
          }
        } else {
          failedItems.push({
            item: item,
            reason: 'No UPC or product name available'
          });
        }
        
      } catch (error) {
        failedItems.push({
          item: item,
          reason: error.message
        });
      }
    }
    
    console.log(`✅ Prepared ${preparedItems.length} items, ${failedItems.length} failed`);
    
    return {
      preparedItems: preparedItems,
      failedItems: failedItems,
      summary: {
        total: smartCartItems.length,
        prepared: preparedItems.length,
        failed: failedItems.length,
        successRate: (preparedItems.length / smartCartItems.length * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * Send complete Cart Smash to Kroger
   */
  async sendCartToKroger(userId, smartCartItems, options = {}) {
    try {
      const {
        storeId = process.env.KROGER_DEFAULT_STORE,
        modality = 'PICKUP', // PICKUP or DELIVERY
        clearExistingCart = false
      } = options;
      
      console.log(`🚀 Sending Cart Smash to Kroger for user ${userId}`);
      console.log(`📍 Store: ${storeId}, Modality: ${modality}`);
      
      // Step 1: Prepare Cart Smash items for Kroger
      const preparation = await this.prepareCartItems(smartCartItems, storeId);
      
      if (preparation.preparedItems.length === 0) {
        throw new Error('No items could be prepared for Kroger cart');
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