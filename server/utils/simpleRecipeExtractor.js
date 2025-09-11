// AI-ONLY Recipe Extractor
// Handles recipe extraction using only AI services - no manual regex patterns

class AIRecipeExtractor {
  constructor() {
    // Detect available AI clients
    this.ai = {
      anthropic: global.anthropic || null,
      openai: global.openai || null,
    };
  }

  async extractRecipes(text) {
    // AI-ONLY PROCESSING - No manual fallback
    if (!this.ai.anthropic && !this.ai.openai) {
      throw new Error('AI services required - no AI clients available for recipe extraction');
    }

    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      console.log('🔍 [DEBUG] AI recipe extraction starting...');
      const recipes = await this.aiExtractRecipes(text);
      console.log('🔍 [DEBUG] AI recipe extraction successful, found', recipes.length, 'recipes');
      return recipes;
    } catch (error) {
      console.error('🔍 [DEBUG] AI recipe extraction failed:', error.message);
      throw error;
    }
  }

  async aiExtractRecipes(text) {
    const sysPrompt = `You extract recipe information from text into structured JSON format.
Rules:
- Only output JSON. No prose. No markdown. No trailing commas.
- Return an array of recipe objects.
- Each recipe object has fields: name (string), ingredients (array of strings), instructions (array of strings), source (string).
- Extract recipe titles, ingredient lists, and cooking instructions.
- Clean bullets, numbers, and formatting from ingredients and instructions.
- If no clear recipes found, return empty array [].
- Separate multiple recipes if present.
- Keep ingredient and instruction text clean and concise.`;

    const userPrompt = `Extract recipes from this text and return JSON array:\n\n${text}`;

    // Resolve AI clients dynamically
    const anthropic = global.anthropic || this.ai.anthropic;
    const openai = global.openai || this.ai.openai;

    // Try Anthropic first, then OpenAI fallback for recipe extraction
    let raw;
    let lastError;
    
    if (anthropic) {
      try {
        console.log('🔍 [DEBUG] Using Anthropic for recipe extraction...');
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.content?.[0]?.text || '';
        console.log('🔍 [DEBUG] Anthropic recipe extraction successful');
      } catch (anthropicError) {
        console.log('🔍 [DEBUG] Anthropic recipe extraction failed:', anthropicError.message);
        lastError = anthropicError;
        
        // Try OpenAI fallback
        if (openai) {
          try {
            console.log('🔍 [DEBUG] Falling back to OpenAI for recipe extraction...');
            const resp = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0,
              max_tokens: 2000,
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            raw = resp.choices?.[0]?.message?.content || '';
            console.log('🔍 [DEBUG] OpenAI recipe extraction fallback successful');
          } catch (openaiError) {
            console.log('🔍 [DEBUG] OpenAI recipe extraction fallback also failed:', openaiError.message);
            lastError = openaiError;
          }
        }
      }
    } else if (openai) {
      try {
        console.log('🔍 [DEBUG] Using OpenAI for recipe extraction (Anthropic not available)...');
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        raw = resp.choices?.[0]?.message?.content || '';
        console.log('🔍 [DEBUG] OpenAI recipe extraction successful');
      } catch (openaiError) {
        console.log('🔍 [DEBUG] OpenAI recipe extraction failed:', openaiError.message);
        lastError = openaiError;
      }
    }
    
    if (!raw) {
      if (lastError) {
        console.error('🔍 [DEBUG] All AI services failed for recipe extraction');
        throw lastError;
      } else {
        throw new Error('No AI clients available for recipe extraction');
      }
    }

    // Parse AI response
    const json = this.extractJSON(raw);
    if (!json) {
      console.log('🔍 [DEBUG] No valid JSON found in AI response');
      return [];
    }

    // Ensure array format and validate recipes
    const recipes = Array.isArray(json) ? json : [json];
    return recipes
      .filter(recipe => this.isValidRecipe(recipe))
      .map(recipe => ({
        name: recipe.name || 'Untitled Recipe',
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        source: 'ai_extractor'
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

  isValidRecipe(recipe) {
    return recipe &&
           recipe.name &&
           recipe.name.length > 0 &&
           (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ||
            Array.isArray(recipe.instructions) && recipe.instructions.length > 0);
  }

  getStats(recipes) {
    if (!Array.isArray(recipes)) {
      return { count: 0, totalIngredients: 0, totalInstructions: 0 };
    }

    return {
      count: recipes.length,
      totalIngredients: recipes.reduce((sum, recipe) => sum + (recipe.ingredients?.length || 0), 0),
      totalInstructions: recipes.reduce((sum, recipe) => sum + (recipe.instructions?.length || 0), 0),
      averageIngredients: recipes.length > 0 ? 
        (recipes.reduce((sum, recipe) => sum + (recipe.ingredients?.length || 0), 0) / recipes.length).toFixed(1) : 0,
      averageInstructions: recipes.length > 0 ? 
        (recipes.reduce((sum, recipe) => sum + (recipe.instructions?.length || 0), 0) / recipes.length).toFixed(1) : 0
    };
  }
}

module.exports = AIRecipeExtractor;