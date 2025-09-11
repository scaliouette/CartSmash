// server/utils/simpleRecipeExtractor.js - Simple Recipe Extractor
class SimpleRecipeExtractor {
  constructor() {
    // Simple patterns for recipe detection
    this.recipeIndicators = [
      'recipe',
      'ingredients',
      'instructions',
      'directions',
      'method',
      'preparation'
    ];

    this.sectionHeaders = {
      ingredients: /^(ingredients?|what you need|grocery list|shopping list):\s*$/i,
      instructions: /^(instructions?|directions?|method|steps?|preparation):\s*$/i,
      title: /^(recipe|dish):\s*(.+)$/i
    };
  }

  /**
   * Extract recipes from text - simple approach
   * @param {string} text - Text to extract recipes from
   * @returns {Array} Array of recipe objects
   */
  extractRecipes(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const recipes = [];
    
    // Check if this looks like recipe content
    if (!this.looksLikeRecipe(text)) {
      return recipes;
    }

    // Try to extract structured recipes
    const structuredRecipes = this.extractStructuredRecipes(text);
    if (structuredRecipes.length > 0) {
      recipes.push(...structuredRecipes);
    } else {
      // Fallback: try to extract a single recipe from the whole text
      const singleRecipe = this.extractSingleRecipe(text);
      if (singleRecipe) {
        recipes.push(singleRecipe);
      }
    }

    return recipes;
  }

  /**
   * Check if text looks like it contains recipe content
   * @param {string} text - Text to check
   * @returns {boolean} True if text looks like recipe content
   */
  looksLikeRecipe(text) {
    const lowerText = text.toLowerCase();
    
    // Must contain at least 2 recipe-related keywords
    const indicators = this.recipeIndicators.filter(indicator => 
      lowerText.includes(indicator)
    );
    
    return indicators.length >= 2;
  }

  /**
   * Extract multiple structured recipes from text
   * @param {string} text - Text to extract from
   * @returns {Array} Array of recipe objects
   */
  extractStructuredRecipes(text) {
    const recipes = [];
    const lines = text.split('\n');
    
    let currentRecipe = null;
    let currentSection = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;

      // Check for recipe title (markdown headers or bold text)
      const titleMatch = this.extractRecipeTitle(trimmedLine);
      if (titleMatch) {
        // Save previous recipe if exists
        if (currentRecipe && this.isValidRecipe(currentRecipe)) {
          recipes.push(currentRecipe);
        }
        
        // Start new recipe
        currentRecipe = {
          name: titleMatch,
          ingredients: [],
          instructions: [],
          source: 'simple_extractor'
        };
        currentSection = null;
        continue;
      }

      // Check for section headers
      if (this.sectionHeaders.ingredients.test(trimmedLine)) {
        currentSection = 'ingredients';
        continue;
      }
      
      if (this.sectionHeaders.instructions.test(trimmedLine)) {
        currentSection = 'instructions';
        continue;
      }

      // Add content to current section
      if (currentRecipe && currentSection && trimmedLine) {
        const cleanedLine = this.cleanRecipeLine(trimmedLine);
        if (cleanedLine) {
          currentRecipe[currentSection].push(cleanedLine);
        }
      }
    }

    // Don't forget the last recipe
    if (currentRecipe && this.isValidRecipe(currentRecipe)) {
      recipes.push(currentRecipe);
    }

    return recipes;
  }

  /**
   * Extract a single recipe from unstructured text
   * @param {string} text - Text to extract from
   * @returns {Object|null} Recipe object or null
   */
  extractSingleRecipe(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 3) {
      return null; // Too short to be a meaningful recipe
    }

    // Try to find a title (first meaningful line that's not a list item)
    let title = 'Untitled Recipe';
    let contentStartIndex = 0;
    
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      if (line && !this.isListItem(line) && !this.isSectionHeader(line)) {
        title = this.cleanRecipeTitle(line);
        contentStartIndex = i + 1;
        break;
      }
    }

    const ingredients = [];
    const instructions = [];
    
    // Simple heuristic: lines that look like list items are probably ingredients/instructions
    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cleanedLine = this.cleanRecipeLine(line);
      if (!cleanedLine) continue;
      
      if (this.looksLikeIngredient(cleanedLine)) {
        ingredients.push(cleanedLine);
      } else if (this.looksLikeInstruction(cleanedLine)) {
        instructions.push(cleanedLine);
      }
    }

    const recipe = {
      name: title,
      ingredients: ingredients,
      instructions: instructions,
      source: 'simple_extractor'
    };

    return this.isValidRecipe(recipe) ? recipe : null;
  }

  /**
   * Extract recipe title from line
   * @param {string} line - Line to check
   * @returns {string|null} Recipe title or null
   */
  extractRecipeTitle(line) {
    // Markdown headers
    const headerMatch = line.match(/^#{1,6}\s*(.+)$/);
    if (headerMatch) {
      return this.cleanRecipeTitle(headerMatch[1]);
    }

    // Bold markdown
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return this.cleanRecipeTitle(boldMatch[1]);
    }

    // "Recipe:" prefix
    const recipeMatch = line.match(/^recipe:\s*(.+)$/i);
    if (recipeMatch) {
      return this.cleanRecipeTitle(recipeMatch[1]);
    }

    return null;
  }

  /**
   * Clean recipe title
   * @param {string} title - Raw title
   * @returns {string} Cleaned title
   */
  cleanRecipeTitle(title) {
    return title
      .replace(/^(recipe|dish):\s*/i, '')
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .trim();
  }

  /**
   * Clean recipe line (remove bullets, numbers, etc.)
   * @param {string} line - Line to clean
   * @returns {string} Cleaned line
   */
  cleanRecipeLine(line) {
    return line
      .replace(/^[\-\*\u2022\u2023\u25AA\u25CF\u25E6]\s*/, '') // Remove bullets
      .replace(/^\d+[\.)]\s*/, '') // Remove numbers
      .trim();
  }

  /**
   * Check if line is a list item
   * @param {string} line - Line to check
   * @returns {boolean} True if line is a list item
   */
  isListItem(line) {
    return /^[\-\*\u2022\u2023\u25AA\u25CF\u25E6]/.test(line) || /^\d+[\.)]/.test(line);
  }

  /**
   * Check if line is a section header
   * @param {string} line - Line to check
   * @returns {boolean} True if line is a section header
   */
  isSectionHeader(line) {
    return Object.values(this.sectionHeaders).some(pattern => pattern.test(line));
  }

  /**
   * Check if line looks like an ingredient
   * @param {string} line - Line to check
   * @returns {boolean} True if line looks like an ingredient
   */
  looksLikeIngredient(line) {
    const lowerLine = line.toLowerCase();
    
    // Has quantity indicators
    if (/\b\d+(\.\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|grams?|ml|liters?)\b/.test(lowerLine)) {
      return true;
    }
    
    // Has common ingredient words
    const ingredientWords = [
      'chicken', 'beef', 'pork', 'fish', 'egg', 'milk', 'cheese', 'butter',
      'onion', 'garlic', 'tomato', 'pepper', 'salt', 'oil', 'flour', 'sugar'
    ];
    
    return ingredientWords.some(word => lowerLine.includes(word));
  }

  /**
   * Check if line looks like an instruction
   * @param {string} line - Line to check
   * @returns {boolean} True if line looks like an instruction
   */
  looksLikeInstruction(line) {
    const lowerLine = line.toLowerCase();
    
    // Has cooking action words
    const actionWords = [
      'heat', 'cook', 'bake', 'fry', 'boil', 'simmer', 'add', 'mix', 'stir',
      'combine', 'season', 'serve', 'garnish', 'preheat', 'chop', 'dice'
    ];
    
    return actionWords.some(word => lowerLine.includes(word));
  }

  /**
   * Check if recipe object is valid
   * @param {Object} recipe - Recipe to validate
   * @returns {boolean} True if recipe is valid
   */
  isValidRecipe(recipe) {
    return recipe &&
           recipe.name &&
           recipe.name.length > 0 &&
           (recipe.ingredients.length > 0 || recipe.instructions.length > 0);
  }

  /**
   * Get simple recipe stats
   * @param {Array} recipes - Array of recipes
   * @returns {Object} Recipe statistics
   */
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

module.exports = SimpleRecipeExtractor;