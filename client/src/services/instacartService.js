// client/src/services/instacartService.js
// Instacart Developer Platform API integration

class InstacartService {
  constructor() {
    this.apiKey = process.env.REACT_APP_INSTACART_API_KEY;
    
    // Official Instacart Developer Platform API endpoints
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.baseURL = this.isDevelopment 
      ? 'https://connect.dev.instacart.tools'  // Development
      : 'https://connect.instacart.com';       // Production
    
    // Recipe creation endpoint
    this.recipeEndpoint = '/idp/v1/products/recipe';
    
    if (!this.apiKey || this.apiKey === 'your_development_api_key_here') {
      throw new Error('⚠️ Instacart API key not configured. Real API key is required.');
    } else {
      console.log('✅ Instacart API configured for', this.isDevelopment ? 'development' : 'production');
    }
  }

  // Get headers for API requests
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Get default recipe image with reliable fallback
  getDefaultRecipeImage() {
    // For production environments, use a reliable placeholder service
    if (process.env.NODE_ENV === 'production') {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#FF6B35"/>
          <text x="200" y="120" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="white">🍳</text>
          <text x="200" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">Recipe</text>
        </svg>
      `.replace(/\s+/g, ' ').trim());
    }

    // For local development, try a simple fallback
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#FF6B35"/>
        <text x="200" y="120" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="white">🍳</text>
        <text x="200" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">Recipe</text>
      </svg>
    `.replace(/\s+/g, ' ').trim());
  }

  // Find nearby retailers using backend API
  async getNearbyRetailers(zipCode = '95670') {
    console.log('🏪 InstacartService: Getting nearby retailers for', zipCode);
    
    try {
      // Always try backend API first (regardless of client API key configuration)
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('📡 Calling backend retailer API:', `${API_URL}/api/instacart/retailers?postalCode=${zipCode}`);
      
      const response = await fetch(`${API_URL}/api/instacart/retailers?postalCode=${zipCode}&countryCode=US`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend API response:', data);

      if (data.success && data.retailers) {
        console.log(`🏪 Found ${data.retailers.length} real retailers from Instacart API`);
        return {
          success: true,
          retailers: data.retailers
        };
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Error fetching Instacart retailers from backend:', error);
      throw error;
    }
  }

  // 🆕 CREATE RECIPE PAGE - Official Instacart Developer Platform API
  async createRecipePage(recipeData) {
    console.log('🍳 InstacartService: Creating recipe page for:', recipeData.title);
    

    try {
      const payload = {
        title: recipeData.title,
        image_url: recipeData.imageUrl || this.getDefaultRecipeImage(),
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || ['Enjoy your meal!'],
        landing_page_configuration: {
          track_pantry_items: recipeData.trackPantryItems || false
        }
      };

      // Add optional retailer preference
      if (recipeData.retailerKey) {
        payload.retailer_key = recipeData.retailerKey;
      }

      // Add partner linkback URL if provided
      if (recipeData.partnerUrl) {
        payload.partner_linkback_url = recipeData.partnerUrl;
      }

      console.log('📤 Sending recipe to Instacart:', payload);

      const response = await fetch(`${this.baseURL}${this.recipeEndpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Instacart API Error Response:', errorText);
        throw new Error(`Instacart recipe creation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Recipe page created successfully:', data);
      return this.formatRecipeResponse(data);
    } catch (error) {
      console.error('❌ Error creating Instacart recipe page:', error);
      throw error;
    }
  }

  // Export grocery list as recipe page to Instacart
  async exportGroceryListAsRecipe(groceryItems, options = {}) {
    console.log('📦 InstacartService: Exporting', groceryItems.length, 'grocery items as recipe');

    const recipeTitle = options.title || 'My CartSmash Grocery List';
    
    // Convert grocery items to ingredients format
    const ingredients = groceryItems.map(item => {
      const quantity = item.quantity || 1;
      const unit = item.unit || 'item';
      const name = item.productName || item.name || item.item;
      
      return `${quantity} ${unit} ${name}`;
    });

    const recipeData = {
      title: recipeTitle,
      imageUrl: options.imageUrl || this.getDefaultRecipeImage(),
      ingredients: ingredients,
      instructions: [
        'This is a grocery shopping list created with CartSmash.',
        'Add these items to your Instacart cart and proceed to checkout.',
        'Enjoy your shopping experience!'
      ],
      retailerKey: options.preferredRetailer,
      partnerUrl: options.partnerUrl || 'https://cartsmash.com',
      trackPantryItems: options.trackPantryItems || false
    };

    return await this.createRecipePage(recipeData);
  }

  // Search for products in Instacart catalog (keeping existing method)
  async searchProducts(query, retailerId = null) {
    console.log('🔍 InstacartService: Searching for products:', query);
    
    try {
      // Always try backend API first (regardless of client API key configuration)
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('📡 Calling backend search API:', `${API_URL}/api/instacart/search`);
      
      const requestBody = {
        query: query,
        retailerId: retailerId,
        originalItem: { productName: query } // Add context for better matching
      };
      
      const response = await fetch(`${API_URL}/api/instacart/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend search API response:', data);
      
      if (data.success && data.products) {
        console.log(`🔍 Found ${data.products.length} products with real Instacart data`);
        // Transform to expected format with enhanced image support
        const products = data.products.map(product => ({
          ...product,
          image_url: product.image || product.image_url, // Support both field names
          success: true
        }));
        
        return {
          success: true,
          products: products,
          results: products // Legacy compatibility
        };
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Error searching Instacart products from backend:', error);
      throw error;
    }
  }

  // Create shopping list via Instacart API
  async createShoppingList(items, listName = 'CartSmash List') {
    console.log('📝 InstacartService: Creating shopping list with', items.length, 'items');
    

    try {
      const payload = {
        name: listName,
        items: items.map(item => ({
          name: item.name || item.item,
          quantity: item.quantity || 1,
          notes: item.notes || ''
        }))
      };

      const response = await fetch(`${this.baseURL}/shopping_lists`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Instacart list creation error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatShoppingListResponse(data);
    } catch (error) {
      console.error('❌ Error creating Instacart shopping list:', error);
      throw error;
    }
  }

  // Add items to existing Instacart cart
  async addToCart(items, retailerId) {
    console.log('🛒 InstacartService: Adding items to cart for retailer', retailerId);
    

    try {
      const payload = {
        retailer_id: retailerId,
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity || 1
        }))
      };

      const response = await fetch(`${this.baseURL}/cart/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Instacart cart error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatCartResponse(data);
    } catch (error) {
      console.error('❌ Error adding to Instacart cart:', error);
      throw error;
    }
  }

  // 🆕 CREATE PRODUCTS LINK WITH ALTERNATIVES - Via CartSmash backend API
  async createProductsLinkWithAlternatives(lineItems, options = {}) {
    console.log('🛒 ===== INSTACART PRODUCTS LINK DEBUG =====');
    console.log('📝 createProductsLinkWithAlternatives called with:', {
      lineItemsCount: lineItems.length,
      title: options.title,
      linkType: options.linkType || 'shopping_list',
      retailerKey: options.retailerKey,
      timestamp: new Date().toISOString()
    });
    console.log('📦 Line items to send:', lineItems.map((item, index) => ({
      index,
      name: item.name || item.productName,
      upcs: item.upcs,
      product_ids: item.product_ids || item.productIds,
      measurements: item.line_item_measurements || item.measurements,
      filters: item.filters,
      hasAlternatives: !!(item.upcs || item.product_ids || item.productIds),
      hasFilters: !!item.filters
    })));

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3086';

      // Add timeout controller for API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const requestPayload = {
        title: options.title || 'CartSmash Shopping List',
        imageUrl: options.imageUrl,
        lineItems: lineItems,
        partnerUrl: options.partnerUrl || 'https://cartsmash.com',
        expiresIn: options.expiresIn || 365,
        instructions: options.instructions,
        linkType: options.linkType || 'shopping_list',
        retailerKey: options.retailerKey,
        filters: options.filters || {}
      };

      console.log('📤 Sending products link request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${apiUrl}/api/instacart/products-link/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      console.log('📞 API Response status:', response.status);
      console.log('📞 API Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📞 API Response data:', data);

      if (data.success) {
        console.log('✅ ===== PRODUCTS LINK CREATION SUCCESS =====');
        console.log('🎉 Products link with alternatives created successfully');
        console.log('🔗 Instacart URL:', data.instacartUrl);
        console.log('📊 Items count:', data.itemsCount);
        console.log('🔄 Alternatives supported:', data.alternativesSupported);

        return {
          success: true,
          productsLinkId: data.productsLinkId,
          instacartUrl: data.instacartUrl,
          title: data.title,
          itemsCount: data.itemsCount,
          type: data.type,
          alternativesSupported: data.alternativesSupported,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          cached: data.cached,
          mockMode: data.mockMode
        };
      } else {
        console.error('❌ ===== PRODUCTS LINK CREATION FAILED =====');
        console.error('💥 Backend products link creation failed:', data.error);
        throw new Error(data.error || 'Products link creation failed');
      }
    } catch (error) {
      console.error('❌ ===== INSTACART PRODUCTS LINK ERROR =====');

      if (error.name === 'AbortError') {
        console.error('⏰ Request timed out after 30 seconds');
        console.error('🌐 This is likely due to the remote API being slow or unresponsive');
      } else {
        console.error('💥 Error creating products link with alternatives:', error);
        console.error('🔍 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
        });
      }

      throw error;
    }
  }

  // 🆕 CREATE DIRECT CART - Via CartSmash backend API
  async createDirectCart(cartItems, retailerId, zipCode, metadata = {}) {
    console.log('🛒 ===== INSTACART SERVICE DEBUG =====');
    console.log('📝 createDirectCart called with:', {
      cartItemsCount: cartItems.length,
      retailerId,
      zipCode,
      metadataKeys: Object.keys(metadata),
      timestamp: new Date().toISOString()
    });
    console.log('📦 Cart items to send:', cartItems.map((item, index) => ({
      index,
      product_id: item.product_id,
      retailer_sku: item.retailer_sku,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      hasRequiredFields: !!(item.product_id && item.retailer_sku && item.quantity && item.name)
    })));
    console.log(`🔧 API URL: ${process.env.REACT_APP_API_URL || 'http://localhost:3048'}`);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3048';
      
      // Add timeout controller for API calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${apiUrl}/api/instacart/cart/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: retailerId,
          zipCode: zipCode,
          items: cartItems,
          userId: metadata.userId || 'cartsmash_user',
          metadata: {
            source: 'CartSmash',
            ...metadata
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes

      console.log('📞 API Response status:', response.status);
      console.log('📞 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📞 API Response data:', data);
      
      if (data.success) {
        console.log('✅ ===== CART CREATION SUCCESS =====');
        console.log('🎉 Direct cart created successfully via backend');
        console.log('🔗 Checkout URL:', data.checkoutUrl);
        console.log('📊 Items added:', data.itemsAdded);
        console.log('💰 Totals:', data.totals);
        
        return {
          success: true,
          cartId: data.cartId,
          checkoutUrl: data.checkoutUrl,
          itemsAdded: data.itemsAdded,
          totals: data.totals,
          metadata: data.metadata
        };
      } else {
        console.error('❌ ===== CART CREATION FAILED =====');
        console.error('💥 Backend cart creation failed:', data.error);
        throw new Error(data.error || 'Cart creation failed');
      }
    } catch (error) {
      console.error('❌ ===== INSTACART API ERROR =====');
      
      if (error.name === 'AbortError') {
        console.error('⏰ Request timed out after 30 seconds');
        console.error('🌐 This is likely due to the remote API being slow or unresponsive');
      } else {
        console.error('💥 Error creating direct cart via backend:', error);
        console.error('🔍 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
        });
      }
      
      throw error;
    }
  }


  // Response formatting methods
  formatRetailersResponse(data) {
    return {
      success: true,
      retailers: data.retailers || data.data || []
    };
  }

  formatProductsResponse(data) {
    return {
      success: true,
      products: data.products || data.items || data.data || [],
      total_results: data.total || data.count || 0
    };
  }

  formatShoppingListResponse(data) {
    return {
      success: true,
      ...data
    };
  }

  formatCartResponse(data) {
    return {
      success: true,
      ...data
    };
  }

  formatRecipeResponse(data) {
    return {
      success: true,
      recipeId: data.id || data.recipe_id,
      title: data.title,
      instacartUrl: data.products_link_url,
      ingredientsCount: data.ingredients_count || (data.ingredients ? data.ingredients.length : 0),
      createdAt: data.created_at,
      status: data.status || 'active',
      ...data
    };
  }
}

// Export singleton instance
const instacartService = new InstacartService();
export default instacartService;