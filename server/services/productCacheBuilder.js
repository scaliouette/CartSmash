// server/services/productCacheBuilder.js
// Comprehensive product cache builder using Spoonacular API
// Builds a local database of common grocery products for fast offline access

const axios = require('axios');
const winston = require('winston');
const cacheService = require('./cacheService');
const mongoose = require('mongoose');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-cache-builder' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'product-cache-builder.log' })
  ]
});

// Product categories to cache
const PRODUCT_CATEGORIES = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen',
  'pantry', 'beverages', 'snacks', 'breakfast', 'condiments',
  'pasta', 'rice', 'canned goods', 'baking', 'spices', 'oils',
  'nuts', 'dried fruits', 'candy', 'chips', 'cookies', 'crackers',
  'cereal', 'granola', 'yogurt', 'cheese', 'milk', 'eggs',
  'chicken', 'beef', 'pork', 'fish', 'vegetables', 'fruits'
];

// Common product search terms for each category
const CATEGORY_SEARCH_TERMS = {
  produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'spinach'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cream cheese', 'cottage cheese'],
  meat: ['chicken breast', 'ground beef', 'pork chops', 'bacon', 'sausage', 'ham', 'turkey', 'steak'],
  seafood: ['salmon', 'shrimp', 'tuna', 'cod', 'tilapia', 'crab', 'lobster', 'scallops'],
  bakery: ['bread', 'bagels', 'muffins', 'croissants', 'rolls', 'tortillas', 'pita', 'naan'],
  beverages: ['water', 'soda', 'juice', 'coffee', 'tea', 'sports drinks', 'energy drinks', 'milk'],
  snacks: ['chips', 'pretzels', 'popcorn', 'nuts', 'crackers', 'trail mix', 'jerky', 'granola bars'],
  pantry: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'olive oil', 'vinegar', 'honey', 'peanut butter']
};

// MongoDB Schema for cached products
const CachedProductSchema = new mongoose.Schema({
  spoonacularId: { type: String, unique: true, sparse: true },
  upc: { type: String, index: true, sparse: true },
  name: { type: String, required: true, index: true },
  brand: String,
  category: { type: String, index: true },
  aisle: String,
  imageUrl: String,
  badges: [String],
  nutrition: {
    nutrients: [{
      name: String,
      amount: Number,
      unit: String,
      percentOfDailyNeeds: Number
    }],
    caloricBreakdown: {
      percentProtein: Number,
      percentFat: Number,
      percentCarbs: Number
    }
  },
  servingSize: String,
  ingredients: [String],
  importantBadges: [String],
  generatedText: String,
  possibleUnits: [String],
  shoppingListUnits: [String],
  cached: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now },
  searchKeywords: [String], // For better search matching
  popularity: { type: Number, default: 0 }, // Track how often it's accessed
  source: { type: String, default: 'spoonacular' }
});

// Add text index for better search
CachedProductSchema.index({
  name: 'text',
  brand: 'text',
  category: 'text',
  searchKeywords: 'text'
});

let CachedProduct;
try {
  CachedProduct = mongoose.model('CachedProduct');
} catch {
  CachedProduct = mongoose.model('CachedProduct', CachedProductSchema);
}

class ProductCacheBuilder {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.baseURL = 'https://api.spoonacular.com';
    this.batchSize = 10; // API requests per batch
    this.delayBetweenBatches = 2000; // 2 seconds
    this.maxProductsPerCategory = 50; // Limit per category to manage API quota

    if (!this.apiKey) {
      logger.error('Spoonacular API key not configured');
    }
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch products from Spoonacular
  async fetchProductsFromSpoonacular(query, number = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/food/products/search`, {
        params: {
          apiKey: this.apiKey,
          query,
          number,
          addProductInformation: true
        }
      });

      return response.data.products || [];
    } catch (error) {
      logger.error(`Failed to fetch products for query "${query}":`, error.message);
      return [];
    }
  }

  // Fetch detailed product information
  async fetchProductDetails(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/food/products/${productId}`, {
        params: {
          apiKey: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch details for product ${productId}:`, error.message);
      return null;
    }
  }

  // Save product to database
  async saveProductToCache(product) {
    try {
      const searchKeywords = [
        product.title,
        product.brand,
        ...(product.breadcrumbs || []),
        ...(product.badges || [])
      ].filter(Boolean).map(k => k.toLowerCase());

      const cachedProduct = {
        spoonacularId: product.id?.toString(),
        upc: product.upc,
        name: product.title,
        brand: product.brand,
        category: product.aisle || product.category,
        aisle: product.aisle,
        imageUrl: product.image,
        badges: product.badges || [],
        nutrition: {
          nutrients: product.nutrition?.nutrients || [],
          caloricBreakdown: product.nutrition?.caloricBreakdown || {}
        },
        servingSize: product.servingSize,
        ingredients: product.ingredients?.map(ing => ing.name) || [],
        importantBadges: product.importantBadges || [],
        generatedText: product.generatedText,
        possibleUnits: product.possibleUnits || [],
        shoppingListUnits: product.shoppingListUnits || [],
        searchKeywords,
        source: 'spoonacular'
      };

      await CachedProduct.findOneAndUpdate(
        { spoonacularId: product.id?.toString() },
        cachedProduct,
        { upsert: true, new: true }
      );

      logger.info(`Cached product: ${product.title} (${product.id})`);
      return true;
    } catch (error) {
      logger.error(`Failed to save product to cache:`, error.message);
      return false;
    }
  }

  // Build cache for a specific category
  async buildCategoryCache(category) {
    const searchTerms = CATEGORY_SEARCH_TERMS[category] || [category];
    let totalCached = 0;

    logger.info(`Building cache for category: ${category}`);

    for (const searchTerm of searchTerms) {
      logger.info(`Searching for: ${searchTerm}`);

      const products = await this.fetchProductsFromSpoonacular(searchTerm, 10);

      for (const product of products) {
        // Fetch detailed information
        const details = await this.fetchProductDetails(product.id);
        if (details) {
          const saved = await this.saveProductToCache(details);
          if (saved) totalCached++;
        }

        // Small delay between individual product fetches
        await this.delay(500);
      }

      // Delay between search terms
      await this.delay(this.delayBetweenBatches);
    }

    logger.info(`Category ${category} complete. Cached ${totalCached} products.`);
    return totalCached;
  }

  // Build complete product cache
  async buildCompleteCache() {
    logger.info('Starting complete product cache build...');
    const stats = {
      totalProducts: 0,
      categories: {},
      startTime: Date.now()
    };

    for (const category of PRODUCT_CATEGORIES) {
      const count = await this.buildCategoryCache(category);
      stats.categories[category] = count;
      stats.totalProducts += count;

      // Longer delay between categories
      await this.delay(5000);
    }

    stats.duration = Date.now() - stats.startTime;
    logger.info('Cache build complete:', stats);
    return stats;
  }

  // Incremental cache update (fetch popular/trending products)
  async updatePopularProducts() {
    const popularSearches = [
      'organic milk', 'eggs', 'bread', 'chicken breast', 'ground beef',
      'bananas', 'apples', 'avocados', 'salmon', 'pasta', 'rice',
      'yogurt', 'cheese', 'butter', 'olive oil', 'tomatoes', 'potatoes',
      'onions', 'garlic', 'lemons', 'strawberries', 'blueberries'
    ];

    logger.info('Updating popular products cache...');
    let updated = 0;

    for (const search of popularSearches) {
      const products = await this.fetchProductsFromSpoonacular(search, 5);

      for (const product of products) {
        const details = await this.fetchProductDetails(product.id);
        if (details) {
          const saved = await this.saveProductToCache(details);
          if (saved) updated++;
        }
        await this.delay(500);
      }

      await this.delay(2000);
    }

    logger.info(`Updated ${updated} popular products`);
    return updated;
  }

  // Search cached products
  async searchCachedProducts(query, limit = 20) {
    try {
      // First try exact match
      let products = await CachedProduct.find({
        $or: [
          { name: new RegExp(query, 'i') },
          { brand: new RegExp(query, 'i') },
          { searchKeywords: new RegExp(query, 'i') }
        ]
      })
      .sort({ popularity: -1 })
      .limit(limit);

      // If no results, try text search
      if (products.length === 0) {
        products = await CachedProduct.find(
          { $text: { $search: query } },
          { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit);
      }

      // Update popularity for accessed products
      const productIds = products.map(p => p._id);
      await CachedProduct.updateMany(
        { _id: { $in: productIds } },
        { $inc: { popularity: 1 } }
      );

      return products;
    } catch (error) {
      logger.error('Failed to search cached products:', error.message);
      return [];
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const totalProducts = await CachedProduct.countDocuments();
      const categoryCounts = await CachedProduct.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      const lastUpdate = await CachedProduct.findOne()
        .sort({ lastUpdated: -1 })
        .select('lastUpdated');

      return {
        totalProducts,
        categories: categoryCounts,
        lastUpdated: lastUpdate?.lastUpdated,
        cacheAge: lastUpdate ? Date.now() - new Date(lastUpdate.lastUpdated) : null
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error.message);
      return null;
    }
  }

  // Clear cache (with optional category filter)
  async clearCache(category = null) {
    try {
      const filter = category ? { category } : {};
      const result = await CachedProduct.deleteMany(filter);
      logger.info(`Cleared ${result.deletedCount} products from cache`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to clear cache:', error.message);
      return 0;
    }
  }
}

// Export singleton instance
module.exports = new ProductCacheBuilder();