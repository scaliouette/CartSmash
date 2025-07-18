const express = require('express');
const router = express.Router();

// Simple in-memory storage (in production, use a database)
let cart = [];

// Parse grocery list
router.post('/parse', (req, res) => {
  console.log('📝 Cart parse request received');
  const { listText, action = 'replace', userId = null } = req.body;
  
  if (!listText) {
    return res.status(400).json({ error: 'listText required' });
  }
  
  // Enhanced parsing function
  const parseGroceryItem = (line, index) => {
    let cleaned = line.trim()
      .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^[a-z]\)\s*/i, '');

    // Extract quantity if present
    const quantityMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(.+)/);
    let quantity = 1;
    let itemName = cleaned;
    
    if (quantityMatch) {
      quantity = parseFloat(quantityMatch[1]);
      itemName = quantityMatch[2];
    }

    // Determine category
    let category = 'other';
    const itemLower = itemName.toLowerCase();
    
    if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
    else if (itemLower.match(/bread|bagel|muffin|cake|cookie/)) category = 'bakery';
    else if (itemLower.match(/apple|banana|orange|fruit|vegetable|carrot|lettuce|tomato|potato|onion|spinach|broccoli/)) category = 'produce';
    else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat/)) category = 'meat';
    else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce|flour|sugar|salt/)) category = 'pantry';
    else if (itemLower.match(/frozen|ice cream/)) category = 'frozen';
    else if (itemLower.match(/water|juice|soda|coffee|tea|beer|wine/)) category = 'beverages';

    return {
      id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      original: line.trim(),
      itemName: itemName.trim(),
      quantity: quantity,
      category: category,
      timestamp: new Date().toISOString(),
      userId: userId
    };
  };
  
  // Parse items
  const items = listText.split('\n')
    .filter(line => line.trim())
    .map((line, index) => parseGroceryItem(line, index));
  
  // Handle action type
  if (action === 'replace') {
    cart = items;
  } else if (action === 'merge') {
    // Add new items, avoiding duplicates by name
    const existingNames = cart.map(item => item.itemName.toLowerCase());
    const newItems = items.filter(item => 
      !existingNames.includes(item.itemName.toLowerCase())
    );
    cart = [...cart, ...newItems];
  }
  
  console.log(`✅ Parsed ${items.length} items, cart now has ${cart.length} items`);
  
  res.json({
    success: true,
    cart: cart,
    action: action,
    itemsAdded: items.length,
    totalItems: cart.length
  });
});

// Get current cart
router.get('/current', (req, res) => {
  console.log('🛒 Cart current request');
  res.json({
    success: true,
    cart: cart,
    itemCount: cart.length,
    timestamp: new Date().toISOString()
  });
});

// Clear entire cart
router.post('/clear', (req, res) => {
  console.log('🗑️ Cart clear request');
  cart = [];
  res.json({ 
    success: true, 
    cart: [],
    message: 'Cart cleared successfully'
  });
});

// Delete specific item by ID
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Delete item request: ${id}`);
  
  const initialLength = cart.length;
  cart = cart.filter(item => item.id !== id);
  
  if (cart.length < initialLength) {
    console.log(`✅ Item ${id} deleted successfully`);
    res.json({
      success: true,
      cart: cart,
      message: 'Item deleted successfully',
      deletedItemId: id
    });
  } else {
    console.log(`❌ Item ${id} not found`);
    res.status(404).json({
      success: false,
      error: 'Item not found',
      itemId: id
    });
  }
});

// Update specific item by ID
router.put('/item/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(`📝 Update item request: ${id}`, updates);
  
  const itemIndex = cart.findIndex(item => item.id === id);
  
  if (itemIndex !== -1) {
    // Update the item while preserving the ID and timestamp
    cart[itemIndex] = {
      ...cart[itemIndex],
      ...updates,
      id: id, // Ensure ID doesn't change
      lastModified: new Date().toISOString()
    };
    
    console.log(`✅ Item ${id} updated successfully`);
    res.json({
      success: true,
      cart: cart,
      updatedItem: cart[itemIndex],
      message: 'Item updated successfully'
    });
  } else {
    console.log(`❌ Item ${id} not found for update`);
    res.status(404).json({
      success: false,
      error: 'Item not found',
      itemId: id
    });
  }
});

// Get cart statistics
router.get('/stats', (req, res) => {
  const stats = {
    totalItems: cart.length,
    categories: {},
    itemsWithQuantity: cart.filter(item => item.quantity && item.quantity > 1).length,
    lastModified: cart.length > 0 ? Math.max(...cart.map(item => new Date(item.timestamp))) : null
  };
  
  // Count items by category
  cart.forEach(item => {
    stats.categories[item.category] = (stats.categories[item.category] || 0) + 1;
  });
  
  res.json({
    success: true,
    stats: stats
  });
});

// Search cart items
router.get('/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) is required'
    });
  }
  
  const searchTerm = q.toLowerCase();
  const results = cart.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm) ||
    item.original.toLowerCase().includes(searchTerm)
  );
  
  res.json({
    success: true,
    query: q,
    results: results,
    resultCount: results.length
  });
});

module.exports = router;