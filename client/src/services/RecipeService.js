// client/src/services/RecipeService.js

/**
 * AI-Driven Recipe Service
 * Generates recipe suggestions dynamically using AI based on cart items
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Fetch AI-generated recipe suggestions based on parsed grocery items
 * @param {Array} items - Array of grocery items from the cart
 * @returns {Promise<Array>} - Array of AI-generated recipe suggestions
 */
export const fetchRecipeSuggestions = async (items) => {
  try {
    // Extract ingredient names for AI analysis
    const ingredientsList = items
      .map(item => item.name)
      .filter(name => name && name.trim())
      .join(', ');

    if (!ingredientsList) {
      return [];
    }

    // Call backend AI service to generate recipe suggestions
    const response = await fetch(`${API_URL}/api/recipes/ai-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredients: ingredientsList,
        itemsArray: items,
        options: {
          numberOfSuggestions: 5,
          includeInstructions: true,
          considerDietaryRestrictions: true,
          skillLevel: 'intermediate',
          maxPrepTime: 60
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI recipe suggestions');
    }

    const data = await response.json();
    
    // AI response should return recipes with this structure
    return data.recipes || [];
    
  } catch (error) {
    console.error('Error fetching AI recipe suggestions:', error);
    // Fallback to empty array if AI service fails
    return [];
  }
};

/**
 * Generate a recipe from text using AI
 * @param {string} recipeText - Raw recipe text to parse
 * @returns {Promise<Object>} - Parsed recipe object
 */
export const parseRecipeWithAI = async (recipeText) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipeText,
        options: {
          extractIngredients: true,
          extractInstructions: true,
          extractMetadata: true,
          generateMissingInfo: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process recipe with AI');
    }

    const data = await response.json();
    return data.recipe;
    
  } catch (error) {
    console.error('Error processing recipe with AI:', error);
    throw error;
  }
};

/**
 * Generate recipe variations using AI
 * @param {Object} originalRecipe - The base recipe to create variations from
 * @param {Object} options - Options for variation generation
 * @returns {Promise<Array>} - Array of recipe variations
 */
export const generateRecipeVariations = async (originalRecipe, options = {}) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-variations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe: originalRecipe,
        variationOptions: {
          dietary: options.dietary || [], // ['vegetarian', 'vegan', 'gluten-free', etc.]
          servingSize: options.servingSize || null,
          difficulty: options.difficulty || null,
          cuisine: options.cuisine || null,
          numberOfVariations: options.numberOfVariations || 3
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate recipe variations');
    }

    const data = await response.json();
    return data.variations || [];
    
  } catch (error) {
    console.error('Error generating recipe variations:', error);
    return [];
  }
};

/**
 * Get AI-powered recipe recommendations based on user preferences and history
 * @param {string} userId - User ID for personalized recommendations
 * @param {Object} preferences - User dietary preferences and restrictions
 * @returns {Promise<Array>} - Personalized recipe recommendations
 */
export const getPersonalizedRecipes = async (userId, preferences = {}) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-ID': userId || 'anonymous'
      },
      body: JSON.stringify({
        preferences: {
          dietary: preferences.dietary || [],
          allergies: preferences.allergies || [],
          favoriteCuisines: preferences.favoriteCuisines || [],
          skillLevel: preferences.skillLevel || 'intermediate',
          maxPrepTime: preferences.maxPrepTime || 60,
          budget: preferences.budget || 'moderate'
        },
        context: {
          season: getCurrentSeason(),
          mealType: preferences.mealType || 'dinner',
          numberOfPeople: preferences.servings || 4
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get personalized recipes');
    }

    const data = await response.json();
    return data.recipes || [];
    
  } catch (error) {
    console.error('Error getting personalized recipes:', error);
    return [];
  }
};

/**
 * Analyze nutritional content of a recipe using AI
 * @param {Object} recipe - Recipe to analyze
 * @returns {Promise<Object>} - Nutritional analysis
 */
export const analyzeRecipeNutrition = async (recipe) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-nutrition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe: {
          name: recipe.name,
          ingredients: recipe.ingredients,
          servings: recipe.servings || 4
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze recipe nutrition');
    }

    const data = await response.json();
    return data.nutrition;
    
  } catch (error) {
    console.error('Error analyzing recipe nutrition:', error);
    return null;
  }
};

/**
 * Generate a meal plan using AI based on available ingredients
 * @param {Array} availableIngredients - Ingredients available for meal planning
 * @param {Object} options - Meal planning options
 * @returns {Promise<Object>} - AI-generated meal plan
 */
export const generateMealPlan = async (availableIngredients, options = {}) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-meal-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredients: availableIngredients,
        planOptions: {
          days: options.days || 7,
          mealsPerDay: options.mealsPerDay || 3,
          dietary: options.dietary || [],
          budget: options.budget || 'moderate',
          variety: options.variety || 'high',
          useLeftovers: options.useLeftovers !== false
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate meal plan');
    }

    const data = await response.json();
    return data.mealPlan;
    
  } catch (error) {
    console.error('Error generating meal plan:', error);
    throw error;
  }
};

/**
 * Find recipe substitutions using AI
 * @param {string} ingredient - Ingredient to find substitutions for
 * @param {Object} context - Recipe context for better substitution suggestions
 * @returns {Promise<Array>} - Array of substitution options
 */
export const findIngredientSubstitutions = async (ingredient, context = {}) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-substitutions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredient,
        context: {
          recipeName: context.recipeName || '',
          recipeType: context.recipeType || '',
          dietary: context.dietary || [],
          allergies: context.allergies || []
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to find substitutions');
    }

    const data = await response.json();
    return data.substitutions || [];
    
  } catch (error) {
    console.error('Error finding substitutions:', error);
    return [];
  }
};

/**
 * Import recipe from URL using AI scraping and parsing
 * @param {string} url - Recipe URL to import
 * @returns {Promise<Object>} - Parsed recipe from URL
 */
export const importRecipeFromURL = async (url) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error('Failed to import recipe from URL');
    }

    const data = await response.json();
    return data.recipe;
    
  } catch (error) {
    console.error('Error importing recipe from URL:', error);
    throw error;
  }
};

/**
 * Helper function to get current season for recipe recommendations
 */
const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

/**
 * Scale recipe ingredients using AI
 * @param {Object} recipe - Recipe to scale
 * @param {number} newServings - Target number of servings
 * @returns {Promise<Object>} - Scaled recipe
 */
export const scaleRecipe = async (recipe, newServings) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/ai-scale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe,
        originalServings: recipe.servings || 4,
        newServings,
        options: {
          adjustCookingTime: true,
          roundMeasurements: true,
          maintainRatios: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to scale recipe');
    }

    const data = await response.json();
    return data.scaledRecipe;
    
  } catch (error) {
    console.error('Error scaling recipe:', error);
    throw error;
  }
};

/**
 * Save recipe to user's library (unified recipe system)
 */
export const saveRecipeToLibrary = async (uid, recipe) => {
  try {
    const { db } = await import('../firebase/config');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    const recipeRef = doc(db, 'users', uid, 'recipes', recipe.id);
    await setDoc(recipeRef, {
      ...recipe,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return recipe.id;
  } catch (error) {
    console.error('Error saving recipe to library:', error);
    throw error;
  }
};

/**
 * Get all recipes from user's library
 */
export const getRecipeLibrary = async (uid) => {
  try {
    const { db } = await import('../firebase/config');
    const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
    
    const recipesRef = collection(db, 'users', uid, 'recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const recipes = [];
    snapshot.forEach(doc => {
      recipes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return recipes;
  } catch (error) {
    console.error('Error getting recipe library:', error);
    throw error;
  }
};

/**
 * Import recipe from URL (unified system)
 */
export const importFromUrl = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        mealType: options.mealType,
        dayAssigned: options.dayAssigned,
        userId: options.userId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to import recipe from URL');
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error importing recipe from URL:', error);
    throw error;
  }
};

/**
 * Validate URL can be scraped
 */
export const validateRecipeUrl = async (url) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/validate-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating recipe URL:', error);
    return { success: false, valid: false, error: error.message };
  }
};

/**
 * Preview recipe from URL without saving
 */
export const previewRecipeFromUrl = async (url) => {
  try {
    const response = await fetch(`${API_URL}/api/recipes/preview-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error('Failed to preview recipe');
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error previewing recipe from URL:', error);
    throw error;
  }
};

const RecipeService = {
  fetchRecipeSuggestions,
  parseRecipeWithAI,
  generateRecipeVariations,
  getPersonalizedRecipes,
  analyzeRecipeNutrition,
  generateMealPlan,
  findIngredientSubstitutions,
  importRecipeFromURL,
  scaleRecipe,
  // Unified recipe system functions
  saveRecipeToLibrary,
  getRecipeLibrary,
  importFromUrl,
  validateRecipeUrl,
  previewRecipeFromUrl
};

export default RecipeService;