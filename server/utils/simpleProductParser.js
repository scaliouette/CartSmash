// server/utils/simpleProductParser.js - Simple, Reliable Product Parser
class SimpleProductParser {
  constructor() {
    // Simple patterns for basic validation
    this.excludePatterns = [
      /^(recipe|instructions?|directions?|method):/i,
      /^(prep time|cook time|total time|serves?):/i,
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /^(breakfast|lunch|dinner|snack):/i,
      /^(note|tip|optional):/i,
      /^#/,  // Headers
      /^\*\*/  // Bold markdown
    ];
  }

  /**
   * Parse grocery products from text - simple and reliable
   * @param {string} text - Text to parse
   * @returns {Array} Array of products with consistent format
   */
  parseProducts(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const lines = text.split('\n');
    const products = [];

    for (const line of lines) {
      const product = this.parseLine(line);
      if (product) {
        products.push(product);
      }
    }

    return products;
  }

  /**
   * Parse a single line into a product
   * @param {string} line - Line to parse
   * @returns {Object|null} Product object or null if not a valid product
   */
  parseLine(line) {
    if (!line || typeof line !== 'string') {
      return null;
    }

    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed.length < 2) {
      return null;
    }

    // Skip excluded patterns
    if (this.isExcludedLine(trimmed)) {
      return null;
    }

    // Remove common prefixes (bullets, numbers)
    const cleaned = this.cleanLine(trimmed);

    if (cleaned.length < 2) {
      return null;
    }

    // Parse quantity and product name
    const parsed = this.parseQuantityAndName(cleaned);

    // Ensure productName is always a string
    const productName = this.ensureStringProductName(parsed.name);

    if (!productName || productName.length < 2) {
      return null;
    }

    return {
      productName: productName,  // Always a string, never an object
      quantity: parsed.quantity || '1',
      unit: parsed.unit || '',
      source: 'simple_parser',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if line should be excluded
   * @param {string} line - Line to check
   * @returns {boolean} True if line should be excluded
   */
  isExcludedLine(line) {
    return this.excludePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Clean line by removing prefixes
   * @param {string} line - Line to clean
   * @returns {string} Cleaned line
   */
  cleanLine(line) {
    return line
      // Remove bullet points
      .replace(/^[\-\*\u2022\u2023\u25AA\u25CF\u25E6]\s*/, '')
      // Remove numbered lists
      .replace(/^\d+[\.)]\s*/, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse quantity and product name from cleaned line
   * @param {string} line - Cleaned line
   * @returns {Object} Object with quantity, unit, and name
   */
  parseQuantityAndName(line) {
    // Pattern 1: "2 lbs chicken breast" or "1 gallon milk"
    const pattern1 = /^(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(lbs?|pounds?|oz|ounces?|cups?|tbsp|tsp|gallon|quart|pint|liters?|bottles?|cans?|jars?|boxes?|bags?|packages?|containers?|dozen|each|pieces?)\s+(.+)$/i;
    const match1 = line.match(pattern1);
    
    if (match1) {
      return {
        quantity: match1[1],
        unit: match1[2],
        name: match1[3]
      };
    }

    // Pattern 2: "2 apples" (simple quantity + item)
    const pattern2 = /^(\d+(?:\.\d+)?)\s+(.+)$/;
    const match2 = line.match(pattern2);
    
    if (match2) {
      return {
        quantity: match2[1],
        unit: '',
        name: match2[2]
      };
    }

    // Pattern 3: No quantity found, treat as "1 item"
    return {
      quantity: '1',
      unit: '',
      name: line
    };
  }

  /**
   * Ensure product name is always a string
   * @param {any} name - Product name (might be object, string, etc.)
   * @returns {string} Product name as string
   */
  ensureStringProductName(name) {
    if (typeof name === 'string') {
      return name.trim();
    }

    if (name && typeof name === 'object') {
      // If it's an object, try to extract a meaningful string
      if (name.name) return String(name.name).trim();
      if (name.productName) return String(name.productName).trim();
      if (name.title) return String(name.title).trim();
      
      // Fallback: stringify the object
      return String(name).replace(/\[object Object\]/, 'Unknown Item').trim();
    }

    if (name !== null && name !== undefined) {
      return String(name).trim();
    }

    return 'Unknown Item';
  }

  /**
   * Validate and clean a list of products
   * @param {Array} products - Array of products to validate
   * @returns {Array} Array of validated products
   */
  validateProducts(products) {
    if (!Array.isArray(products)) {
      return [];
    }

    return products
      .map(product => this.validateProduct(product))
      .filter(product => product !== null);
  }

  /**
   * Validate and clean a single product
   * @param {Object} product - Product to validate
   * @returns {Object|null} Validated product or null if invalid
   */
  validateProduct(product) {
    if (!product || typeof product !== 'object') {
      return null;
    }

    // Ensure productName is a string
    const productName = this.ensureStringProductName(product.productName || product.name);
    
    if (!productName || productName.length < 2) {
      return null;
    }

    return {
      productName: productName,
      quantity: String(product.quantity || '1'),
      unit: String(product.unit || ''),
      source: product.source || 'validated',
      timestamp: product.timestamp || new Date().toISOString()
    };
  }

  /**
   * Extract grocery list section from text (if present)
   * @param {string} text - Full text
   * @returns {string} Grocery list section or original text
   */
  extractGrocerySection(text) {
    const lines = text.split('\n');
    const groceryKeywords = [
      'grocery list',
      'shopping list',
      'ingredients needed',
      'you will need',
      'buy:',
      'shop for:'
    ];

    let startIndex = -1;
    let endIndex = lines.length;

    // Find start of grocery section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (groceryKeywords.some(keyword => line.includes(keyword))) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      // No explicit grocery section found, return original text
      return text;
    }

    // Find end of grocery section (look for next major section)
    const endKeywords = [
      'recipe',
      'instructions',
      'directions',
      'method',
      'preparation',
      'cooking',
      'notes',
      'tips'
    ];

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (endKeywords.some(keyword => line.includes(keyword))) {
        endIndex = i;
        break;
      }
    }

    return lines.slice(startIndex, endIndex).join('\n');
  }
}

module.exports = SimpleProductParser;