// Simplified product search endpoint
// IMPORTANT: Instacart APIs don't return product data, only checkout links
// Product data comes from Spoonacular API

const express = require('express');
const router = express.Router();
const winston = require('winston');
const spoonacularService = require('../services/spoonacularService');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-search' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Product search endpoint - Goes directly to Spoonacular
router.post('/search', async (req, res) => {
  try {
    const { query, retailerId = 'safeway' } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    logger.info(`Product search for: "${query}"`);

    let products = [];

    // Primary source: Spoonacular API for product data
    try {
      logger.info('Searching Spoonacular for products:', query);
      const spoonacularResult = await spoonacularService.searchGroceryProducts(query, 5);

      if (spoonacularResult.products && spoonacularResult.products.length > 0) {
        logger.info(`Spoonacular returned ${spoonacularResult.products.length} products`);

        // Convert Spoonacular products to our format
        products = spoonacularResult.products.map(sp => ({
          id: sp.id || `spoonacular_${Date.now()}_${Math.random()}`,
          name: sp.name,
          brand: sp.brand || 'Generic',
          price: 0, // Spoonacular doesn't provide real-time pricing
          image_url: sp.image_url,
          package_size: sp.servingSize || sp.size || '1 item',
          unit: sp.unit || 'item',
          quantity: 1,
          availability: 'check_store',
          upc: sp.upc || null,
          aisle: sp.aisle,
          badges: sp.badges,
          nutrition: sp.nutrition,
          confidence: 0.8,
          source: 'spoonacular',
          size: sp.servingSize,
          containerType: sp.containerType
        }));
      }
    } catch (spoonError) {
      logger.warn('Spoonacular search failed:', spoonError.message);
    }

    // Fallback: Try cached products if no Spoonacular results
    if (products.length === 0) {
      logger.info('Trying cached products as fallback');
      try {
        const productCacheBuilder = require('../services/productCacheBuilder');
        const cachedProducts = await productCacheBuilder.searchCachedProducts(query, 10);

        if (cachedProducts && cachedProducts.length > 0) {
          logger.info(`Found ${cachedProducts.length} cached products`);
          products = cachedProducts.map(cp => ({
            id: cp._id || `cached_${Date.now()}_${Math.random()}`,
            name: cp.name,
            brand: cp.brand || 'Generic',
            price: 0,
            image_url: cp.imageUrl,
            package_size: cp.servingSize || '1 item',
            unit: 'item',
            quantity: 1,
            availability: 'check_store',
            badges: cp.badges,
            aisle: cp.aisle,
            nutrition: cp.nutrition,
            confidence: 0.75,
            source: 'cache',
            size: cp.servingSize,
            containerType: cp.containerType
          }));
        }
      } catch (cacheError) {
        logger.warn('Cache fallback failed:', cacheError.message);
      }
    }

    // If still no products, create basic entry
    if (products.length === 0) {
      products.push({
        id: `search_${Date.now()}`,
        name: query,
        brand: 'Generic',
        price: 0,
        image_url: null,
        package_size: '1 item',
        unit: 'item',
        quantity: 1,
        availability: 'unknown',
        confidence: 0.5,
        source: 'basic'
      });
    }

    logger.info(`Returning ${products.length} products for query: ${query}`);

    // Return products with clear source information
    res.json({
      success: true,
      products: products,
      query: query,
      retailer: retailerId,
      retailer_name: retailerId,
      count: products.length,
      source: products[0]?.source || 'unknown',
      note: 'Product data from Spoonacular API. Use /api/instacart/cart/create for checkout.'
    });

  } catch (error) {
    logger.error('Product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error.message
    });
  }
});

module.exports = router;