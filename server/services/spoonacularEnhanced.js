// server/services/spoonacularEnhanced.js
// Enhanced Spoonacular API integration with recipes, meal planning, and advanced features

const axios = require('axios');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'spoonacular-enhanced' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SpoonacularEnhancedService {
  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY || '8d19259c6b764d38b6cc0b72396131ae';
    this.baseURL = 'https://api.spoonacular.com';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    if (!this.apiKey) {
      logger.warn('Spoonacular API key not configured');
    } else {
      logger.info('Spoonacular Enhanced service initialized');
    }
  }

  // ==================== RECIPE SEARCH FEATURES ====================

  // Search recipes with complex filters
  async searchRecipesComplex(params = {}) {
    const {
      query,
      cuisine,
      diet,
      excludeIngredients,
      intolerances,
      type, // main course, dessert, appetizer, etc.
      maxReadyTime,
      minCarbs,
      maxCarbs,
      minProtein,
      maxProtein,
      minCalories,
      maxCalories,
      minFat,
      maxFat,
      number = 10,
      offset = 0,
      addRecipeInformation = true,
      addRecipeNutrition = true
    } = params;

    try {
      const response = await axios.get(`${this.baseURL}/recipes/complexSearch`, {
        params: {
          apiKey: this.apiKey,
          query,
          cuisine,
          diet,
          excludeIngredients,
          intolerances,
          type,
          maxReadyTime,
          minCarbs,
          maxCarbs,
          minProtein,
          maxProtein,
          minCalories,
          maxCalories,
          minFat,
          maxFat,
          number,
          offset,
          addRecipeInformation,
          addRecipeNutrition
        }
      });

      return {
        recipes: response.data.results,
        totalResults: response.data.totalResults,
        offset: response.data.offset,
        number: response.data.number
      };
    } catch (error) {
      logger.error('Recipe complex search error:', error.message);
      return { recipes: [], totalResults: 0 };
    }
  }

  // Search recipes by ingredients (what's in your fridge)
  async searchRecipesByIngredients(ingredients, options = {}) {
    const {
      number = 10,
      ranking = 1, // 1 = maximize used ingredients, 2 = minimize missing ingredients
      ignorePantry = true
    } = options;

    try {
      const response = await axios.get(`${this.baseURL}/recipes/findByIngredients`, {
        params: {
          apiKey: this.apiKey,
          ingredients: Array.isArray(ingredients) ? ingredients.join(',') : ingredients,
          number,
          ranking,
          ignorePantry
        }
      });

      return response.data.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        imageType: recipe.imageType,
        usedIngredientCount: recipe.usedIngredientCount,
        missedIngredientCount: recipe.missedIngredientCount,
        usedIngredients: recipe.usedIngredients,
        missedIngredients: recipe.missedIngredients,
        unusedIngredients: recipe.unusedIngredients,
        likes: recipe.likes
      }));
    } catch (error) {
      logger.error('Search recipes by ingredients error:', error.message);
      return [];
    }
  }

  // Search recipes by nutrients
  async searchRecipesByNutrients(params = {}) {
    const {
      minCarbs,
      maxCarbs,
      minProtein,
      maxProtein,
      minCalories,
      maxCalories,
      minFat,
      maxFat,
      minSugar,
      maxSugar,
      minFiber,
      maxFiber,
      minSodium,
      maxSodium,
      number = 10,
      offset = 0
    } = params;

    try {
      const response = await axios.get(`${this.baseURL}/recipes/findByNutrients`, {
        params: {
          apiKey: this.apiKey,
          minCarbs,
          maxCarbs,
          minProtein,
          maxProtein,
          minCalories,
          maxCalories,
          minFat,
          maxFat,
          minSugar,
          maxSugar,
          minFiber,
          maxFiber,
          minSodium,
          maxSodium,
          number,
          offset
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Search recipes by nutrients error:', error.message);
      return [];
    }
  }

  // Get recipe information with nutrition
  async getRecipeInformation(recipeId, includeNutrition = true) {
    try {
      const response = await axios.get(`${this.baseURL}/recipes/${recipeId}/information`, {
        params: {
          apiKey: this.apiKey,
          includeNutrition
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get recipe ${recipeId}:`, error.message);
      return null;
    }
  }

  // ==================== RECIPE TO SHOPPING LIST ====================

  // Convert recipe to shopping list
  async recipeToShoppingList(recipeId, servings = 4) {
    try {
      const recipe = await this.getRecipeInformation(recipeId);
      if (!recipe) return null;

      const adjustedServings = servings / recipe.servings;

      const shoppingList = recipe.extendedIngredients.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        originalName: ingredient.originalName,
        amount: ingredient.amount * adjustedServings,
        unit: ingredient.unit,
        aisle: ingredient.aisle,
        image: ingredient.image,
        meta: ingredient.meta,
        measures: {
          us: {
            amount: ingredient.measures.us.amount * adjustedServings,
            unitShort: ingredient.measures.us.unitShort,
            unitLong: ingredient.measures.us.unitLong
          },
          metric: {
            amount: ingredient.measures.metric.amount * adjustedServings,
            unitShort: ingredient.measures.metric.unitShort,
            unitLong: ingredient.measures.metric.unitLong
          }
        },
        estimatedCost: this.estimateCost(ingredient)
      }));

      return {
        recipeId,
        recipeTitle: recipe.title,
        originalServings: recipe.servings,
        adjustedServings: servings,
        shoppingList
      };
    } catch (error) {
      logger.error('Recipe to shopping list error:', error.message);
      return null;
    }
  }

  // ==================== GROCERY PRODUCT FEATURES ====================

  // Search grocery products by UPC barcode
  async searchProductByUPC(upc) {
    if (!upc) return null;

    try {
      const response = await axios.get(`${this.baseURL}/food/products/upc/${upc}`, {
        params: { apiKey: this.apiKey }
      });

      return {
        id: response.data.id,
        title: response.data.title,
        brand: response.data.brand,
        upc: response.data.upc,
        image: response.data.image,
        images: response.data.images,
        description: response.data.description,
        price: response.data.price,
        nutrition: response.data.nutrition,
        badges: response.data.badges,
        breadcrumbs: response.data.breadcrumbs,
        aisle: response.data.aisle,
        servings: response.data.servings,
        ingredients: response.data.ingredients,
        generatedText: response.data.generatedText
      };
    } catch (error) {
      logger.error(`UPC search failed for ${upc}:`, error.message);
      return null;
    }
  }

  // ==================== CONVERSION UTILITIES ====================

  // Convert amounts between units
  async convertAmounts(params) {
    const {
      ingredientName,
      sourceAmount,
      sourceUnit,
      targetUnit
    } = params;

    try {
      const response = await axios.get(`${this.baseURL}/recipes/convert`, {
        params: {
          apiKey: this.apiKey,
          ingredientName,
          sourceAmount,
          sourceUnit,
          targetUnit
        }
      });

      return {
        sourceAmount: response.data.sourceAmount,
        sourceUnit: response.data.sourceUnit,
        targetAmount: response.data.targetAmount,
        targetUnit: response.data.targetUnit,
        answer: response.data.answer
      };
    } catch (error) {
      logger.error('Unit conversion error:', error.message);
      return null;
    }
  }

  // ==================== INGREDIENT PARSING ====================

  // Parse ingredients from natural language
  async parseIngredients(ingredientList, servings = 1, includeNutrition = true) {
    try {
      const response = await axios.post(
        `${this.baseURL}/recipes/parseIngredients`,
        null,
        {
          params: {
            apiKey: this.apiKey,
            ingredientList,
            servings,
            includeNutrition
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Parse ingredients error:', error.message);
      return [];
    }
  }

  // ==================== MEAL PLANNING ====================

  // Generate meal plan for a week
  async generateMealPlan(params = {}) {
    const {
      timeFrame = 'week', // day or week
      targetCalories = 2000,
      diet, // vegetarian, vegan, gluten free, etc.
      exclude
    } = params;

    try {
      const response = await axios.get(`${this.baseURL}/mealplanner/generate`, {
        params: {
          apiKey: this.apiKey,
          timeFrame,
          targetCalories,
          diet,
          exclude
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Generate meal plan error:', error.message);
      return null;
    }
  }

  // Get meal plan template
  async getMealPlanTemplate(username, hash) {
    try {
      const response = await axios.get(
        `${this.baseURL}/mealplanner/${username}/templates/${hash}`,
        {
          params: { apiKey: this.apiKey }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Get meal plan template error:', error.message);
      return null;
    }
  }

  // ==================== AUTOCOMPLETE FEATURES ====================

  // Autocomplete ingredient search
  async autocompleteIngredient(query, number = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/food/ingredients/autocomplete`, {
        params: {
          apiKey: this.apiKey,
          query,
          number
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Ingredient autocomplete error:', error.message);
      return [];
    }
  }

  // Autocomplete recipe search
  async autocompleteRecipe(query, number = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/recipes/autocomplete`, {
        params: {
          apiKey: this.apiKey,
          query,
          number
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Recipe autocomplete error:', error.message);
      return [];
    }
  }

  // ==================== SMART SHOPPING LIST ====================

  // Create smart shopping list from multiple recipes
  async createSmartShoppingList(recipeIds, servingsMap = {}) {
    try {
      const allIngredients = [];
      const recipeDetails = [];

      // Fetch all recipe ingredients
      for (const recipeId of recipeIds) {
        const servings = servingsMap[recipeId] || 4;
        const shoppingData = await this.recipeToShoppingList(recipeId, servings);

        if (shoppingData) {
          recipeDetails.push({
            id: recipeId,
            title: shoppingData.recipeTitle,
            servings: servings
          });

          allIngredients.push(...shoppingData.shoppingList);
        }
      }

      // Combine similar ingredients
      const combinedList = this.combineIngredients(allIngredients);

      // Organize by aisle
      const byAisle = this.organizeByAisle(combinedList);

      return {
        recipes: recipeDetails,
        totalItems: combinedList.length,
        shoppingList: combinedList,
        byAisle: byAisle,
        estimatedCost: this.calculateTotalCost(combinedList)
      };
    } catch (error) {
      logger.error('Create smart shopping list error:', error.message);
      return null;
    }
  }

  // ==================== HELPER METHODS ====================

  // Combine similar ingredients
  combineIngredients(ingredients) {
    const combined = new Map();

    ingredients.forEach(ingredient => {
      const key = `${ingredient.name}_${ingredient.unit}`;

      if (combined.has(key)) {
        const existing = combined.get(key);
        existing.amount += ingredient.amount;
        existing.estimatedCost += ingredient.estimatedCost || 0;
      } else {
        combined.set(key, { ...ingredient });
      }
    });

    return Array.from(combined.values());
  }

  // Organize ingredients by aisle
  organizeByAisle(ingredients) {
    const byAisle = {};

    ingredients.forEach(ingredient => {
      const aisle = ingredient.aisle || 'Other';

      if (!byAisle[aisle]) {
        byAisle[aisle] = [];
      }

      byAisle[aisle].push(ingredient);
    });

    // Sort aisles in shopping order
    const aisleOrder = [
      'Produce',
      'Dairy',
      'Meat',
      'Seafood',
      'Bakery',
      'Frozen',
      'Canned and Jarred',
      'Pasta and Rice',
      'Baking',
      'Spices and Seasonings',
      'Condiments',
      'Snacks',
      'Beverages',
      'Other'
    ];

    const sortedAisles = {};
    aisleOrder.forEach(aisle => {
      if (byAisle[aisle]) {
        sortedAisles[aisle] = byAisle[aisle];
      }
    });

    // Add any remaining aisles
    Object.keys(byAisle).forEach(aisle => {
      if (!sortedAisles[aisle]) {
        sortedAisles[aisle] = byAisle[aisle];
      }
    });

    return sortedAisles;
  }

  // Estimate cost for ingredient
  estimateCost(ingredient) {
    // Basic cost estimation based on ingredient type
    const costEstimates = {
      'Produce': 2.50,
      'Dairy': 3.00,
      'Meat': 8.00,
      'Seafood': 12.00,
      'Bakery': 2.00,
      'Spices and Seasonings': 3.50,
      'Canned and Jarred': 2.00
    };

    const aisle = ingredient.aisle || 'Other';
    return costEstimates[aisle] || 3.00;
  }

  // Calculate total estimated cost
  calculateTotalCost(ingredients) {
    return ingredients.reduce((total, item) => {
      return total + (item.estimatedCost || 0);
    }, 0);
  }

  // Get random recipes for inspiration
  async getRandomRecipes(params = {}) {
    const {
      limitLicense = true,
      tags, // vegetarian, dessert, etc.
      number = 5
    } = params;

    try {
      const response = await axios.get(`${this.baseURL}/recipes/random`, {
        params: {
          apiKey: this.apiKey,
          limitLicense,
          tags,
          number
        }
      });

      return response.data.recipes;
    } catch (error) {
      logger.error('Get random recipes error:', error.message);
      return [];
    }
  }

  // Search for similar recipes
  async getSimilarRecipes(recipeId, number = 5) {
    try {
      const response = await axios.get(`${this.baseURL}/recipes/${recipeId}/similar`, {
        params: {
          apiKey: this.apiKey,
          number
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Get similar recipes error:', error.message);
      return [];
    }
  }

  // Get wine pairing for food
  async getWinePairing(food, maxPrice) {
    try {
      const response = await axios.get(`${this.baseURL}/food/wine/pairing`, {
        params: {
          apiKey: this.apiKey,
          food,
          maxPrice
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Wine pairing error:', error.message);
      return null;
    }
  }
}

// Create singleton instance
const spoonacularEnhanced = new SpoonacularEnhancedService();

module.exports = spoonacularEnhanced;