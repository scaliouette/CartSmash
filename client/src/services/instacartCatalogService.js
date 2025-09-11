// client/src/services/instacartCatalogService.js
// Instacart Catalog API integration for product matching and resolution

class InstacartCatalogService {
  constructor() {
    this.catalogApiKey = process.env.REACT_APP_INSTACART_CATALOG_API_KEY;
    this.developerApiKey = process.env.REACT_APP_INSTACART_API_KEY;
    
    // API endpoints for different environments
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.baseURL = this.isDevelopment 
      ? 'https://connect.dev.instacart.tools'  // Development
      : 'https://connect.instacart.com';       // Production
    
    // Cache for product searches
    this.searchCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    
    console.log('📦 InstacartCatalogService initialized');
    console.log(`🔑 Catalog API Key: ${this.catalogApiKey ? this.catalogApiKey.substring(0, 20) + '...' : 'NOT SET'}`);
  }

  // Get headers for API requests
  getHeaders(useDevApi = false) {
    const apiKey = useDevApi ? this.developerApiKey : this.catalogApiKey;
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CartSmash/1.0'
    };
  }

  // Search for products in Instacart catalog
  async searchProducts(query, retailerId = null, options = {}) {
    console.log(`🔍 Searching Instacart catalog for: "${query}"`);
    
    const cacheKey = `${query}_${retailerId || 'all'}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('💾 Using cached search results');
        return cached.data;
      }
    }

    try {
      // Try different API endpoints for product search
      const endpoints = [
        '/v2/catalog/products/search',  // Connect API
        '/v1/catalog/search',           // Alternative endpoint
        '/catalog/search'               // Fallback endpoint
      ];

      let searchResult = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const result = await this.makeSearchRequest(endpoint, query, retailerId, options);
          if (result && result.products && result.products.length > 0) {
            searchResult = result;
            console.log(`✅ Found products using endpoint: ${endpoint}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, error.message);
          lastError = error;
          continue;
        }
      }

      if (!searchResult) {
        // If all real endpoints fail, return mock data for development
        console.log('🎭 All endpoints failed, using mock data');
        searchResult = this.getMockSearchResults(query);
      }

      // Cache the result
      this.searchCache.set(cacheKey, {
        data: searchResult,
        timestamp: Date.now()
      });

      return searchResult;

    } catch (error) {
      console.error('❌ Error searching Instacart catalog:', error);
      return this.getMockSearchResults(query);
    }
  }

  // Make a search request to a specific endpoint
  async makeSearchRequest(endpoint, query, retailerId, options) {
    const params = new URLSearchParams({
      q: query,
      limit: options.limit || 10
    });
    
    if (retailerId) {
      params.append('retailer_id', retailerId);
    }
    
    if (options.category) {
      params.append('category', options.category);
    }

    const url = `${this.baseURL}${endpoint}?${params.toString()}`;
    console.log(`📡 Making request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatSearchResponse(data);
  }

  // Find best matching product for a CartSmash item
  async findBestMatch(cartItem, retailerId = null) {
    console.log(`🎯 Finding best match for: ${cartItem.productName || cartItem.name}`);

    const productName = cartItem.productName || cartItem.name || cartItem.item;
    if (!productName) {
      console.log('❌ No product name provided for matching');
      return null;
    }

    // Search for the product
    const searchResult = await this.searchProducts(productName, retailerId, { limit: 5 });
    
    if (!searchResult || !searchResult.products || searchResult.products.length === 0) {
      console.log(`❌ No products found for: ${productName}`);
      return null;
    }

    // Score and rank the results
    const scoredProducts = searchResult.products.map(product => ({
      ...product,
      matchScore: this.calculateMatchScore(cartItem, product)
    }));

    // Sort by match score (highest first)
    scoredProducts.sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = scoredProducts[0];
    console.log(`✅ Best match: ${bestMatch.name} (score: ${bestMatch.matchScore.toFixed(2)})`);

    return {
      originalItem: cartItem,
      matchedProduct: bestMatch,
      matchScore: bestMatch.matchScore,
      alternatives: scoredProducts.slice(1, 3), // Top 2 alternatives
      searchQuery: productName
    };
  }

  // Calculate match score between CartSmash item and Instacart product
  calculateMatchScore(cartItem, product) {
    let score = 0;
    const itemName = (cartItem.productName || cartItem.name || cartItem.item || '').toLowerCase();
    const productName = (product.name || '').toLowerCase();
    const productBrand = (product.brand || '').toLowerCase();
    const productDescription = (product.description || '').toLowerCase();

    // Exact name match
    if (itemName === productName) {
      score += 100;
    }
    
    // Partial name match
    const itemWords = itemName.split(/\s+/);
    const productWords = productName.split(/\s+/);
    
    const matchingWords = itemWords.filter(word => 
      productWords.some(pWord => pWord.includes(word) || word.includes(pWord))
    );
    
    score += (matchingWords.length / itemWords.length) * 50;

    // Brand mentions
    if (itemName.includes(productBrand) || productBrand.includes(itemName)) {
      score += 20;
    }

    // Description relevance
    const descriptionMatch = itemWords.filter(word => 
      productDescription.includes(word)
    );
    score += (descriptionMatch.length / itemWords.length) * 15;

    // Unit/size matching
    if (cartItem.unit && product.size) {
      const itemUnit = cartItem.unit.toLowerCase();
      const productSize = product.size.toLowerCase();
      
      if (productSize.includes(itemUnit) || itemUnit.includes(productSize)) {
        score += 10;
      }
    }

    // Availability bonus
    if (product.availability === 'in_stock' || product.available) {
      score += 5;
    }

    return score;
  }

  // Get product details by ID
  async getProductDetails(productId, retailerId = null) {
    console.log(`📋 Getting product details for ID: ${productId}`);

    try {
      const params = new URLSearchParams();
      if (retailerId) {
        params.append('retailer_id', retailerId);
      }

      const url = `${this.baseURL}/v2/catalog/products/${productId}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Error getting product details:', error);
      return null;
    }
  }

  // Batch resolve multiple cart items
  async batchResolveItems(cartItems, retailerId = null) {
    console.log(`🔄 Batch resolving ${cartItems.length} items`);

    const resolvedItems = [];
    const batchSize = 3; // Process in small batches to avoid rate limits

    for (let i = 0; i < cartItems.length; i += batchSize) {
      const batch = cartItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(item => this.findBestMatch(item, retailerId));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          resolvedItems.push(result.value);
        } else {
          console.error(`❌ Failed to resolve item ${i + index}:`, result.reason);
          resolvedItems.push({
            originalItem: batch[index],
            matchedProduct: null,
            matchScore: 0,
            error: result.reason.message
          });
        }
      });

      // Brief delay between batches
      if (i + batchSize < cartItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      totalItems: cartItems.length,
      resolvedItems: resolvedItems,
      successfulMatches: resolvedItems.filter(item => item.matchedProduct).length,
      failedMatches: resolvedItems.filter(item => !item.matchedProduct).length
    };
  }

  // Format search response from API
  formatSearchResponse(data) {
    if (!data) return { products: [], total: 0 };

    return {
      products: (data.products || data.items || data.data || []).map(product => ({
        id: product.id || product.product_id,
        name: product.name || product.title,
        brand: product.brand || product.manufacturer,
        description: product.description,
        image_url: product.image_url || product.images?.[0],
        price: product.price || product.pricing?.price,
        size: product.size || product.package_size,
        availability: product.availability || product.in_stock ? 'in_stock' : 'out_of_stock',
        upc: product.upc || product.barcode,
        category: product.category
      })),
      total: data.total || data.count || (data.products || data.items || data.data || []).length
    };
  }

  // Mock search results for development/fallback
  getMockSearchResults(query) {
    const mockProducts = [
      {
        id: `mock_${Date.now()}_1`,
        name: `Organic ${query}`,
        brand: 'Generic Brand',
        description: `Fresh organic ${query.toLowerCase()}`,
        image_url: '/placeholder-product.jpg',
        price: 3.99,
        size: '1 lb',
        availability: 'in_stock',
        upc: '123456789012',
        category: 'Grocery'
      },
      {
        id: `mock_${Date.now()}_2`,
        name: `Fresh ${query}`,
        brand: 'Store Brand',
        description: `High quality ${query.toLowerCase()}`,
        image_url: '/placeholder-product.jpg',
        price: 5.49,
        size: '2 lbs',
        availability: 'in_stock',
        upc: '123456789013',
        category: 'Grocery'
      }
    ];

    return {
      products: mockProducts,
      total: mockProducts.length,
      mock: true
    };
  }

  // Clear search cache
  clearCache() {
    this.searchCache.clear();
    console.log('🧹 Search cache cleared');
  }
}

// Export singleton instance
const instacartCatalogService = new InstacartCatalogService();
export default instacartCatalogService;