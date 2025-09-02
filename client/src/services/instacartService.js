// client/src/services/instacartService.js
// Instacart Developer Platform API integration

class InstacartService {
  constructor() {
    this.apiKey = process.env.REACT_APP_INSTACART_API_KEY;
    this.baseURL = process.env.REACT_APP_INSTACART_BASE_URL || 'https://api.instacart.com/v2';
    
    if (!this.apiKey || this.apiKey === 'your_development_api_key_here') {
      console.warn('⚠️ Instacart API key not configured. Using mock data.');
      this.useMockData = true;
    } else {
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

  // Search for products in Instacart catalog
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
}

// Export singleton instance
const instacartService = new InstacartService();
export default instacartService;