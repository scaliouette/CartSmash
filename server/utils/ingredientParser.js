// AI-ONLY Ingredient Parser
// Handles ingredient parsing using only AI services - no manual regex patterns

class AIIngredientParser {
  constructor() {
    // Detect available AI clients
    this.ai = {
      anthropic: global.anthropic || null,
      openai: global.openai || null,
    };
  }

  async parseIngredientLine(line) {
    // AI-ONLY PROCESSING - No manual fallback
    if (!this.ai.anthropic && !this.ai.openai) {
      throw new Error('AI services required - no AI clients available for ingredient parsing');
    }

    try {
      console.log('🔍 [DEBUG] AI ingredient parsing:', line);
      const parsed = await this.aiParseIngredient(line);
      console.log('🔍 [DEBUG] AI ingredient parsing successful:', parsed);
      return parsed;
    } catch (error) {
      console.error('🔍 [DEBUG] AI ingredient parsing failed:', error.message);
      throw error;
    }
  }

  async aiParseIngredient(ingredientText) {
    const sysPrompt = `You parse ingredient lines into structured JSON format.
Rules:
- Only output JSON. No prose. No markdown. No trailing commas.
- One object with fields: qty (number), unit (string), name (string), sizeQty (number or null), sizeUnit (string or null), notes (string), original (string).
- Extract quantity, unit, and clean ingredient name.
- Handle fractions: "1 1/2 cups" → qty=1.5, unit="cup", name="flour"
- Handle embedded sizes: "24 oz jar marinara" → qty=1, unit="jar", name="marinara", sizeQty=24, sizeUnit="oz"
- Clean descriptors: remove "boneless", "skinless", "fresh", "chopped", etc.
- Normalize units: "cups" → "cup", "lbs" → "lb", "oz" → "ounce"
- If no unit detected, use "unit"`;

    const userPrompt = `Parse this ingredient: ${ingredientText}`;

    // Resolve AI clients dynamically
    const anthropic = global.anthropic || this.ai.anthropic;
    const openai = global.openai || this.ai.openai;

    // Try Anthropic first, then OpenAI fallback for ingredient parsing
    let raw;
    let lastError;
    
    if (anthropic) {
      try {
        console.log('🔍 [DEBUG] Using Anthropic for ingredient parsing...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          temperature: 0,
          system: sysPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.content?.[0]?.text || '';
        console.log('🔍 [DEBUG] Anthropic ingredient parsing successful');
      } catch (anthropicError) {
        console.log('🔍 [DEBUG] Anthropic ingredient parsing failed:', anthropicError.message);
        lastError = anthropicError;
        
        // Try OpenAI fallback
        if (openai) {
          try {
            console.log('🔍 [DEBUG] Falling back to OpenAI for ingredient parsing...');
            const resp = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0,
              max_tokens: 800,
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            raw = resp.choices?.[0]?.message?.content || '';
            console.log('🔍 [DEBUG] OpenAI ingredient parsing fallback successful');
          } catch (openaiError) {
            console.log('🔍 [DEBUG] OpenAI ingredient parsing fallback also failed:', openaiError.message);
            lastError = openaiError;
          }
        }
      }
    } else if (openai) {
      try {
        console.log('🔍 [DEBUG] Using OpenAI for ingredient parsing (Anthropic not available)...');
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 800,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.choices?.[0]?.message?.content || '';
        console.log('🔍 [DEBUG] OpenAI ingredient parsing successful');
      } catch (openaiError) {
        console.log('🔍 [DEBUG] OpenAI ingredient parsing failed:', openaiError.message);
        lastError = openaiError;
      }
    }
    
    if (!raw) {
      if (lastError) {
        console.error('🔍 [DEBUG] All AI services failed for ingredient parsing');
        throw lastError;
      } else {
        throw new Error('No AI clients available for ingredient parsing');
      }
    }

    // Parse AI response
    const json = this.extractJSON(raw);
    if (!json) {
      throw new Error('Failed to extract JSON from AI response');
    }

    // Ensure required fields and debug output
    const result = {
      qty: json.qty || 1,
      unit: json.unit || 'unit',
      name: json.name || ingredientText,
      sizeQty: json.sizeQty || null,
      sizeUnit: json.sizeUnit || null,
      notes: json.notes || '',
      original: ingredientText
    };
    
    console.log('🔍 [DEBUG] Ingredient parsing result:', {
      input: ingredientText,
      aiResponse: raw?.substring(0, 200),
      parsed: result
    });
    
    return result;
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
      // Try to find JSON object
      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {}
      }
      return null;
    }
  }

  buildSearchQuery(item) {
    const size = item.sizeQty ? ` ${item.sizeQty} ${item.sizeUnit || ""}` : "";
    return `${item.name}${size}`.trim();
  }

  // Keep clean utility for backward compatibility
  clean(s = "") {
    return s.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  }
}

// Create singleton instance
const aiIngredientParser = new AIIngredientParser();

// Export both class and convenience methods for backward compatibility
module.exports = {
  AIIngredientParser,
  parseIngredientLine: (line) => aiIngredientParser.parseIngredientLine(line),
  buildSearchQuery: (item) => aiIngredientParser.buildSearchQuery(item),
  clean: (s) => aiIngredientParser.clean(s)
};