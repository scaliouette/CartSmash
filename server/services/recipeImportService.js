// server/services/recipeImportService.js
// Unified service for importing recipes from URLs and AI

const { scrapeToCartSmash } = require('../utils/recipeScraper');

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
      const scrapedData = await scrapeToCartSmash(url);
      
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
      servings: scrapedData.yield?.servings || 4,
      prepTime: scrapedData.time?.prep_min || 0,
      cookTime: scrapedData.time?.cook_min || 0,
      totalTime: scrapedData.time?.total_min || 
                 (scrapedData.time?.prep_min || 0) + (scrapedData.time?.cook_min || 0),
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
      if (ingredient.raw) {
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
    
    return steps.map(step => ({
      step: step.number || 1,
      instruction: step.instruction || '',
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
}

module.exports = RecipeImportService;