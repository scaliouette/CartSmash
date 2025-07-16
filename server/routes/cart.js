const express = require('express');
const router = express.Router();
const parseGroceryItem = require('../utils/parseGroceryItem');

// In-memory cart storage (in production, use database)
let userCart = [];

// Parse and add items to cart (merge or replace)
router.post('/parse', async (req, res) => {
  const { listText, action = 'replace' } = req.body;

  if (!listText) {
    return res.status(400).json({ error: 'Missing listText' });
  }

  if (!['merge', 'replace'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use "merge" or "replace"' });
  }

  try {
    const lines = listText
      .split(/[\n;,]/)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(grocery list|shopping list|to buy|items needed):?$/i));

    const parsedItems = lines.map((line, index) => ({
      id: `item_${Date.now()}_${index}`,
      ...parseGroceryItem(line),
      addedAt: new Date().toISOString()
    }));

    let itemsAdded = 0;

    if (action === 'replace') {
      userCart = parsedItems;
      itemsAdded = parsedItems.length;
      console.log(`🔄 Cart replaced with ${parsedItems.length} items`);
    } else if (action === 'merge') {
      // Smart merge: avoid duplicates by item name
      const existingItemNames = new Set(userCart.map(item => item.itemName.toLowerCase()));
      const newItems = parsedItems.filter(item => !existingItemNames.has(item.itemName.toLowerCase()));
      
      userCart = [...userCart, ...newItems];
      itemsAdded = newItems.length;
      console.log(`🔀 Cart merged: ${newItems.length} new items added (${parsedItems.length - newItems.length} duplicates skipped)`);
    }

    res.status(200).json({ 
      success: true,
      cart: userCart,
      action: action,
      itemsAdded: itemsAdded,
      totalItems: userCart.length,
      duplicatesSkipped: action === 'merge' ? parsedItems.length - itemsAdded : 0
    });
  } catch (err) {
    console.error('Cart parse error:', err);
    res.status(500).json({ error: 'Failed to parse grocery list' });
  }
});

// Get current cart
router.get('/current', (req, res) => {
  res.status(200).json({ 
    cart: userCart,
    itemCount: userCart.length,
    lastUpdated: userCart.length > 0 ? Math.max(...userCart.map(item => new Date(item.addedAt).getTime())) : null
  });
});

// Clear cart
router.post('/clear', (req, res) => {
  const clearedCount = userCart.length;
  userCart = [];
  console.log(`🗑️ Cart cleared (${clearedCount} items removed)`);
  res.status(200).json({ 
    success: true,
    cart: [],
    message: `Cart cleared successfully (${clearedCount} items removed)`
  });
});

// Remove specific item
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = userCart.length;
  userCart = userCart.filter(item => item.id !== id);
  
  if (userCart.length < initialLength) {
    console.log(`🗑️ Removed item ${id} from cart`);
    res.status(200).json({ 
      success: true,
      cart: userCart,
      message: 'Item removed successfully'
    });
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Get cart by category
router.get('/categories', (req, res) => {
  const categorized = userCart.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  res.status(200).json({
    categories: categorized,
    totalItems: userCart.length,
    categoryCount: Object.keys(categorized).length
  });
});

// Update item quantity
router.patch('/item/:id', (req, res) => {
  const { id } = req.params;
  const { quantity, unit } = req.body;
  
  const item = userCart.find(item => item.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  if (quantity !== undefined) item.quantity = quantity;
  if (unit !== undefined) item.unit = unit;
  
  console.log(`📝 Updated item ${id}: ${item.itemName}`);
  res.status(200).json({
    success: true,
    item: item,
    cart: userCart
  });
});

module.exports = router;