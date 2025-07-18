// server/utils/aiProductParser.js - Intelligent product parsing with confidence scoring
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProductParser {
  constructor() {
    // Initialize Gemini for product validation if API key available
    this.gemini = process.env.GEMINI_API_KEY ? 
      new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    
    // Common grocery product patterns
    this.productPatterns = {
      // Meat & Seafood
      proteins: [
        'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 
        'ground beef', 'chicken breast', 'pork chops', 'bacon', 'ham', 'tofu'
      ],
      // Dairy & Eggs
      dairy: [
        'milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'sour cream',
        'cottage cheese', 'cream cheese', 'half and half', 'heavy cream'
      ],
      // Produce
      produce: [
        'banana', 'apple', 'orange', 'potato', 'onion', 'tomato', 'carrot', 
        'lettuce', 'spinach', 'broccoli', 'bell pepper', 'cucumber', 'avocado',
        'garlic', 'ginger', 'lime', 'lemon', 'strawberry', 'blueberry'
      ],
      // Pantry staples
      pantry: [
        'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper', 'oil',
        'olive oil', 'vinegar', 'soy sauce', 'honey', 'vanilla', 'baking powder'
      ],
      // Beverages
      beverages: [
        'water', 'juice', 'coffee', 'tea', 'soda', 'beer', 'wine', 'milk'
      ]
    };

    // Measurement units that indicate real grocery items
    this.validUnits = [
      'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
      'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon',
      'gallon', 'quart', 'pint', 'liter', 'ml', 'fl oz',
      'bag', 'box', 'container', 'jar', 'can', 'bottle', 'loaf',
      'dozen', 'pack', 'bunch', 'head', 'piece', 'pieces'
    ];

    // Patterns that indicate non-products (to exclude)
    this.excludePatterns = [
      // Meal/recipe descriptions
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /^(breakfast|lunch|dinner|snack|meal)/i,
      /^(day \d+|week \d+)/i,
      /(recipe|serves|cooking|baking|preparation)/i,
      
      // Cooking instructions
      /(preheat|bake|cook|heat|boil|fry|grill|roast|simmer|sauté)/i,
      /(mix|stir|combine|season|add salt|taste)/i,
      /(prep time|cook time|total time)/i,
      
      // Non-food items (unless specifically grocery-related)
      /(instructions|directions|steps|method)/i,
      /(tips|notes|optional|garnish)/i,
      /(budget|cost|price|total)/i,
      
      // Vague descriptions
      /^(something|anything|stuff|things)/i,
      /^(various|assorted|mixed)/i
    ];
  }

  /**
   * Main parsing function - intelligently extracts only real grocery products
   */
  async parseGroceryProducts(aiResponseText, options = {}) {
    console.log('🤖 Starting intelligent grocery product parsing...');
    
    const lines = aiResponseText.split('\n');
    const candidateItems = this.extractCandidateItems(lines);
    
    console.log(`📝 Found ${candidateItems.length} candidate items`);
    
    // Score and validate each candidate
    const scoredProducts = await Promise.all(
      candidateItems.map(item => this.scoreAndValidateProduct(item))
    );
    
    // Filter by confidence threshold
    const validProducts = scoredProducts
      .filter(product => product.confidence >= 0.6) // Only high-confidence items
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence
    
    // Remove duplicates and normalize
    const uniqueProducts = this.deduplicateProducts(validProducts);
    
    console.log(`✅ Extracted ${uniqueProducts.length} validated grocery products`);
    
    return {
      products: uniqueProducts,
      totalCandidates: candidateItems.length,
      validProducts: uniqueProducts.length,
      averageConfidence: uniqueProducts.length > 0 ? 
        uniqueProducts.reduce((sum, p) => sum + p.confidence, 0) / uniqueProducts.length : 0
    };
  }

  /**
   * Extract potential grocery items from text lines
   */
  extractCandidateItems(lines) {
    const candidates = [];
    let inGrocerySection = false;
    
    const groceryMarkers = [
      'shopping list', 'grocery list', 'ingredients', 'buy these', 
      'you need', 'purchase', 'grocery items', 'food items'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const lowerLine = line.toLowerCase();
      
      // Detect grocery list sections
      if (groceryMarkers.some(marker => lowerLine.includes(marker))) {
        inGrocerySection = true;
        continue;
      }
      
      // Stop at new sections that aren't grocery-related
      if (line.match(/^[#*]{1,4}\s/) || line.match(/^[A-Z][A-Z\s]+:$/)) {
        if (!groceryMarkers.some(marker => lowerLine.includes(marker))) {
          inGrocerySection = false;
        }
        continue;
      }

      // Extract bulleted/numbered items
      const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
      if (bulletMatch) {
        const rawText = bulletMatch[1].trim();
        if (rawText.length > 2) {
          candidates.push({
            original: line.trim(),
            cleaned: rawText,
            inGrocerySection,
            lineIndex: i
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Score and validate a potential grocery product
   */
  async scoreAndValidateProduct(candidate) {
    const cleaned = candidate.cleaned
      .replace(/\*\*/g, '') // Remove markdown
      .replace(/`/g, '')    // Remove code backticks
      .trim();

    // Check exclude patterns first
    if (this.excludePatterns.some(pattern => pattern.test(cleaned))) {
      return {
        ...candidate,
        confidence: 0.1,
        isProduct: false,
        reason: 'Matches exclude pattern'
      };
    }

    let confidence = 0.3; // Base confidence
    const factors = [];

    // Factor 1: In grocery section (+0.3)
    if (candidate.inGrocerySection) {
      confidence += 0.3;
      factors.push('in_grocery_section');
    }

    // Factor 2: Has quantity/measurement (+0.2)
    const hasQuantity = this.hasQuantityIndicator(cleaned);
    if (hasQuantity.found) {
      confidence += 0.2;
      factors.push('has_quantity');
    }

    // Factor 3: Matches known food keywords (+0.2)
    const foodMatch = this.matchesFoodKeywords(cleaned);
    if (foodMatch.matched) {
      confidence += 0.2;
      factors.push(`food_category:${foodMatch.category}`);
    }

    // Factor 4: Looks like grocery item structure (+0.1)
    if (this.hasGroceryStructure(cleaned)) {
      confidence += 0.1;
      factors.push('grocery_structure');
    }

    // Factor 5: Length and format checks
    if (cleaned.length >= 4 && cleaned.length <= 50) {
      confidence += 0.1;
      factors.push('good_length');
    }

    // Penalty: Too generic or vague (-0.3)
    if (this.isTooGeneric(cleaned)) {
      confidence -= 0.3;
      factors.push('too_generic');
    }

    // Parse quantity and unit
    const { quantity, unit, productName } = this.parseQuantityAndProduct(cleaned);

    // Determine category
    const category = this.categorizeProduct(productName);

    const result = {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      original: candidate.original,
      productName: productName || cleaned,
      quantity: quantity,
      unit: unit,
      category: category,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      isProduct: confidence >= 0.6,
      factors: factors,
      timestamp: new Date().toISOString()
    };

    // Optional: AI-powered validation for uncertain cases
    if (confidence >= 0.4 && confidence < 0.7 && this.gemini) {
      try {
        const aiValidation = await this.validateWithAI(cleaned);
        result.confidence = Math.max(result.confidence, aiValidation.confidence);
        result.aiValidated = true;
        result.aiReason = aiValidation.reason;
      } catch (error) {
        console.warn('AI validation failed:', error.message);
      }
    }

    return result;
  }

  /**
   * Check if text has quantity indicators
   */
  hasQuantityIndicator(text) {
    // Number at start: "2 lbs chicken"
    const numberStart = /^\d+(\.\d+)?\s/.test(text);
    
    // Unit patterns: "2 cups rice", "1 gallon milk"
    const unitPattern = new RegExp(`\\b\\d+(\\.\\d+)?\\s*(${this.validUnits.join('|')})\\b`, 'i');
    const hasUnit = unitPattern.test(text);

    // Container words: "1 bag of rice", "2 bottles water"
    const containerPattern = /\b\d+\s+(bag|box|container|jar|bottle|can|loaf|dozen|pack|bunch|head)\b/i;
    const hasContainer = containerPattern.test(text);

    return {
      found: numberStart || hasUnit || hasContainer,
      type: numberStart ? 'number_start' : hasUnit ? 'unit' : hasContainer ? 'container' : 'none'
    };
  }

  /**
   * Check if text matches known food categories
   */
  matchesFoodKeywords(text) {
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.productPatterns)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return { matched: true, category, keyword };
        }
      }
    }
    
    return { matched: false };
  }

  /**
   * Check if text has grocery item structure
   */
  hasGroceryStructure(text) {
    const lowerText = text.toLowerCase();
    
    // Has adjective + noun pattern: "fresh spinach", "organic milk"
    const adjectivePattern = /\b(fresh|organic|free.range|grass.fed|whole|ground|sliced|diced|chopped|frozen|canned)\s+\w+/i;
    
    // Has "of" pattern: "bag of rice", "bottle of water"
    const ofPattern = /\b(bag|bottle|jar|can|box|container|loaf|dozen|pack|bunch|head)\s+of\s+\w+/i;
    
    // Has brand-like pattern: "Brand Name Product"
    const brandPattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+/;

    return adjectivePattern.test(text) || ofPattern.test(text) || brandPattern.test(text);
  }

  /**
   * Check if text is too generic to be a specific product
   */
  isTooGeneric(text) {
    const genericTerms = [
      'food', 'stuff', 'things', 'items', 'something', 'anything',
      'various', 'assorted', 'mixed', 'some', 'any', 'other'
    ];
    
    const lowerText = text.toLowerCase();
    return genericTerms.some(term => lowerText === term || lowerText.startsWith(term + ' '));
  }

  /**
   * Parse quantity, unit, and product name from text
   */
  parseQuantityAndProduct(text) {
    // Pattern: "2 lbs chicken breast"
    const quantityMatch = text.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
    
    if (quantityMatch) {
      const [, quantity, possibleUnit, rest] = quantityMatch;
      
      // Check if the second part is a valid unit
      if (this.validUnits.includes(possibleUnit?.toLowerCase())) {
        return {
          quantity: parseFloat(quantity),
          unit: possibleUnit.toLowerCase(),
          productName: rest.trim()
        };
      } else {
        // No unit, quantity + product: "2 apples"
        return {
          quantity: parseFloat(quantity),
          unit: null,
          productName: (possibleUnit + ' ' + rest).trim()
        };
      }
    }

    // No clear quantity pattern
    return {
      quantity: 1,
      unit: null,
      productName: text.trim()
    };
  }

  /**
   * Categorize product into grocery categories
   */
  categorizeProduct(productName) {
    const lowerName = productName.toLowerCase();
    
    const categoryMappings = {
      'meat': ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'bacon', 'ham', 'ground'],
      'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
      'produce': ['apple', 'banana', 'orange', 'potato', 'onion', 'tomato', 'carrot', 'lettuce', 'spinach', 'broccoli'],
      'pantry': ['rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'beans'],
      'beverages': ['water', 'juice', 'coffee', 'tea', 'soda', 'beer', 'wine'],
      'frozen': ['frozen', 'ice cream'],
      'bakery': ['bread', 'bagel', 'muffin', 'cake', 'cookies'],
      'snacks': ['chips', 'crackers', 'nuts', 'candy', 'popcorn']
    };

    for (const [category, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Remove duplicate products and normalize
   */
  deduplicateProducts(products) {
    const seen = new Map();
    const unique = [];

    for (const product of products) {
      const key = product.productName.toLowerCase().trim();
      
      if (!seen.has(key)) {
        seen.set(key, product);
        unique.push(product);
      } else {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (product.confidence > existing.confidence) {
          const index = unique.findIndex(p => p.productName.toLowerCase().trim() === key);
          if (index !== -1) {
            unique[index] = product;
            seen.set(key, product);
          }
        }
      }
    }

    return unique;
  }

  /**
   * AI-powered validation for uncertain cases (optional)
   */
  async validateWithAI(text) {
    if (!this.gemini) {
      throw new Error('AI validation not available');
    }

    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `Is "${text}" a specific grocery product that someone could buy at a supermarket? 
      
Respond with only: YES or NO, followed by a confidence score 0.0-1.0, followed by a brief reason.
Format: YES|0.85|specific dairy product with clear quantity
Or: NO|0.2|appears to be a meal description not a product

Text to evaluate: "${text}"`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      const [answer, score, reason] = response.split('|').map(s => s.trim());
      
      return {
        confidence: answer === 'YES' ? parseFloat(score || 0.7) : 0.3,
        reason: reason || 'AI validation'
      };
    } catch (error) {
      console.warn('Gemini validation failed:', error);
      return { confidence: 0.5, reason: 'AI validation failed' };
    }
  }

  /**
   * Get parsing statistics
   */
  getParsingStats(results) {
    const products = results.products || [];
    
    const stats = {
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

    return stats;
  }
}

module.exports = AIProductParser;