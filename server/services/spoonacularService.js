// server/services/spoonacularService.js
// Spoonacular API integration for enhanced product data, nutrition, and images

const axios = require('axios');
const winston = require('winston');
const cacheService = require('./cacheService');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'spoonacular-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SpoonacularService {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.baseURL = 'https://api.spoonacular.com';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    if (!this.apiKey) {
      logger.warn('Spoonacular API key not configured');
    } else {
      logger.info('Spoonacular service initialized');
    }
  }

  // Check if cache entry is still valid
  isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp < this.cacheExpiry);
  }

  // Get from cache
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (this.isCacheValid(cached)) {
      logger.debug(`Cache hit for: ${key}`);
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

    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  // Search for grocery products
  async searchGroceryProducts(query, number = 10, options = {}) {
    if (!this.apiKey) {
      logger.warn('Spoonacular API key not configured, returning empty results');
      return { products: [], totalProducts: 0 };
    }

    // Check cache first using the new cache service
    const cached = await cacheService.getCachedSpoonacularResponse('product_search', {
      query, number, ...options
    });
    if (cached) {
      logger.info(`Cache hit for product search: ${query}`);
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseURL}/food/products/search`, {
        params: {
          apiKey: this.apiKey,
          query,
          number,
          ...options // Can include: minCarbs, maxCarbs, minProtein, maxProtein, etc.
        }
      });

      const formattedProducts = response.data.products.map(product => ({
        id: `spoonacular_${product.id}`,
        spoonacularId: product.id,
        name: product.title,
        brand: product.brand || 'Generic',
        image_url: product.image,
        imageType: product.imageType,
        // Spoonacular doesn't provide real-time pricing
        price: null,
        pricePerUnit: null,
        // But provides detailed product info
        badges: product.badges || [],
        importantBadges: product.importantBadges || [],
        nutrition: {
          nutrients: product.nutrition?.nutrients || [],
          caloricBreakdown: product.nutrition?.caloricBreakdown || {}
        },
        servingSize: product.servingSize,
        servings: product.servings?.number,
        aisle: product.aisle,
        category: product.category,
        breadcrumbs: product.breadcrumbs || [],
        generatedText: product.generatedText,
        source: 'spoonacular',
        creditsText: product.creditsText || 'Data from Spoonacular API'
      }));

      const result = {
        products: formattedProducts,
        totalProducts: response.data.totalProducts,
        type: response.data.type,
        offset: response.data.offset,
        number: response.data.number
      };

      // Cache using the new cache service
      await cacheService.cacheSpoonacularResponse('product_search', {
        query, number, ...options
      }, result);

      logger.info(`Found ${formattedProducts.length} products for query: ${query}`);

      return result;
    } catch (error) {
      logger.error('Spoonacular API error:', {
        message: error.message,
        status: error.response?.status,
        query
      });

      // Return empty results on error
      return { products: [], totalProducts: 0 };
    }
  }

  // Search for ingredients (more basic than products)
  async searchIngredients(query, number = 10, options = {}) {
    if (!this.apiKey) {
      return { results: [] };
    }

    const cacheKey = `ingredients_${query}_${number}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/food/ingredients/search`, {
        params: {
          apiKey: this.apiKey,
          query,
          number,
          ...options // metaInformation, sortDirection, sort, etc.
        }
      });

      const formattedIngredients = response.data.results.map(ingredient => ({
        id: `ingredient_${ingredient.id}`,
        spoonacularId: ingredient.id,
        name: ingredient.name,
        image_url: `https://spoonacular.com/cdn/ingredients_500x500/${ingredient.image}`,
        image: ingredient.image,
        aisle: ingredient.aisle,
        possibleUnits: ingredient.possibleUnits || [],
        consistency: ingredient.consistency,
        categoryPath: ingredient.categoryPath || [],
        source: 'spoonacular_ingredients'
      }));

      const result = {
        results: formattedIngredients,
        offset: response.data.offset,
        number: response.data.number,
        totalResults: response.data.totalResults
      };

      this.saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Spoonacular ingredients search error:', error.message);
      return { results: [] };
    }
  }

  // Get detailed product information by Spoonacular ID
  async getProductInfo(id) {
    if (!this.apiKey) {
      return null;
    }

    const cacheKey = `product_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/food/products/${id}`, {
        params: { apiKey: this.apiKey }
      });

      const productInfo = {
        id: response.data.id,
        title: response.data.title,
        brand: response.data.brand,
        badges: response.data.badges,
        breadcrumbs: response.data.breadcrumbs,
        image: response.data.image,
        images: response.data.images || [],
        description: response.data.description,
        generatedText: response.data.generatedText,
        upc: response.data.upc,
        ean: response.data.ean,
        gtin: response.data.gtin,
        aisle: response.data.aisle,
        ingredients: response.data.ingredients,
        ingredientList: response.data.ingredientList,
        ingredientCount: response.data.ingredientCount,
        nutrition: response.data.nutrition,
        price: response.data.price,
        servings: response.data.servings,
        spoonacularScore: response.data.spoonacularScore,
        likes: response.data.likes,
        importantBadges: response.data.importantBadges
      };

      this.saveToCache(cacheKey, productInfo);
      return productInfo;
    } catch (error) {
      logger.error(`Failed to get product info for ID ${id}:`, error.message);
      return null;
    }
  }

  // Autocomplete for grocery products
  async autocompleteProductSearch(query, number = 10) {
    if (!this.apiKey) {
      return { results: [] };
    }

    try {
      const response = await axios.get(`${this.baseURL}/food/products/suggest`, {
        params: {
          apiKey: this.apiKey,
          query,
          number
        }
      });

      return {
        results: response.data.results || []
      };
    } catch (error) {
      logger.error('Spoonacular autocomplete error:', error.message);
      return { results: [] };
    }
  }

  // Parse grocery products from text (like a recipe or shopping list)
  async parseProducts(text, servings = 1) {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/recipes/parseIngredients`,
        {
          ingredientList: text,
          servings,
          includeNutrition: true
        },
        {
          params: { apiKey: this.apiKey },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      return response.data.map(item => ({
        id: item.id,
        name: item.name,
        original: item.original,
        amount: item.amount,
        unit: item.unit,
        unitShort: item.unitShort,
        unitLong: item.unitLong,
        image: item.image,
        aisle: item.aisle,
        consistency: item.consistency,
        possibleUnits: item.possibleUnits,
        nutrition: item.nutrition,
        estimatedCost: item.estimatedCost
      }));
    } catch (error) {
      logger.error('Spoonacular parse products error:', error.message);
      return [];
    }
  }

  // Get comparable products (alternatives)
  async getComparableProducts(upc) {
    if (!this.apiKey || !upc) {
      return { comparableProducts: [] };
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/food/products/upc/${upc}/comparable`,
        {
          params: { apiKey: this.apiKey }
        }
      );

      return {
        comparableProducts: response.data.comparableProducts || []
      };
    } catch (error) {
      logger.error('Failed to get comparable products:', error.message);
      return { comparableProducts: [] };
    }
  }

  // Classify grocery product into categories
  async classifyGroceryProduct(productTitle, upc = null) {
    if (!this.apiKey) {
      return null;
    }

    // Check cache first
    const cached = await cacheService.getCachedSpoonacularResponse('classify_product', {
      productTitle, upc
    });
    if (cached) return cached;

    try {
      const params = {
        apiKey: this.apiKey
      };

      // Use title or UPC for classification
      const url = upc
        ? `${this.baseURL}/food/products/upc/${upc}/classify`
        : `${this.baseURL}/food/products/classify`;

      if (!upc) {
        params.title = productTitle;
      }

      const response = await axios.post(url, null, { params });

      const classification = {
        cleanTitle: response.data.cleanTitle,
        category: response.data.category,
        breadcrumbs: response.data.breadcrumbs || [],
        usdaNutrientIds: response.data.usdaGradeIds || []
      };

      // Cache the classification
      await cacheService.cacheSpoonacularResponse('classify_product', {
        productTitle, upc
      }, classification);

      return classification;
    } catch (error) {
      logger.error('Product classification error:', error.message);
      return null;
    }
  }

  // Compute nutrition widget for recipe
  async computeNutritionWidget(ingredientList) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/recipes/visualizeNutrition`,
        `ingredientList=${encodeURIComponent(ingredientList)}`,
        {
          params: { apiKey: this.apiKey },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html'
          }
        }
      );

      return response.data; // Returns HTML widget
    } catch (error) {
      logger.error('Nutrition widget error:', error.message);
      return null;
    }
  }

  // Get ingredient substitutes
  async getIngredientSubstitutes(ingredientName) {
    if (!this.apiKey) {
      return { substitutes: [] };
    }

    // Check cache
    const cached = await cacheService.getCachedSpoonacularResponse('ingredient_substitutes', {
      ingredientName
    });
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/food/ingredients/substitutes`, {
        params: {
          apiKey: this.apiKey,
          ingredientName
        }
      });

      const result = {
        status: response.data.status,
        ingredient: response.data.ingredient,
        substitutes: response.data.substitutes || [],
        message: response.data.message
      };

      // Cache substitutes
      await cacheService.cacheSpoonacularResponse('ingredient_substitutes', {
        ingredientName
      }, result);

      return result;
    } catch (error) {
      logger.error('Get substitutes error:', error.message);
      return { substitutes: [] };
    }
  }

  // Analyze recipe cost breakdown
  async analyzeRecipeCost(recipeId, servings = 1) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/recipes/${recipeId}/priceBreakdownWidget.json`,
        {
          params: {
            apiKey: this.apiKey,
            servings
          }
        }
      );

      return {
        totalCost: response.data.totalCost,
        totalCostPerServing: response.data.totalCostPerServing,
        ingredients: response.data.ingredients,
        equipment: response.data.equipment || []
      };
    } catch (error) {
      logger.error('Recipe cost analysis error:', error.message);
      return null;
    }
  }

  // Clear expired cache entries (now delegated to cache service)
  clearExpiredCache() {
    // This is now handled by cacheService
    logger.info('Cache cleanup delegated to cacheService');
  }
}

// Create singleton instance
const spoonacularService = new SpoonacularService();

// Clear expired cache every hour
setInterval(() => {
  spoonacularService.clearExpiredCache();
}, 60 * 60 * 1000);

module.exports = spoonacularService;