// server/utils/aiProductParser.js - Cleaned and hardened
class AIProductParser {
  constructor() {
    // Detect available AI clients provided by the server bootstrap
    this.ai = {
      anthropic: global.anthropic || null,
      openai: global.openai || null,
    };
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
      'dozen', 'pack', 'package', 'pkg', 'pk', 'bunch', 'head', 'heads', 
      'loaf', 'piece', 'clove', 'cloves',
      'each', 'ct', 'count', 'packet', 'packets', 'sleeve', 'carton'
    ];

    // Unit normalization mapping
    this.unitNormalization = {
      'ct': 'each',
      'count': 'each', 
      'packet': 'package',
      'packets': 'package',
      'sleeve': 'package',
      'carton': 'container',
      'lbs': 'lb',
      'pounds': 'lb',
      'ounces': 'oz',
      'ounce': 'oz',
      'cups': 'cup',
      'tablespoon': 'tbsp',
      'tablespoons': 'tbsp',
      'teaspoon': 'tsp',
      'teaspoons': 'tsp',
      'bags': 'bag',
      'boxes': 'box',
      'containers': 'container',
      'jars': 'jar',
      'cans': 'can',
      'bottles': 'bottle',
      'pieces': 'piece'
    };

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

    // AI-ONLY PROCESSING - No manual fallback
    if (!this.ai.anthropic && !this.ai.openai) {
      throw new Error('AI services required - no AI clients available');
    }

    try {
      console.log('🔍 [DEBUG] aiProductParser.parseGroceryProducts() - Starting AI extraction...');
      const aiProducts = await this.aiExtractProducts(textToParse, options);
      console.log('🔍 [DEBUG] AI extraction successful, got', aiProducts.length, 'products');
      
      // Apply confidence threshold filtering if specified (lite mode support)
      const confidenceThreshold = options.confidenceThreshold || 0.0;
      const filteredProducts = aiProducts.filter(p => (p.confidence || 0.5) >= confidenceThreshold);

      return {
        products: filteredProducts,
        totalCandidates: aiProducts.length,
        validProducts: filteredProducts.length,
        averageConfidence: filteredProducts.length > 0
          ? filteredProducts.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / filteredProducts.length
          : 0,
        meta: { 
          aiTried: true, 
          aiUsed: aiProducts.length > 0, 
          liteMode: options.liteMode || false,
          confidenceThreshold: confidenceThreshold,
          filteredByConfidence: aiProducts.length - filteredProducts.length
        }
      };
    } catch (error) {
      // AI ONLY: No fallback, throw error if AI fails
      console.error('🔍 [DEBUG] AI extraction failed in aiProductParser, error:', error.message);
      console.error('🔍 [DEBUG] Error type:', typeof error);
      console.error('🔍 [DEBUG] AI ONLY MODE - No fallback available');
      throw error;
    }
  }

  // Use Anthropic/OpenAI to extract a structured grocery list
  async aiExtractProducts(text, options = {}) {
    console.log('🔍 [DEBUG] aiExtractProducts() starting with COMPREHENSIVE Claude AI...');

    // COMPREHENSIVE SYSTEM PROMPT from Claude AI route - generates detailed ingredient lists
    const enhancedPrompt = `${text}

COMPREHENSIVE GROCERY LIST EXTRACTION - Generate complete, restaurant-quality ingredient lists.

Return a structured JSON response for grocery list extraction:

{
  "type": "grocery_list",
  "items": [
    {"name": "boneless skinless chicken breast", "quantity": "2", "unit": "lbs", "category": "meat"},
    {"name": "extra virgin olive oil", "quantity": "1", "unit": "bottle", "category": "pantry"},
    {"name": "yellow onion", "quantity": "1", "unit": "large", "category": "produce"},
    {"name": "garlic cloves", "quantity": "4", "unit": "each", "category": "produce"},
    {"name": "kosher salt", "quantity": "1", "unit": "container", "category": "pantry"},
    {"name": "black pepper", "quantity": "1", "unit": "container", "category": "pantry"},
    {"name": "bell peppers", "quantity": "3", "unit": "large", "category": "produce"},
    {"name": "corn tortillas", "quantity": "12", "unit": "each", "category": "grains"},
    {"name": "enchilada sauce", "quantity": "2", "unit": "can", "category": "canned"},
    {"name": "sharp cheddar cheese", "quantity": "16", "unit": "oz", "category": "dairy"},
    {"name": "white rice", "quantity": "2", "unit": "cups", "category": "grains"},
    {"name": "black beans", "quantity": "2", "unit": "can", "category": "canned"},
    {"name": "cumin", "quantity": "1", "unit": "container", "category": "pantry"},
    {"name": "paprika", "quantity": "1", "unit": "container", "category": "pantry"},
    {"name": "cilantro", "quantity": "1", "unit": "bunch", "category": "produce"},
    {"name": "lime", "quantity": "2", "unit": "each", "category": "produce"},
    {"name": "sour cream", "quantity": "1", "unit": "container", "category": "dairy"},
    {"name": "avocado", "quantity": "2", "unit": "each", "category": "produce"},
    {"name": "roma tomatoes", "quantity": "3", "unit": "large", "category": "produce"}
  ]
}

CRITICAL RULES:
- Generate COMPREHENSIVE ingredient lists including ALL necessary items: spices, aromatics, cooking oils, seasonings
- For Mexican enchiladas, include: tortillas, sauce, cheese, meat, onions, garlic, cumin, paprika, cilantro, lime, oil, salt, pepper
- For Italian dishes, include: olive oil, garlic, onions, herbs (basil, oregano), parmesan, tomatoes, etc.
- For Asian dishes, include: soy sauce, ginger, garlic, sesame oil, rice vinegar, etc.
- ALWAYS include cooking essentials: salt, pepper, cooking oil, onions, garlic
- Extract specific brands, sizes, and preparation notes when mentioned
- Use proper grocery categories: produce, meat, dairy, grains, frozen, canned, pantry, deli, snacks, other
- Preserve exact quantities and units from source text
- Return ONLY the JSON object, no additional text or formatting.`;

    // Resolve AI clients dynamically at call time (not construction time)
    const anthropic = global.anthropic || this.ai.anthropic;
    const openai = global.openai || this.ai.openai;
    
    console.log('🔍 [DEBUG] AI clients available:', {
      anthropic: !!anthropic,
      openai: !!openai,
      globalAnthropic: !!global.anthropic,
      globalOpenai: !!global.openai
    });

    // Try Anthropic first, then OpenAI fallback
    let raw;
    let lastError;
    
    if (anthropic) {
      try {
        console.log('🔍 [DEBUG] Attempting Anthropic API call with COMPREHENSIVE prompting...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            { role: 'user', content: enhancedPrompt }
          ]
        });
        raw = resp.content?.[0]?.text || '';
        console.log('🔍 [DEBUG] Anthropic API successful, response length:', raw.length);
      } catch (anthropicError) {
        console.log('🔍 [DEBUG] Anthropic API failed:', anthropicError.message);
        lastError = anthropicError;
        
        // Try OpenAI fallback
        if (openai) {
          try {
            console.log('🔍 [DEBUG] Falling back to OpenAI API with COMPREHENSIVE prompting...');
            const resp = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0.7,
              max_tokens: 2000,
              messages: [
                { role: 'user', content: enhancedPrompt }
              ]
            });
            raw = resp.choices?.[0]?.message?.content || '';
            console.log('🔍 [DEBUG] OpenAI fallback successful, response length:', raw.length);
          } catch (openaiError) {
            console.log('🔍 [DEBUG] OpenAI fallback also failed:', openaiError.message);
            lastError = openaiError;
          }
        }
      }
    } else if (openai) {
      try {
        console.log('🔍 [DEBUG] Attempting OpenAI API call with COMPREHENSIVE prompting (Anthropic not available)...');
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 2000,
          messages: [
            { role: 'user', content: enhancedPrompt }
          ]
        });
        raw = resp.choices?.[0]?.message?.content || '';
        console.log('🔍 [DEBUG] OpenAI API successful, response length:', raw.length);
      } catch (openaiError) {
        console.log('🔍 [DEBUG] OpenAI API failed:', openaiError.message);
        lastError = openaiError;
      }
    }
    
    if (!raw) {
      if (lastError) {
        console.error('🔍 [DEBUG] All AI services failed, throwing last error');
        throw lastError;
      } else {
        console.log('🔍 [DEBUG] No AI clients available, returning empty array');
        return [];
      }
    }

    console.log('🔍 [DEBUG] Processing COMPREHENSIVE AI response...');
    console.log('🔍 [DEBUG] Raw response length:', raw.length);
    console.log('🔍 [DEBUG] Raw response preview:', raw.substring(0, 200) + '...');

    const json = this.extractStructuredJson(raw);
    if (!json) {
      console.log('⚠️ JSON parsing failed: Response is not valid JSON format, attempting recovery...');

      // Attempt basic repair for common issues
      let repairedRaw = raw;

      // Fix common trailing comma issues
      repairedRaw = repairedRaw.replace(/,(\s*[}\]])/g, '$1');

      // Try one more time with repaired JSON
      const repairedJson = this.extractStructuredJson(repairedRaw);
      if (!repairedJson) {
        console.log('⚠️ JSON recovery failed: Could not repair response format');
        return [];
      }

      console.log('✅ JSON recovery successful');
      return this.processJsonResponse(repairedJson);
    }

    return this.processJsonResponse(json);
  }

  processJsonResponse(json) {
    // Handle the new structured format from comprehensive AI
    let itemsArray = [];
    if (json.type === 'grocery_list' && json.items) {
      itemsArray = json.items;
      console.log('🔍 [DEBUG] Extracted', itemsArray.length, 'items from structured grocery_list response');
    } else if (Array.isArray(json)) {
      // Fallback for simple array format
      itemsArray = json;
      console.log('🔍 [DEBUG] Using fallback array format with', itemsArray.length, 'items');
    } else {
      console.log('🔍 [DEBUG] Unexpected JSON structure:', Object.keys(json));
      return [];
    }

    const processed = itemsArray
      .map(obj => this.normalizeAIProduct(obj))
      .filter(Boolean)
      .map(p => ({ ...p, confidence: Math.min(0.95, (p.confidence || 0.8)) }));

    console.log('🔍 [DEBUG] Successfully processed', processed.length, 'products from COMPREHENSIVE AI');
    return processed;
  }

  extractStructuredJson(text) {
    // Strip code fences and markdown artifacts
    let cleanText = text.replace(/```json\s*\n?/gi, '')
                        .replace(/```\s*\n?/gi, '')
                        .replace(/^\s*json\s*\n?/gi, '')
                        .trim();

    // Try to parse as direct JSON object
    try {
      const direct = JSON.parse(cleanText);
      if (direct && typeof direct === 'object') return direct;
    } catch (_) {}

    // Attempt to find structured JSON object with better regex
    const objectMatch = cleanText.match(/\{\s*"type"\s*:\s*"[^"]*"[\s\S]*\}/);
    if (objectMatch) {
      try {
        console.log('🔍 [DEBUG] Attempting to parse structured JSON object...');
        return JSON.parse(objectMatch[0]);
      } catch (e) {
        console.log('⚠️ JSON parsing failed: Structured object parse error -', e.message);
      }
    }

    // Fallback: try to find any JSON object with balanced braces
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < cleanText.length; i++) {
      if (cleanText[i] === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (cleanText[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      try {
        const jsonCandidate = cleanText.substring(startIndex, endIndex + 1);
        console.log('🔍 [DEBUG] Attempting to parse balanced JSON object...');
        return JSON.parse(jsonCandidate);
      } catch (e) {
        console.log('⚠️ JSON parsing failed: Balanced object parse error -', e.message);
      }
    }

    // Last resort: try to find JSON array for backward compatibility
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (_) {}
    }

    return null;
  }

  extractJsonArray(text) {
    // Deprecated - keeping for backward compatibility
    // Strip code fences and markdown artifacts
    let cleanText = text.replace(/```json\s*\n?/gi, '')
                        .replace(/```\s*\n?/gi, '')
                        .replace(/^\s*json\s*\n?/gi, '')
                        .trim();

    // If content is pure JSON
    try {
      const direct = JSON.parse(cleanText);
      if (Array.isArray(direct)) return direct;
    } catch (_) {}

    // Attempt to find first top-level JSON array
    const match = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (_) { return null; }
  }

  normalizeAIProduct(obj) {
    if (!obj || typeof obj !== 'object') return null;
    let { productName, name, quantity, unit, containerSize, category } = obj;

    // Handle both 'name' (new format) and 'productName' (legacy format)
    productName = productName || name;
    if (!productName || typeof productName !== 'string') return null;
    productName = productName.replace(/\s+/g, ' ').trim();
    quantity = (typeof quantity === 'number' && !Number.isNaN(quantity)) ? quantity : 1;
    unit = unit && typeof unit === 'string' ? unit.toLowerCase().trim() : 'each';
    containerSize = containerSize && String(containerSize).trim() || null;
    const allowedCats = new Set(['produce','meat','dairy','grains','frozen','canned','pantry','deli','snacks','other']);
    category = (typeof category === 'string' && allowedCats.has(category.toLowerCase())) ? category.toLowerCase() : 'other';
    return {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      original: productName,
      productName,
      quantity,
      unit,
      containerSize,
      category,
      isValid: true,
      needsReview: false,
      timestamp: new Date().toISOString(),
    };
  }

  mergeProducts(aiList, rbList) {
    const key = (p) => `${p.productName.toLowerCase()}|${p.unit}|${p.containerSize||''}`;
    const map = new Map();
    for (const p of aiList || []) {
      if (!p || !p.productName) continue;
      const k = key(p);
      map.set(k, p);
    }
    for (const p of rbList || []) {
      if (!p || !p.productName) continue;
      const k = key(p);
      if (!map.has(k)) {
        map.set(k, p);
      } else {
        // Optionally merge quantities if same product
        const existing = map.get(k);
        if (existing && typeof existing.quantity === 'number' && typeof p.quantity === 'number') {
          existing.quantity = existing.quantity + p.quantity;
        }
      }
    }
    // Return AI-processed products without manual validation
    return Array.from(map.values());
  }

  // AI ONLY MODE: No manual parsing methods
  
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
