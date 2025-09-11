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
      console.warn('⚠️ Instacart API key not configured. Using mock data.');
      this.useMockData = true;
    } else {
      console.log('✅ Instacart API configured for', this.isDevelopment ? 'development' : 'production');
      this.useMockData = false;
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

  // Find nearby retailers using Instacart API
  async getNearbyRetailers(zipCode = '95670') {
    console.log('🏪 InstacartService: Getting nearby retailers for', zipCode);
    
    if (this.useMockData) {
      return this.getMockRetailers();
    }

    try {
      const response = await fetch(`${this.baseURL}/retailers?zip_code=${zipCode}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Instacart API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatRetailersResponse(data);
    } catch (error) {
      console.error('❌ Error fetching Instacart retailers:', error);
      // Fallback to mock data
      return this.getMockRetailers();
    }
  }

  // 🆕 CREATE RECIPE PAGE - Official Instacart Developer Platform API
  async createRecipePage(recipeData) {
    console.log('🍳 InstacartService: Creating recipe page for:', recipeData.title);
    
    if (this.useMockData) {
      return this.getMockRecipeCreation(recipeData);
    }

    try {
      const payload = {
        title: recipeData.title,
        image_url: recipeData.imageUrl || 'https://via.placeholder.com/400x300/4CAF50/white?text=Recipe',
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
      return this.getMockRecipeCreation(recipeData);
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
      imageUrl: options.imageUrl || 'https://via.placeholder.com/400x300/2196F3/white?text=CartSmash+List',
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
    
    if (this.useMockData) {
      return this.getMockProductSearch(query);
    }

    try {
      let url = `${this.baseURL}/catalog/search?q=${encodeURIComponent(query)}`;
      if (retailerId) {
        url += `&retailer_id=${retailerId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Instacart search error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatProductsResponse(data);
    } catch (error) {
      console.error('❌ Error searching Instacart products:', error);
      return this.getMockProductSearch(query);
    }
  }

  // Create shopping list via Instacart API
  async createShoppingList(items, listName = 'CartSmash List') {
    console.log('📝 InstacartService: Creating shopping list with', items.length, 'items');
    
    if (this.useMockData) {
      return this.getMockShoppingListCreation(items, listName);
    }

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
      return this.getMockShoppingListCreation(items, listName);
    }
  }

  // Add items to existing Instacart cart
  async addToCart(items, retailerId) {
    console.log('🛒 InstacartService: Adding items to cart for retailer', retailerId);
    
    if (this.useMockData) {
      return this.getMockCartAddition(items, retailerId);
    }

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
      return this.getMockCartAddition(items, retailerId);
    }
  }

  // 🆕 CREATE DIRECT CART - Via CartSmash backend API
  async createDirectCart(cartItems, retailerId, zipCode, metadata = {}) {
    console.log('🛒 InstacartService: Creating direct cart via backend API');
    console.log(`📦 Items: ${cartItems.length}, Retailer: ${retailerId}, ZIP: ${zipCode}`);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Direct cart created successfully via backend');
        return {
          success: true,
          cartId: data.cartId,
          checkoutUrl: data.checkoutUrl,
          itemsAdded: data.itemsAdded,
          totals: data.totals,
          metadata: data.metadata
        };
      } else {
        console.error('❌ Backend cart creation failed:', data.error);
        throw new Error(data.error || 'Cart creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating direct cart via backend:', error);
      // Return mock response for development
      return this.getMockCartCreation(cartItems, retailerId, zipCode);
    }
  }

  // Mock data methods (for development/fallback)
  getMockRetailers() {
    return {
      success: true,
      retailers: [
        {
          id: 'safeway_1',
          name: 'Safeway',
          address: '123 Main St, Sacramento, CA 95670',
          distance: 0.8,
          delivery_fee: 3.99,
          minimum_order: 35.00,
          estimated_delivery: '1-2 hours',
          logo_url: '/instacart-logos/safeway.png',
          available: true
        },
        {
          id: 'kroger_1',
          name: 'Kroger',
          address: '456 Oak Ave, Sacramento, CA 95670',
          distance: 1.2,
          delivery_fee: 4.99,
          minimum_order: 35.00,
          estimated_delivery: '2-3 hours',
          logo_url: '/instacart-logos/kroger.png',
          available: true
        },
        {
          id: 'costco_1',
          name: 'Costco Wholesale',
          address: '789 Business Park Dr, Sacramento, CA 95670',
          distance: 2.1,
          delivery_fee: 5.99,
          minimum_order: 35.00,
          estimated_delivery: '2-4 hours',
          logo_url: '/instacart-logos/costco.png',
          available: true
        }
      ]
    };
  }

  getMockProductSearch(query) {
    const mockProducts = [
      {
        id: 'prod_1',
        name: `Organic ${query}`,
        brand: 'Generic Brand',
        size: '1 lb',
        price: 3.99,
        image_url: '/placeholder-product.jpg',
        availability: 'in_stock'
      },
      {
        id: 'prod_2', 
        name: `Fresh ${query}`,
        brand: 'Store Brand',
        size: '2 lbs',
        price: 5.49,
        image_url: '/placeholder-product.jpg',
        availability: 'limited_stock'
      }
    ];

    return {
      success: true,
      products: mockProducts,
      total_results: mockProducts.length
    };
  }

  getMockShoppingListCreation(items, listName) {
    return {
      success: true,
      list_id: 'list_' + Date.now(),
      name: listName,
      items_added: items.length,
      share_url: `https://www.instacart.com/lists/share/${Date.now()}`,
      created_at: new Date().toISOString()
    };
  }

  getMockCartAddition(items, retailerId) {
    return {
      success: true,
      cart_id: 'cart_' + Date.now(),
      retailer_id: retailerId,
      items_added: items.length,
      total_items: items.length,
      estimated_total: items.length * 4.99,
      checkout_url: `https://www.instacart.com/store/checkout?cart_id=cart_${Date.now()}`
    };
  }

  getMockRecipeCreation(recipeData) {
    const recipeId = Math.floor(Math.random() * 1000000);
    return {
      success: true,
      recipe_id: recipeId,
      title: recipeData.title,
      products_link_url: `https://www.instacart.com/store/recipes/${recipeId}`,
      ingredients_count: recipeData.ingredients ? recipeData.ingredients.length : 0,
      created_at: new Date().toISOString(),
      status: 'active'
    };
  }

  getMockCartCreation(cartItems, retailerId, zipCode) {
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const estimatedTotal = cartItems.length * 4.99; // Mock pricing
    
    console.log(`✅ Mock direct cart created: ${cartId}`);
    
    return {
      success: true,
      cartId: cartId,
      checkoutUrl: `https://www.instacart.com/store/checkout_v3/${cartId}?partner=CartSmash&utm_source=CartSmash`,
      itemsAdded: cartItems.length,
      totals: {
        subtotal: estimatedTotal,
        total: Math.round((estimatedTotal * 1.15) * 100) / 100, // Add estimated taxes/fees
        item_count: cartItems.length
      },
      metadata: {
        retailer: retailerId,
        zipCode: zipCode,
        createdAt: new Date().toISOString(),
        mockMode: true
      }
    };
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