// server/utils/aiProductParser.js - Cleaned and hardened
class AIProductParser {
  constructor() {
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

    this.validUnits = [
      'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
      'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon',
      'gallon', 'quart', 'pint', 'liter', 'ml', 'fl oz',
      'bag', 'bags', 'box', 'boxes', 'container', 'containers',
      'jar', 'jars', 'can', 'cans', 'bottle', 'bottles',
      'dozen', 'pack', 'package', 'bunch', 'head', 'loaf', 'piece'
    ];

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

  extractGroceryListSection(text) {
    const lines = text.split('\n');
    let groceryStartIndex = -1;
    let groceryEndIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      if (line.includes('grocery list') || line.includes('shopping list') ||
          line === 'produce:' || line === 'proteins & dairy:' ||
          line === 'grains & bakery:' || line === 'pantry:') {
        groceryStartIndex = i;
        break;
      }
    }
    if (groceryStartIndex === -1) return null;
    for (let i = groceryStartIndex + 1; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
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
    if (groceryEndIndex === -1) groceryEndIndex = lines.length;
    const grocerySection = lines.slice(groceryStartIndex, groceryEndIndex).join('\n');
    return grocerySection;
  }

  async parseGroceryProducts(text, options = {}) {
    // Extract grocery list section if present
    const grocerySection = this.extractGroceryListSection(text);
    const textToParse = grocerySection || text;
    const lines = textToParse.split('\n').filter(line => line.trim());
    const products = [];
    for (const line of lines) {
      const product = this.parseLine(line);
      if (product && product.isValid) products.push(product);
    }
    return {
      products,
      totalCandidates: lines.length,
      validProducts: products.length,
      averageConfidence: products.length > 0
        ? products.reduce((sum, p) => sum + p.confidence, 0) / products.length
        : 0
    };
  }

  parseLine(line) {
    const trimmed = line.trim();
    if (this.isExcludedLine(trimmed)) return null;
    // Remove bullet markers and ordered list prefixes
    const cleaned = trimmed
      .replace(/^[\-\*\u2022\u2023\u25AA\u25CF\u25E6]\s*/, '')
      .replace(/^\d+[\.)]\s*/, '');

    let quantity = 1;
    let unit = 'each';
    let productName = cleaned;
    let containerSize = null;

    const containerPattern = /^(\d+(?:\.\d+)?)\s+(bag|bags|container|containers|jar|jars|can|cans|bottle|bottles|box|boxes|package|packages)\s*\(([^)]+)\)\s+(.+)$/i;
    const containerMatch = cleaned.match(containerPattern);
    if (containerMatch) {
      quantity = parseFloat(containerMatch[1]);
      unit = this.normalizeUnit(containerMatch[2]);
      containerSize = containerMatch[3];
      productName = containerMatch[4];
    } else {
      const sizePattern = /^(\d+(?:\.\d+)?)\s+(\w+)\s*\(([^)]+)\)\s+(.+)$/i;
      const sizeMatch = cleaned.match(sizePattern);
      if (sizeMatch) {
        quantity = parseFloat(sizeMatch[1]);
        const possibleUnit = sizeMatch[2];
        containerSize = sizeMatch[3];
        productName = sizeMatch[4];
        if (this.isValidUnit(possibleUnit)) {
          unit = this.normalizeUnit(possibleUnit);
        } else {
          productName = possibleUnit + ' ' + productName;
        }
      } else {
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
          const numberPattern = /^(\d+(?:\.\d+)?)\s+(.+)$/;
          const numberMatch = cleaned.match(numberPattern);
          if (numberMatch) {
            quantity = parseFloat(numberMatch[1]);
            productName = numberMatch[2];
          }
        }
      }
    }

    productName = productName.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    if (!productName || productName.length < 2) return null;

    const category = this.categorizeProduct(productName);
    const confidence = this.calculateConfidence(productName, quantity, unit);
    return {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      original: line,
      productName,
      quantity,
      unit,
      containerSize,
      category,
      confidence,
      needsReview: confidence < 0.7,
      isValid: true,
      timestamp: new Date().toISOString()
    };
  }

  isExcludedLine(line) {
    for (const pattern of this.excludePatterns) {
      if (pattern.test(line)) return true;
    }
    const lower = line.toLowerCase();
    if (['proteins:', 'produce:', 'dairy:', 'pantry:', 'pantry/other:', 'beverages:'].includes(lower)) return true;
    if (lower.includes('salads with') || lower.includes('salmon with') || lower.includes('lunch with') || lower.includes('breakfast with')) return true;
    if (lower.includes('combinations') || lower.includes('quick grain bowls') || lower.includes('wrap sandwiches')) return true;
    return false;
  }

  isValidUnit(word) {
    const normalized = word.toLowerCase();
    return this.validUnits.some(unit => unit === normalized || unit + 's' === normalized || unit === normalized + 's');
  }

  normalizeUnit(unit) {
    const lower = unit.toLowerCase();
    const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
    const unitMap = {
      pound: 'lb', pounds: 'lb', lbs: 'lb',
      ounce: 'oz', ounces: 'oz',
      container: 'container', containers: 'container',
      bag: 'bag', bags: 'bag',
      jar: 'jar', jars: 'jar',
      can: 'can', cans: 'can',
      bottle: 'bottle', bottles: 'bottle',
      box: 'box', boxes: 'box',
      package: 'package', packages: 'package'
    };
    return unitMap[lower] || singular || lower;
  }

  categorizeProduct(productName) {
    const lower = productName.toLowerCase();
    if (lower.match(/cheese|ricotta|mozzarella|parmesan|milk|yogurt|cream|butter/)) return 'dairy';
    if (lower.match(/beef|chicken|pork|turkey|fish|salmon/)) return 'meat';
    if (lower.match(/spinach|mushroom|onion|garlic|tomato|pepper|lettuce|carrot|banana|apple|orange/)) return 'produce';
    if (lower.match(/sauce|pasta|rice|oil|vinegar|powder|foil|bread|flour|sugar/)) return 'pantry';
    if (lower.includes('egg')) return 'dairy';
    return 'other';
  }

  calculateConfidence(productName, quantity, unit) {
    let confidence = 0.5;
    if (quantity && quantity !== 1) confidence += 0.2;
    if (unit && unit !== 'each') confidence += 0.2;
    const allProducts = Object.values(this.productPatterns).flat();
    if (allProducts.some(product => productName.toLowerCase().includes(product))) confidence += 0.2;
    if (productName.length >= 3 && productName.length <= 50) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

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
        filteringEfficiency: results.totalCandidates > 0
          ? (results.validProducts / results.totalCandidates * 100).toFixed(1) + '%'
          : '0%'
      }
    };
  }
}

module.exports = AIProductParser;

