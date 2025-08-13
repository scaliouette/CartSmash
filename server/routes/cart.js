// server/routes/cart.js
const express = require('express');
const router = express.Router();
const { parseGroceryItem, parseGroceryList } = require('../utils/parseGroceryItem');

// In-memory storage (replace with database in production)
let currentCart = [];
let savedRecipes = [];

// Parse grocery list - THIS IS THE MAIN ENDPOINT
router.post('/parse', (req, res) => {
  try {
    console.log('📝 Parse request received');
    const { listText, action = 'replace', userId, recipeInfo, options = {} } = req.body;
    
    if (!listText) {
      return res.status(400).json({ 
        success: false, 
        error: 'List text is required' 
      });
    }

    // Parse the entire list
    const parsedItems = parseGroceryList(listText);
    
    // If no items parsed, try line by line
    if (parsedItems.length === 0) {
      const lines = listText.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const item = parseGroceryItem(line);
        if (item) {
          parsedItems.push(item);
        }
      });
    }

    // Add IDs and confidence scores
    const itemsWithIds = parsedItems.map((item, index) => ({
      ...item,
      id: item.id || `item_${Date.now()}_${index}`,
      name: item.itemName || item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'unit',
      confidence: item.confidence || 0.8,
      needsReview: item.needsReview || false
    }));

    // Handle cart action
    if (action === 'replace') {
      currentCart = itemsWithIds;
      console.log(`🔄 Replaced cart with ${itemsWithIds.length} items`);
    } else if (action === 'merge') {
      // Merge without duplicates
      itemsWithIds.forEach(newItem => {
        const exists = currentCart.find(item => 
          item.itemName?.toLowerCase() === newItem.itemName?.toLowerCase() ||
          item.name?.toLowerCase() === newItem.name?.toLowerCase()
        );
        if (!exists) {
          currentCart.push(newItem);
        }
      });
      console.log(`🔀 Merged ${itemsWithIds.length} items into cart`);
    }

    // Calculate stats
    const stats = {
      totalParsed: itemsWithIds.length,
      highConfidence: itemsWithIds.filter(i => i.confidence >= 0.8).length,
      needsReview: itemsWithIds.filter(i => i.needsReview).length,
      averageConfidence: itemsWithIds.length > 0 
        ? itemsWithIds.reduce((sum, i) => sum + (i.confidence || 0.8), 0) / itemsWithIds.length 
        : 0
    };

    // Handle recipe info if provided
    if (recipeInfo) {
      const recipe = {
        id: Date.now().toString(),
        title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
        ingredients: recipeInfo.ingredients || [],
        instructions: recipeInfo.instructions || [],
        savedAt: new Date().toISOString(),
        userId: userId
      };
      savedRecipes.push(recipe);
      console.log(`📝 Recipe saved: "${recipe.title}"`);
    }

    console.log(`✅ Parsed ${itemsWithIds.length} items with ${(stats.averageConfidence * 100).toFixed(1)}% avg confidence`);

    res.json({
      success: true,
      cart: currentCart,
      action,
      itemsAdded: itemsWithIds.length,
      totalItems: currentCart.length,
      parsing: { 
        stats,
        averageConfidence: stats.averageConfidence 
      },
      quality: {
        quantityParsingAccuracy: stats.averageConfidence,
        needsReviewItems: stats.needsReview
      },
      recipe: recipeInfo ? { saved: true, title: recipeInfo.title } : null
    });
  } catch (error) {
    console.error('❌ Parse error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse grocery list',
      message: error.message 
    });
  }
});

// Get current cart
router.get('/current', (req, res) => {
  console.log('🛒 Current cart requested');
  res.json({
    success: true,
    cart: currentCart,
    itemCount: currentCart.length
  });
});

// Clear cart
router.post('/clear', (req, res) => {
  console.log('🗑️ Clear cart requested');
  currentCart = [];
  res.json({
    success: true,
    message: 'Cart cleared',
    cart: []
  });
});

// Delete specific item
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  const index = currentCart.findIndex(item => item.id === id);
  
  if (index !== -1) {
    currentCart.splice(index, 1);
    console.log(`🗑️ Item ${id} removed`);
    res.json({
      success: true,
      message: 'Item removed',
      cart: currentCart
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
});

// Get items by category
router.get('/categories', (req, res) => {
  const categories = {};
  
  currentCart.forEach(item => {
    const category = item.category || 'other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(item);
  });
  
  res.json({
    success: true,
    categories: categories,
    totalCategories: Object.keys(categories).length
  });
});

// Validate all items
router.post('/validate-all', (req, res) => {
  console.log('🔍 Validate all items requested');
  
  // Mock validation - enhance confidence scores
  const validated = currentCart.map(item => ({
    ...item,
    validated: true,
    confidence: Math.min((item.confidence || 0.8) * 1.1, 1),
    needsReview: false
  }));
  
  currentCart = validated;
  
  const summary = {
    highConfidence: validated.filter(i => i.confidence >= 0.8).length,
    needsReview: validated.filter(i => i.confidence < 0.8).length
  };
  
  console.log(`✅ Validated ${validated.length} items`);
  
  res.json({
    success: true,
    cart: currentCart,
    validation: { summary }
  });
});

// Get saved recipes
router.get('/recipes', (req, res) => {
  console.log('📚 Get recipes requested');
  res.json({
    success: true,
    recipes: savedRecipes,
    count: savedRecipes.length
  });
});

// Save a recipe
router.post('/recipes', (req, res) => {
  console.log('📝 Save recipe request');
  const { recipeInfo, userId } = req.body;
  
  if (!recipeInfo) {
    return res.status(400).json({
      success: false,
      error: 'recipeInfo is required'
    });
  }
  
  const recipe = {
    id: Date.now().toString(),
    title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
    ingredients: recipeInfo.ingredients || [],
    instructions: recipeInfo.instructions || [],
    servings: recipeInfo.servings || '',
    prepTime: recipeInfo.prepTime || '',
    cookTime: recipeInfo.cookTime || '',
    fullText: recipeInfo.fullText || '',
    savedAt: new Date().toISOString(),
    userId: userId,
    ingredientChoice: recipeInfo.ingredientChoice || 'basic'
  };
  
  savedRecipes.push(recipe);
  
  console.log(`✅ Recipe saved: "${recipe.title}" (Total: ${savedRecipes.length})`);
  
  res.json({
    success: true,
    recipe: recipe,
    message: 'Recipe saved successfully',
    totalRecipes: savedRecipes.length
  });
});

module.exports = router;