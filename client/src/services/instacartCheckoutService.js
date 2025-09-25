// client/src/services/instacartCheckoutService.js
// Dedicated Instacart Checkout Service - Separate from existing cart system

class InstacartCheckoutService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // Cache for retailers and pricing data
    this.retailerCache = new Map();
    this.priceCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes

    console.log('🛒 InstacartCheckoutService initialized');
  }

  // ============ RETAILER MANAGEMENT ============

  /**
   * Get available retailers for a location
   */
  async getAvailableRetailers(postalCode = '95670', countryCode = 'US') {
    const cacheKey = `retailers_${postalCode}_${countryCode}`;

    // Check cache first
    if (this.retailerCache.has(cacheKey)) {
      const cached = this.retailerCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('🏪 Using cached retailers');
        return cached.data;
      }
    }

    try {
      console.log(`🏪 Fetching retailers for ${postalCode}, ${countryCode}`);

      const response = await fetch(`${this.apiUrl}/api/instacart/retailers?postalCode=${postalCode}&countryCode=${countryCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Retailers API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.retailers) {
        // Cache the result
        this.retailerCache.set(cacheKey, {
          data: data,
          timestamp: Date.now()
        });

        console.log(`✅ Found ${data.retailers.length} retailers`);
        return data;
      } else {
        throw new Error('Invalid response from retailers API');
      }
    } catch (error) {
      console.error('❌ Error fetching retailers:', error);

      // Return mock data for development
      return this.getMockRetailers(postalCode);
    }
  }

  /**
   * Get retailer details by ID
   */
  async getRetailerDetails(retailerId) {
    try {
      const retailers = await this.getAvailableRetailers();
      const retailer = retailers.retailers?.find(r => r.id === retailerId || r.retailer_key === retailerId);

      if (!retailer) {
        throw new Error(`Retailer ${retailerId} not found`);
      }

      return {
        success: true,
        retailer: retailer
      };
    } catch (error) {
      console.error('❌ Error getting retailer details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ PRODUCT SEARCH & MATCHING ============

  /**
   * Search for products at a specific retailer
   */
  async searchProducts(query, retailerId, options = {}) {
    try {
      console.log(`🔍 Searching for "${query}" at ${retailerId}`);

      const requestBody = {
        query: query,
        retailerId: retailerId,
        originalItem: options.originalItem || { productName: query },
        ...options
      };

      const response = await fetch(`${this.apiUrl}/api/instacart/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.products) {
        console.log(`✅ Found ${data.products.length} products for "${query}"`);
        return data;
      } else {
        throw new Error('Invalid response from search API');
      }
    } catch (error) {
      console.error('❌ Error searching products:', error);
      return {
        success: false,
        error: error.message,
        products: []
      };
    }
  }

  /**
   * Batch search for multiple items
   */
  async batchSearchProducts(items, retailerId, options = {}) {
    try {
      console.log(`🔍 Batch searching ${items.length} items at ${retailerId}`);

      const response = await fetch(`${this.apiUrl}/api/instacart/batch-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          retailerId: retailerId,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Batch search API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.results) {
        console.log(`✅ Batch search completed: ${data.summary.itemsWithMatches} matches found`);
        return data;
      } else {
        throw new Error('Invalid response from batch search API');
      }
    } catch (error) {
      console.error('❌ Error in batch search:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  // ============ CART CREATION & MANAGEMENT ============

  /**
   * Create Instacart cart with items
   */
  async createInstacartCart(cartItems, retailerId, deliveryInfo = {}) {
    try {
      console.log(`🛒 Creating Instacart cart with ${cartItems.length} items for ${retailerId}`);

      // Validate cart items have required fields
      const validatedItems = cartItems.map((item, index) => {
        const validated = {
          product_id: item.product_id || item.id || `product_${Date.now()}_${index}`,
          retailer_sku: item.retailer_sku || item.sku || `sku_${Date.now()}_${index}`,
          quantity: parseFloat(item.quantity) || 1,
          name: item.name || item.productName || 'Unknown Item',
          price: parseFloat(item.price) || 0
        };

        // Add optional fields
        if (item.variant_id) validated.variant_id = item.variant_id;
        if (item.size) validated.size = item.size;
        if (item.brand) validated.brand = item.brand;

        return validated;
      });

      const requestBody = {
        retailerId: retailerId,
        zipCode: deliveryInfo.zipCode || '95670',
        items: validatedItems,
        userId: deliveryInfo.userId || 'cartsmash_checkout_user',
        metadata: {
          source: 'InstacartCheckout',
          checkoutFlow: 'dedicated',
          itemCount: validatedItems.length,
          retailer: retailerId,
          ...deliveryInfo.metadata
        }
      };

      console.log('📤 Sending cart creation request:', {
        retailerId,
        itemCount: validatedItems.length,
        zipCode: requestBody.zipCode
      });

      const response = await fetch(`${this.apiUrl}/api/instacart/cart/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cart creation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Instacart cart created successfully');
        console.log(`🔗 Checkout URL: ${data.checkoutUrl || 'Not provided'}`);

        return {
          success: true,
          cartId: data.cartId || null,
          checkoutUrl: data.checkoutUrl || this.getFallbackCheckoutUrl(retailerId),
          itemsAdded: data.itemsAdded || 0,
          totals: data.totals || null,
          metadata: data.metadata || null,
          retailer: retailerId
        };
      } else {
        throw new Error(data.error || 'Cart creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating Instacart cart:', error);
      return {
        success: false,
        error: error.message,
        fallbackUrl: this.getFallbackCheckoutUrl(retailerId)
      };
    }
  }

  /**
   * Get cart status
   */
  async getCartStatus(cartId) {
    try {
      const response = await fetch(`${this.apiUrl}/api/instacart/cart/${cartId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Cart status error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting cart status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ RECIPE INTEGRATION ============

  /**
   * Create recipe page on Instacart
   */
  async createRecipePage(recipeData, options = {}) {
    try {
      console.log(`🍳 Creating recipe page: "${recipeData.title}"`);

      const requestBody = {
        title: recipeData.title,
        imageUrl: recipeData.imageUrl || recipeData.image,
        instructions: recipeData.instructions || ['Enjoy your meal!'],
        ingredients: recipeData.ingredients || [],
        partnerUrl: options.partnerUrl || 'https://cartsmash.com',
        enablePantryItems: options.enablePantryItems !== false,
        retailerKey: options.retailerKey,
        author: recipeData.author || 'CartSmash User',
        servings: recipeData.servings || 4,
        cookingTime: recipeData.cookingTime || recipeData.cooking_time,
        dietaryRestrictions: recipeData.dietaryRestrictions || [],
        externalReferenceId: recipeData.id || `cartsmash_recipe_${Date.now()}`
      };

      const response = await fetch(`${this.apiUrl}/api/instacart/recipe/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Recipe creation error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Recipe page created successfully');
        return data;
      } else {
        throw new Error(data.error || 'Recipe creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating recipe page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create shopping list on Instacart
   */
  async createShoppingList(listData, options = {}) {
    try {
      console.log(`📝 Creating shopping list: "${listData.title}"`);

      const requestBody = {
        title: listData.title,
        imageUrl: listData.imageUrl,
        lineItems: listData.items || listData.lineItems || [],
        partnerUrl: options.partnerUrl || 'https://cartsmash.com',
        expiresIn: options.expiresIn || 365,
        instructions: listData.instructions || ['Shopping list created with CartSmash']
      };

      const response = await fetch(`${this.apiUrl}/api/instacart/shopping-list/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Shopping list creation error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Shopping list created successfully');
        return data;
      } else {
        throw new Error(data.error || 'Shopping list creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating shopping list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Convert CartSmash items to Instacart format
   */
  convertCartItemsToInstacart(cartItems, searchResults = {}) {
    return cartItems.map((item, index) => {
      // Look for matching search results
      const searchResult = searchResults[item.id] || searchResults[item.productName];

      if (searchResult && searchResult.products && searchResult.products.length > 0) {
        const product = searchResult.products[0]; // Use best match
        return {
          product_id: product.id,
          retailer_sku: product.sku || product.retailer_sku,
          quantity: parseFloat(item.quantity) || 1,
          name: product.name,
          price: product.price,
          brand: product.brand,
          size: product.size,
          image_url: product.image_url,
          confidence: product.confidence || 0
        };
      }

      // NO MOCK DATA FALLBACK - return error instead
      console.log(`🚫 DISABLED: Mock product fallback eliminated for item: ${item.productName || item.name}`);
      return null;
    });
  }

  /**
   * Get fallback checkout URL
   */
  getFallbackCheckoutUrl(retailerId) {
    const fallbackUrls = {
      'safeway': 'https://www.instacart.com/store/safeway',
      'kroger': 'https://www.instacart.com/store/kroger',
      'costco': 'https://www.instacart.com/store/costco-wholesale',
      'whole_foods': 'https://www.instacart.com/store/whole-foods-market',
      'target': 'https://www.instacart.com/store/target',
      'albertsons': 'https://www.instacart.com/store/albertsons'
    };

    return fallbackUrls[retailerId] || 'https://www.instacart.com/store/storefront';
  }

  /**
   * Calculate estimated cart total
   */
  calculateEstimatedTotal(items, retailer = {}) {
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 3.99;
      const quantity = parseFloat(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);

    const serviceFee = retailer.service_fee || 3.99;
    const deliveryFee = retailer.delivery_fee || 5.99;
    const tax = subtotal * 0.08; // Estimate 8% tax

    const total = subtotal + serviceFee + deliveryFee + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount: items.length
    };
  }

  /**
   * Validate items for Instacart checkout
   */
  validateCheckoutItems(items) {
    const errors = [];
    const warnings = [];

    if (!items || items.length === 0) {
      errors.push('No items to checkout');
      return { valid: false, errors, warnings };
    }

    items.forEach((item, index) => {
      if (!item.productName && !item.name) {
        errors.push(`Item ${index + 1}: Missing product name`);
      }

      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        warnings.push(`Item ${index + 1}: Invalid quantity`);
      }

      if (!item.product_id && !item.id) {
        warnings.push(`Item ${index + 1}: Missing product ID - will use mock data`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: items.length
    };
  }

  // ============ MOCK DATA FOR DEVELOPMENT ============

  getMockRetailers(postalCode) {
    return {
      success: true,
      retailers: [
        {
          id: 'safeway',
          retailer_key: 'safeway',
          name: 'Safeway',
          logo: '🏪',
          estimatedDelivery: '2 hours',
          available: true,
          service_fee: 3.99,
          delivery_fee: 5.99,
          distance: 1.2,
          address: `123 Main St, ${postalCode}`
        },
        {
          id: 'kroger',
          retailer_key: 'kroger',
          name: 'Kroger',
          logo: '🛒',
          estimatedDelivery: '2-3 hours',
          available: true,
          service_fee: 2.99,
          delivery_fee: 4.99,
          distance: 1.8,
          address: `456 Oak Ave, ${postalCode}`
        },
        {
          id: 'whole_foods',
          retailer_key: 'whole_foods',
          name: 'Whole Foods Market',
          logo: '🥬',
          estimatedDelivery: '1-2 hours',
          available: true,
          service_fee: 3.99,
          delivery_fee: 7.99,
          distance: 2.1,
          address: `789 Organic Way, ${postalCode}`
        }
      ]
    };
  }

  // ============ TEST METHODS ============

  /**
   * Test API connectivity
   */
  async testConnectivity() {
    try {
      const response = await fetch(`${this.apiUrl}/api/instacart/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Test API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const instacartCheckoutService = new InstacartCheckoutService();
export default instacartCheckoutService;