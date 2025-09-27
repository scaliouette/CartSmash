// Simplified product search endpoint
// IMPORTANT: Instacart APIs don't return product data, only checkout links
// Product data comes from Spoonacular API

const express = require('express');
const router = express.Router();
const winston = require('winston');
const spoonacularService = require('../services/spoonacularService');

// Function to estimate price based on product name and category
function estimatePrice(productName, aisle, brand) {
  const name = productName.toLowerCase();
  const productAisle = (aisle || '').toLowerCase();
  const isBrandName = brand && brand !== 'Generic';

  // Base prices by category/keyword
  let basePrice = 3.99; // default

  // Dairy products
  if (productAisle.includes('dairy') || name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
    if (name.includes('gallon')) basePrice = 4.99;
    else if (name.includes('cheese')) basePrice = 5.49;
    else if (name.includes('yogurt')) basePrice = 4.29;
    else basePrice = 3.99;
  }
  // Meat & Seafood
  else if (productAisle.includes('meat') || productAisle.includes('seafood') ||
           name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
           name.includes('fish') || name.includes('salmon')) {
    if (name.includes('steak') || name.includes('beef')) basePrice = 12.99;
    else if (name.includes('chicken')) basePrice = 7.99;
    else if (name.includes('salmon') || name.includes('seafood')) basePrice = 14.99;
    else if (name.includes('ground')) basePrice = 6.99;
    else basePrice = 8.99;
  }
  // Produce
  else if (productAisle.includes('produce') || name.includes('apple') || name.includes('banana') ||
           name.includes('lettuce') || name.includes('tomato') || name.includes('onion')) {
    if (name.includes('organic')) basePrice = 4.99;
    else if (name.includes('banana')) basePrice = 0.89;
    else if (name.includes('apple')) basePrice = 3.99;
    else basePrice = 2.49;
  }
  // Bread & Bakery
  else if (productAisle.includes('bakery') || productAisle.includes('bread') ||
           name.includes('bread') || name.includes('bagel') || name.includes('muffin')) {
    basePrice = 3.49;
  }
  // Beverages
  else if (productAisle.includes('beverage') || name.includes('soda') || name.includes('juice') ||
           name.includes('water') || name.includes('coffee') || name.includes('tea')) {
    if (name.includes('case') || name.includes('pack')) basePrice = 6.99;
    else if (name.includes('coffee')) basePrice = 8.99;
    else basePrice = 3.99;
  }
  // Frozen
  else if (productAisle.includes('frozen') || name.includes('ice cream') || name.includes('pizza')) {
    if (name.includes('ice cream')) basePrice = 5.99;
    else if (name.includes('pizza')) basePrice = 7.99;
    else basePrice = 4.99;
  }
  // Canned & Packaged
  else if (productAisle.includes('canned') || productAisle.includes('pasta') ||
           name.includes('soup') || name.includes('pasta') || name.includes('sauce')) {
    basePrice = 2.49;
  }
  // Snacks
  else if (productAisle.includes('snack') || name.includes('chips') || name.includes('cookie') ||
           name.includes('cracker')) {
    basePrice = 3.99;
  }
  // Condiments & Spices
  else if (productAisle.includes('condiment') || productAisle.includes('spice') ||
           name.includes('salt') || name.includes('pepper') || name.includes('ketchup')) {
    basePrice = 2.99;
  }

  // Add brand premium (20% more for brand names)
  if (isBrandName) {
    basePrice = basePrice * 1.2;
  }

  // Add some random variation (-10% to +10%) to make it look more realistic
  const variation = (Math.random() * 0.2 - 0.1);
  basePrice = basePrice * (1 + variation);

  // Round to .49 or .99 endings for realistic pricing
  const cents = basePrice % 1;
  if (cents < 0.25) {
    basePrice = Math.floor(basePrice) + 0.29;
  } else if (cents < 0.75) {
    basePrice = Math.floor(basePrice) + 0.49;
  } else {
    basePrice = Math.floor(basePrice) + 0.99;
  }

  return Math.max(0.99, Math.min(basePrice, 29.99)); // Cap between $0.99 and $29.99
}

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

        // Convert Spoonacular products to our format with estimated pricing
        products = spoonacularResult.products.map(sp => ({
          id: sp.id || `spoonacular_${Date.now()}_${Math.random()}`,
          name: sp.name,
          brand: sp.brand || 'Generic',
          price: estimatePrice(sp.name, sp.aisle, sp.brand), // Use estimated pricing
          estimated_price: true, // Flag that this is an estimate
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
            price: estimatePrice(cp.name, cp.aisle, cp.brand), // Use estimated pricing
            estimated_price: true,
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

    // If still no products, create basic entry with estimated price
    if (products.length === 0) {
      products.push({
        id: `search_${Date.now()}`,
        name: query,
        brand: 'Generic',
        price: estimatePrice(query, '', 'Generic'), // Basic estimate
        estimated_price: true,
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