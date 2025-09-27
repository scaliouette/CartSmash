// client/src/services/instacartService.js
// Instacart Developer Platform API integration
import debugService from './debugService';
import { auth } from '../firebase/config';

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
      debugService.log('✅ Instacart API configured for', this.isDevelopment ? 'development' : 'production');
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
    debugService.log('🏪 InstacartService: Getting nearby retailers for', zipCode);

    try {
      // Get auth token if user is logged in
      let authHeaders = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
        } catch (authError) {
          debugService.log('⚠️ Could not get auth token:', authError.message);
        }
      }

      // Always try backend API first (regardless of client API key configuration)
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      debugService.log('📡 Calling backend retailer API:', `${API_URL}/api/instacart/retailers?postalCode=${zipCode}`);

      const response = await fetch(`${API_URL}/api/instacart/retailers?postalCode=${zipCode}&countryCode=US`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      debugService.log('✅ Backend API response:', data);

      if (data.success && data.retailers) {
        debugService.log(`🏪 Found ${data.retailers.length} real retailers from Instacart API`);
        return {
          success: true,
          retailers: data.retailers
        };
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      debugService.logError('❌ Error fetching Instacart retailers from backend:', error);
      throw error;
    }
  }

  // 🆕 CREATE RECIPE PAGE - Official Instacart Developer Platform API
  async createRecipePage(recipeData) {
    debugService.log('🍳 InstacartService: Creating recipe page for:', recipeData.title);
    

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

      debugService.log('📤 Sending recipe to Instacart:', payload);

      const response = await fetch(`${this.baseURL}${this.recipeEndpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugService.logError('❌ Instacart API Error Response:', errorText);
        throw new Error(`Instacart recipe creation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      debugService.log('✅ Recipe page created successfully:', data);
      return this.formatRecipeResponse(data);
    } catch (error) {
      debugService.logError('❌ Error creating Instacart recipe page:', error);
      throw error;
    }
  }

  // Export grocery list as recipe page to Instacart
  async exportGroceryListAsRecipe(groceryItems, options = {}) {
    debugService.log('📦 InstacartService: Exporting', groceryItems.length, 'grocery items as recipe');

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
    debugService.log('🔍 InstacartService: Searching for products:', query);

    try {
      // Get auth token if user is logged in
      let authHeaders = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          authHeaders['Authorization'] = `Bearer ${token}`;
          debugService.log('✅ Auth token added to request');
        } catch (authError) {
          debugService.log('⚠️ Could not get auth token:', authError.message);
        }
      }

      // Always try backend API first (backend handles all Instacart API complexities)
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      debugService.log('📡 Calling backend search API:', `${API_URL}/api/instacart/search`);

      const requestBody = {
        query: query,
        retailerId: retailerId,
        originalItem: { productName: query } // Add context for better matching
      };

      const response = await fetch(`${API_URL}/api/instacart/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        debugService.logError(`❌ Backend API error: ${response.status} ${response.statusText}`);
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      debugService.log('✅ Backend search API response:', data);

      if (data.success && data.products && Array.isArray(data.products)) {
        if (data.products.length > 0) {
          debugService.log(`🔍 Found ${data.products.length} products with real Instacart data`);

          // Transform to expected format with enhanced validation
          const products = data.products.map(product => {
            const transformedProduct = {
              ...product,
              // Ensure image field consistency
              image_url: product.image || product.image_url || product.imageUrl,
              imageUrl: product.image || product.image_url || product.imageUrl,
              image: product.image || product.image_url || product.imageUrl,
              // Ensure price is numeric
              price: parseFloat(product.price) || 0,
              // Mark as successfully enriched
              enriched: true,
              source: 'instacart_api'
            };

            debugService.log(`✅ Transformed product: ${product.name || product.productName}`, {
              price: transformedProduct.price,
              hasImage: !!transformedProduct.image,
              enriched: transformedProduct.enriched
            });

            return transformedProduct;
          });

          return {
            success: true,
            products: products,
            results: products, // Legacy compatibility
            source: 'backend_api'
          };
        } else {
          debugService.log('⚠️ No products found from backend API');
          return {
            success: true,
            products: [],
            results: [],
            source: 'backend_api_empty'
          };
        }
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      debugService.logError('❌ Error searching Instacart products from backend:', error);
      throw error;
    }
  }

  // Create shopping list via Instacart API
  async createShoppingList(items, listName = 'CartSmash List') {
    debugService.log('📝 InstacartService: Creating shopping list with', items.length, 'items');
    

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
      debugService.logError('❌ Error creating Instacart shopping list:', error);
      throw error;
    }
  }

  // Add items to existing Instacart cart
  async addToCart(items, retailerId) {
    debugService.log('🛒 InstacartService: Adding items to cart for retailer', retailerId);
    

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
      debugService.logError('❌ Error adding to Instacart cart:', error);
      throw error;
    }
  }

  // 🆕 CREATE PRODUCTS LINK WITH ALTERNATIVES - Via CartSmash backend API
  async createProductsLinkWithAlternatives(lineItems, options = {}) {
    debugService.log('🛒 ===== INSTACART PRODUCTS LINK DEBUG =====');
    debugService.log('📝 createProductsLinkWithAlternatives called with:', {
      lineItemsCount: lineItems.length,
      title: options.title,
      linkType: options.linkType || 'shopping_list',
      retailerKey: options.retailerKey,
      timestamp: new Date().toISOString()
    });
    debugService.log('📦 Line items to send:', lineItems.map((item, index) => ({
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
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

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

      debugService.log('📤 Sending products link request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${apiUrl}/api/instacart/products-link/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      debugService.log('📞 API Response status:', response.status);
      debugService.log('📞 API Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      debugService.log('📞 API Response data:', data);

      if (data.success) {
        debugService.log('✅ ===== PRODUCTS LINK CREATION SUCCESS =====');
        debugService.log('🎉 Products link with alternatives created successfully');
        debugService.log('🔗 Instacart URL:', data.instacartUrl);
        debugService.log('📊 Items count:', data.itemsCount);
        debugService.log('🔄 Alternatives supported:', data.alternativesSupported);

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
        debugService.logError('❌ ===== PRODUCTS LINK CREATION FAILED =====');
        debugService.logError('💥 Backend products link creation failed:', data.error);
        throw new Error(data.error || 'Products link creation failed');
      }
    } catch (error) {
      debugService.logError('❌ ===== INSTACART PRODUCTS LINK ERROR =====');

      if (error.name === 'AbortError') {
        debugService.logError('⏰ Request timed out after 30 seconds');
        debugService.logError('🌐 This is likely due to the remote API being slow or unresponsive');
      } else {
        debugService.logError('💥 Error creating products link with alternatives:', error);
        debugService.logError('🔍 Error details:', {
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
    debugService.log('🛒 ===== INSTACART SERVICE DEBUG =====');
    debugService.log('📝 createDirectCart called with:', {
      cartItemsCount: cartItems.length,
      retailerId,
      zipCode,
      metadataKeys: Object.keys(metadata),
      timestamp: new Date().toISOString()
    });
    debugService.log('📦 Cart items to send:', cartItems.map((item, index) => ({
      index,
      product_id: item.product_id,
      retailer_sku: item.retailer_sku,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      hasRequiredFields: !!(item.product_id && item.retailer_sku && item.quantity && item.name)
    })));
    debugService.log(`🔧 API URL: ${process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com'}`);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      
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

      debugService.log('📞 API Response status:', response.status);
      debugService.log('📞 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      debugService.log('📞 API Response data:', data);
      
      if (data.success) {
        debugService.log('✅ ===== CART CREATION SUCCESS =====');
        debugService.log('🎉 Direct cart created successfully via backend');
        debugService.log('🔗 Checkout URL:', data.checkoutUrl);
        debugService.log('📊 Items added:', data.itemsAdded);
        debugService.log('💰 Totals:', data.totals);
        
        return {
          success: true,
          cartId: data.cartId,
          checkoutUrl: data.checkoutUrl,
          itemsAdded: data.itemsAdded,
          totals: data.totals,
          metadata: data.metadata
        };
      } else {
        debugService.logError('❌ ===== CART CREATION FAILED =====');
        debugService.logError('💥 Backend cart creation failed:', data.error);
        throw new Error(data.error || 'Cart creation failed');
      }
    } catch (error) {
      debugService.logError('❌ ===== INSTACART API ERROR =====');
      
      if (error.name === 'AbortError') {
        debugService.logError('⏰ Request timed out after 30 seconds');
        debugService.logError('🌐 This is likely due to the remote API being slow or unresponsive');
      } else {
        debugService.logError('💥 Error creating direct cart via backend:', error);
        debugService.logError('🔍 Error details:', {
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