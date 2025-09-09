// server/services/recipeImportService.js
// Unified service for importing recipes from URLs and AI

const { extractRecipe } = require('../utils/recipeScraper');

class RecipeImportService {
  constructor() {
    this.recipeIdCounter = 2000; // URL recipes start at 2000
    this.mealTypeIcons = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snack: '🍎',
      dessert: '🍰',
      default: '🍴'
    };
  }

  /**
   * Import recipe from URL and convert to standard format
   */
  async importFromUrl(url, options = {}) {
    try {
      // Scrape recipe using existing scraper
      const scrapedData = await extractRecipe(url);
      
      // Convert to unified format matching AI recipes
      const recipe = await this.convertToUnifiedFormat(scrapedData, url, options);
      
      return {
        success: true,
        recipe
      };
    } catch (error) {
      console.error('Error importing recipe from URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert scraped recipe to unified format matching AI meal plan recipes
   */
  async convertToUnifiedFormat(scrapedData, sourceUrl, options = {}) {
    const recipeId = options.id || `url-recipe-${this.recipeIdCounter++}`;
    
    // Parse ingredients with structured data
    const parsedIngredients = await this.parseIngredientsStructured(scrapedData.ingredients);
    
    // Detect meal type from title or time of day
    const mealType = this.detectMealType(scrapedData.title, options.mealType);
    
    // Generate tags based on recipe characteristics
    const tags = this.generateTags(scrapedData, parsedIngredients);
    
    // Calculate nutrition if not provided
    const nutrition = await this.enhanceNutrition(scrapedData.nutrition_per_serving, parsedIngredients);
    
    return {
      id: recipeId,
      title: scrapedData.title || 'Untitled Recipe',
      description: scrapedData.description || `Imported from ${new URL(sourceUrl).hostname}`,
      servings: this.parseServings(scrapedData.yields) || 4,
      prepTime: this.parseTimeMinutes(scrapedData.prepTime) || 0,
      cookTime: this.parseTimeMinutes(scrapedData.cookTime) || 0,
      totalTime: this.parseTimeMinutes(scrapedData.totalTime) || 
                 (this.parseTimeMinutes(scrapedData.prepTime) || 0) + (this.parseTimeMinutes(scrapedData.cookTime) || 0),
      difficulty: this.calculateDifficulty(scrapedData),
      ingredients: parsedIngredients,
      instructions: this.formatInstructions(scrapedData.steps),
      nutrition: {
        calories: nutrition.calories_kcal || 0,
        protein: nutrition.protein_g || 0,
        carbs: nutrition.carbohydrates_g || 0,
        fat: nutrition.fat_g || 0,
        saturatedFat: nutrition.saturated_fat_g || 0,
        cholesterol: nutrition.cholesterol_mg || 0,
        sodium: nutrition.sodium_mg || 0,
        sugar: nutrition.sugar_g || 0,
        fiber: nutrition.fiber_g || 0
      },
      tags: tags,
      imageUrl: scrapedData.image || '/images/recipes/default.jpg',
      sourceUrl: sourceUrl,
      source: 'url-import',
      notes: scrapedData.notes || [],
      rating: 0,
      isFavorite: false,
      mealType: mealType,
      icon: this.mealTypeIcons[mealType] || this.mealTypeIcons.default,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      importedFrom: {
        url: sourceUrl,
        site: new URL(sourceUrl).hostname,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Parse ingredients to structured format (without AI to preserve existing parsing)
   */
  async parseIngredientsStructured(rawIngredients) {
    const parsed = [];
    
    for (const ingredient of rawIngredients) {
      if (typeof ingredient === 'string') {
        parsed.push(this.basicIngredientParse(ingredient));
      } else if (ingredient.raw) {
        parsed.push(this.basicIngredientParse(ingredient.raw));
      }
    }
    
    return parsed;
  }

  /**
   * Basic ingredient parsing without AI
   */
  basicIngredientParse(ingredientLine) {
    const quantityMatch = ingredientLine.match(/^([\d.\/]+)\s*(cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l)?\s+(.+)/i);
    
    if (quantityMatch) {
      return {
        quantity: this.parseQuantity(quantityMatch[1]),
        unit: quantityMatch[2] || 'unit',
        item: quantityMatch[3],
        original: ingredientLine
      };
    }
    
    return {
      quantity: 1,
      unit: 'as needed',
      item: ingredientLine,
      original: ingredientLine
    };
  }

  /**
   * Parse quantity strings including fractions
   */
  parseQuantity(quantityStr) {
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      return numerator / denominator;
    }
    return parseFloat(quantityStr) || 1;
  }

  /**
   * Detect meal type from recipe title and characteristics
   */
  detectMealType(title, suggestedType) {
    if (suggestedType) return suggestedType;
    
    const titleLower = title.toLowerCase();
    
    // Breakfast indicators
    if (titleLower.match(/pancake|waffle|oatmeal|eggs|scramble|omelet|breakfast|brunch|toast|cereal|smoothie bowl/)) {
      return 'breakfast';
    }
    
    // Lunch indicators
    if (titleLower.match(/sandwich|wrap|salad|soup|lunch/)) {
      return 'lunch';
    }
    
    // Dinner indicators
    if (titleLower.match(/dinner|roast|steak|pasta|curry|stir-fry|casserole/)) {
      return 'dinner';
    }
    
    // Snack indicators
    if (titleLower.match(/snack|bites|bars|chips|dip|nuts/)) {
      return 'snack';
    }
    
    // Dessert indicators
    if (titleLower.match(/cake|cookie|pie|dessert|sweet|chocolate|ice cream/)) {
      return 'dessert';
    }
    
    return 'dinner'; // Default to dinner
  }

  /**
   * Generate tags based on recipe characteristics
   */
  generateTags(scrapedData, ingredients) {
    const tags = [];
    
    // Time-based tags
    const totalTime = scrapedData.time?.total_min || 0;
    if (totalTime > 0 && totalTime <= 15) tags.push('Quick');
    if (totalTime > 0 && totalTime <= 30) tags.push('30-Minutes');
    if (scrapedData.time?.cook_min === 0) tags.push('No-Cook');
    
    // Ingredient-based tags
    const ingredientText = ingredients.map(i => i.item).join(' ').toLowerCase();
    
    if (!ingredientText.match(/meat|chicken|beef|pork|fish|seafood|turkey/)) {
      tags.push('Vegetarian');
    }
    if (!ingredientText.match(/meat|chicken|beef|pork|fish|seafood|turkey|dairy|milk|cheese|egg|butter/)) {
      tags.push('Vegan');
    }
    if (!ingredientText.match(/wheat|flour|bread|pasta/)) {
      tags.push('Gluten-Free');
    }
    
    // Method-based tags
    const instructions = (scrapedData.steps || []).map(s => s.instruction).join(' ').toLowerCase();
    if (instructions.match(/slow cooker|crock pot/)) tags.push('Slow-Cooker');
    if (instructions.match(/instant pot|pressure cook/)) tags.push('Instant-Pot');
    if (instructions.match(/grill/)) tags.push('Grilled');
    if (instructions.match(/bake|oven/)) tags.push('Baked');
    
    // Nutrition-based tags
    const nutrition = scrapedData.nutrition_per_serving || {};
    if (nutrition.calories_kcal && nutrition.calories_kcal < 300) tags.push('Low-Calorie');
    if (nutrition.protein_g && nutrition.protein_g > 20) tags.push('High-Protein');
    
    return tags;
  }

  /**
   * Calculate recipe difficulty
   */
  calculateDifficulty(scrapedData) {
    const totalTime = scrapedData.time?.total_min || 0;
    const stepCount = scrapedData.steps?.length || 0;
    const ingredientCount = scrapedData.ingredients?.length || 0;
    
    if (totalTime <= 20 && stepCount <= 5 && ingredientCount <= 8) return 'easy';
    if (totalTime <= 45 && stepCount <= 10 && ingredientCount <= 12) return 'medium';
    return 'hard';
  }

  /**
   * Format instructions for display
   */
  formatInstructions(steps) {
    if (!steps || !Array.isArray(steps)) return [];
    
    return steps.map((step, index) => ({
      step: typeof step === 'object' ? (step.number || index + 1) : index + 1,
      instruction: typeof step === 'string' ? step : (step.instruction || ''),
      time: null // Could be enhanced with AI to extract time from instruction text
    }));
  }

  /**
   * Enhance nutrition data with estimates if needed
   */
  async enhanceNutrition(existingNutrition, ingredients) {
    if (existingNutrition && existingNutrition.calories_kcal) {
      return existingNutrition;
    }
    
    // If no nutrition data, return basic estimates
    return {
      calories_kcal: 350, // Default estimate
      protein_g: 15,
      carbohydrates_g: 45,
      fat_g: 12,
      saturated_fat_g: 4,
      cholesterol_mg: 30,
      sodium_mg: 400,
      sugar_g: 8,
      fiber_g: 5
    };
  }

  /**
   * Parse servings from yields string (e.g., "24 cookies" -> 24)
   */
  parseServings(yieldsStr) {
    if (!yieldsStr) return null;
    const match = String(yieldsStr).match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  /**
   * Parse time strings to minutes (e.g., "1 hr 30 min" -> 90)
   */
  parseTimeMinutes(timeStr) {
    if (!timeStr) return null;
    
    // If it's already a number, return it
    if (typeof timeStr === 'number') return timeStr;
    
    const str = String(timeStr).toLowerCase();
    let totalMinutes = 0;
    
    // Extract hours
    const hourMatch = str.match(/(\d+)\s*(?:hr|hour|hours)/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    
    // Extract minutes
    const minMatch = str.match(/(\d+)\s*(?:min|minute|minutes)/);
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1]);
    }
    
    // If no time units found, try to extract just a number (assume minutes)
    if (totalMinutes === 0) {
      const numberMatch = str.match(/(\d+)/);
      if (numberMatch) {
        totalMinutes = parseInt(numberMatch[1]);
      }
    }
    
    return totalMinutes || null;
  }
}

module.exports = RecipeImportService;