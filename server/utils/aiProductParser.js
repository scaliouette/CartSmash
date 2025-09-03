// server/utils/aiProductParser.js - FIXED VERSION
class AIProductParser {
  constructor() {
    // Common grocery product patterns
    this.productPatterns = {
      proteins: [
        'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 
        'ground beef', 'chicken breast', 'pork chops', 'bacon', 'ham', 'tofu',
        'ricotta', 'mozzarella', 'parmesan', 'cheese', 'eggs'
      ],
      dairy: [
        'milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'sour cream',
        'cottage cheese', 'cream cheese', 'half and half', 'heavy cream',
        'ricotta', 'mozzarella', 'parmesan'
      ],
      produce: [
        'banana', 'apple', 'orange', 'potato', 'onion', 'tomato', 'carrot', 
        'lettuce', 'spinach', 'broccoli', 'bell pepper', 'cucumber', 'avocado',
        'garlic', 'ginger', 'lime', 'lemon', 'strawberry', 'blueberry', 'mushroom'
      ],
      pantry: [
        'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper', 'oil',
        'olive oil', 'vinegar', 'soy sauce', 'honey', 'vanilla', 'baking powder',
        'marinara', 'sauce', 'garlic powder'
      ]
    };

    // Valid units
    this.validUnits = [
      'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
      'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon',
      'gallon', 'quart', 'pint', 'liter', 'ml', 'fl oz',
      'bag', 'bags', 'box', 'boxes', 'container', 'containers', 
      'jar', 'jars', 'can', 'cans', 'bottle', 'bottles',
      'dozen', 'pack', 'package', 'bunch', 'head', 'loaf', 'piece'
    ];

    // Patterns that indicate non-products
    this.excludePatterns = [
      /^note:/i,
      /^tip:/i,
      /^optional:/i,
      /^instructions?:/i,
      /^directions?:/i,
      /if you (prefer|like|want)/i,
      /consider getting/i,
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /^(breakfast|lunch|dinner|snack|meal)/i,
      /^(prep time|cook time|serves)/i
    ];
  }

  /**
   * Extract grocery list section from structured meal plans
   */
  extractGroceryListSection(text) {
    const lines = text.split('\n');
    const lowerText = text.toLowerCase();
    
    // Look for grocery list indicators
    const groceryIndicators = [
      'grocery list', 'shopping list', 'ingredients needed',
      'produce:', 'proteins & dairy:', 'grains & bakery:', 'pantry:'
    ];
    
    let groceryStartIndex = -1;
    let groceryEndIndex = -1;
    
    // Find the start of grocery list section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      
      // Check if this line indicates start of grocery list
      if (line.includes('grocery list') || line.includes('shopping list') || 
          line === 'produce:' || line === 'proteins & dairy:') {
        groceryStartIndex = i;
        break;
      }
    }
    
    if (groceryStartIndex === -1) {
      // No grocery list section found, return null to use full text
      return null;
    }
    
    // Find the end of grocery list section
    for (let i = groceryStartIndex + 1; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      
      // Stop if we hit recipe instructions, tips, or other non-grocery content
      if (line.startsWith('estimated total cost:') || 
          line.startsWith('money-saving tips:') ||
          line.startsWith('sample recipe') ||
          line.startsWith('key recipes:') ||
          line.startsWith('instructions:') ||
          line.includes('this plan emphasizes') ||
          line.includes('this meal plan')) {
        groceryEndIndex = i;
        break;
      }
    }
    
    // If no end found, take everything from start to end
    if (groceryEndIndex === -1) {
      groceryEndIndex = lines.length;
    }
    
    // Extract just the grocery list section
    const groceryLines = lines.slice(groceryStartIndex, groceryEndIndex);
    const grocerySection = groceryLines.join('\n');
    
    console.log(`📋 Extracted grocery list section (${groceryLines.length} lines)`);
    return grocerySection;
  }

  /**
   * Main parsing function - intelligently extracts only real grocery products
   */
  async parseGroceryProducts(text, options = {}) {
    console.log('🤖 Starting intelligent grocery product parsing...');
    
    // First, try to extract grocery list section if it's a structured meal plan
    const grocerySection = this.extractGroceryListSection(text);
    const textToParse = grocerySection || text;
    
    const lines = textToParse.split('\n').filter(line => line.trim());
    const products = [];
    
    for (const line of lines) {
      const product = this.parseLine(line);
      if (product && product.isValid) {
        products.push(product);
      }
    }
    
    console.log(`✅ Extracted ${products.length} validated grocery products`);
    
    return {
      products,
      totalCandidates: lines.length,
      validProducts: products.length,
      averageConfidence: products.length > 0 ? 
        products.reduce((sum, p) => sum + p.confidence, 0) / products.length : 0
    };
  }

  /**
   * Parse a single line into a product
   */
  parseLine(line) {
    const trimmed = line.trim();
    
    // Check if it's a non-product line
    if (this.isExcludedLine(trimmed)) {
      return null;
    }
    
    // Remove bullet points and list markers
    const cleaned = trimmed
      .replace(/^[-•*]+\s*/, '')
      .replace(/^\d+\.\s*/, '');
    
    // Parse complex patterns like "1 containers (15 oz each) ricotta cheese"
    let quantity = 1;
    let unit = 'each';
    let productName = cleaned;
    let containerSize = null;
    
    // Pattern 1: "X containers/bags/etc (Y oz each) product name"
    const containerPattern = /^(\d+(?:\.\d+)?)\s+(bag|bags|container|containers|jar|jars|can|cans|bottle|bottles|box|boxes|package|packages)\s*\(([^)]+)\)\s+(.+)$/i;
    const containerMatch = cleaned.match(containerPattern);
    
    if (containerMatch) {
      quantity = parseFloat(containerMatch[1]);
      unit = this.normalizeUnit(containerMatch[2]);
      containerSize = containerMatch[3];
      productName = containerMatch[4];
    } else {
      // Pattern 2: "X unit (size) product" like "1 bag (8 oz) shredded parmesan cheese"
      const sizePattern = /^(\d+(?:\.\d+)?)\s+(\w+)\s*\(([^)]+)\)\s+(.+)$/i;
      const sizeMatch = cleaned.match(sizePattern);
      
      if (sizeMatch) {
        quantity = parseFloat(sizeMatch[1]);
        const possibleUnit = sizeMatch[2];
        containerSize = sizeMatch[3];
        productName = sizeMatch[4];
        
        // Check if it's a valid unit
        if (this.isValidUnit(possibleUnit)) {
          unit = this.normalizeUnit(possibleUnit);
        } else {
          // Not a unit, it's part of the product name
          productName = possibleUnit + ' ' + productName;
        }
      } else {
        // Pattern 3: Simple "X unit product" like "1 pound ground beef"
        const simplePattern = /^(\d+(?:\.\d+)?)\s+([a-zA-Z]+)\s+(.+)$/;
        const simpleMatch = cleaned.match(simplePattern);
        
        if (simpleMatch) {
          quantity = parseFloat(simpleMatch[1]);
          const possibleUnit = simpleMatch[2];
          
          if (this.isValidUnit(possibleUnit)) {
            unit = this.normalizeUnit(possibleUnit);
            productName = simpleMatch[3];
          } else {
            productName = possibleUnit + ' ' + simpleMatch[3];
          }
        } else {
          // Pattern 4: Just a number at the start
          const numberPattern = /^(\d+(?:\.\d+)?)\s+(.+)$/;
          const numberMatch = cleaned.match(numberPattern);
          
          if (numberMatch) {
            quantity = parseFloat(numberMatch[1]);
            productName = numberMatch[2];
          }
        }
      }
    }
    
    // Clean up product name
    productName = productName
      .replace(/\(.*?\)/g, '') // Remove any remaining parentheses
      .replace(/\s+/g, ' ')
      .trim();
    
    // Skip if product name is too short or invalid
    if (!productName || productName.length < 2) {
      return null;
    }
    
    // Determine category
    const category = this.categorizeProduct(productName);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(productName, quantity, unit);
    
    return {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      original: line,
      productName: productName,
      quantity: quantity,
      unit: unit,
      containerSize: containerSize,
      category: category,
      confidence: confidence,
      needsReview: confidence < 0.7,
      isValid: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if a line should be excluded
   */
  isExcludedLine(line) {
    const lower = line.toLowerCase();
    
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(line)) {
        return true;
      }
    }
    
    // Check if it's just a category header
    if (lower === 'proteins:' || lower === 'produce:' || lower === 'dairy:' || 
        lower === 'pantry:' || lower === 'pantry/other:' || lower === 'beverages:') {
      return true;
    }
    
    // Check if it's a meal description
    if (lower.includes('salads with') || lower.includes('salmon with') || 
        lower.includes('lunch with') || lower.includes('breakfast with')) {
      return true;
    }
    
    // Check if it's an instruction or combo
    if (lower.includes('combinations') || lower.includes('quick grain bowls') ||
        lower.includes('wrap sandwiches')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a word is a valid unit
   */
  isValidUnit(word) {
    const normalized = word.toLowerCase();
    return this.validUnits.some(unit => 
      unit === normalized || 
      unit + 's' === normalized ||
      unit === normalized + 's'
    );
  }

  /**
   * Normalize unit to standard form
   */
  normalizeUnit(unit) {
    const lower = unit.toLowerCase();
    
    // Handle plurals
    const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
    
    const unitMap = {
      'pound': 'lb',
      'pounds': 'lb',
      'lbs': 'lb',
      'ounce': 'oz',
      'ounces': 'oz',
      'container': 'container',
      'containers': 'container',
      'bag': 'bag',
      'bags': 'bag',
      'jar': 'jar',
      'jars': 'jar',
      'can': 'can',
      'cans': 'can',
      'bottle': 'bottle',
      'bottles': 'bottle',
      'box': 'box',
      'boxes': 'box',
      'package': 'package',
      'packages': 'package'
    };
    
    return unitMap[lower] || singular || lower;
  }

  /**
   * Categorize product
   */
  categorizeProduct(productName) {
    const lower = productName.toLowerCase();
    
    // Check for dairy products
    if (lower.includes('cheese') || lower.includes('ricotta') || 
        lower.includes('mozzarella') || lower.includes('parmesan') ||
        lower.includes('milk') || lower.includes('yogurt') || 
        lower.includes('cream') || lower.includes('butter')) {
      return 'dairy';
    }
    
    // Check for meat products
    if (lower.includes('beef') || lower.includes('chicken') || 
        lower.includes('pork') || lower.includes('turkey') ||
        lower.includes('fish') || lower.includes('salmon')) {
      return 'meat';
    }
    
    // Check for produce
    if (lower.includes('spinach') || lower.includes('mushroom') || 
        lower.includes('onion') || lower.includes('garlic') ||
        lower.includes('tomato') || lower.includes('pepper') ||
        lower.includes('lettuce') || lower.includes('carrot')) {
      return 'produce';
    }
    
    // Check for pantry items
    if (lower.includes('sauce') || lower.includes('pasta') || 
        lower.includes('rice') || lower.includes('oil') ||
        lower.includes('vinegar') || lower.includes('powder') ||
        lower.includes('foil')) {
      return 'pantry';
    }
    
    // Check for eggs (special case - can be dairy or protein)
    if (lower.includes('egg')) {
      return 'dairy';
    }
    
    return 'other';
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(productName, quantity, unit) {
    let confidence = 0.5; // Base confidence
    
    // Has specific quantity
    if (quantity && quantity !== 1) {
      confidence += 0.2;
    }
    
    // Has specific unit (not 'each')
    if (unit && unit !== 'each') {
      confidence += 0.2;
    }
    
    // Matches known products
    const allProducts = Object.values(this.productPatterns).flat();
    if (allProducts.some(product => productName.toLowerCase().includes(product))) {
      confidence += 0.2;
    }
    
    // Product name length is reasonable
    if (productName.length >= 3 && productName.length <= 50) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get parsing statistics
   */
  getParsingStats(results) {
    const products = results.products || [];
    
    return {
      totalProducts: products.length,
      highConfidence: products.filter(p => p.confidence >= 0.8).length,
      mediumConfidence: products.filter(p => p.confidence >= 0.6 && p.confidence < 0.8).length,
      lowConfidence: products.filter(p => p.confidence < 0.6).length,
      categoriesFound: [...new Set(products.map(p => p.category))],
      averageConfidence: results.averageConfidence || 0,
      processingMetrics: {
        candidateItems: results.totalCandidates || 0,
        validProducts: results.validProducts || 0,
        filteringEfficiency: results.totalCandidates > 0 ? 
          (results.validProducts / results.totalCandidates * 100).toFixed(1) + '%' : '0%'
      }
    };
  }
}

module.exports = AIProductParser;