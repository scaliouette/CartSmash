// server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const groceryRoutes = require('./routes/grocery');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/grocery', groceryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock grocery parsing endpoint (if not in grocery routes)
app.post('/api/parse-grocery-list', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No text provided' 
      });
    }
    
    // Simple parsing logic - split by lines and parse each item
    const lines = text.split('\n').filter(line => line.trim());
    const items = lines.map((line, index) => {
      // Basic parsing - extract quantity, unit, and product name
      const quantityMatch = line.match(/^(\d+(?:\.\d+)?)\s*/);
      const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
      
      // Remove quantity from line if found
      const lineWithoutQuantity = quantityMatch 
        ? line.substring(quantityMatch[0].length) 
        : line;
      
      // Detect unit
      const unitPatterns = [
        'lbs?', 'pounds?', 'oz', 'ounces?', 'kg', 'g', 'grams?',
        'cups?', 'tbsp', 'tsp', 'ml', 'l', 'liters?',
        'gallons?', 'quarts?', 'pints?',
        'cans?', 'bottles?', 'boxes?', 'bags?', 'dozen'
      ];
      
      const unitRegex = new RegExp(`(${unitPatterns.join('|')})\\s+`, 'i');
      const unitMatch = lineWithoutQuantity.match(unitRegex);
      const unit = unitMatch ? unitMatch[1].toLowerCase() : 'each';
      
      // Extract product name
      const productName = unitMatch
        ? lineWithoutQuantity.replace(unitRegex, '').trim()
        : lineWithoutQuantity.trim();
      
      // Determine category based on keywords
      const category = detectCategory(productName);
      
      // Calculate confidence based on parsing success
      let confidence = 0.5;
      if (quantityMatch) confidence += 0.2;
      if (unitMatch) confidence += 0.2;
      if (productName.length > 2) confidence += 0.1;
      
      return {
        id: `item_${Date.now()}_${index}`,
        original: line,
        productName: productName,
        itemName: productName,
        quantity: quantity,
        unit: normalizeUnit(unit),
        category: category,
        confidence: Math.min(confidence, 1),
        needsReview: confidence < 0.6
      };
    });
    
    res.json({
      success: true,
      items: items,
      stats: {
        totalItems: items.length,
        highConfidence: items.filter(i => i.confidence >= 0.8).length,
        needsReview: items.filter(i => i.needsReview).length
      }
    });
  } catch (error) {
    console.error('Error parsing grocery list:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse grocery list' 
    });
  }
});

// Helper function to detect category
function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  const categoryKeywords = {
    produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'fruit', 'vegetable', 'salad', 'berry', 'grape', 'cucumber', 'pepper', 'broccoli', 'spinach', 'celery'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'cottage', 'sour cream', 'ice cream'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'bacon', 'sausage', 'ham', 'steak', 'ground'],
    bakery: ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita'],
    pantry: ['rice', 'pasta', 'cereal', 'soup', 'sauce', 'oil', 'vinegar', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'can', 'beans', 'nuts'],
    beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer', 'drink'],
    frozen: ['frozen', 'ice', 'pizza'],
    snacks: ['chips', 'crackers', 'cookies', 'candy', 'popcorn', 'pretzels', 'chocolate']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

// Helper function to normalize units
function normalizeUnit(unit) {
  const unitMap = {
    'lb': 'lb',
    'lbs': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'liter': 'l',
    'liters': 'l',
    'gallon': 'gal',
    'gallons': 'gal',
    'quart': 'qt',
    'quarts': 'qt',
    'pint': 'pt',
    'pints': 'pt',
    'cup': 'cup',
    'cups': 'cup',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'can': 'can',
    'cans': 'can',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'box': 'box',
    'boxes': 'box',
    'bag': 'bag',
    'bags': 'bag'
  };
  
  return unitMap[unit.toLowerCase()] || unit.toLowerCase();
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CartSmash server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});