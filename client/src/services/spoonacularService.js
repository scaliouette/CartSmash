// client/src/services/spoonacularService.js
// Spoonacular API service for enhanced product data

import axios from 'axios';
import debugService from './debugService';

const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

class SpoonacularService {
  constructor() {
    this.baseURL = `${API_URL}/api/spoonacular`;
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Check if cache entry is still valid
  isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp < this.cacheExpiry);
  }

  // Get from cache
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (this.isCacheValid(cached)) {
      debugService.log(`🎯 Spoonacular cache hit for: ${key}`);
      return cached.data;
    }
    return null;
  }

  // Save to cache
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Search for products
  async searchProducts(query, options = {}) {
    try {
      const cacheKey = `search:${query}:${JSON.stringify(options)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      debugService.log(`🔍 Searching Spoonacular for: ${query}`);

      const response = await axios.post(`${this.baseURL}/products/search`, {
        query,
        number: options.number || 10,
        ...options
      });

      if (response.data.success) {
        this.saveToCache(cacheKey, response.data);
        return response.data;
      }

      return { success: false, products: [] };
    } catch (error) {
      debugService.logError('Spoonacular search error:', error);
      return { success: false, products: [], error: error.message };
    }
  }

  // Enrich shopping list with full product details
  async enrichShoppingList(items) {
    try {
      debugService.log(`💎 Enriching ${items.length} items with Spoonacular data`);

      const response = await axios.post(`${this.baseURL}/shopping-list/enrich`, {
        items: items.map(item => ({
          name: item.name || item.productName,
          quantity: item.quantity || 1,
          unit: item.unit || 'item'
        }))
      });

      if (response.data.success) {
        debugService.log(`✅ Enriched ${response.data.stats.enrichedCount} items`);
        return response.data;
      }

      return { success: false, items: [] };
    } catch (error) {
      debugService.logError('Spoonacular enrichment error:', error);
      return { success: false, items: [], error: error.message };
    }
  }

  // Get product details by ID
  async getProductDetails(productId) {
    try {
      const cacheKey = `product:${productId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseURL}/products/${productId}`);

      if (response.data.success) {
        this.saveToCache(cacheKey, response.data);
        return response.data;
      }

      return { success: false, product: null };
    } catch (error) {
      debugService.logError('Get product details error:', error);
      return { success: false, product: null, error: error.message };
    }
  }

  // Search for ingredients
  async searchIngredients(query, number = 10) {
    try {
      const cacheKey = `ingredients:${query}:${number}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.post(`${this.baseURL}/ingredients/search`, {
        query,
        number
      });

      if (response.data.success) {
        this.saveToCache(cacheKey, response.data);
        return response.data;
      }

      return { success: false, ingredients: [] };
    } catch (error) {
      debugService.logError('Ingredient search error:', error);
      return { success: false, ingredients: [], error: error.message };
    }
  }

  // Get ingredient substitutes
  async getSubstitutes(ingredientName) {
    try {
      const cacheKey = `substitutes:${ingredientName}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseURL}/ingredients/${encodeURIComponent(ingredientName)}/substitutes`);

      if (response.data.success) {
        this.saveToCache(cacheKey, response.data);
        return response.data;
      }

      return { success: false, substitutes: [] };
    } catch (error) {
      debugService.logError('Get substitutes error:', error);
      return { success: false, substitutes: [], error: error.message };
    }
  }

  // Convert units
  async convertUnits(ingredientName, sourceAmount, sourceUnit, targetUnit) {
    try {
      const response = await axios.post(`${this.baseURL}/convert`, {
        ingredientName,
        sourceAmount,
        sourceUnit,
        targetUnit
      });

      if (response.data.success) {
        return response.data;
      }

      return { success: false };
    } catch (error) {
      debugService.logError('Unit conversion error:', error);
      return { success: false, error: error.message };
    }
  }

  // Classify products for better categorization
  async classifyProduct(title, upc = null) {
    try {
      const cacheKey = `classify:${title}:${upc}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await axios.post(`${this.baseURL}/products/classify`, {
        title,
        ...(upc && { upc })
      });

      if (response.data.success) {
        this.saveToCache(cacheKey, response.data);
        return response.data;
      }

      return { success: false, classification: null };
    } catch (error) {
      debugService.logError('Product classification error:', error);
      return { success: false, classification: null, error: error.message };
    }
  }

  // Search recipes
  async searchRecipes(params) {
    try {
      const response = await axios.post(`${this.baseURL}/recipes/search`, params);

      if (response.data.success) {
        return response.data;
      }

      return { success: false, recipes: [] };
    } catch (error) {
      debugService.logError('Recipe search error:', error);
      return { success: false, recipes: [], error: error.message };
    }
  }

  // Convert recipe to shopping list
  async recipeToShoppingList(recipeId, servings = 4) {
    try {
      const response = await axios.post(`${this.baseURL}/recipes/${recipeId}/shopping-list`, {
        servings
      });

      if (response.data.success) {
        return response.data;
      }

      return { success: false, shoppingList: [] };
    } catch (error) {
      debugService.logError('Recipe to shopping list error:', error);
      return { success: false, shoppingList: [], error: error.message };
    }
  }

  // Enhanced product enrichment with nutrition and categories
  async enrichProduct(product) {
    try {
      // Try to classify the product for better categorization
      const classification = await this.classifyProduct(product.name || product.productName);

      // Get full product details if we have an ID
      let productDetails = null;
      if (product.spoonacularId) {
        const detailsResponse = await this.getProductDetails(product.spoonacularId);
        if (detailsResponse.success) {
          productDetails = detailsResponse.product;
        }
      }

      // Search for the product if we don't have details yet
      if (!productDetails && (product.name || product.productName)) {
        const searchResponse = await this.searchProducts(product.name || product.productName, { number: 1 });
        if (searchResponse.success && searchResponse.products.length > 0) {
          productDetails = searchResponse.products[0];
        }
      }

      // Combine all enrichment data
      const enrichedProduct = {
        ...product,
        spoonacular: {
          enriched: true,
          timestamp: Date.now()
        }
      };

      // Add classification data
      if (classification.success && classification.classification) {
        enrichedProduct.category = classification.classification.category;
        enrichedProduct.breadcrumbs = classification.classification.breadcrumbs;
        enrichedProduct.cleanName = classification.classification.cleanTitle;
      }

      // Add product details
      if (productDetails) {
        enrichedProduct.image_url = enrichedProduct.image_url || productDetails.image_url;
        enrichedProduct.nutrition = productDetails.nutrition;
        enrichedProduct.badges = [...(enrichedProduct.badges || []), ...(productDetails.badges || [])];
        enrichedProduct.aisle = productDetails.aisle;
        enrichedProduct.spoonacularId = productDetails.spoonacularId || productDetails.id;
        enrichedProduct.brand = enrichedProduct.brand || productDetails.brand;
        enrichedProduct.servingSize = productDetails.servingSize;
      }

      return enrichedProduct;
    } catch (error) {
      debugService.logError('Product enrichment error:', error);
      return product; // Return original product if enrichment fails
    }
  }

  // Batch enrich multiple products
  async batchEnrichProducts(products) {
    try {
      debugService.log(`🔄 Batch enriching ${products.length} products with Spoonacular`);

      const enrichmentPromises = products.map(product =>
        this.enrichProduct(product).catch(err => {
          debugService.logError(`Failed to enrich ${product.name}:`, err);
          return product; // Return original on failure
        })
      );

      const enrichedProducts = await Promise.all(enrichmentPromises);

      const enrichedCount = enrichedProducts.filter(p => p.spoonacular?.enriched).length;
      debugService.log(`✅ Successfully enriched ${enrichedCount}/${products.length} products`);

      return enrichedProducts;
    } catch (error) {
      debugService.logError('Batch enrichment error:', error);
      return products; // Return original products if batch enrichment fails
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    debugService.log('🧹 Spoonacular cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    const validEntries = Array.from(this.cache.values()).filter(entry => this.isCacheValid(entry));
    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length
    };
  }
}

// Create singleton instance
const spoonacularService = new SpoonacularService();

export default spoonacularService;