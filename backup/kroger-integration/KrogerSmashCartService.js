// KrogerSmashCartService.js - Comprehensive Kroger Cart Management for SmashCart
// Implements GET, PUT, POST operations with store location and comprehensive cart data

const axios = require('axios');
const tokenStore = require('./TokenStore');

class KrogerSmashCartService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.defaultStore = process.env.KROGER_DEFAULT_STORE || '01400943';
    
    console.log('🛒 Kroger SmashCart Service initialized');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   Default Store: ${this.defaultStore}`);
  }

  /**
   * GET CART - Retrieve user's cart with store location and comprehensive info
   */
  async getCart(userId, options = {}) {
    try {
      const { includeStoreInfo = true, includeProductDetails = true } = options;
      
      console.log(`🛒 [GET CART] Retrieving cart for user: ${userId}`);
      
      // Get user authentication
      const tokenInfo = await this.validateUserAuth(userId);
      
      // Get all user carts
      const cartsResponse = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', '/carts'
      );
      
      if (!cartsResponse.data || cartsResponse.data.length === 0) {
        console.log(`📭 No carts found for user ${userId}`);
        return {
          success: true,
          cart: {
            id: null,
            items: [],
            itemCount: 0,
            store: includeStoreInfo ? await this.getStoreInfo(this.defaultStore) : null,
            summary: {
              totalItems: 0,
              estimatedTotal: 0,
              lastModified: null
            }
          },
          message: 'No cart found - ready to create new cart'
        };
      }
      
      // Get the primary cart (first one)
      const cart = cartsResponse.data[0];
      console.log(`📦 Found cart: ${cart.id}`);
      
      // Get detailed cart contents
      const cartDetails = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', `/carts/${cart.id}`
      );
      
      // Build comprehensive cart response
      const cartResponse = {
        id: cart.id,
        items: cartDetails.data?.items || [],
        itemCount: cartDetails.data?.items?.length || 0,
        store: null,
        summary: {
          totalItems: cartDetails.data?.items?.length || 0,
          estimatedTotal: this.calculateEstimatedTotal(cartDetails.data?.items || []),
          lastModified: cart.modifiedAt || cart.createdAt,
          cartId: cart.id
        },
        metadata: {
          createdAt: cart.createdAt,
          modifiedAt: cart.modifiedAt,
          userId: userId,
          apiVersion: 'v1'
        }
      };
      
      // Add store information if requested
      if (includeStoreInfo) {
        try {
          const storeId = cart.locationId || this.defaultStore;
          cartResponse.store = await this.getStoreInfo(storeId);
        } catch (storeError) {
          console.warn(`⚠️ Could not fetch store info: ${storeError.message}`);
          cartResponse.store = { error: 'Store info unavailable' };
        }
      }
      
      // Enhance product details if requested
      if (includeProductDetails && cartResponse.items.length > 0) {
        cartResponse.items = await this.enhanceCartItemsWithDetails(
          tokenInfo, cartResponse.items, cartResponse.store?.locationId
        );
      }
      
      console.log(`✅ Cart retrieved: ${cartResponse.itemCount} items`);
      
      return {
        success: true,
        cart: cartResponse,
        message: `Cart retrieved with ${cartResponse.itemCount} items`
      };
      
    } catch (error) {
      console.error(`❌ [GET CART] Failed for user ${userId}:`, error.message);
      return {
        success: false,
        error: error.message,
        cart: null
      };
    }
  }

  /**
   * POST CART - Create new cart or add items to existing cart
   */
  async postCart(userId, items, options = {}) {
    try {
      const { 
        storeId = this.defaultStore, 
        modality = 'PICKUP',
        clearExisting = false 
      } = options;
      
      console.log(`🛒 [POST CART] Adding ${items.length} items for user: ${userId}`);
      console.log(`📍 Store: ${storeId}, Modality: ${modality}`);
      
      // Validate user authentication
      const tokenInfo = await this.validateUserAuth(userId);
      
      // Get or create cart
      let cartId = await this.getOrCreateCart(tokenInfo, storeId);
      
      // Clear existing cart if requested
      if (clearExisting && cartId) {
        await this.clearCart(tokenInfo, cartId);
        cartId = await this.getOrCreateCart(tokenInfo, storeId);
      }
      
      // Prepare items for Kroger API
      const preparedItems = await this.prepareItemsForKroger(
        tokenInfo, items, storeId
      );
      
      if (preparedItems.length === 0) {
        throw new Error('No valid items could be prepared for cart');
      }
      
      // Add items to cart
      const addResponse = await this.addItemsToCart(
        tokenInfo, cartId, preparedItems
      );
      
      // Get updated cart details
      const updatedCart = await this.getCart(userId, { 
        includeStoreInfo: true, 
        includeProductDetails: true 
      });
      
      console.log(`✅ Cart updated: ${addResponse.addedCount} items added`);
      
      return {
        success: true,
        cart: updatedCart.cart,
        itemsAdded: addResponse.addedCount,
        itemsFailed: addResponse.failedCount,
        message: `Added ${addResponse.addedCount} items to cart`
      };
      
    } catch (error) {
      console.error(`❌ [POST CART] Failed for user ${userId}:`, error.message);
      return {
        success: false,
        error: error.message,
        itemsAdded: 0
      };
    }
  }

  /**
   * PUT CART - Update existing cart items
   */
  async putCart(userId, updates, options = {}) {
    try {
      const { storeId = this.defaultStore } = options;
      
      console.log(`🛒 [PUT CART] Updating cart for user: ${userId}`);
      console.log(`📝 Updates: ${JSON.stringify(updates, null, 2)}`);
      
      // Validate user authentication
      const tokenInfo = await this.validateUserAuth(userId);
      
      // Get existing cart
      const currentCart = await this.getCart(userId, { includeStoreInfo: false });
      if (!currentCart.success || !currentCart.cart.id) {
        throw new Error('No existing cart found to update');
      }
      
      const cartId = currentCart.cart.id;
      
      // Process different types of updates
      const results = {
        updated: 0,
        removed: 0,
        added: 0,
        failed: 0
      };
      
      // Handle item quantity updates
      if (updates.items) {
        for (const update of updates.items) {
          try {
            if (update.action === 'remove' || update.quantity === 0) {
              await this.removeCartItem(tokenInfo, cartId, update.itemId);
              results.removed++;
            } else if (update.action === 'update') {
              await this.updateCartItemQuantity(
                tokenInfo, cartId, update.itemId, update.quantity
              );
              results.updated++;
            } else if (update.action === 'add') {
              const preparedItems = await this.prepareItemsForKroger(
                tokenInfo, [update], storeId
              );
              if (preparedItems.length > 0) {
                await this.addItemsToCart(tokenInfo, cartId, preparedItems);
                results.added++;
              } else {
                results.failed++;
              }
            }
          } catch (itemError) {
            console.warn(`⚠️ Failed to update item ${update.itemId}: ${itemError.message}`);
            results.failed++;
          }
        }
      }
      
      // Handle cart-level updates (store change, modality, etc.)
      if (updates.storeId && updates.storeId !== storeId) {
        // Note: Kroger API typically requires creating a new cart for different stores
        console.log(`🏪 Store change requested: ${storeId} → ${updates.storeId}`);
      }
      
      // Get updated cart
      const updatedCart = await this.getCart(userId, { 
        includeStoreInfo: true, 
        includeProductDetails: true 
      });
      
      console.log(`✅ Cart updated: ${results.updated} updated, ${results.added} added, ${results.removed} removed`);
      
      return {
        success: true,
        cart: updatedCart.cart,
        results: results,
        message: `Cart updated successfully`
      };
      
    } catch (error) {
      console.error(`❌ [PUT CART] Failed for user ${userId}:`, error.message);
      return {
        success: false,
        error: error.message,
        results: { updated: 0, removed: 0, added: 0, failed: 0 }
      };
    }
  }

  /**
   * DELETE CART - Clear or remove cart
   */
  async deleteCart(userId, options = {}) {
    try {
      const { removeCompletely = false } = options;
      
      console.log(`🛒 [DELETE CART] ${removeCompletely ? 'Removing' : 'Clearing'} cart for user: ${userId}`);
      
      // Validate user authentication
      const tokenInfo = await this.validateUserAuth(userId);
      
      // Get user's carts
      const cartsResponse = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', '/carts'
      );
      
      if (!cartsResponse.data || cartsResponse.data.length === 0) {
        return {
          success: true,
          message: 'No cart found to delete'
        };
      }
      
      const cartId = cartsResponse.data[0].id;
      
      if (removeCompletely) {
        // Delete the entire cart
        await this.makeAuthenticatedRequest(
          tokenInfo, 'DELETE', `/carts/${cartId}`
        );
        console.log(`🗑️ Cart ${cartId} completely removed`);
      } else {
        // Clear all items from cart
        await this.clearCart(tokenInfo, cartId);
        console.log(`🧹 Cart ${cartId} cleared of all items`);
      }
      
      return {
        success: true,
        message: removeCompletely ? 'Cart removed completely' : 'Cart cleared successfully'
      };
      
    } catch (error) {
      console.error(`❌ [DELETE CART] Failed for user ${userId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive store information
   */
  async getStoreInfo(storeId) {
    try {
      console.log(`🏪 Fetching store info for: ${storeId}`);
      
      // Use client credentials for store lookup (doesn't require user auth)
      const clientToken = await this.getClientCredentialsToken();
      
      const storeResponse = await axios.get(
        `${this.baseURL}/locations/${storeId}`,
        {
          headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const store = storeResponse.data.data;
      
      return {
        locationId: store.locationId,
        name: store.name,
        address: {
          street: store.address?.addressLine1,
          city: store.address?.city,
          state: store.address?.state,
          zipCode: store.address?.zipCode,
          county: store.address?.county
        },
        coordinates: {
          latitude: store.geolocation?.latitude,
          longitude: store.geolocation?.longitude
        },
        contact: {
          phone: store.phone
        },
        hours: store.hours,
        departments: store.departments,
        services: {
          pharmacy: store.pharmacy,
          fuelCenter: store.fuelCenter,
          pickup: store.pickup,
          delivery: store.delivery
        },
        timezone: store.timezone
      };
      
    } catch (error) {
      console.warn(`⚠️ Failed to fetch store info for ${storeId}: ${error.message}`);
      return {
        locationId: storeId,
        name: 'Store information unavailable',
        error: error.message
      };
    }
  }

  /**
   * Enhance cart items with detailed product information
   */
  async enhanceCartItemsWithDetails(tokenInfo, items, storeId) {
    try {
      const enhancedItems = [];
      
      for (const item of items) {
        try {
          // Get product details if we have a UPC
          if (item.upc) {
            const productDetails = await this.getProductDetails(
              tokenInfo, item.upc, storeId
            );
            
            enhancedItems.push({
              ...item,
              productDetails: productDetails,
              enhanced: true
            });
          } else {
            enhancedItems.push({
              ...item,
              enhanced: false
            });
          }
        } catch (itemError) {
          console.warn(`⚠️ Could not enhance item ${item.upc}: ${itemError.message}`);
          enhancedItems.push({
            ...item,
            enhanced: false,
            enhancementError: itemError.message
          });
        }
      }
      
      return enhancedItems;
      
    } catch (error) {
      console.warn(`⚠️ Failed to enhance cart items: ${error.message}`);
      return items; // Return original items if enhancement fails
    }
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(tokenInfo, upc, locationId) {
    try {
      const response = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', `/products/${upc}`, { 'filter.locationId': locationId }
      );
      
      return response.data;
      
    } catch (error) {
      console.warn(`⚠️ Could not get product details for UPC ${upc}: ${error.message}`);
      return null;
    }
  }

  /**
   * Prepare items for Kroger API format
   */
  async prepareItemsForKroger(tokenInfo, items, storeId) {
    const preparedItems = [];
    
    for (const item of items) {
      try {
        let upc = item.upc;
        
        // If no UPC, search for the product
        if (!upc && (item.productName || item.name)) {
          const searchTerm = item.productName || item.name;
          const searchResult = await this.searchProduct(tokenInfo, searchTerm, storeId);
          
          if (searchResult && searchResult.length > 0) {
            upc = searchResult[0].upc;
          }
        }
        
        if (upc) {
          preparedItems.push({
            upc: upc,
            quantity: parseInt(item.quantity) || 1,
            modality: 'PICKUP'
          });
        }
        
      } catch (itemError) {
        console.warn(`⚠️ Could not prepare item: ${itemError.message}`);
      }
    }
    
    return preparedItems;
  }

  /**
   * Search for product by name
   */
  async searchProduct(tokenInfo, searchTerm, locationId) {
    try {
      const searchParams = {
        'filter.term': searchTerm,
        'filter.locationId': locationId,
        'filter.limit': '5'
      };
      
      const response = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', '/products', searchParams
      );
      
      return response.data?.data || [];
      
    } catch (error) {
      console.warn(`⚠️ Product search failed for "${searchTerm}": ${error.message}`);
      return [];
    }
  }

  /**
   * Get or create cart for user
   */
  async getOrCreateCart(tokenInfo, storeId) {
    try {
      // Check for existing carts
      const cartsResponse = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', '/carts'
      );
      
      if (cartsResponse.data && cartsResponse.data.length > 0) {
        return cartsResponse.data[0].id;
      }
      
      // Create new cart
      const createResponse = await this.makeAuthenticatedRequest(
        tokenInfo, 'POST', '/carts', {}, {
          locationId: storeId
        }
      );
      
      return createResponse.data.id;
      
    } catch (error) {
      console.error(`❌ Failed to get/create cart: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add items to cart
   */
  async addItemsToCart(tokenInfo, cartId, items) {
    try {
      let addedCount = 0;
      let failedCount = 0;
      
      for (const item of items) {
        try {
          await this.makeAuthenticatedRequest(
            tokenInfo, 'PUT', `/carts/${cartId}/items`, {}, {
              items: [item]
            }
          );
          addedCount++;
        } catch (itemError) {
          console.warn(`⚠️ Failed to add item ${item.upc}: ${itemError.message}`);
          failedCount++;
        }
      }
      
      return { addedCount, failedCount };
      
    } catch (error) {
      console.error(`❌ Failed to add items to cart: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear all items from cart
   */
  async clearCart(tokenInfo, cartId) {
    try {
      // Get cart contents first
      const cartDetails = await this.makeAuthenticatedRequest(
        tokenInfo, 'GET', `/carts/${cartId}`
      );
      
      // Remove each item
      if (cartDetails.data?.items) {
        for (const item of cartDetails.data.items) {
          try {
            await this.makeAuthenticatedRequest(
              tokenInfo, 'DELETE', `/carts/${cartId}/items/${item.id}`
            );
          } catch (itemError) {
            console.warn(`⚠️ Failed to remove item ${item.id}: ${itemError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to clear cart: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove specific item from cart
   */
  async removeCartItem(tokenInfo, cartId, itemId) {
    await this.makeAuthenticatedRequest(
      tokenInfo, 'DELETE', `/carts/${cartId}/items/${itemId}`
    );
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(tokenInfo, cartId, itemId, quantity) {
    await this.makeAuthenticatedRequest(
      tokenInfo, 'PATCH', `/carts/${cartId}/items/${itemId}`, {}, {
        quantity: quantity
      }
    );
  }

  /**
   * Calculate estimated total for cart items
   */
  calculateEstimatedTotal(items) {
    return items.reduce((total, item) => {
      const price = item.price?.regular || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  }

  /**
   * Validate user authentication
   */
  async validateUserAuth(userId) {
    const tokenInfo = await tokenStore.getTokens(userId);
    
    if (!tokenInfo) {
      throw new Error('AUTHENTICATION_REQUIRED: User must complete Kroger OAuth before cart operations');
    }
    
    if (!tokenInfo.scope?.includes('cart.basic:write')) {
      throw new Error('INSUFFICIENT_SCOPE: User token missing cart.basic:write scope');
    }
    
    return tokenInfo;
  }

  /**
   * Make authenticated request to Kroger API
   */
  async makeAuthenticatedRequest(tokenInfo, method, endpoint, queryParams = {}, data = null) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const config = {
      method: method.toUpperCase(),
      url: url.toString(),
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${tokenInfo.accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'CartSmash/1.0'
      },
      timeout: 15000
    };
    
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Token expired - please re-authenticate');
      }
      throw error;
    }
  }

  /**
   * Get client credentials token for store lookups
   */
  async getClientCredentialsToken() {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/connect/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'product.compact'
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response.data.access_token;
      
    } catch (error) {
      console.error('❌ Failed to get client credentials token:', error.message);
      throw error;
    }
  }

  /**
   * Get service health and status
   */
  getServiceHealth() {
    return {
      service: 'kroger_smash_cart',
      baseURL: this.baseURL,
      defaultStore: this.defaultStore,
      configured: !!(this.clientId && this.clientSecret),
      features: {
        get: 'Retrieve cart with store location and product details',
        post: 'Create cart and add items',
        put: 'Update existing cart items',
        delete: 'Clear or remove cart',
        storeInfo: 'Comprehensive store information',
        productDetails: 'Enhanced product information'
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = KrogerSmashCartService;