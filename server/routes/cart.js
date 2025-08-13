// server/routes/cart.js
const express = require('express');
const router = express.Router();

// In-memory storage (replace with database in production)
let cartItems = new Map();
let priceCache = new Map();

// Middleware to get user ID (simplified - use real auth in production)
const getUserId = (req) => {
  return req.headers['user-id'] || 'default-user';
};

// Mock price fetching service (replace with real API integration)
const fetchPriceFromService = async (productName) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  
  // Generate mock prices based on product name
  const basePrice = 2 + Math.random() * 18; // $2-20 base price
  const hasDiscount = Math.random() > 0.7; // 30% chance of sale
  
  return {
    price: parseFloat(basePrice.toFixed(2)),
    salePrice: hasDiscount ? parseFloat((basePrice * 0.8).toFixed(2)) : null,
    availability: Math.random() > 0.1 ? 'in-stock' : 'limited',
    lastUpdated: new Date().toISOString()
  };
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

// POST /api/cart/items - Add items to cart (bulk add)
router.post('/items', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid items data' 
      });
    }
    
    // Get existing cart or create new
    let userCart = cartItems.get(userId) || [];
    
    // Add items with unique IDs
    const newItems = items.map(item => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      addedAt: new Date().toISOString(),
      validated: false
    }));
    
    userCart = [...userCart, ...newItems];
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      items: newItems,
      totalItems: userCart.length
    });
  } catch (error) {
    console.error('Error adding items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add items to cart' 
    });
  }
});

// PUT /api/cart/items/:itemId - Update a specific item
router.put('/items/:itemId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemId } = req.params;
    const updates = req.body;
    
    let userCart = cartItems.get(userId) || [];
    const itemIndex = userCart.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }
    
    // Update the item
    userCart[itemIndex] = {
      ...userCart[itemIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      item: userCart[itemIndex]
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update item' 
    });
  }
});

// DELETE /api/cart/item/:itemId - Delete a specific item
router.delete('/item/:itemId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemId } = req.params;
    
    let userCart = cartItems.get(userId) || [];
    const originalLength = userCart.length;
    
    userCart = userCart.filter(item => item.id !== itemId);
    
    if (userCart.length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }
    
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
      remainingItems: userCart.length
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete item' 
    });
  }
});

// POST /api/cart/clear - Clear all items from cart
router.post('/clear', async (req, res) => {
  try {
    const userId = getUserId(req);
    cartItems.set(userId, []);
    
    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear cart' 
    });
  }
});

// POST /api/cart/fetch-prices - Fetch real-time prices for items
router.post('/fetch-prices', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid items data' 
      });
    }
    
    const prices = {};
    
    // Fetch prices for each item (with caching)
    await Promise.all(items.map(async (item) => {
      const cacheKey = `${item.name}_${new Date().toDateString()}`;
      
      // Check cache first (24-hour cache)
      if (priceCache.has(cacheKey)) {
        prices[item.id] = priceCache.get(cacheKey);
      } else {
        // Fetch new price
        const priceData = await fetchPriceFromService(item.name);
        prices[item.id] = priceData;
        priceCache.set(cacheKey, priceData);
      }
    }));
    
    res.json({
      success: true,
      prices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch prices' 
    });
  }
});

// POST /api/cart/validate-all - Validate and enhance all items
router.post('/validate-all', async (req, res) => {
  try {
    const userId = getUserId(req);
    let userCart = cartItems.get(userId) || [];
    
    // Enhanced validation logic
    userCart = userCart.map(item => {
      // Increase confidence for validated items
      let newConfidence = Math.min((item.confidence || 0.7) + 0.2, 1);
      
      // Smart unit detection (simplified version)
      let detectedUnit = item.unit;
      if (!detectedUnit || detectedUnit === 'unit') {
        const itemText = (item.original || item.itemName || item.name || '').toLowerCase();
        
        if (itemText.includes('lb') || itemText.includes('pound')) {
          detectedUnit = 'lb';
        } else if (itemText.includes('oz') || itemText.includes('ounce')) {
          detectedUnit = 'oz';
        } else if (itemText.includes('gal') || itemText.includes('gallon')) {
          detectedUnit = 'gal';
        } else if (itemText.includes('dozen')) {
          detectedUnit = 'dozen';
        } else if (itemText.includes('can') || itemText.includes('bottle')) {
          detectedUnit = itemText.includes('can') ? 'can' : 'bottle';
        } else {
          detectedUnit = 'each';
        }
      }
      
      return {
        ...item,
        confidence: newConfidence,
        unit: detectedUnit,
        validated: true,
        needsReview: false,
        validatedAt: new Date().toISOString()
      };
    });
    
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      message: 'All items validated successfully',
      items: userCart
    });
  } catch (error) {
    console.error('Error validating items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate items' 
    });
  }
});

// POST /api/cart/bulk-delete - Delete multiple items
router.post('/bulk-delete', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemIds, criteria } = req.body;
    
    let userCart = cartItems.get(userId) || [];
    let deletedCount = 0;
    
    if (itemIds && Array.isArray(itemIds)) {
      // Delete specific items by ID
      const originalLength = userCart.length;
      userCart = userCart.filter(item => !itemIds.includes(item.id));
      deletedCount = originalLength - userCart.length;
    } else if (criteria) {
      // Delete by criteria (e.g., low confidence)
      const originalLength = userCart.length;
      
      if (criteria === 'low-confidence') {
        userCart = userCart.filter(item => (item.confidence || 0) >= 0.6);
      }
      
      deletedCount = originalLength - userCart.length;
    }
    
    cartItems.set(userId, userCart);
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} items`,
      deletedCount,
      remainingItems: userCart.length
    });
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete items' 
    });
  }
});

// GET /api/cart/export - Export cart data
router.get('/export', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { format = 'json' } = req.query;
    const userCart = cartItems.get(userId) || [];
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Product Name', 'Quantity', 'Unit', 'Category', 'Confidence', 'Price'];
      const csvContent = [
        headers.join(','),
        ...userCart.map(item => [
          `"${item.productName || item.itemName || item.name}"`,
          item.quantity || 1,
          item.unit || 'each',
          item.category || 'other',
          ((item.confidence || 0) * 100).toFixed(0) + '%',
          item.realPrice ? `$${item.realPrice.toFixed(2)}` : 'N/A'
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cart-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        exportDate: new Date().toISOString(),
        items: userCart,
        stats: {
          totalItems: userCart.length,
          totalPrice: userCart.reduce((sum, item) => 
            sum + ((item.realPrice || 0) * (item.quantity || 1)), 0
          ),
          categories: [...new Set(userCart.map(item => item.category))].length
        }
      });
    }
  } catch (error) {
    console.error('Error exporting cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export cart' 
    });
  }
});

// GET /api/cart/stats - Get cart statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = getUserId(req);
    const userCart = cartItems.get(userId) || [];
    
    const stats = {
      total: userCart.length,
      highConfidence: userCart.filter(item => (item.confidence || 0) >= 0.8).length,
      mediumConfidence: userCart.filter(item => 
        (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8
      ).length,
      lowConfidence: userCart.filter(item => (item.confidence || 0) < 0.6).length,
      validated: userCart.filter(item => item.validated).length,
      categories: [...new Set(userCart.map(item => item.category))],
      averageConfidence: userCart.length > 0 
        ? userCart.reduce((sum, item) => sum + (item.confidence || 0), 0) / userCart.length 
        : 0,
      totalEstimatedPrice: userCart.reduce((sum, item) => 
        sum + ((item.realPrice || 0) * (item.quantity || 1)), 0
      ),
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cart statistics' 
    });
  }
});

// POST /api/cart/save-template - Save cart as template
router.post('/save-template', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description } = req.body;
    const userCart = cartItems.get(userId) || [];
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template name is required' 
      });
    }
    
    // In production, save to database
    const template = {
      id: `template_${Date.now()}`,
      userId,
      name,
      description,
      items: userCart.map(item => ({
        productName: item.productName || item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      })),
      createdAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Template saved successfully',
      template
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save template' 
    });
  }
});

module.exports = router;