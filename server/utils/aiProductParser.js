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
    console.log('🔍 [DEBUG] aiExtractProducts() starting...');
    
    const sysPrompt = `You convert meal plans and shopping lists into a clean JSON array of grocery products.
Rules:
- Only output JSON. No prose. No markdown. No trailing commas.
- One object per product with fields: productName (string), quantity (number), unit (string or null), containerSize (string or null), category (produce|meat|dairy|grains|frozen|canned|pantry|deli|snacks|other).
- CRITICAL: Preserve exact quantities from the input. If recipe says "8 eggs", output quantity=8, unit="each", NOT quantity=4, unit="dozen".
- Normalize units (lb, oz, can, jar, bottle, box, bag, container, dozen, each) but preserve the original quantity scale.
- Remove bullets (*), asterisks, numbers, and list markers from the beginning of lines. Clean "• 1 2 lbs chicken breast" to extract quantity=2, unit="lbs", productName="chicken breast".
- Remove headings, recipes, instructions. Ignore lines like Breakfast/Lunch/Dinner.
- Parse grouped sections (Produce:, Proteins & Dairy:, Grains & Bakery:, Pantry:).
- If quantity missing, set quantity=1 and unit='each'.
- Keep productName concise (e.g., "boneless skinless chicken breast").
- DO NOT convert units automatically (e.g., don't convert 8 eggs to dozens unless explicitly stated as dozens in the source).`;

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

    // Try Anthropic first, then OpenAI fallback
    let raw;
    let lastError;
    
    if (anthropic) {
      try {
        console.log('🔍 [DEBUG] Attempting Anthropic API call...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1200,
          temperature: 0,
          system: sysPrompt,
          messages: [
            { role: 'user', content: userPrompt }
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
            console.log('🔍 [DEBUG] Falling back to OpenAI API...');
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
            console.log('🔍 [DEBUG] OpenAI fallback successful, response length:', raw.length);
          } catch (openaiError) {
            console.log('🔍 [DEBUG] OpenAI fallback also failed:', openaiError.message);
            lastError = openaiError;
          }
        }
      }
    } else if (openai) {
      try {
        console.log('🔍 [DEBUG] Attempting OpenAI API call (Anthropic not available)...');
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
