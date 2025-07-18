const express = require('express');
const router = express.Router();

// Simple in-memory storage
let cart = [];

// Parse grocery list
router.post('/parse', (req, res) => {
  console.log('📝 Cart parse request received');
  const { listText, action = 'replace' } = req.body;
  
  if (!listText) {
    return res.status(400).json({ error: 'listText required' });
  }
  
  // Simple parsing
  const items = listText.split('\n')
    .filter(line => line.trim())
    .map((line, index) => ({
      id: `item_${Date.now()}_${index}`,
      original: line.trim(),
      itemName: line.trim(),
      quantity: 1,
      category: 'other',
      timestamp: new Date().toISOString()
    }));
  
  if (action === 'replace') {
    cart = items;
  } else {
    cart = [...cart, ...items];
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
    cart: cart,
    itemCount: cart.length
  });
});

// Clear cart
router.post('/clear', (req, res) => {
  cart = [];
  res.json({ success: true, cart: [] });
});

module.exports = router;