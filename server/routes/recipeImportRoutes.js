// server/routes/recipeImportRoutes.js
// API routes for importing recipes from URLs

const express = require('express');
const router = express.Router();
const RecipeImportService = require('../services/recipeImportService');
const { authenticateUser } = require('../middleware/auth');
const { saveRecipeToDatabase } = require('../services/databaseService');

const importService = new RecipeImportService();

/**
 * POST /api/recipes/import-url
 * Import a recipe from a URL
 */
router.post('/import-url', async (req, res) => {
  try {
    const { url, mealType, dayAssigned } = req.body;
    const userId = req.body.userId || req.user?.uid;

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

    // Import recipe from URL
    const result = await importService.importFromUrl(url, {
      mealType,
      dayAssigned,
      userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Optionally save to database immediately
    if (req.body.autoSave && userId) {
      await saveRecipeToDatabase(userId, result.recipe);
    }

    res.json({
      success: true,
      recipe: result.recipe
    });

  } catch (error) {
    console.error('Error in import-url endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import recipe: ' + error.message
    });
  }
});

/**
 * POST /api/recipes/bulk-import-urls
 * Import multiple recipes from URLs
 */
router.post('/bulk-import-urls', async (req, res) => {
  try {
    const { urls, mealPlanId } = req.body;
    const userId = req.body.userId || req.user?.uid;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each URL
    for (const urlData of urls) {
      const url = typeof urlData === 'string' ? urlData : urlData.url;
      const mealType = typeof urlData === 'object' ? urlData.mealType : null;
      const dayAssigned = typeof urlData === 'object' ? urlData.dayAssigned : null;

      try {
        const result = await importService.importFromUrl(url, {
          mealType,
          dayAssigned,
          mealPlanId,
          userId
        });

        if (result.success) {
          // Save to database
          if (userId) {
            await saveRecipeToDatabase(userId, result.recipe);
          }
          results.successful.push({
            url,
            recipe: result.recipe
          });
        } else {
          results.failed.push({
            url,
            error: result.error
          });
        }
      } catch (error) {
        results.failed.push({
          url,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: urls.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    console.error('Error in bulk-import-urls endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk import failed: ' + error.message
    });
  }
});

/**
 * POST /api/recipes/preview-url
 * Preview a recipe from URL without saving
 */
router.post('/preview-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Import recipe without saving
    const result = await importService.importFromUrl(url, {
      preview: true
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      recipe: result.recipe,
      preview: true
    });

  } catch (error) {
    console.error('Error in preview-url endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview recipe: ' + error.message
    });
  }
});

/**
 * POST /api/recipes/validate-url
 * Check if a URL can be scraped
 */
router.post('/validate-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Try to validate URL is scrapeable
    const { extractRecipe } = require('../utils/recipeScraper');
    
    try {
      const recipe = await extractRecipe(url);
      const hasContent = recipe && (
        recipe.ingredients?.length > 0 || 
        recipe.steps?.length > 0
      );

      res.json({
        success: true,
        valid: hasContent,
        hasIngredients: recipe.ingredients?.length > 0,
        hasInstructions: recipe.steps?.length > 0,
        recipeName: recipe.title || null
      });

    } catch (scrapeError) {
      res.json({
        success: true,
        valid: false,
        error: 'Could not find recipe data on this page'
      });
    }

  } catch (error) {
    console.error('Error in validate-url endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed: ' + error.message
    });
  }
});

module.exports = router;