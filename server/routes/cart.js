// server/routes/cart.js - FIXED WITH DEDUPLICATION
const express = require('express');
const router = express.Router();

// In-memory storage (replace with database in production)
let cartItems = new Map();
let savedLists = new Map();
let savedRecipes = new Map();

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
  
  // Check for exact match
  if (name1 === name2) return true;
  
  // Check for partial match (one contains the other)
  if (name1.includes(name2) || name2.includes(name1)) {
    // Make sure they're in the same category
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
    
    // Find all duplicates of current item
    for (let j = i + 1; j < items.length; j++) {
      if (!processed.has(j) && areDuplicates(currentItem, items[j])) {
        duplicates.push(items[j]);
        processed.add(j);
      }
    }
    
    // Merge quantities if duplicates found
    if (duplicates.length > 0) {
      let totalQuantity = parseFloat(currentItem.quantity || 1);
      
      for (const dup of duplicates) {
        // Only merge if units match or one is missing
        if (!currentItem.unit || !dup.unit || currentItem.unit === dup.unit) {
          totalQuantity += parseFloat(dup.quantity || 1);
          // Take the unit if current doesn't have one
          if (!currentItem.unit && dup.unit) {
            currentItem.unit = dup.unit;
          }
        } else {
          // Different units, keep separate
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

// Middleware to get user ID
const getUserId = (req) => {
  return req.headers['user-id'] || req.body?.userId || 'default-user';
};

// GET /api/cart - Get all cart items for user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const userCart = cartItems.get(userId) || [];
    
    res.json({
      success: true,
      items: userCart,
      count: userCart.length
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cart items' 
    });
  }
});

// POST /api/cart/parse - Parse grocery list with DEDUPLICATION
router.post('/parse', async (req, res) => {
  try {
    const { listText, action = 'merge', userId, options = {} } = req.body;
    
    if (!listText || listText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text provided to parse'
      });
    }

    console.log('🔍 Parsing grocery list with deduplication enabled...');

    // Parse the grocery list text
    const lines = listText.split('\n').filter(line => line.trim());
    const parsedItems = [];
    
    for (const line of lines) {
      const cleaned = line.trim()
        .replace(/^[-•*\d+\.\)]\s*/, '') // Remove bullets
        .replace(/\*\*/g, ''); // Remove markdown
      
      if (!cleaned || cleaned.length < 2) continue;
      
      // Skip common non-product lines
      if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|day|meal|breakfast|lunch|dinner|snack):/i.test(cleaned)) {
        continue;
      }
      
      // Parse quantity, handling fractions
      const quantityMatch = cleaned.match(/^(\d+(?:\/\d+)?|\d+\.\d+)\s*([a-zA-Z]*)\s*(.+)$/);
      
      let quantity = 1;
      let unit = null;
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
      
      // Detect container words in product name
      const containerMatch = productName.match(/^(can|bottle|jar|bag|box|package)\s+(?:of\s+)?(.+)$/i);
      if (containerMatch) {
        unit = containerMatch[1].toLowerCase();
        productName = containerMatch[2];
        quantity = quantity || 1;
      }
      
      const category = detectCategory(productName);
      
      parsedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productName: productName,
        quantity: quantity,
        unit: unit || 'each',
        original: line,
        confidence: 0.8,
        needsReview: false,
        category: category,
        addedAt: new Date().toISOString()
      });
    }

    // Apply deduplication if enabled
    let finalParsedItems = parsedItems;
    let duplicatesMerged = 0;
    
    if (options.mergeDuplicates !== false) {
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
      // When merging, also deduplicate with existing cart
      const combined = [...existingCart, ...finalParsedItems];
      finalCart = options.mergeDuplicates !== false ? mergeDuplicates(combined) : combined;
      console.log(`✅ Merged ${finalParsedItems.length} new items with ${existingCart.length} existing items`);
    } else {
      finalCart = finalParsedItems;
      console.log(`✅ Replaced cart with ${finalParsedItems.length} new items`);
    }
    
    // Save the cart
    cartItems.set(userIdToUse, finalCart);
    
    res.json({
      success: true,
      cart: finalCart,
      itemsAdded: finalParsedItems.length,
      totalItems: finalCart.length,
      parsing: {
        stats: {
          totalLines: lines.length,
          parsedItems: parsedItems.length,
          afterDeduplication: finalParsedItems.length,
          duplicatesMerged: duplicatesMerged,
          confidence: 0.8
        },
        averageConfidence: 0.8,
        duplicatesMerged: duplicatesMerged
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

// POST /api/cart/save-list - Save shopping list to account
router.post('/save-list', async (req, res) => {
  try {
    const { name, items, userId, metadata } = req.body;
    const userIdToUse = userId || getUserId(req);
    
    if (!name || !items) {
      return res.status(400).json({
        success: false,
        error: 'Name and items are required'
      });
    }
    
    const listId = `list_${Date.now()}`;
    const list = {
      id: listId,
      name,
      items,
      userId: userIdToUse,
      createdAt: new Date().toISOString(),
      metadata
    };
    
    // Save to user's lists
    let userLists = savedLists.get(userIdToUse) || [];
    userLists.push(list);
    savedLists.set(userIdToUse, userLists);
    
    console.log(`✅ Saved list "${name}" with ${items.length} items for user ${userIdToUse}`);
    
    res.json({
      success: true,
      listId,
      message: 'List saved successfully'
    });
  } catch (error) {
    console.error('Error saving list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save list'
    });
  }
});

// GET /api/cart/lists - Get saved lists
router.get('/lists', async (req, res) => {
  try {
    const userId = getUserId(req);
    const userLists = savedLists.get(userId) || [];
    
    res.json({
      success: true,
      lists: userLists
    });
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lists'
    });
  }
});

// POST /api/recipes - Save a recipe
router.post('/recipes', async (req, res) => {
  try {
    const recipe = req.body;
    const userId = getUserId(req);
    
    let userRecipes = savedRecipes.get(userId) || [];
    userRecipes.push(recipe);
    savedRecipes.set(userId, userRecipes);
    
    res.json({
      success: true,
      message: 'Recipe saved'
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save recipe'
    });
  }
});

// GET /api/recipes - Get saved recipes
router.get('/recipes', async (req, res) => {
  try {
    const userId = getUserId(req);
    const userRecipes = savedRecipes.get(userId) || [];
    
    res.json({
      success: true,
      recipes: userRecipes
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes'
    });
  }
});

// GET /api/user/data - Get all user data for account page
router.get('/user/data', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    const userCart = cartItems.get(userId) || [];
    const userLists = savedLists.get(userId) || [];
    const userRecipes = savedRecipes.get(userId) || [];
    
    const itemCount = userLists.reduce((sum, list) => sum + (list.items?.length || 0), 0);
    
    res.json({
      success: true,
      cart: userCart,
      lists: userLists,
      recipes: userRecipes,
      stats: {
        totalLists: userLists.length,
        totalMealPlans: 0,
        totalRecipes: userRecipes.length,
        itemsParsed: itemCount
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

// Helper function to detect category
function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  const categories = {
    produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'spinach', 'broccoli', 'pepper', 'cucumber', 'avocado', 'berry', 'berries', 'grape', 'lemon', 'lime', 'celery', 'kale', 'cabbage'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'cottage', 'sour cream', 'mozzarella', 'cheddar', 'parmesan'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'bacon', 'ham', 'sausage', 'ground', 'steak', 'shrimp', 'lamb'],
    pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'sauce', 'vinegar', 'salt', 'pepper', 'spice', 'cereal', 'oats', 'beans', 'soup', 'noodle'],
    beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'milk'],
    frozen: ['frozen', 'ice cream', 'pizza'],
    bakery: ['bread', 'bagel', 'muffin', 'roll', 'bun', 'cake', 'cookie', 'donut', 'croissant'],
    snacks: ['chips', 'crackers', 'nuts', 'popcorn', 'candy', 'chocolate', 'pretzel']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

module.exports = router;