// server/routes/cart.js - FIXED WITH AI PARSING INTEGRATION
const express = require('express');
const router = express.Router();
const AIProductParser = require('../utils/aiProductParser');
const { parseIngredientLine, buildSearchQuery } = require('../utils/ingredientParser');
const { validateUserId, validateQuantity, sanitizeText } = require('../utils/validation');
const winston = require('winston');
const spoonacularService = require('../services/spoonacularService');

// Configure logger for this route
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cart-routes' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize AI parser
const productParser = new AIProductParser();

// In-memory storage with size limits to prevent memory leaks
class BoundedMap {
  constructor(maxSize = 1000) {
    this.map = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      // Remove oldest entry (FIFO)
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
  
  get(key) {
    return this.map.get(key);
  }
  
  has(key) {
    return this.map.has(key);
  }
  
  delete(key) {
    return this.map.delete(key);
  }
  
  size() {
    return this.map.size;
  }
}

let cartItems = new BoundedMap(1000);
let savedLists = new BoundedMap(500);
let savedRecipes = new BoundedMap(500);

// Helper function to normalize product names for comparison
function normalizeProductName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Helper function to check if two items are duplicates
function areDuplicates(item1, item2) {
  const name1 = normalizeProductName(item1.productName || item1.itemName || item1.name || '');
  const name2 = normalizeProductName(item2.productName || item2.itemName || item2.name || '');
  
  if (name1 === name2) return true;
  
  if (name1.includes(name2) || name2.includes(name1)) {
    return item1.category === item2.category;
  }
  
  return false;
}

// Helper function to merge duplicate items
function mergeDuplicates(items) {
  const merged = [];
  const processed = new Set();
  
  for (let i = 0; i < items.length; i++) {
    if (processed.has(i)) continue;
    
    const currentItem = { ...items[i] };
    const duplicates = [];
    
    for (let j = i + 1; j < items.length; j++) {
      if (!processed.has(j) && areDuplicates(currentItem, items[j])) {
        duplicates.push(items[j]);
        processed.add(j);
      }
    }
    
    if (duplicates.length > 0) {
      let totalQuantity = parseFloat(currentItem.quantity || 1);
      
      for (const dup of duplicates) {
        if (!currentItem.unit || !dup.unit || currentItem.unit === dup.unit) {
          totalQuantity += parseFloat(dup.quantity || 1);
          if (!currentItem.unit && dup.unit) {
            currentItem.unit = dup.unit;
          }
        } else {
          merged.push(dup);
        }
      }
      
      currentItem.quantity = totalQuantity;
      currentItem.merged = true;
      currentItem.duplicatesCount = duplicates.length + 1;
    }
    
    merged.push(currentItem);
    processed.add(i);
  }
  
  return merged;
}

// Function to determine category based on product name
function determineCategory(productName) {
  if (!productName) return 'other';

  const name = productName.toLowerCase();

  // Produce items (fruits and vegetables)
  const produceItems = [
    'avocado', 'tomato', 'lettuce', 'spinach', 'kale', 'carrot', 'onion',
    'potato', 'pepper', 'cucumber', 'broccoli', 'cauliflower', 'zucchini',
    'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grape',
    'watermelon', 'pineapple', 'mango', 'peach', 'pear', 'plum',
    'celery', 'asparagus', 'corn', 'mushroom', 'garlic', 'ginger'
  ];

  // Dairy items
  const dairyItems = [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream',
    'cottage cheese', 'ice cream', 'whipped cream'
  ];

  // Meat items
  const meatItems = [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon',
    'tuna', 'shrimp', 'bacon', 'sausage', 'ham', 'steak'
  ];

  // Bakery items
  const bakeryItems = [
    'bread', 'bagel', 'muffin', 'croissant', 'donut', 'cake', 'pie',
    'roll', 'bun', 'tortilla', 'pita'
  ];

  // Check categories
  if (produceItems.some(item => name.includes(item))) return 'produce';
  if (dairyItems.some(item => name.includes(item))) return 'dairy';
  if (meatItems.some(item => name.includes(item))) return 'meat';
  if (bakeryItems.some(item => name.includes(item))) return 'bakery';

  // Check for common category keywords
  if (name.includes('fruit') || name.includes('vegetable')) return 'produce';
  if (name.includes('frozen')) return 'frozen';
  if (name.includes('snack') || name.includes('chip') || name.includes('cookie')) return 'snacks';
  if (name.includes('beverage') || name.includes('drink') || name.includes('soda') || name.includes('juice')) return 'beverages';

  return 'pantry'; // Default to pantry instead of 'other'
}

// Middleware to get user ID with validation
const getUserId = (req) => {
  const userId = req.headers['user-id'] || req.body?.userId || 'default-user';
  return validateUserId(userId);
};

// POST /api/cart/parse - Parse grocery list with AI INTEGRATION
// Recipe extraction function
function extractRecipes(text) {
  const recipes = [];
  const lines = text.split('\n');
  let currentRecipe = null;
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Detect recipe title/name
    const titleMatch = line.match(/^(recipe name?|title):\s*(.+)/i) || 
                      line.match(/^#{1,3}\s*(.+recipe.*)$/i) ||
                      line.match(/^\*\*(.+recipe.*)\*\*$/i);
    
    if (titleMatch) {
      // Save previous recipe if exists
      if (currentRecipe && (currentRecipe.ingredients.length > 0 || currentRecipe.instructions.length > 0)) {
        recipes.push(currentRecipe);
      }
      
      // Start new recipe
      currentRecipe = {
        id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: titleMatch[2] || titleMatch[1],
        ingredients: [],
        instructions: [],
        fullText: '',
        extractedAt: new Date().toISOString()
      };
      currentSection = 'title';
      continue;
    }
    
    // Detect sections
    if (line.match(/^(ingredients?|shopping list):\s*$/i) || 
        line.match(/^#{1,3}\s*(ingredients?|shopping list)/i) ||
        line.match(/^\*\*(ingredients?|shopping list)\*\*$/i)) {
      currentSection = 'ingredients';
      continue;
    }
    
    if (line.match(/^(instructions?|directions?|method|steps?):\s*$/i) || 
        line.match(/^#{1,3}\s*(instructions?|directions?|method|steps?)/i) ||
        line.match(/^\*\*(instructions?|directions?|method|steps?)\*\*$/i)) {
      currentSection = 'instructions';
      continue;
    }
    
    // Extract content based on current section
    if (currentRecipe) {
      const bulletMatch = line.match(/^[•\-*]\s*(.+)$/) || line.match(/^\d+[\.)]\s*(.+)$/);
      const content = bulletMatch ? bulletMatch[1].trim() : line;
      
      if (currentSection === 'ingredients' && content.length > 2) {
        currentRecipe.ingredients.push(content);
      } else if (currentSection === 'instructions' && content.length > 5) {
        currentRecipe.instructions.push(content);
      }
      
      // Always add to full text
      currentRecipe.fullText += line + '\n';
    }
  }
  
  // Save final recipe if exists
  if (currentRecipe && (currentRecipe.ingredients.length > 0 || currentRecipe.instructions.length > 0)) {
    recipes.push(currentRecipe);
  }
  
  logger.info(`📝 Extracted ${recipes.length} recipes from text`);
  return recipes;
}

router.post('/parse', async (req, res) => {
  try {
    const { listText, action = 'merge', userId, options = {}, useAI = true } = req.body;
    
    if (!listText || listText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text provided to parse'
      });
    }

    logger.info('🔍 Parsing grocery list with AI intelligence...');
    
    let parsedItems = [];
    
    // Use AI parsing for intelligent extraction
    if (useAI) {
      logger.info('🤖 Using AI-powered intelligent parsing...');
      
      try {
        const parsingResults = await productParser.parseGroceryProducts(listText, {
          context: 'cart_parse',
          strictMode: options.strictMode !== false
        });
        
        // Convert AI parser results to cart items format with enhanced ingredient parsing
        // Process in batches to avoid overwhelming Spoonacular API
        const BATCH_SIZE = 5; // Process 5 items at a time
        parsedItems = [];

        for (let i = 0; i < parsingResults.products.length; i += BATCH_SIZE) {
          const batch = parsingResults.products.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(async (product) => {
          // CRITICAL FIX: Ensure productName is always a string, never an object
          let productName = '';
          if (typeof product.productName === 'string') {
            productName = product.productName;
          } else if (typeof product.productName === 'object' && product.productName !== null) {
            // Handle nested productName objects by extracting the actual text
            productName = product.productName.text || 
                         product.productName.name || 
                         product.productName.value ||
                         product.productName.original ||
                         product.productName.displayName ||
                         product.productName.title ||
                         product.productName.label ||
                         String(product.productName);
          } else {
            productName = product.name || product.item || product.ingredient || String(product.productName || '');
          }
          
          // Ensure productName is a clean string
          productName = String(productName).trim();
          if (!productName) {
            productName = 'Unknown Item';
          }
          
          // Use AI-parsed data directly without redundant secondary parsing
          let ingredientData, searchQuery;

          // CRITICAL FIX: Avoid double-parsing that causes quantity conversion errors
          // The AI product parser already extracted structured data, don't re-parse it
          ingredientData = {
            qty: product.quantity || 1,
            unit: product.unit || 'each',
            name: productName,
            sizeQty: null,
            sizeUnit: null,
            original: product.original || productName
          };
          searchQuery = productName;

          logger.info('🔍 [DEBUG] Using AI-parsed data directly (no secondary parsing):', {
            productName,
            quantity: product.quantity,
            unit: product.unit,
            avoidingDoubleConversion: true
          });

          // Try to match with Spoonacular product data
          let spoonacularData = null;
          let productPrice = null;
          try {
            const spoonResult = await spoonacularService.searchGroceryProducts(searchQuery, 1);
            if (spoonResult.products && spoonResult.products.length > 0) {
              spoonacularData = spoonResult.products[0];
              logger.info(`✅ Matched "${productName}" with Spoonacular product: ${spoonacularData.name}`);

              // Try to get detailed product info including price
              if (spoonacularData.spoonacularId) {
                try {
                  const detailedInfo = await spoonacularService.getProductInfo(spoonacularData.spoonacularId);
                  if (detailedInfo && detailedInfo.price) {
                    productPrice = detailedInfo.price;
                    logger.info(`💰 Found price for ${productName}: $${productPrice}`);
                  } else {
                    // Generate estimated price based on category if not available
                    // This is a temporary fallback until we get real pricing
                    const estimatedPrices = {
                      'produce': 2.99,
                      'dairy': 3.49,
                      'meat': 7.99,
                      'bakery': 3.99,
                      'pantry': 2.49,
                      'frozen': 4.99,
                      'beverages': 2.99,
                      'snacks': 3.99,
                      'other': 3.99
                    };
                    productPrice = estimatedPrices[product.category] || 3.99;
                    logger.info(`📊 Using estimated price for ${productName}: $${productPrice}`);
                  }
                } catch (priceError) {
                  logger.debug(`Could not fetch price details:`, priceError.message);
                  // Use fallback estimated price
                  productPrice = 3.99;
                }
              }
            }
          } catch (spoonError) {
            logger.debug(`Could not match "${productName}" with Spoonacular:`, spoonError.message);
          }

          return {
            id: product.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productName: productName, // GUARANTEED to be a string
            quantity: product.quantity || ingredientData.qty || 1,
            unit: product.unit || ingredientData.unit || 'each',
            category: product.category || determineCategory(productName),
            confidence: product.confidence || 0.8,
            needsReview: product.confidence < 0.6,
            original: product.original || productName,
            addedAt: new Date().toISOString(),
            aiParsed: true,
            parsingFactors: product.factors,
            // Add Spoonacular data if found
            spoonacularData: spoonacularData,
            hasSpoonacularMatch: !!spoonacularData,
            // Add Spoonacular-specific fields for easier access
            image: spoonacularData?.image_url || null,
            image_url: spoonacularData?.image_url || null,
            imageUrl: spoonacularData?.image_url || null,
            nutrition: spoonacularData?.nutrition || null,
            aisle: spoonacularData?.aisle || null,
            badges: spoonacularData?.badges || [],
            // Add price information
            price: productPrice || spoonacularData?.price || null,
            // Enhanced ingredient data from professional parser
            ingredientData: {
              parsedName: ingredientData.name,
              parsedQuantity: ingredientData.qty,
              parsedUnit: ingredientData.unit,
              sizeQuantity: ingredientData.sizeQty,
              sizeUnit: ingredientData.sizeUnit,
              searchQuery: searchQuery,
              originalLine: ingredientData.original
            }
          };
          }));
          parsedItems.push(...batchResults);
        }

        logger.info(`✅ AI parsed ${parsedItems.length} validated products from ${parsingResults.totalCandidates} candidates`);
        logger.info(`📊 Average confidence: ${(parsingResults.averageConfidence * 100).toFixed(1)}%`);
        
      } catch (aiError) {
        logger.error('🔍 [DEBUG] AI parsing failed in cart.js - analyzing error...');
        logger.error('🔍 [DEBUG] Error message:', aiError.message);
        logger.error('🔍 [DEBUG] Error type:', typeof aiError);
        logger.error('🔍 [DEBUG] Error stack:', aiError.stack?.substring(0, 500));
        logger.error('🔍 [DEBUG] Full error object:', JSON.stringify(aiError, null, 2));
        
        // AI-only mode: No emergency fallback available
        
        // Check if it's a credit/billing issue
        if (aiError.message && aiError.message.includes('credit balance is too low')) {
          logger.error('🔍 [DEBUG] Detected credit balance issue - returning 400');
          return res.status(400).json({
            success: false,
            error: 'AI credits exhausted',
            message: 'AI parsing temporarily unavailable due to credit limits. Please try again later.',
            needsCredits: true,
            debugInfo: 'Credit balance too low'
          });
        }
        
        // Other AI failures - add debugging
        logger.error('🔍 [DEBUG] Other AI failure - returning 400');
        return res.status(400).json({
          success: false,
          error: 'AI parsing unavailable',
          message: 'AI service temporarily unavailable. Please try again later.',
          debugInfo: aiError.message?.substring(0, 200)
        });
      }
    } else {
      // AI-only mode - cannot disable AI
      return res.status(400).json({
        success: false,
        error: 'AI processing required',
        message: 'System is configured for AI-only processing - useAI cannot be disabled'
      });
    }

    // Apply deduplication if enabled
    let finalParsedItems = parsedItems;
    let duplicatesMerged = 0;
    
    if (options.mergeDuplicates !== false && parsedItems.length > 0) {
      const beforeCount = parsedItems.length;
      finalParsedItems = mergeDuplicates(parsedItems);
      duplicatesMerged = beforeCount - finalParsedItems.length;
      logger.info(`✅ Merged ${duplicatesMerged} duplicate items`);
    }

    // Get user's existing cart
    const userIdToUse = userId || getUserId(req);
    let existingCart = cartItems.get(userIdToUse) || [];
    
    // Handle merge vs replace
    let finalCart;
    if (action === 'merge') {
      const combined = [...existingCart, ...finalParsedItems];
      finalCart = options.mergeDuplicates !== false ? mergeDuplicates(combined) : combined;
      logger.info(`✅ Merged ${finalParsedItems.length} new items with ${existingCart.length} existing items`);
    } else {
      finalCart = finalParsedItems;
      logger.info(`✅ Replaced cart with ${finalParsedItems.length} new items`);
    }
    
    // Save the cart
    cartItems.set(userIdToUse, finalCart);
    
    // Calculate stats
    const highConfidenceCount = finalCart.filter(item => item.confidence >= 0.8).length;
    const needsReviewCount = finalCart.filter(item => item.needsReview || item.confidence < 0.6).length;
    
    // Extract recipes from the full text
    const extractedRecipes = extractRecipes(listText);
    
    res.json({
      success: true,
      cart: finalCart,
      itemsAdded: finalParsedItems.length,
      totalItems: finalCart.length,
      fullContent: listText, // Preserve full text
      recipes: extractedRecipes, // Extract recipe blocks
      parsing: {
        method: 'ai_intelligent',
        stats: {
          totalLines: listText.split('\n').filter(l => l.trim()).length,
          parsedItems: parsedItems.length,
          afterDeduplication: finalParsedItems.length,
          duplicatesMerged: duplicatesMerged,
          highConfidence: highConfidenceCount,
          needsReview: needsReviewCount,
          averageConfidence: finalCart.length > 0 ? 
            finalCart.reduce((sum, item) => sum + (item.confidence || 0), 0) / finalCart.length : 0
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error parsing grocery list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse grocery list',
      message: error.message
    });
  }
});

// POST /api/cart/validate-all - Validate all items using AI
router.post('/validate-all', async (req, res) => {
  try {
    const userId = getUserId(req);
    const userCart = cartItems.get(userId) || [];
    
    if (userCart.length === 0) {
      return res.json({
        success: true,
        items: [],
        message: 'No items to validate'
      });
    }
    
    logger.info(`🔍 Validating ${userCart.length} items with AI...`);
    
    const validatedItems = [];
    
    for (const item of userCart) {
      // Skip if already high confidence
      if (item.confidence >= 0.9 && !item.needsReview) {
        validatedItems.push(item);
        continue;
      }
      
      // Re-validate with AI
      const validationResult = await productParser.scoreAndValidateProduct({
        original: item.original || `${item.quantity} ${item.unit} ${item.productName}`,
        cleaned: item.productName,
        inGrocerySection: true
      });
      
      validatedItems.push({
        ...item,
        confidence: Math.max(item.confidence, validationResult.confidence),
        needsReview: validationResult.confidence < 0.6,
        category: validationResult.category || item.category,
        validated: true,
        validatedAt: new Date().toISOString()
      });
    }
    
    // Save validated cart
    cartItems.set(userId, validatedItems);
    
    res.json({
      success: true,
      items: validatedItems,
      validatedCount: validatedItems.filter(i => i.validated).length,
      needsReviewCount: validatedItems.filter(i => i.needsReview).length
    });
    
  } catch (error) {
    logger.error('Error validating items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate items'
    });
  }
});

// POST /api/cart/fetch-prices - Fetch real prices from Kroger (ARCHIVED - Kroger integration disabled)
router.post('/fetch-prices', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items provided for price fetching'
      });
    }

    logger.info(`🚫 Kroger price fetching disabled - returning empty results for ${items.length} items`);

    // Return empty prices since Kroger integration is archived
    return res.json({
      success: true,
      prices: {},
      found: 0,
      notFound: items.length,
      message: 'Kroger integration has been disabled'
    });
    
  } catch (error) {
    logger.error('❌ Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices from Kroger',
      message: error.message
    });
  }
});

// GET /api/cart/:userId - Get user's cart
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userCart = cartItems.get(validateUserId(userId)) || [];
    
    res.json({
      success: true,
      cart: userCart,
      itemCount: userCart.length,
      lastUpdated: userCart.length > 0 ? 
        Math.max(...userCart.map(item => new Date(item.addedAt).getTime())) : null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid user ID'
    });
  }
});

// POST /api/cart/add - Add items to cart
router.post('/add', (req, res) => {
  try {
    const { items, userId: bodyUserId } = req.body;
    const userId = bodyUserId || getUserId(req);
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }
    
    const existingCart = cartItems.get(userId) || [];
    const newItems = items.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString()
    }));
    
    const updatedCart = [...existingCart, ...newItems];
    cartItems.set(userId, updatedCart);
    
    res.json({
      success: true,
      cart: updatedCart,
      itemsAdded: newItems.length,
      totalItems: updatedCart.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add items to cart'
    });
  }
});

// DELETE /api/cart/:userId - Clear user's cart
router.delete('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    cartItems.delete(validateUserId(userId));
    
    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid user ID'
    });
  }
});

// PUT /api/cart/items/:itemId - Update individual item
router.put('/items/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = getUserId(req);
    const updates = req.body;
    
    const userCart = cartItems.get(userId) || [];
    const itemIndex = userCart.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Validate updates
    if (updates.quantity !== undefined) {
      if (!validateQuantity(updates.quantity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quantity'
        });
      }
    }
    
    if (updates.productName !== undefined) {
      updates.productName = sanitizeText(updates.productName);
    }
    
    userCart[itemIndex] = {
      ...userCart[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      item: userCart[itemIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

// DELETE /api/cart/items/:itemId - Delete individual item
router.delete('/items/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = getUserId(req);
    
    const userCart = cartItems.get(userId) || [];
    const itemIndex = userCart.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    const deletedItem = userCart[itemIndex];
    userCart.splice(itemIndex, 1);
    
    cartItems.set(userId, userCart);
    
    logger.info(`🗑️ Deleted item ${itemId} from cart for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
      deletedItem: deletedItem,
      remainingItems: userCart.length
    });
  } catch (error) {
    logger.error('❌ Error deleting cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

module.exports = router;