// client/src/services/instacartShoppingListService.js
// Enhanced Instacart Shopping List Service with Full API Integration

class InstacartShoppingListService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get default shopping list image with reliable fallback
   * @returns {string} Default image URL
   */
  getDefaultShoppingImage() {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
        <rect width="500" height="500" fill="#00B894"/>
        <text x="250" y="200" font-family="Arial, sans-serif" font-size="64" text-anchor="middle" fill="white">🛒</text>
        <text x="250" y="350" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">Shopping List</text>
      </svg>
    `.replace(/\s+/g, ' ').trim());
  }

  /**
   * Create an enhanced shopping list with full Instacart API format
   * @param {Object} listData - Shopping list data
   * @param {Array} listData.items - Array of items to add
   * @param {string} listData.title - List title
   * @param {string} listData.retailerKey - Selected retailer
   * @param {Object} listData.preferences - User preferences for matching
   * @returns {Promise<Object>} API response
   */
  async createEnhancedShoppingList(listData, options = {}) {
    try {
      console.log('🛒 Creating enhanced shopping list:', listData.title);

      const enhancedLineItems = await this.processLineItems(listData.items || listData.lineItems, listData.preferences);

      const requestBody = {
        title: listData.title || 'My CartSmash Shopping List',
        imageUrl: listData.imageUrl || this.getDefaultShoppingImage(),
        lineItems: enhancedLineItems,
        partnerUrl: options.partnerUrl || 'https://cartsmash.com',
        expiresIn: options.expiresIn || 365,
        instructions: listData.instructions || ['Enhanced shopping list created with CartSmash']
      };

      console.log('📦 Enhanced shopping list payload:', {
        title: requestBody.title,
        itemCount: requestBody.lineItems.length,
        sampleItems: requestBody.lineItems.slice(0, 2).map(item => ({
          name: item.name,
          measurements: item.line_item_measurements,
          filters: item.filters
        }))
      });

      const response = await fetch(`${this.baseUrl}/api/instacart/shopping-list/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Shopping list creation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Enhanced shopping list created successfully');
        return result;
      } else {
        throw new Error(result.error || 'Shopping list creation failed');
      }

    } catch (error) {
      console.error('❌ Error creating enhanced shopping list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process items into enhanced line_items format with full API features
   * @param {Array} items - CartSmash items
   * @param {Object} preferences - User preferences for matching
   * @returns {Promise<Array>} Enhanced line items
   */
  async processLineItems(items, preferences = {}) {
    const enhancedItems = [];

    for (const item of items) {
      const enhancedItem = await this.enhanceLineItem(item, preferences);
      enhancedItems.push(enhancedItem);
    }

    return enhancedItems;
  }

  /**
   * Enhance a single item with full Instacart API format
   * @param {Object} item - CartSmash item
   * @param {Object} preferences - User preferences
   * @returns {Promise<Object>} Enhanced line item
   */
  async enhanceLineItem(item, preferences) {
    // Base line item format
    const lineItem = {
      name: item.productName || item.name || 'Unknown Item',
      display_text: this.generateDisplayText(item)
    };

    // Enhanced measurements with multiple options
    lineItem.line_item_measurements = this.generateMeasurements(item);

    // UPC barcodes for exact matching
    if (item.upc || item.upcs || item.barcode) {
      lineItem.upcs = this.normalizeUpcs(item.upc || item.upcs || item.barcode);
    }

    // Specific Instacart product IDs
    if (item.instacartId || item.product_ids || item.productIds) {
      lineItem.product_ids = this.normalizeProductIds(
        item.instacartId || item.product_ids || item.productIds
      );
    }

    // Enhanced filters
    const filters = this.generateFilters(item, preferences);
    if (Object.keys(filters).length > 0) {
      lineItem.filters = filters;
    }

    return lineItem;
  }

  /**
   * Generate display text for item
   * @param {Object} item - CartSmash item
   * @returns {string} Display text
   */
  generateDisplayText(item) {
    const quantity = item.quantity || 1;
    const unit = item.unit || 'each';
    const name = item.productName || item.name || 'Unknown Item';

    return `${quantity} ${unit} ${name}`;
  }

  /**
   * Generate measurements array with alternatives
   * @param {Object} item - CartSmash item
   * @returns {Array} Measurements array
   */
  generateMeasurements(item) {
    const measurements = [];

    // Primary measurement
    const primaryQty = parseFloat(item.quantity) || 1;
    const primaryUnit = item.unit || 'each';

    measurements.push({
      quantity: primaryQty,
      unit: primaryUnit
    });

    // Add alternative measurements for common conversions
    if (primaryUnit === 'cup' && primaryQty === 1) {
      measurements.push(
        { quantity: 16, unit: 'tbsp' },
        { quantity: 48, unit: 'tsp' }
      );
    } else if (primaryUnit === 'lb' && primaryQty === 1) {
      measurements.push({ quantity: 16, unit: 'oz' });
    } else if (primaryUnit === 'gallon' && primaryQty === 1) {
      measurements.push(
        { quantity: 4, unit: 'quart' },
        { quantity: 8, unit: 'pint' },
        { quantity: 16, unit: 'cup' }
      );
    }

    return measurements;
  }

  /**
   * Normalize UPC codes
   * @param {string|Array} upcs - UPC codes
   * @returns {Array} Normalized UPC array
   */
  normalizeUpcs(upcs) {
    if (!upcs) return undefined;

    const upcArray = Array.isArray(upcs) ? upcs : [upcs];
    return upcArray
      .map(upc => String(upc).replace(/\D/g, '')) // Remove non-digits
      .filter(upc => upc.length >= 8 && upc.length <= 14); // Valid UPC length
  }

  /**
   * Normalize product IDs
   * @param {string|Array} productIds - Product IDs
   * @returns {Array} Normalized product ID array
   */
  normalizeProductIds(productIds) {
    if (!productIds) return undefined;

    const idArray = Array.isArray(productIds) ? productIds : [productIds];
    return idArray
      .map(id => String(id).trim())
      .filter(id => id.length > 0);
  }

  /**
   * Generate enhanced filters for better matching
   * @param {Object} item - CartSmash item
   * @param {Object} preferences - User preferences
   * @returns {Object} Filters object
   */
  generateFilters(item, preferences) {
    const filters = {};

    // Brand filters (preferred brands)
    const brandFilters = this.generateBrandFilters(item, preferences);
    if (brandFilters.length > 0) {
      filters.brand_filters = brandFilters;
    }

    // Health filters (dietary restrictions)
    const healthFilters = this.generateHealthFilters(item, preferences);
    if (healthFilters.length > 0) {
      filters.health_filters = healthFilters;
    }

    return filters;
  }

  /**
   * Generate brand filters
   * @param {Object} item - CartSmash item
   * @param {Object} preferences - User preferences
   * @returns {Array} Brand filters array
   */
  generateBrandFilters(item, preferences) {
    const brands = [];

    // Item-specific brand preference
    if (item.brand) {
      brands.push(item.brand);
    }

    // User's preferred brands
    if (preferences.preferredBrands && Array.isArray(preferences.preferredBrands)) {
      brands.push(...preferences.preferredBrands);
    }

    // Category-specific brand preferences
    if (item.category && preferences.categoryBrands && preferences.categoryBrands[item.category]) {
      brands.push(...preferences.categoryBrands[item.category]);
    }

    // Remove duplicates and filter out non-string values
    return [...new Set(brands)]
      .filter(brand => typeof brand === 'string' && brand.trim().length > 0)
      .map(brand => brand.trim());
  }

  /**
   * Generate health filters based on dietary restrictions
   * @param {Object} item - CartSmash item
   * @param {Object} preferences - User preferences
   * @returns {Array} Health filters array
   */
  generateHealthFilters(item, preferences) {
    const healthFilters = [];

    // Valid health filters per Instacart API
    const VALID_HEALTH_FILTERS = [
      'ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN',
      'KOSHER', 'SUGAR_FREE', 'LOW_FAT'
    ];

    // Item-specific health preferences
    if (item.healthFilters && Array.isArray(item.healthFilters)) {
      healthFilters.push(...item.healthFilters);
    }

    // User's dietary restrictions
    if (preferences.dietaryRestrictions && Array.isArray(preferences.dietaryRestrictions)) {
      healthFilters.push(...preferences.dietaryRestrictions);
    }

    // Auto-detect common health filters based on item name
    const itemName = (item.productName || item.name || '').toLowerCase();
    if (itemName.includes('organic')) {
      healthFilters.push('ORGANIC');
    }
    if (itemName.includes('gluten free') || itemName.includes('gluten-free')) {
      healthFilters.push('GLUTEN_FREE');
    }
    if (itemName.includes('vegan')) {
      healthFilters.push('VEGAN');
    }
    if (itemName.includes('kosher')) {
      healthFilters.push('KOSHER');
    }

    // Filter to only valid health filters and remove duplicates
    return [...new Set(healthFilters)]
      .filter(filter => VALID_HEALTH_FILTERS.includes(filter));
  }

  /**
   * Search for products with enhanced matching
   * @param {string} query - Search query
   * @param {string} retailerId - Retailer ID
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with confidence scores
   */
  async searchProductsWithMatching(query, retailerId, options = {}) {
    try {
      const cacheKey = `search_${query}_${retailerId}_${JSON.stringify(options)}`;

      // Check cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('📦 Using cached search results');
          return cached.data;
        }
      }

      console.log(`🔍 Enhanced product search: "${query}" at ${retailerId}`);

      const response = await fetch(`${this.baseUrl}/api/instacart/search/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          retailerId,
          options: {
            includeConfidence: true,
            includeMatchDetails: true,
            ...options
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const result = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('❌ Enhanced search error:', error);
      return {
        success: false,
        error: error.message,
        products: []
      };
    }
  }

  /**
   * Get user preferences for enhanced matching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/shopping-preferences`);

      if (response.ok) {
        return await response.json();
      }

      // Return default preferences if user preferences not found
      return this.getDefaultPreferences();

    } catch (error) {
      console.warn('⚠️ Could not load user preferences, using defaults:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get default user preferences
   * @returns {Object} Default preferences
   */
  getDefaultPreferences() {
    return {
      preferredBrands: [],
      dietaryRestrictions: [],
      categoryBrands: {},
      measurementPreferences: 'imperial', // 'imperial' or 'metric'
      organicPreference: false,
      pricePreference: 'balanced' // 'budget', 'balanced', 'premium'
    };
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Shopping list service cache cleared');
  }
}

const instacartShoppingListService = new InstacartShoppingListService();
export { instacartShoppingListService };
export default instacartShoppingListService;