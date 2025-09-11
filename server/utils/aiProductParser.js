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
      // EMERGENCY FALLBACK: Use basic parsing when AI APIs are invalid/unavailable
      console.error('🔍 [DEBUG] AI extraction failed in aiProductParser, error:', error.message);
      console.error('🔍 [DEBUG] Error type:', typeof error);
      console.error('🔍 [DEBUG] Activating emergency fallback...');
      
      try {
        const emergencyProducts = this.emergencyBasicParsing(textToParse);
        console.log('🔍 [DEBUG] Emergency parsing successful, got', emergencyProducts.length, 'products');
        
        return {
          products: emergencyProducts,
          totalCandidates: emergencyProducts.length,
          validProducts: emergencyProducts.length,
          averageConfidence: 0.6, // Lower confidence for basic parsing
          meta: { 
            aiTried: true, 
            aiUsed: false, 
            emergencyMode: true,
            errorMessage: error.message,
            emergencySuccess: true
          }
        };
      } catch (emergencyError) {
        console.error('🔍 [DEBUG] Emergency parsing also failed!', emergencyError.message);
        throw new Error(`AI and emergency parsing both failed. AI: ${error.message}, Emergency: ${emergencyError.message}`);
      }
    }
  }

  // Use Anthropic/OpenAI to extract a structured grocery list
  async aiExtractProducts(text, options = {}) {
    console.log('🔍 [DEBUG] aiExtractProducts() starting...');
    
    const sysPrompt = `You convert meal plans and shopping lists into a clean JSON array of grocery products.
Rules:
- Only output JSON. No prose. No markdown. No trailing commas.
- One object per product with fields: productName (string), quantity (number), unit (string or null), containerSize (string or null), category (produce|meat|dairy|grains|frozen|canned|pantry|deli|snacks|other).
- Normalize units (lb, oz, can, jar, bottle, box, bag, container, dozen, each).
- Remove bullets, headings, recipes, instructions. Ignore lines like Breakfast/Lunch/Dinner.
- Parse grouped sections (Produce:, Proteins & Dairy:, Grains & Bakery:, Pantry:).
- If quantity missing, set quantity=1 and unit='each'.
- Keep productName concise (e.g., "boneless skinless chicken breast").`;

    const userPrompt = `Extract grocery products from this text and return JSON array only.\n\n${text}`;

    // Resolve AI clients dynamically at call time (not construction time)
    const anthropic = global.anthropic || this.ai.anthropic;
    const openai = global.openai || this.ai.openai;
    
    console.log('🔍 [DEBUG] AI clients available:', {
      anthropic: !!anthropic,
      openai: !!openai,
      globalAnthropic: !!global.anthropic,
      globalOpenai: !!global.openai
    });

    // Call Anthropic first if available, else OpenAI
    let raw;
    try {
      if (anthropic) {
        console.log('🔍 [DEBUG] Attempting Anthropic API call...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1200,
          temperature: 0,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.content?.[0]?.text || '';
        console.log('🔍 [DEBUG] Anthropic API successful, response length:', raw.length);
      } else if (openai) {
        console.log('🔍 [DEBUG] Attempting OpenAI API call...');
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.choices?.[0]?.message?.content || '';
        console.log('🔍 [DEBUG] OpenAI API successful, response length:', raw.length);
      } else {
        console.log('🔍 [DEBUG] No AI clients available, returning empty array');
        return [];
      }
    } catch (apiError) {
      console.error('🔍 [DEBUG] API call failed:', apiError.message);
      console.error('🔍 [DEBUG] API error details:', JSON.stringify(apiError, null, 2));
      throw apiError;  // Re-throw to trigger emergency fallback
    }

    console.log('🔍 [DEBUG] Processing AI response...');
    const json = this.extractJsonArray(raw);
    if (!json) {
      console.log('🔍 [DEBUG] Failed to extract JSON from response');
      return [];
    }
    
    const processed = json
      .map(obj => this.normalizeAIProduct(obj))
      .filter(Boolean)
      .map(p => ({ ...p, confidence: Math.min(0.95, (p.confidence || 0.8)) }));
      
    console.log('🔍 [DEBUG] Successfully processed', processed.length, 'products from AI');
    return processed;
  }

  extractJsonArray(text) {
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
    let { productName, quantity, unit, containerSize, category } = obj;
    if (!productName || typeof productName !== 'string') return null;
    productName = productName.replace(/\s+/g, ' ').trim();
    quantity = (typeof quantity === 'number' && !Number.isNaN(quantity)) ? quantity : 1;
    unit = unit && typeof unit === 'string' ? this.normalizeUnit(unit) : 'each';
    containerSize = containerSize && String(containerSize).trim() || null;
    const allowedCats = new Set(['produce','meat','dairy','grains','frozen','canned','pantry','deli','snacks','other']);
    category = (typeof category === 'string' && allowedCats.has(category.toLowerCase())) ? category.toLowerCase() : this.categorizeProduct(productName);
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
    // Post-validate with manual rules for confidence
    return Array.from(map.values()).map(p => {
      const conf = this.calculateConfidence(p.productName, p.quantity, p.unit);
      return { ...p, confidence: Math.max(p.confidence || 0, conf) };
    });
  }

  // Parse fractions including mixed numbers (1 1/2), simple fractions (1/2), and Unicode fractions (½)
  parseFraction(str) {
    // Handle Unicode fractions
    const unicodeFractions = {
      '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
      '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.167,
      '⅚': 0.833, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    };
    
    if (unicodeFractions[str]) return unicodeFractions[str];
    
    // Handle mixed numbers like "1 1/2"
    const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseFloat(mixedMatch[1]);
      const numerator = parseFloat(mixedMatch[2]);
      const denominator = parseFloat(mixedMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fractions like "1/2"
    const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseFloat(fractionMatch[1]);
      const denominator = parseFloat(fractionMatch[2]);
      return numerator / denominator;
    }
    
    // Handle regular decimals or integers
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  parseLine(line, context = {}) {
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
    let quantityRange = null;

    // Handle ranged quantities like "4-6 chicken breasts" or "4 to 6 ..."
    const rangeMatch = cleaned.match(/^(\d+)\s*(?:-|\s*to\s*)\s*(\d+)\s+(.+)$/i);
    if (rangeMatch) {
      const minQ = parseInt(rangeMatch[1], 10);
      const maxQ = parseInt(rangeMatch[2], 10);
      if (!Number.isNaN(minQ) && !Number.isNaN(maxQ)) {
        quantity = minQ;
        unit = 'each';
        productName = rangeMatch[3];
        quantityRange = { min: minQ, max: maxQ };
      }
    }

    // Enhanced patterns to support fractions, mixed numbers, and Unicode fractions
    const containerPattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s+(bag|bags|container|containers|jar|jars|can|cans|bottle|bottles|box|boxes|package|packages)\s*\(([^)]+)\)\s+(.+)$/i;
    const containerMatch = cleaned.match(containerPattern);
    if (!quantityRange && containerMatch) {
      const parsedQty = this.parseFraction(containerMatch[1]);
      quantity = parsedQty !== null ? parsedQty : 1;
      unit = this.normalizeUnit(containerMatch[2]);
      containerSize = containerMatch[3];
      productName = containerMatch[4];
    } else if (!quantityRange) {
      const sizePattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s+(\w+)\s*\(([^)]+)\)\s+(.+)$/i;
      const sizeMatch = cleaned.match(sizePattern);
      if (sizeMatch) {
        const parsedQty = this.parseFraction(sizeMatch[1]);
        quantity = parsedQty !== null ? parsedQty : 1;
        const possibleUnit = sizeMatch[2];
        containerSize = sizeMatch[3];
        productName = sizeMatch[4];
        if (this.isValidUnit(possibleUnit)) {
          unit = this.normalizeUnit(possibleUnit);
        } else {
          productName = possibleUnit + ' ' + productName;
        }
      } else {
        const simplePattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s+([a-zA-Z]+)\s+(.+)$/;
        const simpleMatch = cleaned.match(simplePattern);
        if (simpleMatch) {
          const parsedQty = this.parseFraction(simpleMatch[1]);
          quantity = parsedQty !== null ? parsedQty : 1;
          const possibleUnit = simpleMatch[2];
          if (this.isValidUnit(possibleUnit)) {
            unit = this.normalizeUnit(possibleUnit);
            productName = simpleMatch[3];
          } else {
            productName = possibleUnit + ' ' + simpleMatch[3];
          }
        } else {
          const numberPattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/;
          const numberMatch = cleaned.match(numberPattern);
          if (numberMatch) {
            const parsedQty = this.parseFraction(numberMatch[1]);
            quantity = parsedQty !== null ? parsedQty : 1;
            productName = numberMatch[2];
          }
        }
      }
    }

    productName = productName.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    if (!productName || productName.length < 2) return null;

    const category = this.categorizeProduct(productName);
    const confidence = this.calculateConfidence(productName, quantity, unit, context);
    return {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      original: line,
      productName,
      quantity,
      unit,
      containerSize,
      ...(quantityRange ? { quantityRange } : {}),
      category,
      confidence,
      needsReview: confidence < 0.7,
      isValid: true,
      timestamp: new Date().toISOString(),
      section: context.section
    };
  }

  isExcludedLine(line) {
    for (const pattern of this.excludePatterns) {
      if (pattern.test(line)) return true;
    }
    const lower = line.toLowerCase();
    
    // Exclude markdown headers and section titles like "For the Chicken"
    if (/^#{1,6}\s/.test(line)) return true;
    if (/^for the\b/.test(lower)) return true;
    
    // Exclude section headers with asterisks or colons
    if (/^\*+.*\*+$/.test(line)) return true; // *GROCERY SHOPPING LIST:*, *Proteins:*, etc.
    if (/^\*+[^*]*:?\*+$/.test(line)) return true; // Any text wrapped in asterisks
    
    // Standard section headers
    if (['proteins:', 'produce:', 'dairy:', 'pantry:', 'pantry/other:', 'beverages:', 'grains & bakery:', 'pantry items:', 'fresh produce:'].includes(lower)) return true;
    
    // Headers without colons but clearly section names
    if (['grocery shopping list', 'proteins', 'fresh produce', 'pantry items', 'dairy', 'grains & bakery'].includes(lower)) return true;
    
    // Food category descriptions
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
    
    // Use comprehensive unit normalization mapping
    const normalizedUnit = this.unitNormalization[lower] || 
                          this.unitNormalization[singular] || 
                          singular || 
                          lower;
    
    return normalizedUnit;
  }

  categorizeProduct(productName) {
    const lower = productName.toLowerCase();
    if (lower.match(/cheese|ricotta|mozzarella|parmesan|milk|yogurt|cream|butter/)) return 'dairy';
    if (lower.match(/beef|chicken|pork|turkey|fish|salmon/)) return 'meat';
    if (lower.match(/spinach|mushroom|onion|garlic|tomato|pepper|lettuce|carrot|banana|apple|orange/)) return 'produce';
    if (lower.match(/sauce|pasta|rice|oil|olive oil|vinegar|powder|foil|bread|flour|sugar|salt|sea salt|stock|broth|spice|seasoning/)) return 'pantry';
    if (lower.match(/edamame|peas|mixed vegetables/)) return 'frozen';
    if (lower.match(/turkey slices|ham|bacon/)) return 'deli';
    if (lower.includes('egg')) return 'dairy';
    return 'other';
  }

  calculateConfidence(productName, quantity, unit, context = {}) {
    let confidence = 0.5;
    if (quantity && quantity !== 1) confidence += 0.2;
    if (unit && unit !== 'each') confidence += 0.2;
    const allProducts = Object.values(this.productPatterns).flat();
    if (allProducts.some(product => productName.toLowerCase().includes(product))) confidence += 0.2;
    if (productName.length >= 3 && productName.length <= 50) confidence += 0.1;
    
    // Boost confidence for items under section headers
    if (context.section) {
      confidence += 0.15; // Base boost for being under any section
      
      // Additional boost if the section matches the categorized product
      const category = this.categorizeProduct(productName);
      const sectionCategoryMap = {
        'produce': 'produce',
        'protein': 'meat', 'proteins': 'meat',
        'dairy': 'dairy',
        'meat': 'meat',
        'grain': 'pantry', 'grains': 'pantry',
        'bakery': 'pantry',
        'pantry': 'pantry',
        'frozen': 'frozen',
        'deli': 'deli',
        'beverage': 'other', 'beverages': 'other',
        'snack': 'other', 'snacks': 'other'
      };
      
      if (sectionCategoryMap[context.section] === category) {
        confidence += 0.1; // Additional boost for category match
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  emergencyBasicParsing(text) {
    console.log('🚨 EMERGENCY MODE: Basic parsing active - AI APIs unavailable');
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const products = [];
    
    for (const line of lines) {
      if (this.isExcludedLine(line)) continue;
      
      // Use existing parseLine method which has all the logic
      const parsed = this.parseLine(line, { section: 'emergency' });
      if (parsed) {
        // Lower confidence for emergency parsing
        parsed.confidence = Math.max(0.4, parsed.confidence - 0.2);
        parsed.emergencyParsed = true;
        products.push(parsed);
      }
    }
    
    console.log(`🔄 Emergency parsing extracted ${products.length} items`);
    return products;
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
