// Basic grocery list parser - Emergency fallback when AI services are unavailable
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'basic-parser' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Common units mapping
const UNITS = {
  // Weight
  'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
  'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
  'g': 'g', 'gram': 'g', 'grams': 'g',
  'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',

  // Volume
  'cup': 'cup', 'cups': 'cup',
  'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
  'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
  'gal': 'gal', 'gallon': 'gal', 'gallons': 'gal',
  'qt': 'qt', 'quart': 'qt', 'quarts': 'qt',
  'pt': 'pt', 'pint': 'pt', 'pints': 'pt',
  'l': 'l', 'liter': 'l', 'liters': 'l',
  'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',

  // Count
  'dozen': 'dozen', 'doz': 'dozen',
  'pack': 'pack', 'package': 'pack', 'pkg': 'pack',
  'bag': 'bag', 'bags': 'bag',
  'box': 'box', 'boxes': 'box',
  'can': 'can', 'cans': 'can',
  'jar': 'jar', 'jars': 'jar',
  'bottle': 'bottle', 'bottles': 'bottle',
  'container': 'container', 'containers': 'container',

  // Default
  'each': 'each', 'ea': 'each', 'item': 'each', 'items': 'each'
};

// Category detection based on common grocery items
function detectCategory(itemName) {
  const name = itemName.toLowerCase();

  // Produce
  if (/apple|banana|orange|grape|berr|fruit|tomato|potato|onion|carrot|lettuce|spinach|broccoli|pepper|cucumber|celery|corn|peas|beans|vegetable/i.test(name)) {
    return 'Produce';
  }

  // Dairy
  if (/milk|cheese|yogurt|butter|cream|egg|dairy/i.test(name)) {
    return 'Dairy & Eggs';
  }

  // Meat & Seafood
  if (/chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|meat|bacon|sausage|ham/i.test(name)) {
    return 'Meat & Seafood';
  }

  // Bakery
  if (/bread|bagel|muffin|donut|cake|cookie|pastry|bakery|roll|bun|croissant/i.test(name)) {
    return 'Bakery';
  }

  // Beverages
  if (/soda|juice|water|coffee|tea|drink|beverage|wine|beer|cola|lemonade/i.test(name)) {
    return 'Beverages';
  }

  // Frozen
  if (/frozen|ice cream|pizza/i.test(name)) {
    return 'Frozen';
  }

  // Pantry/Canned
  if (/pasta|rice|soup|sauce|oil|flour|sugar|salt|pepper|spice|can|canned|cereal|oats/i.test(name)) {
    return 'Pantry';
  }

  // Snacks
  if (/chip|cracker|pretzel|popcorn|candy|chocolate|cookie|snack/i.test(name)) {
    return 'Snacks';
  }

  return 'Other';
}

// Parse a single line into structured item
function parseLine(line) {
  if (!line || line.trim().length === 0) {
    return null;
  }

  // Clean the line
  line = line.trim();

  // Remove common list markers
  line = line.replace(/^[-*•·▪▸→◆◇○●■□☐☑]\s*/, '');
  line = line.replace(/^\d+[.)]\s*/, '');

  // Skip instruction lines
  if (line.toLowerCase().startsWith('step ') ||
      line.toLowerCase().startsWith('instruction') ||
      line.toLowerCase().startsWith('direction') ||
      line.length > 100) {
    return null;
  }

  // Try to extract quantity and unit
  let quantity = 1;
  let unit = 'each';
  let itemName = line;

  // Pattern 1: "2 cups flour" or "1-2 cups flour"
  const pattern1 = /^(\d+(?:\.\d+)?|\d+\/\d+|\d+-\d+)\s*([\w]+)?\s+(.+)$/;
  const match1 = line.match(pattern1);

  if (match1) {
    const [, qty, possibleUnit, rest] = match1;

    // Parse quantity
    if (qty.includes('-')) {
      // Range like "1-2" - take the average
      const [min, max] = qty.split('-').map(Number);
      quantity = (min + max) / 2;
    } else if (qty.includes('/')) {
      // Fraction like "1/2"
      const [num, den] = qty.split('/').map(Number);
      quantity = num / den;
    } else {
      quantity = parseFloat(qty);
    }

    // Check if the second word is a unit
    const normalizedUnit = possibleUnit ? possibleUnit.toLowerCase() : '';
    if (UNITS[normalizedUnit]) {
      unit = UNITS[normalizedUnit];
      itemName = rest;
    } else {
      // Not a unit, include it in the item name
      itemName = possibleUnit ? `${possibleUnit} ${rest}` : rest;
    }
  }

  // Pattern 2: "flour (2 cups)"
  const pattern2 = /^(.+?)\s*\((\d+(?:\.\d+)?|\d+\/\d+)\s*([\w]+)?\)$/;
  const match2 = line.match(pattern2);

  if (match2) {
    const [, name, qty, possibleUnit] = match2;
    itemName = name;
    quantity = parseFloat(qty);
    if (possibleUnit && UNITS[possibleUnit.toLowerCase()]) {
      unit = UNITS[possibleUnit.toLowerCase()];
    }
  }

  // Clean up item name
  itemName = itemName.trim();
  itemName = itemName.replace(/[,;]$/, ''); // Remove trailing punctuation

  // Skip if no meaningful item name
  if (!itemName || itemName.length < 2) {
    return null;
  }

  return {
    productName: itemName,
    quantity: quantity,
    unit: unit,
    category: detectCategory(itemName),
    confidence: 0.5, // Low confidence since it's basic parsing
    source: 'basic_parser'
  };
}

// Main parsing function
function parseGroceryList(text) {
  logger.info('🔧 Basic parser activated - parsing without AI');

  if (!text || typeof text !== 'string') {
    return { products: [] };
  }

  // Split text into lines
  const lines = text.split(/[\n\r]+/);
  const products = [];
  const recipes = [];

  // Track if we're in a recipe section
  let inRecipe = false;
  let currentRecipe = null;
  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check for recipe markers
    if (trimmedLine.toLowerCase().includes('recipe:') ||
        trimmedLine.toLowerCase().includes('recipe for') ||
        trimmedLine.toLowerCase().includes('how to make')) {
      inRecipe = true;
      currentRecipe = {
        title: trimmedLine.replace(/recipe:?\s*/i, '').trim(),
        ingredients: [],
        instructions: []
      };
      currentSection = null;
      continue;
    }

    // Check for ingredients section
    if (trimmedLine.toLowerCase().includes('ingredients:') ||
        trimmedLine.toLowerCase() === 'ingredients') {
      currentSection = 'ingredients';
      continue;
    }

    // Check for instructions section
    if (trimmedLine.toLowerCase().includes('instructions:') ||
        trimmedLine.toLowerCase().includes('directions:') ||
        trimmedLine.toLowerCase() === 'instructions' ||
        trimmedLine.toLowerCase() === 'directions') {
      currentSection = 'instructions';
      continue;
    }

    // Process based on current context
    if (inRecipe && currentRecipe) {
      if (currentSection === 'ingredients') {
        currentRecipe.ingredients.push(trimmedLine);
        // Also parse as a product
        const item = parseLine(trimmedLine);
        if (item) {
          products.push(item);
        }
      } else if (currentSection === 'instructions') {
        currentRecipe.instructions.push(trimmedLine);
      }
    } else {
      // Regular grocery item
      const item = parseLine(trimmedLine);
      if (item) {
        products.push(item);
      }
    }

    // Check if recipe section ended
    if (inRecipe && (trimmedLine === '' || trimmedLine.startsWith('---'))) {
      if (currentRecipe && currentRecipe.ingredients.length > 0) {
        recipes.push(currentRecipe);
      }
      inRecipe = false;
      currentRecipe = null;
      currentSection = null;
    }
  }

  // Save final recipe if exists
  if (currentRecipe && currentRecipe.ingredients.length > 0) {
    recipes.push(currentRecipe);
  }

  // Remove duplicates by combining similar items
  const consolidatedProducts = [];
  const productMap = new Map();

  for (const product of products) {
    const key = `${product.productName.toLowerCase()}_${product.unit}`;
    if (productMap.has(key)) {
      const existing = productMap.get(key);
      existing.quantity += product.quantity;
    } else {
      productMap.set(key, { ...product });
      consolidatedProducts.push(productMap.get(key));
    }
  }

  logger.info(`📦 Basic parser extracted ${consolidatedProducts.length} products and ${recipes.length} recipes`);

  return {
    products: consolidatedProducts,
    recipes: recipes,
    source: 'basic_parser',
    confidence: 0.5
  };
}

// Export the parsing functions
module.exports = {
  parseGroceryList,
  parseLine,
  detectCategory
};