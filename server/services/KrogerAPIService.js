// server/services/KrogerAPIService.js - Kroger API Integration
const axios = require('axios');

class KrogerAPIService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Cache for API responses
    this.cache = new Map();
    this.cacheExpiry = new Map();
    
    // Default store location (you can make this configurable)
    this.defaultLocationId = process.env.KROGER_DEFAULT_STORE || '01400943';
    
    console.log('🏪 Kroger API Service initialized');
  }

  /**
   * Authenticate with Kroger API using Client Credentials flow
   */
// Fixed authenticate method for KrogerAPIService.js
async authenticate() {
  try {
    console.log('🔐 Authenticating with Kroger API...');
    
    // Check if credentials exist
    if (!this.clientId || !this.clientSecret) {
      console.error('❌ Missing Kroger credentials in environment variables');
      throw new Error('KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set');
    }
    
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    // Use URLSearchParams to properly format the body
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.KROGER_REDIRECT_URI);

    const tokenResponse = await axios.post(
  `${process.env.KROGER_BASE_URL}/connect/oauth2/token`,
  params.toString(),
  {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  }
);
    
    const response = await axios.post(
      `${this.baseURL}/connect/oauth2/token`,
      params.toString(), // Convert to proper form data
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    
    console.log('✅ Kroger API authentication successful');
    console.log(`   Token expires in: ${response.data.expires_in} seconds`);
    return true;
    
  } catch (error) {
    console.error('❌ Kroger API authentication failed:', error.response?.data || error.message);
    
    // Log more detailed error information
    if (error.response?.status === 401) {
      console.error('   Status: 401 - Invalid client credentials');
      console.error('   Check your KROGER_CLIENT_ID and KROGER_CLIENT_SECRET');
    } else if (error.response?.status === 400) {
      console.error('   Status: 400 - Bad request format');
    }
    
    throw new Error('Failed to authenticate with Kroger API');
  }
}

  /**
   * Ensure we have a valid access token
   */
  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      return await this.authenticate();
    }
    return true;
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, params = {}) {
    if (!(await this.ensureAuthenticated())) {
      throw new Error('Failed to authenticate with Kroger API');
    }

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        },
        params: params
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ Kroger API request failed [${endpoint}]:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for products by name
   */
  async searchProducts(query, locationId = null, limit = 10) {
    const cacheKey = `search_${query}_${locationId || this.defaultLocationId}_${limit}`;
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      console.log(`🎯 Cache hit for product search: ${query}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔍 Searching Kroger products: "${query}"`);
      
      const params = {
        'filter.term': query,
        'filter.locationId': locationId || this.defaultLocationId,
        'filter.limit': limit
      };
      
      const data = await this.makeRequest('/products', params);
      const products = data.data || [];
      
      // Cache the results for 2 hours
      this.setCacheWithExpiry(cacheKey, products, 2 * 60 * 60 * 1000);
      
      console.log(`✅ Found ${products.length} products for "${query}"`);
      return products;
      
    } catch (error) {
      console.error(`❌ Product search failed for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(productId, locationId = null) {
    const cacheKey = `product_${productId}_${locationId || this.defaultLocationId}`;
    
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = {
        'filter.locationId': locationId || this.defaultLocationId
      };
      
      const data = await this.makeRequest(`/products/${productId}`, params);
      const product = data.data;
      
      // Cache for 1 hour
      this.setCacheWithExpiry(cacheKey, product, 60 * 60 * 1000);
      
      return product;
      
    } catch (error) {
      console.error(`❌ Failed to get product details for ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Find stores near a zip code
   */
  async findStores(zipCode, radius = 10, limit = 10) {
    const cacheKey = `stores_${zipCode}_${radius}_${limit}`;
    
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🏪 Finding Kroger stores near ${zipCode}`);
      
      const params = {
        'filter.zipCode.near': zipCode,
        'filter.radiusInMiles': radius,
        'filter.limit': limit
      };
      
      const data = await this.makeRequest('/locations', params);
      const stores = data.data || [];
      
      // Cache store locations for 24 hours
      this.setCacheWithExpiry(cacheKey, stores, 24 * 60 * 60 * 1000);
      
      console.log(`✅ Found ${stores.length} stores near ${zipCode}`);
      return stores;
      
    } catch (error) {
      console.error(`❌ Store search failed for ${zipCode}:`, error.message);
      return [];
    }
  }

  /**
   * Validate a grocery item against Kroger's catalog
   */
  async validateGroceryItem(itemName, options = {}) {
    try {
      const {
        locationId = null,
        fuzzyMatch = true,
        includePricing = true,
        includeNutrition = false
      } = options;

      // Search for the product
      const products = await this.searchProducts(itemName, locationId, 5);
      
      if (products.length === 0) {
        return {
          isValid: false,
          confidence: 0.0,
          reason: 'Product not found in Kroger catalog',
          suggestions: []
        };
      }

      // Find the best match
      const bestMatch = this.findBestMatch(itemName, products);
      const confidence = this.calculateMatchConfidence(itemName, bestMatch);
      
      // Get detailed product information if needed
      let productDetails = bestMatch;
      if (includePricing || includeNutrition) {
        productDetails = await this.getProductDetails(bestMatch.productId, locationId);
      }

      return {
        isValid: confidence >= 0.6,
        confidence: confidence,
        product: this.mapKrogerProduct(productDetails || bestMatch),
        alternatives: products.slice(1, 4).map(p => this.mapKrogerProduct(p)),
        reason: confidence >= 0.6 ? 'Product found in Kroger catalog' : 'Low confidence match'
      };
      
    } catch (error) {
      console.error(`❌ Product validation failed for "${itemName}":`, error.message);
      return {
        isValid: false,
        confidence: 0.0,
        reason: 'Validation service error',
        error: error.message
      };
    }
  }

  /**
   * Batch validate multiple grocery items
   */
  async batchValidateItems(items, options = {}) {
    console.log(`🔍 Batch validating ${items.length} items...`);
    
    const results = await Promise.allSettled(
      items.map(item => this.validateGroceryItem(item, options))
    );
    
    const validatedItems = results.map((result, index) => ({
      originalItem: items[index],
      validation: result.status === 'fulfilled' ? result.value : {
        isValid: false,
        confidence: 0.0,
        reason: 'Validation failed',
        error: result.reason?.message
      }
    }));
    
    const summary = {
      total: items.length,
      validated: validatedItems.filter(item => item.validation.isValid).length,
      failed: validatedItems.filter(item => !item.validation.isValid).length,
      averageConfidence: validatedItems.reduce((sum, item) => sum + item.validation.confidence, 0) / items.length
    };
    
    console.log(`✅ Batch validation complete: ${summary.validated}/${summary.total} validated`);
    
    return {
      items: validatedItems,
      summary: summary
    };
  }

  /**
   * Get pricing for a product
   */
  async getProductPricing(productName, locationId = null) {
    try {
      const validation = await this.validateGroceryItem(productName, { 
        locationId, 
        includePricing: true 
      });
      
      if (!validation.isValid || !validation.product) {
        return {
          found: false,
          productName: productName,
          price: null,
          reason: 'Product not found'
        };
      }
      
      const product = validation.product;
      return {
        found: true,
        productName: product.name,
        price: product.price,
        salePrice: product.salePrice,
        unit: product.size,
        store: product.storeId,
        confidence: validation.confidence
      };
      
    } catch (error) {
      console.error(`❌ Pricing lookup failed for "${productName}":`, error.message);
      return {
        found: false,
        productName: productName,
        price: null,
        error: error.message
      };
    }
  }

  /**
   * Find the best matching product from search results
   */
  findBestMatch(query, products) {
    if (products.length === 0) return null;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Score each product based on name similarity
    let bestMatch = products[0];
    let bestScore = this.calculateSimilarity(normalizedQuery, bestMatch.description.toLowerCase());
    
    for (const product of products.slice(1)) {
      const score = this.calculateSimilarity(normalizedQuery, product.description.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    // Simple word overlap scoring
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    for (const word of words1) {
      if (words2.some(w => w.includes(word) || word.includes(w))) {
        matches++;
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  /**
   * Calculate match confidence based on query and product
   */
  calculateMatchConfidence(query, product) {
    if (!product) return 0.0;
    
    const similarity = this.calculateSimilarity(
      query.toLowerCase(), 
      product.description.toLowerCase()
    );
    
    // Boost confidence if brand matches
    if (product.brand && query.toLowerCase().includes(product.brand.toLowerCase())) {
      return Math.min(similarity + 0.2, 1.0);
    }
    
    return similarity;
  }

  /**
   * Map Kroger product to standardized format
   */
  mapKrogerProduct(krogerProduct) {
    if (!krogerProduct) return null;
    
    const item = krogerProduct.items?.[0] || {};
    const price = item.price || {};
    
    return {
      id: krogerProduct.productId,
      name: krogerProduct.description,
      brand: krogerProduct.brand,
      size: item.size,
      price: price.regular || 0,
      salePrice: price.promo || null,
      category: krogerProduct.categories?.[0] || 'other',
      upc: krogerProduct.upc,
      imageUrl: krogerProduct.images?.[0]?.sizes?.[0]?.url,
      availability: item.inventory?.stockLevel || 'unknown',
      storeId: krogerProduct.locationId,
      source: 'kroger',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Cache management methods
   */
  setCacheWithExpiry(key, value, ttlMs) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttlMs);
  }

  isValidCache(key) {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * Get service health and statistics
   */
  getServiceHealth() {
    return {
      isAuthenticated: !!this.accessToken && Date.now() < this.tokenExpiry,
      tokenExpiry: this.tokenExpiry,
      cacheSize: this.cache.size,
      defaultStore: this.defaultLocationId,
      baseURL: this.baseURL,
      lastAuthentication: this.tokenExpiry ? new Date(this.tokenExpiry - 3600000).toISOString() : null
    };
  }
}

module.exports = KrogerAPIService;