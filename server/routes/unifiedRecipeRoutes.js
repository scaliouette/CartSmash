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
      recipes: [standardizedRecipe], // Ensure unified format compatibility
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
 * POST /api/recipes/validate
 * Validate a recipe source before importing
 */
router.post('/validate', async (req, res) => {
  try {
    const { source, data } = req.body;

    if (!source || !data) {
      return res.status(400).json({
        success: false,
        error: 'Source and data are required'
      });
    }

    console.log('🔍 Validating recipe source:', source);

    let validationResult = { success: true, details: {} };

    if (source === 'url' && data.url) {
      // Validate URL format and accessibility
      try {
        new URL(data.url);
        const response = await fetch(data.url, { method: 'HEAD', timeout: 5000 });
        validationResult.details = {
          valid: response.ok,
          accessible: response.ok,
          contentType: response.headers.get('content-type')
        };
      } catch (error) {
        validationResult = {
          success: false,
          error: 'URL is not accessible',
          details: { valid: false, accessible: false }
        };
      }
    } else if (source === 'ai-text' && data.text) {
      // Validate text content
      validationResult.details = {
        valid: data.text.trim().length > 10,
        wordCount: data.text.split(/\s+/).length,
        hasIngredients: /ingredient/i.test(data.text),
        hasInstructions: /instruction|step|method/i.test(data.text)
      };
    } else {
      validationResult = {
        success: false,
        error: 'Unsupported source type or missing data'
      };
    }

    res.json(validationResult);

  } catch (error) {
    console.error('❌ Error validating recipe source:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
});

/**
 * POST /api/recipes/import-recipe
 * Import a single recipe from any source
 */
router.post('/import-recipe', async (req, res) => {
  try {
    const { source, data, userId } = req.body;

    if (!source || !data) {
      return res.status(400).json({
        success: false,
        error: 'Source and data are required'
      });
    }

    console.log('📥 Importing recipe from:', source);

    let recipes = [];

    if (source === 'url' && data.url) {
      // Use existing URL import logic
      const scrapedRecipe = await recipeImportService.importFromUrl(data.url);
      
      const standardizedRecipe = {
        id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: scrapedRecipe.title || 'Imported Recipe',
        ingredients: Array.isArray(scrapedRecipe.ingredients) ? scrapedRecipe.ingredients : [],
        instructions: Array.isArray(scrapedRecipe.instructions) ? scrapedRecipe.instructions : [],
        prepTime: scrapedRecipe.prepTime || null,
        cookTime: scrapedRecipe.cookTime || null,
        servings: scrapedRecipe.servings || null,
        calories: scrapedRecipe.calories || null,
        mealType: data.mealType || 'main',
        day: data.dayAssigned || null,
        tags: ['url-import'],
        source: 'url-import',
        sourceUrl: data.url,
        createdAt: new Date().toISOString(),
        userId: userId
      };
      
      recipes = [standardizedRecipe];

    } else if (source === 'ai-text' && data.text) {
      // Use AI parsing logic
      const parsedContent = mealPlanParser.parseMealPlan(data.text);
      const cartsmashRecipes = mealPlanParser.toCartsmashFormat(parsedContent);

      // Handle both array and single recipe results
      const recipesToProcess = Array.isArray(cartsmashRecipes) ? cartsmashRecipes : 
                               cartsmashRecipes.recipes ? cartsmashRecipes.recipes : [cartsmashRecipes];

      recipes = recipesToProcess.map(recipe => ({
        id: recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: recipe.title || recipe.name || 'AI Generated Recipe',
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
        tags: ['ai-generated'],
        source: 'ai-text',
        createdAt: new Date().toISOString(),
        userId: userId
      }));
    }

    res.json({
      success: true,
      recipes,
      count: recipes.length,
      source
    });

  } catch (error) {
    console.error('❌ Error importing recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Import failed',
      details: error.message
    });
  }
});

/**
 * POST /api/recipes/batch-import
 * Import multiple recipes from different sources in batch
 */
router.post('/batch-import', async (req, res) => {
  try {
    const { items, userId } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    console.log('📦 Batch importing', items.length, 'items');

    const results = [];
    let totalRecipes = 0;

    for (const item of items) {
      try {
        const importResult = await new Promise((resolve) => {
          // Simulate the import-recipe endpoint call
          const mockReq = { body: { source: item.type, data: item, userId } };
          const mockRes = {
            json: resolve,
            status: () => ({ json: resolve })
          };
          
          // Call the import logic directly
          if (item.type === 'url' && item.url) {
            // Process URL import
            recipeImportService.importFromUrl(item.url).then(scrapedRecipe => {
              const recipe = {
                id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: scrapedRecipe.title || 'Imported Recipe',
                ingredients: scrapedRecipe.ingredients || [],
                instructions: scrapedRecipe.instructions || [],
                source: 'url-import',
                sourceUrl: item.url,
                createdAt: new Date().toISOString(),
                userId
              };
              resolve({ success: true, recipes: [recipe] });
            }).catch(error => {
              resolve({ success: false, error: error.message });
            });
          } else if (item.type === 'ai' && item.text) {
            // Process AI text import
            try {
              const parsedContent = mealPlanParser.parseMealPlan(item.text);
              const recipes = mealPlanParser.toCartsmashFormat(parsedContent);
              resolve({ success: true, recipes });
            } catch (error) {
              resolve({ success: false, error: error.message });
            }
          } else {
            resolve({ success: false, error: 'Invalid item format' });
          }
        });

        if (importResult.success) {
          results.push(...importResult.recipes);
          totalRecipes += importResult.recipes.length;
        }

      } catch (error) {
        console.error('Batch import item failed:', error);
      }
    }

    res.json({
      success: true,
      count: totalRecipes,
      recipes: results
    });

  } catch (error) {
    console.error('❌ Error in batch import:', error);
    res.status(500).json({
      success: false,
      error: 'Batch import failed',
      details: error.message
    });
  }
});

/**
 * POST /api/recipes/convert-format
 * Convert recipe to different format
 */
router.post('/convert-format', async (req, res) => {
  try {
    const { recipe, targetFormat } = req.body;

    if (!recipe || !targetFormat) {
      return res.status(400).json({
        success: false,
        error: 'Recipe and target format are required'
      });
    }

    console.log('🔄 Converting recipe to format:', targetFormat);

    let converted;

    switch (targetFormat) {
      case 'cartsmash':
        converted = {
          id: recipe.id || `recipe_${Date.now()}`,
          title: recipe.title || recipe.name,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          mealType: recipe.mealType || 'main',
          tags: recipe.tags || [],
          source: recipe.source || 'converted'
        };
        break;

      case 'schema.org':
        converted = {
          '@context': 'https://schema.org',
          '@type': 'Recipe',
          name: recipe.title || recipe.name,
          recipeIngredient: recipe.ingredients || [],
          recipeInstructions: (recipe.instructions || []).map(instruction => ({
            '@type': 'HowToStep',
            text: typeof instruction === 'string' ? instruction : instruction.instruction
          })),
          prepTime: recipe.prepTime ? `PT${recipe.prepTime}M` : undefined,
          cookTime: recipe.cookTime ? `PT${recipe.cookTime}M` : undefined,
          recipeYield: recipe.servings,
          recipeCategory: recipe.mealType
        };
        break;

      case 'markdown':
        const ingredients = (recipe.ingredients || []).map(ing => `- ${ing}`).join('\n');
        const instructions = (recipe.instructions || []).map((inst, i) => `${i + 1}. ${inst}`).join('\n');
        converted = `# ${recipe.title || recipe.name}

## Ingredients
${ingredients}

## Instructions
${instructions}

**Prep Time:** ${recipe.prepTime || 'N/A'}
**Cook Time:** ${recipe.cookTime || 'N/A'}  
**Servings:** ${recipe.servings || 'N/A'}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported target format'
        });
    }

    res.json({
      success: true,
      format: targetFormat,
      converted
    });

  } catch (error) {
    console.error('❌ Error converting recipe format:', error);
    res.status(500).json({
      success: false,
      error: 'Format conversion failed',
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
      'Batch import',
      'Format conversion',
      'Standardized data format'
    ]
  });
});

module.exports = router;