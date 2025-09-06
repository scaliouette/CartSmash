// server/routes/unifiedRecipeRoutes.js
// UNIFIED Recipe Management System - Consolidates all recipe operations

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const MealPlanParser = require('../services/aiMealPlanParser');
const RecipeImportService = require('../services/recipeImportService');
const { saveRecipeToDatabase, getUserRecipes, deleteUserRecipe } = require('../services/databaseService');

// Initialize services
const mealPlanParser = new MealPlanParser();
const recipeImportService = new RecipeImportService();

/**
 * POST /api/recipes/parse-ai
 * Parse recipes from AI-generated text (meal plans, single recipes, etc.)
 */
router.post('/parse-ai', async (req, res) => {
  try {
    const { text, source = 'ai-generated', userId } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }

    console.log('🤖 Parsing AI-generated recipe content...');

    // Use MealPlanParser for all AI text parsing
    const parsedContent = mealPlanParser.parseMealPlan(text);
    const cartsmashRecipes = mealPlanParser.toCartsmashFormat(parsedContent);

    // Standardize recipe format
    const standardizedRecipes = cartsmashRecipes.map(recipe => ({
      id: recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: recipe.title || recipe.name || 'Untitled Recipe',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : 
                   typeof recipe.ingredients === 'string' ? recipe.ingredients.split('\n').filter(i => i.trim()) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions :
                    typeof recipe.instructions === 'string' ? recipe.instructions.split('\n').filter(i => i.trim()) : [],
      prepTime: recipe.prepTime || '15-30 minutes',
      cookTime: recipe.cookTime || 'Varies',
      servings: recipe.servings || '4 people',
      calories: recipe.calories || null,
      mealType: recipe.mealType || 'main',
      day: recipe.day || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : ['ai-generated'],
      source: source,
      createdAt: new Date().toISOString(),
      userId: userId
    }));

    res.json({
      success: true,
      recipes: standardizedRecipes,
      totalRecipes: standardizedRecipes.length,
      source: 'ai-parsing'
    });

  } catch (error) {
    console.error('❌ Error parsing AI recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse AI content',
      details: error.message
    });
  }
});

/**
 * POST /api/recipes/import-url
 * Import recipe from URL using web scraping
 */
router.post('/import-url', async (req, res) => {
  try {
    const { url, mealType, dayAssigned, userId } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    console.log('🌐 Importing recipe from URL:', url);

    // Use RecipeImportService to scrape the recipe
    const scrapedRecipe = await recipeImportService.importFromUrl(url);

    // Standardize format
    const standardizedRecipe = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: scrapedRecipe.title || 'Imported Recipe',
      ingredients: Array.isArray(scrapedRecipe.ingredients) ? scrapedRecipe.ingredients : [],
      instructions: Array.isArray(scrapedRecipe.instructions) ? scrapedRecipe.instructions : [],
      prepTime: scrapedRecipe.prepTime || null,
      cookTime: scrapedRecipe.cookTime || null,
      servings: scrapedRecipe.servings || null,
      calories: scrapedRecipe.calories || null,
      mealType: mealType || scrapedRecipe.mealType || 'main',
      day: dayAssigned || null,
      tags: scrapedRecipe.tags || ['url-import'],
      source: 'url-import',
      sourceUrl: url,
      createdAt: new Date().toISOString(),
      userId: userId
    };

    res.json({
      success: true,
      recipe: standardizedRecipe,
      source: 'url-import'
    });

  } catch (error) {
    console.error('❌ Error importing recipe from URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import recipe from URL',
      details: error.message,
      fallbackToText: true // Suggest manual text input
    });
  }
});

/**
 * POST /api/recipes/save
 * Save a recipe to user's library
 */
router.post('/save', authenticateUser, async (req, res) => {
  try {
    const { recipe } = req.body;
    const userId = req.user.uid;

    if (!recipe) {
      return res.status(400).json({
        success: false,
        error: 'Recipe data is required'
      });
    }

    // Ensure standardized format
    const standardizedRecipe = {
      id: recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: recipe.title || recipe.name || 'Untitled Recipe',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : 
                   typeof recipe.ingredients === 'string' ? recipe.ingredients.split('\n').filter(i => i.trim()) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions :
                    typeof recipe.instructions === 'string' ? recipe.instructions.split('\n').filter(i => i.trim()) : [],
      prepTime: recipe.prepTime || null,
      cookTime: recipe.cookTime || null,
      servings: recipe.servings || null,
      calories: recipe.calories || null,
      mealType: recipe.mealType || 'main',
      day: recipe.day || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      source: recipe.source || 'manual',
      sourceUrl: recipe.sourceUrl || null,
      createdAt: recipe.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId
    };

    console.log('💾 Saving recipe to user library:', standardizedRecipe.title);

    // Save to database
    await saveRecipeToDatabase(userId, standardizedRecipe);

    res.json({
      success: true,
      recipe: standardizedRecipe,
      message: 'Recipe saved to library'
    });

  } catch (error) {
    console.error('❌ Error saving recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save recipe',
      details: error.message
    });
  }
});

/**
 * GET /api/recipes/list
 * Get all recipes for authenticated user
 */
router.get('/list', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { mealType, tag, limit = 50 } = req.query;

    console.log('📋 Fetching recipes for user:', userId);

    const recipes = await getUserRecipes(userId, {
      mealType,
      tag,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      recipes,
      total: recipes.length
    });

  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes',
      details: error.message
    });
  }
});

/**
 * DELETE /api/recipes/:recipeId
 * Delete a recipe from user's library
 */
router.delete('/:recipeId', authenticateUser, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.uid;

    console.log('🗑️ Deleting recipe:', recipeId, 'for user:', userId);

    await deleteUserRecipe(userId, recipeId);

    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recipe',
      details: error.message
    });
  }
});

/**
 * POST /api/recipes/to-cart
 * Convert recipe ingredients to shopping cart format
 */
router.post('/to-cart', async (req, res) => {
  try {
    const { recipe, userId } = req.body;

    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe with ingredients is required'
      });
    }

    console.log('🛒 Converting recipe to cart format:', recipe.title);

    // Convert ingredients to cart format (reuse existing cart parsing logic)
    const ingredientsText = Array.isArray(recipe.ingredients) ? 
                           recipe.ingredients.join('\n') : 
                           recipe.ingredients;

    // This will use the existing cart parsing API internally
    const API_URL = process.env.API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/api/cart/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listText: ingredientsText,
        action: 'new', // Create new cart items
        userId: userId,
        source: `recipe:${recipe.title}`,
        options: {
          mergeDuplicates: true,
          enhancedQuantityParsing: true,
          detectContainers: true
        }
      }),
    });

    const cartData = await response.json();

    if (cartData.success) {
      res.json({
        success: true,
        cartItems: cartData.cart,
        itemCount: cartData.cart.length,
        source: recipe.title
      });
    } else {
      throw new Error('Cart parsing failed');
    }

  } catch (error) {
    console.error('❌ Error converting recipe to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert recipe to cart items',
      details: error.message
    });
  }
});

/**
 * GET /api/recipes/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Unified Recipe Management',
    timestamp: new Date().toISOString(),
    features: [
      'AI recipe parsing',
      'URL recipe import',
      'Recipe library management',
      'Cart integration',
      'Standardized data format'
    ]
  });
});

module.exports = router;