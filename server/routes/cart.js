// server/routes/cart.js
const express = require('express');
const router = express.Router();
const { parseGroceryList } = require('../utils/parseGroceryItem');

// In-memory cart storage (replace with database in production)
let currentCart = [];

// Parse grocery list and update cart
router.post('/parse', (req, res) => {
  try {
    const { listText, action = 'merge', userId = null } = req.body;

    if (!listText) {
      return res.status(400).json({ 
        success: false, 
        error: 'No grocery list provided' 
      });
    }

    console.log('🛒 Processing grocery list...');
    console.log('📝 Text length:', listText.length);
    
    // Parse the grocery list
    const parsedItems = parseGroceryList(listText);
    
    if (!parsedItems || parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No grocery items could be parsed from the provided text'
      });
    }

    // Add IDs and timestamps to items
    const itemsWithIds = parsedItems.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      ...item,
      addedAt: new Date().toISOString(),
      userId: userId
    }));

    let duplicatesSkipped = 0;
    let itemsAdded = 0;

    if (action === 'replace') {
      // Replace entire cart
      currentCart = itemsWithIds;
      itemsAdded = itemsWithIds.length;
      console.log(`🔄 Cart replaced with ${itemsAdded} items`);
    } else {
      // Merge with existing cart (skip duplicates)
      const existingItemNames = currentCart.map(item => 
        (item.itemName || item.name || '').toLowerCase()
      );

      itemsWithIds.forEach(newItem => {
        const itemName = (newItem.itemName || newItem.name || '').toLowerCase();
        if (!existingItemNames.includes(itemName)) {
          currentCart.push(newItem);
          itemsAdded++;
        } else {
          duplicatesSkipped++;
        }
      });

      console.log(`🔀 Cart merged: ${itemsAdded} new items added (${duplicatesSkipped} duplicates skipped)`);
    }

    // Response with detailed information
    res.json({
      success: true,
      cart: currentCart,
      action: action,
      itemsAdded: itemsAdded,
      duplicatesSkipped: duplicatesSkipped,
      totalItems: currentCart.length
    });

  } catch (error) {
    console.error('❌ Cart parse error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse grocery list',
      details: error.message
    });
  }
});

// Get current cart
router.get('/current', (req, res) => {
  res.json({
    success: true,
    cart: currentCart,
    totalItems: currentCart.length
  });
});

// Clear entire cart
router.post('/clear', (req, res) => {
  currentCart = [];
  console.log('🗑️ Cart cleared');
  
  res.json({
    success: true,
    message: 'Cart cleared',
    cart: currentCart
  });
});

// Remove specific item
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = currentCart.length;
  
  currentCart = currentCart.filter(item => item.id !== id);
  
  if (currentCart.length < initialLength) {
    console.log(`🗑️ Item ${id} removed from cart`);
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

// Update item quantity
router.patch('/item/:id', (req, res) => {
  const { id } = req.params;
  const { quantity, unit } = req.body;
  
  const item = currentCart.find(item => item.id === id);
  
  if (item) {
    item.quantity = quantity;
    if (unit !== undefined) item.unit = unit;
    item.updatedAt = new Date().toISOString();
    
    console.log(`✏️ Item ${id} updated`);
    res.json({
      success: true,
      message: 'Item updated',
      item: item
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
});

module.exports = router;