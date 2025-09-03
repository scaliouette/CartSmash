// server/routes/cart.js - FIXED WITH AI PARSING INTEGRATION
const express = require('express');
const router = express.Router();
const AIProductParser = require('../utils/aiProductParser');
const { validateUserId, validateQuantity, sanitizeText } = require('../utils/validation');

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
  
  console.log(`📝 Extracted ${recipes.length} recipes from text`);
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

    console.log('🔍 Parsing grocery list with AI intelligence...');
    
    let parsedItems = [];
    
    // Use AI parsing for intelligent extraction
    if (useAI) {
      console.log('🤖 Using AI-powered intelligent parsing...');
      
      try {
        const parsingResults = await productParser.parseGroceryProducts(listText, {
          context: 'cart_parse',
          strictMode: options.strictMode !== false
        });
        
        // Convert AI parser results to cart items format
        parsedItems = parsingResults.products.map(product => ({
          id: product.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productName: product.productName,
          quantity: product.quantity || 1,
          unit: product.unit || 'each',
          category: product.category || 'other',
          confidence: product.confidence || 0.8,
          needsReview: product.confidence < 0.6,
          original: product.original,
          addedAt: new Date().toISOString(),
          aiParsed: true,
          parsingFactors: product.factors
        }));
        
        console.log(`✅ AI parsed ${parsedItems.length} validated products from ${parsingResults.totalCandidates} candidates`);
        console.log(`📊 Average confidence: ${(parsingResults.averageConfidence * 100).toFixed(1)}%`);
        
      } catch (aiError) {
        console.warn('⚠️ AI parsing failed, falling back to basic parsing:', aiError.message);
        // Fall back to basic parsing if AI fails
        parsedItems = basicParse(listText);
      }
    } else {
      // Use basic parsing if AI is disabled
      parsedItems = basicParse(listText);
    }

    // Apply deduplication if enabled
    let finalParsedItems = parsedItems;
    let duplicatesMerged = 0;
    
    if (options.mergeDuplicates !== false && parsedItems.length > 0) {
      const beforeCount = parsedItems.length;
      finalParsedItems = mergeDuplicates(parsedItems);
      duplicatesMerged = beforeCount - finalParsedItems.length;
      console.log(`✅ Merged ${duplicatesMerged} duplicate items`);
    }

    // Get user's existing cart
    const userIdToUse = userId || getUserId(req);
    let existingCart = cartItems.get(userIdToUse) || [];
    
    // Handle merge vs replace
    let finalCart;
    if (action === 'merge') {
      const combined = [...existingCart, ...finalParsedItems];
      finalCart = options.mergeDuplicates !== false ? mergeDuplicates(combined) : combined;
      console.log(`✅ Merged ${finalParsedItems.length} new items with ${existingCart.length} existing items`);
    } else {
      finalCart = finalParsedItems;
      console.log(`✅ Replaced cart with ${finalParsedItems.length} new items`);
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
        method: useAI ? 'ai_intelligent' : 'basic',
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
    console.error('❌ Error parsing grocery list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse grocery list',
      message: error.message
    });
  }
});

// Basic parsing fallback function
function basicParse(listText) {
  const lines = listText.split('\n').filter(line => line.trim());
  const parsedItems = [];
  
  for (const line of lines) {
    const cleaned = line.trim()
      .replace(/^[-•*\d+\.\)]\s*/, '')
      .replace(/\*\*/g, '');
    
    if (!cleaned || cleaned.length < 2) continue;
    
    // Skip common non-product lines
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|day|meal|breakfast|lunch|dinner|snack):/i.test(cleaned)) {
      continue;
    }
    
    const quantityMatch = cleaned.match(/^(\d+(?:\/\d+)?|\d+\.\d+)\s*([a-zA-Z]*)\s*(.+)$/);
    
    let quantity = 1;
    let unit = 'each';
    let productName = cleaned;
    
    if (quantityMatch) {
      const quantityStr = quantityMatch[1];
      if (quantityStr.includes('/')) {
        const [numerator, denominator] = quantityStr.split('/');
        quantity = parseFloat(numerator) / parseFloat(denominator);
      } else {
        quantity = parseFloat(quantityStr);
      }
      
      const possibleUnit = quantityMatch[2];
      const validUnits = ['lb', 'lbs', 'oz', 'cup', 'cups', 'tbsp', 'tsp', 'can', 'bottle', 'jar', 'bag', 'box', 'package', 'dozen', 'bunch', 'head', 'kg', 'g', 'ml', 'l'];
      
      if (possibleUnit && validUnits.some(u => possibleUnit.toLowerCase().includes(u))) {
        unit = possibleUnit.toLowerCase();
        productName = quantityMatch[3];
      } else {
        productName = (possibleUnit + ' ' + quantityMatch[3]).trim();
      }
    }
    
    // Detect container words
    const containerMatch = productName.match(/^(can|bottle|jar|bag|box|package)\s+(?:of\s+)?(.+)$/i);
    if (containerMatch) {
      unit = containerMatch[1].toLowerCase();
      productName = containerMatch[2];
    }
    
    const category = detectCategory(productName);
    
    parsedItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productName: productName,
      quantity: quantity,
      unit: unit,
      original: line,
      confidence: 0.7, // Lower confidence for basic parsing
      needsReview: true, // Mark for review since not AI validated
      category: category,
      addedAt: new Date().toISOString(),
      aiParsed: false
    });
  }
  
  return parsedItems;
}

// Helper function to detect category
function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  const categories = {
    produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'spinach', 'broccoli', 'pepper', 'cucumber', 'avocado', 'berry', 'berries', 'grape', 'lemon', 'lime'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'cottage', 'sour cream'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'bacon', 'ham', 'sausage', 'ground', 'steak'],
    pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'sauce', 'vinegar', 'salt', 'pepper', 'spice', 'cereal', 'oats', 'beans'],
    beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine'],
    frozen: ['frozen', 'ice cream', 'pizza'],
    bakery: ['bread', 'bagel', 'muffin', 'roll', 'bun', 'cake', 'cookie'],
    snacks: ['chips', 'crackers', 'nuts', 'popcorn', 'candy', 'chocolate']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

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
    
    console.log(`🔍 Validating ${userCart.length} items with AI...`);
    
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
    console.error('Error validating items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate items'
    });
  }
});

// POST /api/cart/fetch-prices - Fetch real prices from Kroger
router.post('/fetch-prices', async (req, res) => {
  try {
    const { items, userId, storeId = '01400943' } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items provided for price fetching'
      });
    }

    console.log(`💰 Fetching prices for ${items.length} items from Kroger...`);
    
    // Import Kroger service
    const KrogerAPIService = require('../services/KrogerAPIService');
    const krogerService = new KrogerAPIService();
    
    const prices = {};
    let found = 0;
    let notFound = 0;
    
    // Try to get user's access token for better results
    const tokenStore = require('../services/TokenStore');
    let userTokens = null;
    if (userId) {
      try {
        userTokens = await tokenStore.getTokens(userId);
      } catch (error) {
        console.log('No user tokens found, using anonymous search');
      }
    }
    
    for (const item of items) {
      const itemName = item.name || item.productName || item.itemName;
      if (!itemName) continue;
      
      try {
        // Clean up the item name for better Kroger matching
        let cleanItemName = itemName.toLowerCase()
          .replace(/organic/gi, '') // Remove "organic" as it might limit results
          .replace(/fresh/gi, '')   // Remove "fresh"
          .replace(/\b(lb|lbs|oz|pound|pounds|ounce|ounces)\b/gi, '') // Remove units
          .replace(/\s+/g, ' ')     // Normalize spaces
          .trim();
        
        console.log(`🔍 Searching Kroger for: "${itemName}" -> cleaned: "${cleanItemName}"`);
        
        // Try multiple search strategies
        let searchResults = [];
        
        // Strategy 1: Search with cleaned name
        searchResults = await krogerService.searchProducts(cleanItemName, storeId, 5);
        
        // Strategy 2: If no results, try with original name
        if (!searchResults || searchResults.length === 0) {
          console.log(`⚠️ No results for cleaned name, trying original: "${itemName}"`);
          searchResults = await krogerService.searchProducts(itemName, storeId, 5);
        }
        
        // Strategy 3: If still no results, try just the main word(s)
        if (!searchResults || searchResults.length === 0) {
          const mainWords = cleanItemName.split(' ').slice(0, 2).join(' '); // Take first 1-2 words
          if (mainWords !== cleanItemName) {
            console.log(`⚠️ Trying with main words: "${mainWords}"`);
            searchResults = await krogerService.searchProducts(mainWords, storeId, 5);
          }
        }
        
        if (searchResults && searchResults.length > 0) {
          console.log(`✅ Found ${searchResults.length} results for "${itemName}"`);
          const product = searchResults[0]; // Get the best match
          
          // Extract price information
          const regularPrice = product.items?.[0]?.price?.regular || 
                             product.price?.regular ||
                             null;
          
          const promoPrice = product.items?.[0]?.price?.promo || 
                           product.price?.promo ||
                           null;
          
          if (regularPrice) {
            prices[item.id] = {
              price: regularPrice,
              salePrice: promoPrice && promoPrice < regularPrice ? promoPrice : null,
              availability: product.items?.[0]?.fulfillment?.inStore || 'AVAILABLE',
              productId: product.productId,
              upc: product.upc,
              brand: product.brand,
              size: product.items?.[0]?.size,
              lastUpdated: new Date().toISOString(),
              storeId: storeId,
              krogerProduct: product, // Store full product details for cart adding
              matchedName: product.description || product.productName,
              searchTerm: cleanItemName
            };
            found++;
            console.log(`✅ Found price for ${itemName}: $${regularPrice} (Product ID: ${product.productId})`);
          } else {
            notFound++;
            console.log(`⚠️ No price found for ${itemName} - product found but no pricing`);
          }
        } else {
          notFound++;
          console.log(`❌ No product found for ${itemName}`);
        }
        
        // Rate limiting - small delay between requests
        if (items.length > 5) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (productError) {
        console.error(`❌ Error fetching price for ${itemName}:`, productError.message);
        notFound++;
      }
    }
    
    console.log(`💰 Price fetching complete: ${found} found, ${notFound} not found`);
    
    res.json({
      success: true,
      prices: prices,
      summary: {
        totalItems: items.length,
        found: found,
        notFound: notFound,
        storeId: storeId
      },
      message: `Found prices for ${found} out of ${items.length} items`
    });
    
  } catch (error) {
    console.error('❌ Error fetching prices:', error);
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
    
    console.log(`🗑️ Deleted item ${itemId} from cart for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
      deletedItem: deletedItem,
      remainingItems: userCart.length
    });
  } catch (error) {
    console.error('❌ Error deleting cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

module.exports = router;