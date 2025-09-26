// server/routes/spoonacularRoutes.js
// Routes for Spoonacular API integration

const express = require('express');
const router = express.Router();
const winston = require('winston');
const spoonacularService = require('../services/spoonacularService');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'spoonacular-routes' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// GET /api/spoonacular/health - Health check
router.get('/health', (req, res) => {
  const hasApiKey = !!process.env.SPOONACULAR_API_KEY;

  res.json({
    status: hasApiKey ? 'ready' : 'missing_api_key',
    service: 'spoonacular',
    apiKeyConfigured: hasApiKey,
    timestamp: new Date().toISOString()
  });
});

// POST /api/spoonacular/products/search - Search for grocery products
router.post('/products/search', async (req, res) => {
  try {
    const {
      query,
      number = 10,
      minCarbs,
      maxCarbs,
      minProtein,
      maxProtein,
      minCalories,
      maxCalories,
      minFat,
      maxFat,
      offset = 0
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    logger.info(`Searching Spoonacular for: "${query}"`);

    const options = {};
    // Add nutritional filters if provided
    if (minCarbs !== undefined) options.minCarbs = minCarbs;
    if (maxCarbs !== undefined) options.maxCarbs = maxCarbs;
    if (minProtein !== undefined) options.minProtein = minProtein;
    if (maxProtein !== undefined) options.maxProtein = maxProtein;
    if (minCalories !== undefined) options.minCalories = minCalories;
    if (maxCalories !== undefined) options.maxCalories = maxCalories;
    if (minFat !== undefined) options.minFat = minFat;
    if (maxFat !== undefined) options.maxFat = maxFat;
    if (offset !== undefined) options.offset = offset;

    const result = await spoonacularService.searchGroceryProducts(query, number, options);

    logger.info(`Found ${result.products.length} products from Spoonacular`);

    res.json({
      success: true,
      ...result,
      query,
      source: 'spoonacular'
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

// POST /api/spoonacular/ingredients/search - Search for ingredients
router.post('/ingredients/search', async (req, res) => {
  try {
    const { query, number = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    logger.info(`Searching Spoonacular ingredients for: "${query}"`);

    const result = await spoonacularService.searchIngredients(query, number);

    res.json({
      success: true,
      ...result,
      query,
      source: 'spoonacular_ingredients'
    });
  } catch (error) {
    logger.error('Ingredient search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search ingredients',
      message: error.message
    });
  }
});

// GET /api/spoonacular/products/:id - Get detailed product information
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Getting product info for ID: ${id}`);

    const productInfo = await spoonacularService.getProductInfo(id);

    if (!productInfo) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      product: productInfo,
      source: 'spoonacular'
    });
  } catch (error) {
    logger.error('Get product info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product information',
      message: error.message
    });
  }
});

// POST /api/spoonacular/products/parse - Parse products from text
router.post('/products/parse', async (req, res) => {
  try {
    const { text, servings = 1 } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text parameter is required'
      });
    }

    logger.info('Parsing products from text');

    const products = await spoonacularService.parseProducts(text, servings);

    res.json({
      success: true,
      products,
      count: products.length,
      source: 'spoonacular_parser'
    });
  } catch (error) {
    logger.error('Parse products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse products',
      message: error.message
    });
  }
});

// GET /api/spoonacular/products/autocomplete - Autocomplete product search
router.get('/products/autocomplete', async (req, res) => {
  try {
    const { query, number = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const result = await spoonacularService.autocompleteProductSearch(query, number);

    res.json({
      success: true,
      ...result,
      query,
      source: 'spoonacular_autocomplete'
    });
  } catch (error) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to autocomplete',
      message: error.message
    });
  }
});

// GET /api/spoonacular/products/upc/:upc/comparable - Get comparable products by UPC
router.get('/products/upc/:upc/comparable', async (req, res) => {
  try {
    const { upc } = req.params;

    logger.info(`Getting comparable products for UPC: ${upc}`);

    const result = await spoonacularService.getComparableProducts(upc);

    res.json({
      success: true,
      ...result,
      upc,
      source: 'spoonacular_comparable'
    });
  } catch (error) {
    logger.error('Get comparable products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comparable products',
      message: error.message
    });
  }
});

// POST /api/spoonacular/hybrid-search - Combine with Instacart data
router.post('/hybrid-search', async (req, res) => {
  try {
    const { query, includeNutrition = true, number = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    logger.info(`Hybrid search for: "${query}"`);

    // Search Spoonacular for product data
    const spoonacularResult = await spoonacularService.searchGroceryProducts(query, number);

    // Enhance with nutrition if requested
    const enhancedProducts = spoonacularResult.products.map(product => ({
      ...product,
      // Add fields that Instacart would provide
      instacart_compatible: true,
      display_name: product.name,
      needs_instacart_price: true, // Flag for frontend to fetch price from Instacart
      nutrition_available: product.nutrition?.nutrients?.length > 0,
      badges: product.badges || [],
      aisle: product.aisle || 'Unknown',
      // Image is from Spoonacular
      image_source: 'spoonacular',
      // Price would come from Instacart
      price_source: 'requires_instacart'
    }));

    res.json({
      success: true,
      products: enhancedProducts,
      totalProducts: spoonacularResult.totalProducts,
      query,
      source: 'spoonacular_hybrid',
      note: 'Images and nutrition from Spoonacular, prices need Instacart API'
    });
  } catch (error) {
    logger.error('Hybrid search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform hybrid search',
      message: error.message
    });
  }
});

module.exports = router;