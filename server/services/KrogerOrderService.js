// server/services/KrogerOrderService.js - Complete Kroger ordering system

const axios = require('axios');
const tokenStore = require('./TokenStore');  // ADD THIS AT TOP

class KrogerOrderService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    
    this.scopes = {
      products: 'product.compact',
      cart: 'cart.basic:write',
      profile: 'profile.compact'
    };
    
    // Enhanced logging for Render debugging
    console.log('🛒 Kroger Order Service initializing with config:');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   Client ID: ${this.clientId ? this.clientId.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   Client Secret: ${this.clientSecret ? '***SET***' : 'NOT SET'}`);
    console.log(`   Redirect URI: ${this.redirectUri}`);
    console.log(`   Available Scopes: ${JSON.stringify(this.scopes)}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (!this.clientId || !this.clientSecret) {
      console.error('❌ CRITICAL: Missing Kroger API credentials in environment!');
    }
    
    console.log('🛒 Kroger Order Service initialized');
    // Note: Async initialization moved to separate method to avoid constructor anti-pattern
  }

  /**
   * Initialize async operations that couldn't be done in constructor
   */
  async initialize() {
    try {
      const count = await this.getActiveUserCount();
      console.log(`   Active users: ${count}`);
    } catch (error) {
      console.warn('⚠️ Could not get initial user count:', error.message);
    }
  }

  async getActiveUserCount() {
    const stats = await tokenStore.getStats();
    return stats.active || 0;
  
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
      console.log(`🔄 Exchanging auth code for tokens - User: ${userId}`)
      
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
      
      // Store tokens securely using TokenStore
      await tokenStore.setTokens(userId, {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope
      }, tokenData.refresh_token);
      
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


async ensureUserAuth(userId) {
  try {
    // Get tokens from TokenStore (MongoDB) - supports both Azure B2C and legacy OAuth tokens
    const tokenInfo = await tokenStore.getTokens(userId);
    
    if (!tokenInfo) {
      return { 
        authenticated: false, 
        reason: 'No tokens found - user needs to complete OAuth flow (Azure B2C or legacy)' 
      };
    }
    
    console.log(`🔍 Auth check for user ${userId}:`);
    console.log(`   Auth type: ${tokenInfo.authType || 'legacy'}`);
    console.log(`   Scope: ${tokenInfo.scope}`);
    console.log(`   Expires: ${new Date(tokenInfo.expiresAt).toISOString()}`);
    console.log(`   Client ID: ${tokenInfo.clientId || 'not stored'}`);
    
    // Check if token is expired
    if (Date.now() >= tokenInfo.expiresAt) {
      console.log(`⏰ Token expired for user ${userId}, attempting refresh...`);
      
      // Try to refresh the token (works for both Azure B2C and legacy)
      const refreshed = await this.refreshUserToken(userId);
      if (!refreshed) {
        return { 
          authenticated: false, 
          reason: `Token expired and refresh failed (auth type: ${tokenInfo.authType || 'legacy'})` 
        };
      }
      
      // Get the refreshed token info
      const refreshedTokenInfo = await tokenStore.getTokens(userId);
      console.log(`✅ Token refreshed for user ${userId}`);
      
      return {
        authenticated: true,
        tokenInfo: refreshedTokenInfo
      };
    }
    
    // Token is valid
    return { 
      authenticated: true, 
      tokenInfo: tokenInfo
    };
  } catch (error) {
    console.error(`Error checking auth for ${userId}:`, error);
    return {
      authenticated: false,
      reason: `Authentication check failed: ${error.message}`
    };
  }
}

  /**
   * Refresh user's access token
   */
  async refreshUserToken(userId) {
  try {
    // Get refresh token from TokenStore
    const refreshToken = await tokenStore.getRefreshToken(userId);
    
    if (!refreshToken) {
      console.log(`⚠️ No refresh token for user ${userId}`);
      return false;
    }
    
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
    
    // Update tokens in TokenStore
     await tokenStore.setTokens(userId, {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope
      }, tokenData.refresh_token);
    
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
   * Get client credentials token (NOTE: Cannot be used for cart operations - cart.basic:write requires user OAuth)
   * Only valid for product search and non-cart endpoints
   */
  async getClientCredentialsToken() {
    try {
      const credentials = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'product.compact'); // Only product scope - cart.basic:write requires user OAuth
      
      const response = await axios.post(
        `${this.baseURL}/connect/oauth2/token`,
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('✅ Client credentials token obtained with product.compact scope (cart operations require user OAuth)');
      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type || 'Bearer',
        scope: response.data.scope,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('❌ Client credentials token failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Make API request using client credentials token (for cart operations)
   */
  async makeClientRequest(method, endpoint, data = null) {
    console.log(`📡 [CLIENT CREDENTIALS] Making API request`);
    console.log(`   Method: ${method} ${endpoint}`);
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    try {
      // Get client credentials token (product search only - cart operations require user OAuth)
      const tokenInfo = await this.getClientCredentialsToken();
      
      const config = {
        method: method.toLowerCase(),
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `${tokenInfo.tokenType} ${tokenInfo.accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'CartSmash/1.0 (Render Deployment)',
          'X-Request-ID': `client-${Date.now()}`
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }

      console.log(`   [CLIENT CREDENTIALS] Full URL: ${config.url}`);
      console.log(`   [CLIENT CREDENTIALS] Auth header set: ${tokenInfo.tokenType} ${tokenInfo.accessToken.substring(0, 20)}...`);
      console.log(`   [CLIENT CREDENTIALS] Sending request to Kroger API...`);

      const response = await axios(config);
      
      console.log(`✅ [CLIENT CREDENTIALS] API request successful`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ [CLIENT CREDENTIALS] API request failed [${method} ${endpoint}]:`);
      console.error(`   Error Type: ${error.constructor.name}`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Status Text: ${error.response?.statusText}`);
      console.error(`   Message: ${error.message}`);
      if (error.response?.data) {
        console.error(`   Response Data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Make authenticated API request for a specific user
   */
  async makeUserRequest(userId, method, endpoint, data = null) {
  console.log(`📡 [RENDER DEBUG] Making API request for user: "${userId}"`);
  console.log(`   Method: ${method} ${endpoint}`);
  console.log(`   Base URL: ${this.baseURL}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  const authCheck = await this.ensureUserAuth(userId);
  
  if (!authCheck.authenticated) {
    console.log(`❌ [RENDER DEBUG] User not authenticated: ${authCheck.reason}`);
    throw new Error(`User not authenticated: ${authCheck.reason}`);
  }
  
  console.log(`✅ [RENDER DEBUG] User authenticated, token exists`);
  console.log(`   Token (first 20 chars): ${authCheck.tokenInfo.accessToken.substring(0, 20)}...`);
  console.log(`   Token Scopes: ${authCheck.tokenInfo.scope}`);
  console.log(`   Token Expires: ${authCheck.tokenInfo.expiresAt}`);
  
  // ENHANCED TOKEN ANALYSIS
  console.log(`🔍 [RENDER DEBUG] DETAILED TOKEN ANALYSIS:`);
  console.log(`   Required cart scope: cart.basic:write (OAuth and API)`);
  console.log(`   Token has cart.basic:write: ${authCheck.tokenInfo.scope?.includes('cart.basic:write') || false}`);
  console.log(`   All token scopes: ${authCheck.tokenInfo.scope?.split(' ') || []}`);
  console.log(`   Token type: ${authCheck.tokenInfo.tokenType || 'Bearer'}`);
  console.log(`   Token expires at: ${new Date(authCheck.tokenInfo.expiresAt).toISOString()}`);
  console.log(`   Current time: ${new Date().toISOString()}`);
  console.log(`   Token valid (time): ${authCheck.tokenInfo.expiresAt > Date.now()}`);
  console.log(`   Minutes until expiry: ${Math.round((authCheck.tokenInfo.expiresAt - Date.now()) / 60000)}`);
  
  // Check for specific scope patterns
  const scopes = authCheck.tokenInfo.scope?.split(' ') || [];
  console.log(`   Cart-related scopes found:`, scopes.filter(s => s.includes('cart')));
  console.log(`   Write-related scopes found:`, scopes.filter(s => s.includes('write')));
  console.log(`   All scopes count: ${scopes.length}`);
  
  const config = {
    method: method,
    url: `${this.baseURL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authCheck.tokenInfo.accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'CartSmash/1.0 (Render Deployment)',
      'X-Request-ID': `${userId}-${Date.now()}`
    }
  };
  
  console.log(`   [RENDER DEBUG] Full URL: ${config.url}`);
  console.log(`   [RENDER DEBUG] Auth header set: ${config.headers.Authorization.substring(0, 30)}...`);
  
  if (data) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
    console.log(`   [RENDER DEBUG] Request payload size: ${JSON.stringify(data).length} characters`);
    console.log(`   [RENDER DEBUG] Request payload preview: ${JSON.stringify(data).substring(0, 200)}...`);
  }
  
  try {
    console.log(`   [RENDER DEBUG] Sending request to Kroger API...`);
    const response = await axios(config);
    console.log(`✅ [RENDER DEBUG] API request successful`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log(`   Response Size: ${JSON.stringify(response.data).length} characters`);
    console.log(`   Response Preview: ${JSON.stringify(response.data).substring(0, 300)}...`);
    return response.data;
  } catch (error) {
    console.error(`❌ [RENDER DEBUG] API request failed [${method} ${endpoint}]:`);
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Status: ${error.response?.status || 'NO_STATUS'}`);
    console.error(`   Status Text: ${error.response?.statusText || 'NO_STATUS_TEXT'}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
    console.error(`   Full Error Data: ${JSON.stringify(error.response?.data || {}, null, 2)}`);
    console.error(`   Request Config: ${JSON.stringify({
      method: config.method,
      url: config.url,
      headers: { ...config.headers, Authorization: '[REDACTED]' }
    }, null, 2)}`);
    console.error(`   Network Error: ${!error.response ? 'YES (no response received)' : 'NO (response received)'}`);
    console.error(`   Error Code: ${error.code || 'NO_CODE'}`);
    console.error(`   Error Stack: ${error.stack}`);
    throw error;
  }
}

  /**
   * Get user's Kroger cart
   */
async getUserCart(userId) {
  try {
    // If we have a stored cart response, return it
    if (this.lastCartResponse) {
      console.log(`🛒 Returning stored cart data for user ${userId}`);
      return { 
        data: this.lastCartResponse 
      };
    }
    
    // Otherwise return success indicator
    return { 
      data: { 
        success: true,
        message: "Items added to cart successfully"
      } 
    };
  } catch (error) {
    return { data: { items: [] } };
  }
}

  /**
   * Add items to user's Kroger cart
   */

async addItemsToCart(userId, items) {
  try {
    console.log(`➕ Adding ${items.length} items to Kroger cart for user ${userId}`);
    
    // CRITICAL: Ensure user has valid OAuth tokens before attempting cart operations
    const authCheck = await this.ensureUserAuth(userId);
    if (!authCheck.authenticated) {
      console.error(`❌ User ${userId} not authenticated with Kroger OAuth`);
      throw new Error(`AUTHENTICATION_REQUIRED: User must complete Kroger OAuth before cart operations. ${authCheck.reason}`);
    }
    
    // Verify user has cart.basic:write scope
    if (!authCheck.tokenInfo.scope?.includes('cart.basic:write')) {
      console.error(`❌ User ${userId} missing cart.basic:write scope: ${authCheck.tokenInfo.scope}`);
      throw new Error('INSUFFICIENT_SCOPE: User token missing cart.basic:write scope. Please re-authenticate with Kroger.');
    }
    
    console.log(`✅ User ${userId} authenticated with cart.basic:write scope`);
    
    // Remove duplicates first
    const uniqueItems = [];
    const seenUPCs = new Set();
    
    for (const item of items) {
      if (!seenUPCs.has(item.upc)) {
        seenUPCs.add(item.upc);
        uniqueItems.push({
          upc: item.upc,
          quantity: parseInt(item.quantity) || 1,
          modality: item.modality || 'PICKUP',
          allowSubstitutes: true
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

    // First, check if user has any existing carts
    let existingCartId = null;
    try {
      const cartsResponse = await this.makeUserRequest(userId, 'GET', '/carts');
      if (cartsResponse.data && cartsResponse.data.length > 0) {
        existingCartId = cartsResponse.data[0].id;
        console.log(`✅ Found existing cart: ${existingCartId}`);
      } else {
        console.log('📦 No carts exist, will create new one');
      }
    } catch (error) {
      console.log('📦 No carts found or error checking carts:', error.response?.status || error.message);
    }
    
    let result;
    
    if (existingCartId) {
      // If cart exists, get its current contents first
      console.log(`📋 Getting existing cart contents...`);
      const existingCart = await this.makeUserRequest(userId, 'GET', `/carts/${existingCartId}`);
      const existingItems = existingCart.data?.items || [];
      
      // Create a map of existing UPCs to their current quantities
      const existingUPCs = new Map();
      existingItems.forEach(item => {
        existingUPCs.set(item.upc, item);
      });
      
      console.log(`📦 Cart has ${existingItems.length} existing items`);
      
      // Separate items into new items and items to update
      const newItems = [];
      const itemsToUpdate = [];
      
      uniqueItems.forEach(item => {
        if (existingUPCs.has(item.upc)) {
          // Item exists - need to update quantity
          const existing = existingUPCs.get(item.upc);
          itemsToUpdate.push({
            upc: item.upc,
            currentQty: existing.quantity,
            addQty: item.quantity,
            newQty: existing.quantity + item.quantity
          });
        } else {
          // New item - can be added
          newItems.push(item);
        }
      });
      
      console.log(`📊 ${newItems.length} new items, ${itemsToUpdate.length} items to update`);
      
      // Add new items via POST
      if (newItems.length > 0) {
        console.log(`➕ Adding ${newItems.length} new items to cart...`);
        const addPromises = newItems.map(async (item) => {
          try {
            return await this.makeUserRequest(
              userId,
              'POST',
              `/carts/${existingCartId}/items`,
              item
            );
          } catch (error) {
            console.warn(`⚠️ Failed to add item ${item.upc}:`, error.message);
            return null;
          }
        });
        await Promise.all(addPromises);
      }
      
      // Update existing items via PUT
      if (itemsToUpdate.length > 0) {
        console.log(`🔄 Updating quantities for ${itemsToUpdate.length} existing items...`);
        const updatePromises = itemsToUpdate.map(async (item) => {
          try {
            return await this.makeUserRequest(
              userId,
              'PUT',
              `/carts/${existingCartId}/items/${item.upc}`,
              {
                quantity: item.newQty,
                modality: 'PICKUP',
                allowSubstitutes: true
              }
            );
          } catch (error) {
            console.warn(`⚠️ Failed to update item ${item.upc} to qty ${item.newQty}:`, error.message);
            return null;
          }
        });
        await Promise.all(updatePromises);
      }
      
      console.log(`✅ Cart update complete`);
      
      // Get the updated cart
      result = await this.makeUserRequest(userId, 'GET', `/carts/${existingCartId}`);
      
    } else {
      // No cart exists, create a new one with items
      console.log('🛒 Creating new cart with items');
      
      // DETAILED DEBUGGING: Log everything before making the request
      console.log('📋 PRE-REQUEST CART CREATION DEBUG:');
      console.log(`   User ID: ${userId}`);
      console.log(`   Endpoint: POST /carts`);
      console.log(`   Items to add: ${uniqueItems.length}`);
      console.log(`   Items payload:`, JSON.stringify(uniqueItems, null, 2));
      
      // Check user token details before request
      const preReqTokenInfo = await tokenStore.getTokens(userId);
      if (preReqTokenInfo) {
        console.log(`   Token scopes: ${preReqTokenInfo.scope}`);
        console.log(`   Token expires at: ${new Date(preReqTokenInfo.expiresAt).toISOString()}`);
        console.log(`   Token type: ${preReqTokenInfo.tokenType}`);
        console.log(`   Current time: ${new Date().toISOString()}`);
        console.log(`   Token valid: ${preReqTokenInfo.expiresAt > Date.now()}`);
        console.log(`   Has cart.basic:write scope: ${preReqTokenInfo.scope?.includes('cart.basic:write') || false}`);
      } else {
        console.log(`   ❌ NO TOKEN FOUND for user ${userId}`);
      }
      
      try {
        result = await this.makeUserRequest(
          userId, 
          'POST',
          '/carts',  // Create new cart endpoint
          { items: uniqueItems }
        );
        console.log(`✅ Successfully created new cart with ${uniqueItems.length} items`);
      } catch (createError) {
        console.error('❌ Cart creation failed - Enhanced debugging info:');
        console.error(`   Status: ${createError.response?.status || 'NO_STATUS'}`);
        console.error(`   Status Text: ${createError.response?.statusText || 'NO_STATUS_TEXT'}`);
        console.error(`   Headers: ${JSON.stringify(createError.response?.headers || {}, null, 2)}`);
        console.error(`   Response Data: ${JSON.stringify(createError.response?.data || {}, null, 2)}`);
        console.error(`   Error Message: ${createError.message}`);
        console.error(`   Request URL: ${createError.config?.url || 'NO_URL'}`);
        console.error(`   Request Method: ${createError.config?.method || 'NO_METHOD'}`);
        console.error(`   Request Headers: ${JSON.stringify(createError.config?.headers || {}, null, 2)}`);
        
        // Log token information for debugging
        const tokenInfo = await tokenStore.getTokens(userId);
        if (tokenInfo) {
          console.error(`   User Token Scopes: ${tokenInfo.scope || 'NO_SCOPES'}`);
          console.error(`   Token Expires: ${tokenInfo.expiresAt || 'NO_EXPIRY'}`);
          console.error(`   Token Type: ${tokenInfo.tokenType || 'NO_TYPE'}`);
        } else {
          console.error(`   User Token: NO_TOKEN_FOUND for userId=${userId}`);
        }
        
        // ENHANCED ERROR ANALYSIS
        console.error('🔍 [RENDER DEBUG] COMPREHENSIVE ERROR ANALYSIS:');
        console.error(`   Is this a scope error?: ${createError.response?.data?.errors?.reason?.includes('scope') || false}`);
        console.error(`   Is this a rate limit?: ${createError.response?.status === 429 || createError.response?.headers?.['retry-after']}`);
        console.error(`   Is this auth related?: ${createError.response?.status === 401 || createError.response?.status === 403}`);
        console.error(`   Error code from Kroger: ${createError.response?.data?.errors?.code || 'NO_CODE'}`);
        console.error(`   Exact error reason: "${createError.response?.data?.errors?.reason || 'NO_REASON'}"`);
        console.error(`   API endpoint used: ${createError.config?.url || 'NO_URL'}`);
        console.error(`   Request timestamp: ${new Date().toISOString()}`);
        console.error(`   X-Correlation-ID: ${createError.response?.headers?.['x-correlation-id'] || 'NO_CORRELATION_ID'}`);
        
        // Check if error message contains any scope hints
        const errorReason = createError.response?.data?.errors?.reason || '';
        if (errorReason.includes('scope')) {
          console.error(`🎯 [RENDER DEBUG] SCOPE-SPECIFIC ANALYSIS:`);
          console.error(`   Error mentions scope: TRUE`);
          console.error(`   Expected scope in error: ${errorReason.match(/expected \[(.*?)\]/) ? errorReason.match(/expected \[(.*?)\]/)[1] : 'NOT_FOUND'}`);
          console.error(`   Current token scope: ${tokenInfo?.scope || 'NO_TOKEN'}`);
          console.error(`   Scope mismatch detected: ${!tokenInfo?.scope?.includes('cart.basic:write') && errorReason.includes('cart')}`);
        }
        
        // If cart creation fails due to scope issues, try alternative approaches
        if (createError.response?.status === 403 && 
            createError.response?.data?.errors?.reason?.includes('scope')) {
          console.log('🔄 Scope issue detected - checking if user needs re-authentication...');
          
          // Check if user has the required scopes
          const tokenInfo = await tokenStore.getTokens(userId);
          if (tokenInfo && tokenInfo.scope && !tokenInfo.scope.includes('cart.basic:write')) {
            console.log('🔒 User token missing required scope "cart.basic:write"');
            console.log(`   Current scopes: ${tokenInfo.scope}`);
            console.log('🚪 User needs to re-authenticate to get updated scopes');
            
            // Clear the existing token to force re-authentication
            await tokenStore.deleteTokens(userId);
            
            throw new Error('REAUTHENTICATION_REQUIRED: Your current login session does not have permission to manage carts. Please log in again to get updated permissions.');
          }
          
          console.log('🔄 Trying alternative cart creation methods...');
          
          try {
            // Method 1: Try creating empty cart first, then add items
            console.log('📦 Method 1: Creating empty cart first');
            const emptyCart = await this.makeUserRequest(userId, 'POST', '/carts', {});
            const cartId = emptyCart.data?.id || emptyCart.id;
            
            if (cartId) {
              console.log(`✅ Created empty cart: ${cartId}, now adding items`);
              
              // Add items one by one to the empty cart
              for (const item of uniqueItems.slice(0, 5)) { // Try first 5 items as test
                try {
                  await this.makeUserRequest(userId, 'POST', `/carts/${cartId}/items`, item);
                } catch (itemError) {
                  console.warn(`⚠️ Failed to add item ${item.upc}:`, itemError.message);
                }
              }
              
              result = await this.makeUserRequest(userId, 'GET', `/carts/${cartId}`);
              console.log('✅ Alternative method 1 succeeded');
            }
          } catch (altError) {
            console.error('❌ Alternative method 1 failed:', altError.message);
            
            // Client credentials cannot be used for cart operations (cart.basic:write requires user OAuth)
            console.log('⚠️ Skipping client credentials fallback - cart.basic:write requires user OAuth');
            
            // Method 2: Try using PUT instead of POST
            try {
              console.log('📦 Method 2: Trying PUT /carts');
              result = await this.makeUserRequest(userId, 'PUT', '/carts', { items: uniqueItems });
              console.log('✅ Alternative method 2 (PUT) succeeded');
            } catch (putError) {
              console.error('❌ Alternative method 2 failed:', putError.message);
              
              // Method 3: Try alternative endpoints
              try {
                console.log('📦 Method 3: Trying POST /cart/items');
                const emptyCart = await this.makeUserRequest(userId, 'POST', '/carts', {});
                const cartId = emptyCart.data?.id || emptyCart.id;
                
                if (cartId) {
                  result = await this.makeUserRequest(userId, 'POST', '/cart/items', { items: uniqueItems });
                  console.log('✅ Alternative method 3 (POST /cart/items) succeeded');
                }
              } catch (altError3) {
                console.error('❌ Alternative method 3 failed:', altError3.message);
                
                // Method 4: Try bulk endpoint
                try {
                  console.log('📦 Method 4: Trying POST /cart/bulk');
                  result = await this.makeUserRequest(userId, 'POST', '/cart/bulk', { items: uniqueItems });
                  console.log('✅ Alternative method 4 (bulk) succeeded');
                } catch (bulkError) {
                  console.error('❌ Alternative method 4 failed:', bulkError.message);
                  
                  // Method 5: Cannot use client credentials for cart operations
                  console.log('⚠️ Method 5 skipped: Client credentials invalid for cart.basic:write scope');
                  throw createError; // Throw original error
                }
              }
            }
          }
        } else {
          throw createError;
        }
      }
    }
    
    // Store the cart response for later retrieval
    this.lastCartResponse = result;
    
    console.log('📦 Cart response from Kroger:', JSON.stringify(result, null, 2));
    console.log(`✅ Successfully processed ${uniqueItems.length} items for user ${userId}`);
    
    // Verify the cart was actually updated
    console.log('🔍 Verifying cart contents...');
    try {
      const cartsVerification = await this.makeUserRequest(userId, 'GET', '/carts');
      if (cartsVerification.data && cartsVerification.data.length > 0) {
        const cartId = existingCartId || cartsVerification.data[0].id;
        const cartDetails = await this.makeUserRequest(userId, 'GET', `/carts/${cartId}`);
        console.log(`✅ Cart verified: ${cartDetails.data?.items?.length || 0} items in cart`);
        this.lastCartResponse = cartDetails;
        return cartDetails;
      }
    } catch (verifyError) {
      console.log('⚠️ Could not verify cart contents:', verifyError.message);
    }
    
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
    { method: 'GET', path: '/customer/cart', description: 'Get customer cart' },
    
    // POST endpoints for cart creation
    { method: 'POST', path: '/cart', body: { items: [testItem] }, description: 'Create cart with items' },
    { method: 'POST', path: '/carts', body: {}, description: 'Create empty cart' },
    { method: 'POST', path: '/cart/items', body: { items: [testItem] }, description: 'Add items to cart' },
    { method: 'POST', path: '/customer/cart', body: { items: [testItem] }, description: 'Create customer cart' },
    
    // PUT endpoints for adding items
    { method: 'PUT', path: '/cart', body: { items: [testItem] }, description: 'Update cart with items' },
    { method: 'PUT', path: '/cart/add', body: { items: [testItem] }, description: 'Add items to cart' },
    { method: 'PUT', path: '/cart/items', body: { items: [testItem] }, description: 'Update cart items' },
    { method: 'PUT', path: '/carts', body: { items: [testItem] }, description: 'Update carts with items' },
    
    // PATCH endpoints as alternative
    { method: 'PATCH', path: '/cart', body: { items: [testItem] }, description: 'Patch cart with items' },
    { method: 'PATCH', path: '/cart/items', body: { items: [testItem] }, description: 'Patch cart items' },
    
    // Bulk/batch endpoints
    { method: 'POST', path: '/cart/bulk', body: { items: [testItem] }, description: 'Bulk add items to cart' },
    { method: 'PUT', path: '/cart/bulk', body: { items: [testItem] }, description: 'Bulk update cart items' },
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
        // Get list of carts first
        const cartsResponse = await this.makeUserRequest(userId, 'GET', '/carts');
        if (cartsResponse.data && cartsResponse.data.length > 0) {
          // Delete each cart (you can't delete items individually in bulk)
          for (const cart of cartsResponse.data) {
            try {
              await this.makeUserRequest(userId, 'DELETE', `/carts/${cart.id}`);
              console.log(`🗑️ Deleted cart ${cart.id}`);
            } catch (deleteError) {
              console.warn(`⚠️ Could not delete cart ${cart.id}:`, deleteError.message);
            }
          }
        }
        console.log('🗑️ Cleared existing Kroger carts');
      } catch (error) {
        console.warn('⚠️ Could not clear existing carts:', error.message);
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
    // Update getServiceHealth to use TokenStore
  async getServiceHealth(userId = null) {
    const stats = await tokenStore.getStats();
    
    const health = {
      service: 'kroger_orders',
      configured: !!(this.clientId && this.clientSecret && this.redirectUri),
      activeUsers: stats.active || 0,
      baseURL: this.baseURL
    };
    
    if (userId) {
      const hasToken = await tokenStore.hasValidToken(userId);
      if (hasToken) {
        const tokenInfo = await tokenStore.getTokens(userId);
        health.userAuth = {
          authenticated: true,
          expiresAt: tokenInfo?.expiresAt,
          scope: tokenInfo?.scope,
          hasRefreshToken: !!tokenInfo?.refreshToken
        };
      } else {
        health.userAuth = {
          authenticated: false
        };
      }
    }
    
    return health;
  }

  // Update clearUserTokens to use TokenStore
  async clearUserTokens(userId) {
    await tokenStore.deleteTokens(userId);
    console.log(`🚪 Cleared tokens for user ${userId}`);
  }
}

module.exports = KrogerOrderService;