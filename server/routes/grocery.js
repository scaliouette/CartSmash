const express = require('express');
const router = express.Router();

// Mock AI parsing service
async function parseGroceryListWithAI(text) {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const lines = text.split('\n').filter(line => line.trim());
  const items = [];
  
  for (const line of lines) {
    const parsed = parseGroceryLine(line);
    items.push(parsed);
  }
  
  return items;
}

function parseGroceryLine(line) {
  // Enhanced parsing logic
  const originalLine = line.trim();
  
  // Extract quantity
  const quantityMatch = line.match(/^(\d+(?:\.\d+)?)\s*/);
  const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
  
  // Remove quantity and parse rest
  const withoutQty = quantityMatch 
    ? line.substring(quantityMatch[0].length) 
    : line;
  
  // Extract unit
  const unitPatterns = {
    weight: /\b(lbs?|pounds?|oz|ounces?|kg|kilograms?|g|grams?)\b/i,
    volume: /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|ml|milliliters?|l|liters?|gal|gallons?|qt|quarts?|pt|pints?|fl\s*oz)\b/i,
    container: /\b(cans?|bottles?|jars?|boxes?|bags?|packages?|containers?|cartons?|bunches?|heads?|loaves?)\b/i,
    count: /\b(dozen|pack|piece|cloves?)\b/i
  };
  
  let unit = 'each';
  let productName = withoutQty;
  
  for (const [type, pattern] of Object.entries(unitPatterns)) {
    const match = withoutQty.match(pattern);
    if (match) {
      unit = normalizeUnit(match[1]);
      productName = withoutQty.replace(pattern, '').trim();
      break;
    }
  }
  
  // Detect category
  const category = detectCategory(productName);
  
  // Calculate confidence
  let confidence = 0.7; // Base confidence
  if (quantityMatch) confidence += 0.1;
  if (unit !== 'each') confidence += 0.1;
  if (productName.length > 3) confidence += 0.1;
  
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    original: originalLine,
    productName: productName,
    itemName: productName,
    quantity: quantity,
    unit: unit,
    category: category,
    confidence: Math.min(confidence, 1),
    needsReview: confidence < 0.6,
    parsedAt: new Date().toISOString()
  };
}

function normalizeUnit(unit) {
  const unitMap = {
    'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
    'ounce': 'oz', 'ounces': 'oz',
    'kilogram': 'kg', 'kilograms': 'kg',
    'gram': 'g', 'grams': 'g',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'gallon': 'gal', 'gallons': 'gal',
    'quart': 'qt', 'quarts': 'qt',
    'pint': 'pt', 'pints': 'pt',
    'liter': 'l', 'liters': 'l',
    'milliliter': 'ml', 'milliliters': 'ml',
    'can': 'can', 'cans': 'can',
    'bottle': 'bottle', 'bottles': 'bottle',
    'jar': 'jar', 'jars': 'jar',
    'box': 'box', 'boxes': 'box',
    'bag': 'bag', 'bags': 'bag',
    'bunch': 'bunch', 'bunches': 'bunch',
    'head': 'head', 'heads': 'head',
    'loaf': 'loaf', 'loaves': 'loaf',
    'clove': 'clove', 'cloves': 'clove'
  };
  
  const normalized = unit.toLowerCase();
  return unitMap[normalized] || normalized;
}

function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  const categories = {
    produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'fruit', 'vegetable', 'berr', 'grape', 'cucumber', 'pepper', 'broccoli', 'spinach', 'celery', 'kale', 'cabbage', 'corn', 'peas', 'beans', 'squash', 'zucchini', 'mushroom', 'avocado', 'lemon', 'lime'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'cottage', 'sour', 'ice cream', 'whipped', 'half and half'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'lamb', 'veal', 'seafood', 'shrimp', 'crab'],
    bakery: ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita', 'naan', 'baguette', 'donut'],
    pantry: ['rice', 'pasta', 'cereal', 'soup', 'sauce', 'oil', 'vinegar', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'can', 'jar', 'nuts', 'honey', 'syrup', 'ketchup', 'mustard', 'mayo'],
    beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer', 'drink', 'cola', 'sprite', 'gatorade'],
    frozen: ['frozen', 'ice', 'pizza', 'fries'],
    snacks: ['chips', 'crackers', 'cookies', 'candy', 'popcorn', 'pretzels', 'chocolate', 'bar', 'gum']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

// Routes
router.post('/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text provided'
      });
    }
    
    const items = await parseGroceryListWithAI(text);
    
    res.json({
      success: true,
      items: items,
      stats: {
        totalItems: items.length,
        highConfidence: items.filter(i => i.confidence >= 0.8).length,
        mediumConfidence: items.filter(i => i.confidence >= 0.6 && i.confidence < 0.8).length,
        lowConfidence: items.filter(i => i.confidence < 0.6).length,
        categories: [...new Set(items.map(i => i.category))].length
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

module.exports = router;