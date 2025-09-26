// server/routes/spoonacularRoutes.js
// Routes for Spoonacular API integration

const express = require('express');
const router = express.Router();
const winston = require('winston');
const spoonacularService = require('../services/spoonacularService');
const spoonacularEnhanced = require('../services/spoonacularEnhanced');

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

// POST /api/spoonacular/search/all - Unified search for all food types
router.post('/search/all', async (req, res) => {
  try {
    const { query, number = 20, offset = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    logger.info(`Unified food search for: "${query}"`);

    const results = await spoonacularService.searchAllFood(query, { number, offset });

    res.json({
      success: true,
      ...results,
      query,
      source: 'spoonacular_unified'
    });
  } catch (error) {
    logger.error('Unified search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search',
      message: error.message
    });
  }
});

// POST /api/spoonacular/search/smart - Smart search with suggestions
router.post('/search/smart', async (req, res) => {
  try {
    const {
      query,
      includeRecipes = true,
      includeProducts = true,
      includeMenuItems = false,
      maxResults = 20
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    logger.info(`Smart search for: "${query}"`);

    const results = await spoonacularService.smartSearch(query, {
      includeRecipes,
      includeProducts,
      includeMenuItems,
      maxResults
    });

    res.json({
      success: true,
      ...results,
      source: 'spoonacular_smart'
    });
  } catch (error) {
    logger.error('Smart search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart search',
      message: error.message
    });
  }
});

// POST /api/spoonacular/shopping-list/enrich - Enrich shopping list with full details
router.post('/shopping-list/enrich', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    logger.info(`Enriching shopping list with ${items.length} items`);

    const enrichedItems = [];

    for (const item of items) {
      try {
        // Parse the item name/query
        const itemName = item.name || item.productName || item.query || item;

        // Search for the item using unified search
        const searchResults = await spoonacularService.searchAllFood(itemName, { number: 5 });

        // Find the best matching product
        const products = searchResults.byType?.products || [];
        const bestProduct = products[0];

        if (bestProduct) {
          // Get full product details if we have an ID
          let fullDetails = bestProduct;
          if (bestProduct.id) {
            try {
              const productInfo = await spoonacularService.getProductInfo(bestProduct.id);
              if (productInfo) {
                fullDetails = { ...bestProduct, ...productInfo };
              }
            } catch (detailError) {
              logger.warn(`Could not get full details for product ${bestProduct.id}`);
            }
          }

          // Get classification for better categorization
          let classification = null;
          try {
            classification = await spoonacularService.classifyGroceryProduct(itemName);
          } catch (classError) {
            logger.warn(`Could not classify product: ${itemName}`);
          }

          // Get substitutes in case item is unavailable
          let substitutes = [];
          try {
            const substituteData = await spoonacularService.getIngredientSubstitutes(itemName);
            substitutes = substituteData.substitutes || [];
          } catch (subError) {
            logger.warn(`Could not get substitutes for: ${itemName}`);
          }

          enrichedItems.push({
            original: item,
            enriched: {
              id: fullDetails.id,
              name: fullDetails.name || fullDetails.title || itemName,
              cleanName: classification?.cleanTitle || fullDetails.name,
              brand: fullDetails.brand,
              image: fullDetails.image || fullDetails.image_url,
              images: fullDetails.images || [],
              category: classification?.category || fullDetails.aisle,
              breadcrumbs: classification?.breadcrumbs || fullDetails.breadcrumbs || [],
              aisle: fullDetails.aisle,
              badges: fullDetails.badges || [],
              nutrition: fullDetails.nutrition,
              servings: fullDetails.servings,
              ingredients: fullDetails.ingredients,
              ingredientList: fullDetails.ingredientList,
              description: fullDetails.description,
              price: fullDetails.price, // Note: Spoonacular doesn't provide real-time prices
              upc: fullDetails.upc,
              substitutes: substitutes,
              spoonacularScore: fullDetails.spoonacularScore,
              importantBadges: fullDetails.importantBadges || [],
              quantity: item.quantity || 1,
              unit: item.unit || 'item',
              confidence: 'high',
              source: 'spoonacular_enriched'
            },
            alternatives: products.slice(1, 4) // Provide 3 alternatives
          });
        } else {
          // No product found, return basic info
          enrichedItems.push({
            original: item,
            enriched: {
              name: itemName,
              quantity: item.quantity || 1,
              unit: item.unit || 'item',
              confidence: 'low',
              source: 'not_found',
              message: 'Product not found in database'
            },
            alternatives: []
          });
        }
      } catch (itemError) {
        logger.error(`Error enriching item "${item.name || item}":`, itemError.message);
        enrichedItems.push({
          original: item,
          enriched: null,
          error: itemError.message
        });
      }
    }

    // Calculate statistics
    const stats = {
      totalItems: items.length,
      enrichedCount: enrichedItems.filter(i => i.enriched && i.enriched.id).length,
      notFoundCount: enrichedItems.filter(i => i.enriched?.source === 'not_found').length,
      errorCount: enrichedItems.filter(i => i.error).length
    };

    res.json({
      success: true,
      items: enrichedItems,
      stats,
      source: 'spoonacular_enrichment'
    });
  } catch (error) {
    logger.error('Shopping list enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich shopping list',
      message: error.message
    });
  }
});

// POST /api/spoonacular/products/classify - Classify grocery products
router.post('/products/classify', async (req, res) => {
  try {
    const { title, upc } = req.body;

    if (!title && !upc) {
      return res.status(400).json({
        success: false,
        error: 'Either title or UPC is required'
      });
    }

    logger.info(`Classifying product: ${title || upc}`);

    const classification = await spoonacularService.classifyGroceryProduct(title, upc);

    if (!classification) {
      return res.status(404).json({
        success: false,
        error: 'Could not classify product'
      });
    }

    res.json({
      success: true,
      classification,
      source: 'spoonacular_classify'
    });
  } catch (error) {
    logger.error('Product classification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to classify product',
      message: error.message
    });
  }
});

// GET /api/spoonacular/ingredients/:name/substitutes - Get ingredient substitutes
router.get('/ingredients/:name/substitutes', async (req, res) => {
  try {
    const { name } = req.params;

    logger.info(`Getting substitutes for: ${name}`);

    const substitutes = await spoonacularService.getIngredientSubstitutes(name);

    res.json({
      success: true,
      ...substitutes,
      source: 'spoonacular_substitutes'
    });
  } catch (error) {
    logger.error('Get substitutes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get substitutes',
      message: error.message
    });
  }
});

// POST /api/spoonacular/convert - Convert amounts between units
router.post('/convert', async (req, res) => {
  try {
    const { ingredientName, sourceAmount, sourceUnit, targetUnit } = req.body;

    if (!ingredientName || !sourceAmount || !sourceUnit || !targetUnit) {
      return res.status(400).json({
        success: false,
        error: 'All parameters are required: ingredientName, sourceAmount, sourceUnit, targetUnit'
      });
    }

    logger.info(`Converting ${sourceAmount} ${sourceUnit} of ${ingredientName} to ${targetUnit}`);

    const conversion = await spoonacularService.convertAmounts({
      ingredientName,
      sourceAmount,
      sourceUnit,
      targetUnit
    });

    if (!conversion) {
      return res.status(400).json({
        success: false,
        error: 'Could not perform conversion'
      });
    }

    res.json({
      success: true,
      ...conversion,
      source: 'spoonacular_convert'
    });
  } catch (error) {
    logger.error('Unit conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert units',
      message: error.message
    });
  }
});

// ==================== RECIPE FEATURES ====================

// POST /api/spoonacular/recipes/search - Search recipes with complex filters
router.post('/recipes/search', async (req, res) => {
  try {
    const params = req.body;
    logger.info(`Searching recipes with query: "${params.query || 'all'}"`);

    const results = await spoonacularEnhanced.searchRecipesComplex(params);

    res.json({
      success: true,
      ...results,
      source: 'spoonacular_recipes'
    });
  } catch (error) {
    logger.error('Recipe search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search recipes',
      message: error.message
    });
  }
});

// POST /api/spoonacular/recipes/by-ingredients - Find recipes by available ingredients
router.post('/recipes/by-ingredients', async (req, res) => {
  try {
    const { ingredients, number = 10, ranking = 1, ignorePantry = true } = req.body;

    if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients list is required'
      });
    }

    logger.info(`Finding recipes with ${Array.isArray(ingredients) ? ingredients.length : 1} ingredients`);

    const recipes = await spoonacularEnhanced.searchRecipesByIngredients(ingredients, {
      number,
      ranking,
      ignorePantry
    });

    res.json({
      success: true,
      recipes,
      count: recipes.length,
      source: 'spoonacular_by_ingredients'
    });
  } catch (error) {
    logger.error('Recipe by ingredients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find recipes',
      message: error.message
    });
  }
});

// GET /api/spoonacular/recipes/:id - Get detailed recipe information
router.get('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeNutrition = true } = req.query;

    logger.info(`Getting recipe information for ID: ${id}`);

    const recipe = await spoonacularEnhanced.getRecipeInformation(id, includeNutrition);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      recipe,
      source: 'spoonacular_recipe_detail'
    });
  } catch (error) {
    logger.error('Get recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recipe',
      message: error.message
    });
  }
});

// POST /api/spoonacular/recipes/:id/shopping-list - Convert recipe to shopping list
router.post('/recipes/:id/shopping-list', async (req, res) => {
  try {
    const { id } = req.params;
    const { servings = 4 } = req.body;

    logger.info(`Converting recipe ${id} to shopping list for ${servings} servings`);

    const shoppingList = await spoonacularEnhanced.recipeToShoppingList(id, servings);

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        error: 'Could not create shopping list from recipe'
      });
    }

    res.json({
      success: true,
      ...shoppingList,
      source: 'spoonacular_recipe_shopping'
    });
  } catch (error) {
    logger.error('Recipe to shopping list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shopping list',
      message: error.message
    });
  }
});

// POST /api/spoonacular/shopping-list/from-recipes - Create smart shopping list from multiple recipes
router.post('/shopping-list/from-recipes', async (req, res) => {
  try {
    const { recipeIds, servingsMap = {} } = req.body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe IDs array is required'
      });
    }

    logger.info(`Creating shopping list from ${recipeIds.length} recipes`);

    const smartList = await spoonacularEnhanced.createSmartShoppingList(recipeIds, servingsMap);

    if (!smartList) {
      return res.status(500).json({
        success: false,
        error: 'Could not create smart shopping list'
      });
    }

    res.json({
      success: true,
      ...smartList,
      source: 'spoonacular_smart_list'
    });
  } catch (error) {
    logger.error('Smart shopping list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create smart shopping list',
      message: error.message
    });
  }
});

// ==================== MEAL PLANNING ====================

// POST /api/spoonacular/meal-plan/generate - Generate meal plan
router.post('/meal-plan/generate', async (req, res) => {
  try {
    const params = req.body;
    logger.info(`Generating ${params.timeFrame || 'week'} meal plan`);

    const mealPlan = await spoonacularEnhanced.generateMealPlan(params);

    if (!mealPlan) {
      return res.status(500).json({
        success: false,
        error: 'Could not generate meal plan'
      });
    }

    res.json({
      success: true,
      mealPlan,
      source: 'spoonacular_meal_plan'
    });
  } catch (error) {
    logger.error('Meal plan generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate meal plan',
      message: error.message
    });
  }
});

// GET /api/spoonacular/recipes/random - Get random recipes for inspiration
router.get('/recipes/random', async (req, res) => {
  try {
    const { tags, number = 5 } = req.query;

    logger.info('Getting random recipes for inspiration');

    const recipes = await spoonacularEnhanced.getRandomRecipes({ tags, number });

    res.json({
      success: true,
      recipes,
      count: recipes.length,
      source: 'spoonacular_random'
    });
  } catch (error) {
    logger.error('Random recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get random recipes',
      message: error.message
    });
  }
});

// GET /api/spoonacular/products/upc/:upc - Search product by UPC barcode
router.get('/products/upc/:upc', async (req, res) => {
  try {
    const { upc } = req.params;

    logger.info(`Searching product by UPC: ${upc}`);

    const product = await spoonacularEnhanced.searchProductByUPC(upc);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      product,
      source: 'spoonacular_upc'
    });
  } catch (error) {
    logger.error('UPC search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search by UPC',
      message: error.message
    });
  }
});

module.exports = router;