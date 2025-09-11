// AI-ONLY Shopping List Loader
// Handles shopping list parsing using only AI services - no manual regex patterns

class AIShoppingListLoader {
  constructor() {
    // Detect available AI clients
    this.ai = {
      anthropic: global.anthropic || null,
      openai: global.openai || null,
    };
  }

  async parseProducts(text) {
    // AI-ONLY PROCESSING - No manual fallback
    if (!this.ai.anthropic && !this.ai.openai) {
      throw new Error('AI services required - no AI clients available for shopping list loading');
    }

    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      console.log('🔍 [DEBUG] AI shopping list loading starting...');
      const products = await this.aiParseShoppingList(text);
      console.log('🔍 [DEBUG] AI shopping list loading successful, found', products.length, 'products');
      return products;
    } catch (error) {
      console.error('🔍 [DEBUG] AI shopping list loading failed:', error.message);
      throw error;
    }
  }

  async aiParseShoppingList(text) {
    const sysPrompt = `You parse shopping lists and grocery text into structured JSON format.
Rules:
- Only output JSON. No prose. No markdown. No trailing commas.
- Return an array of product objects.
- Each product object has fields: productName (string), quantity (string), unit (string), source (string).
- Extract product names, quantities, and units from list items.
- Clean bullets, numbers, and formatting from product lines.
- Handle "• 1 2 lbs chicken breast" → productName="chicken breast", quantity="2", unit="lbs"
- If no quantity detected, use quantity="1" and unit="each".
- Skip recipes, instructions, directions, prep time, cook time.
- Keep product names clean and concise.
- Remove descriptors like "boneless", "skinless", "fresh", "chopped".`;

    const userPrompt = `Parse this shopping list and return JSON array:\\n\\n${text}`;

    // Resolve AI clients dynamically
    const anthropic = global.anthropic || this.ai.anthropic;
    const openai = global.openai || this.ai.openai;

    let raw;
    try {
      if (anthropic) {
        console.log('🔍 [DEBUG] Using Anthropic for shopping list loading...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.content?.[0]?.text || '';
      } else if (openai) {
        console.log('🔍 [DEBUG] Using OpenAI for shopping list loading...');
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.choices?.[0]?.message?.content || '';
      } else {
        throw new Error('No AI clients available');
      }
    } catch (apiError) {
      console.error('🔍 [DEBUG] AI shopping list loading API failed:', apiError.message);
      throw apiError;
    }

    // Parse AI response
    const json = this.extractJSON(raw);
    if (!json) {
      console.log('🔍 [DEBUG] No valid JSON found in AI response');
      return [];
    }

    // Ensure array format and validate products
    const products = Array.isArray(json) ? json : [json];
    return products
      .filter(product => this.isValidProduct(product))
      .map(product => ({
        productName: product.productName || 'Unknown Item',
        quantity: product.quantity || '1',
        unit: product.unit || 'each',
        source: 'ai_shopping_loader',
        timestamp: new Date().toISOString()
      }));
  }

  extractJSON(text) {
    // Strip code fences and markdown
    let cleanText = text.replace(/```json\s*\n?/gi, '')
                        .replace(/```\s*\n?/gi, '')
                        .replace(/^\s*json\s*\n?/gi, '')
                        .trim();
    
    try {
      return JSON.parse(cleanText);
    } catch (_) {
      // Try to find JSON array
      const match = cleanText.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {}
      }
      return null;
    }
  }

  isValidProduct(product) {
    return product &&
           product.productName &&
           product.productName.length > 0;
  }

  // Keep utility methods for backward compatibility
  extractGrocerySection(text) {
    // AI will handle section detection, return original text
    return text;
  }

  validateProducts(products) {
    if (!Array.isArray(products)) {
      return [];
    }

    return products
      .filter(product => this.isValidProduct(product))
      .map(product => ({
        productName: product.productName || 'Unknown Item',
        quantity: product.quantity || '1',
        unit: product.unit || 'each',
        source: product.source || 'ai_shopping_loader',
        timestamp: product.timestamp || new Date().toISOString()
      }));
  }

  validateProduct(product) {
    if (!product || typeof product !== 'object') {
      return null;
    }

    if (!this.isValidProduct(product)) {
      return null;
    }

    return {
      productName: product.productName || 'Unknown Item',
      quantity: product.quantity || '1',
      unit: product.unit || 'each',
      source: product.source || 'ai_shopping_loader',
      timestamp: product.timestamp || new Date().toISOString()
    };
  }
}

module.exports = AIShoppingListLoader;