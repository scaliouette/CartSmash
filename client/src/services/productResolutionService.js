// client/src/services/productResolutionService.js
// Enhanced product ID resolution for CartSmash to Instacart integration

import instacartService from './instacartService';

class ProductResolutionService {
  constructor() {
    this.cache = new Map(); // Cache for resolved products
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Common unit mappings
    this.unitMappings = {
      'lb': 'pound',
      'lbs': 'pound', 
      'pound': 'pound',
      'pounds': 'pound',
      'oz': 'ounce',
      'ounce': 'ounce',
      'ounces': 'ounce',
      'kg': 'kilogram',
      'gram': 'gram',
      'grams': 'gram',
      'cup': 'cup',
      'cups': 'cup',
      'tsp': 'teaspoon',
      'teaspoon': 'teaspoon',
      'tbsp': 'tablespoon',
      'tablespoon': 'tablespoon',
      'piece': 'each',
      'pieces': 'each',
      'item': 'each',
      'items': 'each',
      'each': 'each',
      'bunch': 'bunch',
      'bag': 'bag',
      'box': 'box',
      'bottle': 'bottle',
      'can': 'can',
      'jar': 'jar',
      'package': 'package',
      'pack': 'package'
    };

    console.log('🔧 ProductResolutionService initialized');
  }

  // Main method to resolve CartSmash items to Instacart products
  async resolveCartSmashItems(cartItems, retailerId = null) {
    console.log('🔍 Resolving', cartItems.length, 'CartSmash items to Instacart products');
    console.log('🛒 Using direct Instacart API search for product matching');
    
    // Use the legacy resolution method as primary method since catalog service doesn't exist
    return await this.legacyResolveCartSmashItems(cartItems, retailerId);
  }

  // Legacy resolution method as fallback
  async legacyResolveCartSmashItems(cartItems, retailerId = null) {
    const resolvedItems = [];
    const unresolvedItems = [];

    for (const item of cartItems) {
      try {
        const resolved = await this.resolveItem(item, retailerId);
        if (resolved.success) {
          resolvedItems.push(resolved);
        } else {
          unresolvedItems.push({
            originalItem: item,
            reason: resolved.error || 'No matching product found'
          });
        }
      } catch (error) {
        console.error('❌ Error resolving item:', item, error);
        unresolvedItems.push({
          originalItem: item,
          reason: error.message
        });
      }
    }

    return {
      success: true,
      resolved: resolvedItems,
      unresolved: unresolvedItems,
      stats: {
        total: cartItems.length,
        resolved: resolvedItems.length,
        unresolved: unresolvedItems.length,
        resolutionRate: ((resolvedItems.length / cartItems.length) * 100).toFixed(1) + '%'
      }
    };
  }

  // Resolve individual CartSmash item to Instacart product
  async resolveItem(item, retailerId = null) {
    const cacheKey = this.getCacheKey(item, retailerId);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log('📦 Using cached result for:', item.name || item.item);
      return cached;
    }

    try {
      // Extract item details
      const itemDetails = this.parseItemDetails(item);
      console.log('📝 Parsed item details:', itemDetails);

      // Search for matching products in Instacart
      const searchResults = await this.searchInstacartProducts(itemDetails, retailerId);
      
      if (searchResults.products && searchResults.products.length > 0) {
        // Find best match
        const bestMatch = this.findBestMatch(itemDetails, searchResults.products);
        
        const resolved = {
          success: true,
          originalItem: item,
          instacartProduct: {
            ...bestMatch,
            // Ensure we have the required fields for Instacart API
            id: bestMatch.id || `instacart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sku: bestMatch.sku || bestMatch.id || `sku_${Date.now()}`,
            retailer_sku: bestMatch.retailer_sku || bestMatch.sku || bestMatch.id
          },
          resolvedDetails: {
            productId: bestMatch.id || `instacart_${Date.now()}`,
            name: bestMatch.name,
            brand: bestMatch.brand,
            size: bestMatch.size,
            price: bestMatch.price,
            quantity: itemDetails.quantity,
            unit: itemDetails.unit,
            totalPrice: (bestMatch.price * itemDetails.quantity).toFixed(2)
          },
          confidence: this.calculateConfidence(itemDetails, bestMatch)
        };

        // Cache the result
        this.cacheResult(cacheKey, resolved);
        return resolved;
        
      } else {
        const failed = {
          success: false,
          originalItem: item,
          error: 'No matching products found in Instacart catalog',
          searchQuery: itemDetails.searchQuery
        };
        
        // Cache failed result for shorter time
        this.cacheResult(cacheKey, failed, 5 * 60 * 1000); // 5 minutes
        return failed;
      }
      
    } catch (error) {
      console.error('❌ Error resolving item:', error);
      return {
        success: false,
        originalItem: item,
        error: error.message
      };
    }
  }

  // Parse CartSmash item details into structured format
  parseItemDetails(item) {
    // Handle different item formats from CartSmash
    const rawName = item.productName || item.name || item.item || '';
    const rawQuantity = item.quantity || 1;
    const rawUnit = item.unit || '';
    
    // Extract quantity and unit from name if not separate
    let cleanName = rawName;
    let quantity = parseFloat(rawQuantity) || 1;
    let unit = rawUnit.toLowerCase();

    // Parse patterns like "2 lbs apples" or "1 cup flour"
    const quantityPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
    const match = rawName.match(quantityPattern);
    
    if (match && !rawUnit) {
      const [, extractedQty, extractedUnit, extractedName] = match;
      quantity = parseFloat(extractedQty) || quantity;
      unit = extractedUnit ? extractedUnit.toLowerCase() : unit;
      cleanName = extractedName;
    }

    // Normalize unit
    const normalizedUnit = this.unitMappings[unit] || unit || 'each';

    // Create search query
    const searchQuery = this.createSearchQuery(cleanName);

    return {
      originalName: rawName,
      cleanName: cleanName.trim(),
      quantity,
      unit: normalizedUnit,
      searchQuery,
      category: item.category || '',
      brand: item.brand || ''
    };
  }

  // Create optimized search query for Instacart
  createSearchQuery(name) {
    // Remove common words that might confuse search
    const stopWords = ['fresh', 'organic', 'natural', 'free', 'range', 'local'];
    const words = name.toLowerCase().split(/\s+/);
    const cleanedWords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    return cleanedWords.join(' ').trim() || name;
  }

  // Search Instacart products using the existing service
  async searchInstacartProducts(itemDetails, retailerId) {
    try {
      console.log('🔍 Searching Instacart for:', itemDetails.searchQuery);
      return await instacartService.searchProducts(itemDetails.searchQuery, retailerId);
    } catch (error) {
      console.error('❌ Instacart search error:', error);
      throw error;
    }
  }

  // Find best matching product from search results
  findBestMatch(itemDetails, products) {
    if (products.length === 1) {
      return products[0];
    }

    // Score products based on relevance
    const scoredProducts = products.map(product => ({
      ...product,
      score: this.calculateMatchScore(itemDetails, product)
    }));

    // Sort by score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);
    
    console.log('🎯 Best match for', itemDetails.cleanName, ':', scoredProducts[0].name, 'Score:', scoredProducts[0].score);
    
    return scoredProducts[0];
  }

  // Calculate match score for product relevance
  calculateMatchScore(itemDetails, product) {
    let score = 0;
    const productName = (product.name || '').toLowerCase();
    const itemName = itemDetails.cleanName.toLowerCase();
    const searchQuery = itemDetails.searchQuery.toLowerCase();

    // Exact name match bonus
    if (productName.includes(itemName)) {
      score += 50;
    }

    // Search query word matches
    const queryWords = searchQuery.split(/\s+/);
    queryWords.forEach(word => {
      if (productName.includes(word)) {
        score += 10;
      }
    });

    // Brand match bonus
    if (itemDetails.brand && product.brand) {
      const itemBrand = itemDetails.brand.toLowerCase();
      const productBrand = (product.brand || '').toLowerCase();
      if (productBrand.includes(itemBrand) || itemBrand.includes(productBrand)) {
        score += 25;
      }
    }

    // Availability bonus
    if (product.availability === 'in_stock') {
      score += 15;
    } else if (product.availability === 'limited_stock') {
      score += 5;
    }

    // Price reasonableness (prefer mid-range prices)
    if (product.price && product.price > 0.50 && product.price < 50) {
      score += 5;
    }

    return score;
  }

  // Calculate confidence level for the match
  calculateConfidence(itemDetails, product) {
    const score = this.calculateMatchScore(itemDetails, product);
    
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'very_low';
  }

  // Cache management
  getCacheKey(item, retailerId) {
    const itemKey = item.productName || item.name || item.item || '';
    return `${itemKey}_${retailerId || 'default'}_${item.quantity || 1}_${item.unit || ''}`;
  }

  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired
    }
    return null;
  }

  cacheResult(key, result, ttl = this.cacheExpiry) {
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl
    });
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const productResolutionService = new ProductResolutionService();
export default productResolutionService;