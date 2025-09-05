// server/routes/unifiedRoutes.js
// Main server file with all recipe import integrations

const express = require('express');
const router = express.Router();
const MealPlanParser = require('../services/aiMealPlanParser');
const RecipeImportService = require('../services/recipeImportService');
const { saveRecipeToDatabase } = require('../services/databaseService');

// Unified recipe import endpoint that handles both AI and URLs
router.post('/import-recipe', async (req, res) => {
  try {
    const { source, data, userId } = req.body;
    let recipe;

    switch (source) {
      case 'url':
        // Import from URL using scraper
        const importService = new RecipeImportService();
        const urlResult = await importService.importFromUrl(data.url, {
          mealType: data.mealType,
          dayAssigned: data.dayAssigned
        });
        recipe = urlResult.recipe;
        break;

      case 'ai-text':
        // Parse AI-generated text
        const parser = new MealPlanParser();
        const parsed = parser.parseSingleRecipe(data.text);
        recipe = parser.toCartsmashFormat({ recipes: [parsed] }).recipes[0];
        break;

      case 'ai-meal-plan':
        // Parse complete AI meal plan
        const mealPlanParser = new MealPlanParser();
        const mealPlan = mealPlanParser.parseMealPlan(data.text);
        const cartsmashPlan = mealPlanParser.toCartsmashFormat(mealPlan);
        return res.json({
          success: true,
          type: 'meal-plan',
          mealPlan: cartsmashPlan
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid source type'
        });
    }

    // Save to database (implement your database logic here)
    // await saveRecipeToDatabase(userId, recipe);

    res.json({
      success: true,
      type: 'recipe',
      recipe: recipe
    });

  } catch (error) {
    console.error('Error in unified import:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch import endpoint for multiple sources
router.post('/batch-import', async (req, res) => {
  try {
    const { items, userId } = req.body;
    const results = {
      successful: [],
      failed: [],
      stats: {
        urls: 0,
        aiRecipes: 0,
        total: items.length
      }
    };

    const importService = new RecipeImportService();
    const parser = new MealPlanParser();

    for (const item of items) {
      try {
        let recipe;

        if (item.type === 'url') {
          const result = await importService.importFromUrl(item.url, {
            mealType: item.mealType,
            dayAssigned: item.dayAssigned
          });
          recipe = result.recipe;
          results.stats.urls++;
        } else if (item.type === 'ai') {
          const parsed = parser.parseSingleRecipe(item.text);
          recipe = parser.toCartsmashFormat({ recipes: [parsed] }).recipes[0];
          results.stats.aiRecipes++;
        }

        results.successful.push({
          source: item.type,
          recipe: recipe
        });

      } catch (error) {
        results.failed.push({
          source: item.type,
          data: item.url || item.text?.substring(0, 100),
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error in batch import:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Recipe validation endpoint
router.post('/validate', async (req, res) => {
  try {
    const { source, data } = req.body;
    let valid = false;
    let details = {};

    if (source === 'url') {
      // Validate URL can be scraped
      const { scrapeToCartSmash } = require('../utils/recipeScraper');
      try {
        const recipe = await scrapeToCartSmash(data.url);
        valid = !!(recipe && (recipe.ingredients?.length > 0 || recipe.steps?.length > 0));
        details = {
          hasIngredients: recipe.ingredients?.length > 0,
          hasInstructions: recipe.steps?.length > 0,
          recipeName: recipe.title
        };
      } catch {
        valid = false;
        details = { error: 'Could not extract recipe from URL' };
      }
    } else if (source === 'ai-text') {
      // Validate AI text can be parsed
      const parser = new MealPlanParser();
      try {
        const lines = data.text.split('\n');
        valid = lines.some(line => line.includes('**') || line.includes('Ingredients:'));
        details = {
          looksLikeRecipe: valid,
          lineCount: lines.length
        };
      } catch {
        valid = false;
        details = { error: 'Invalid text format' };
      }
    }

    res.json({
      success: true,
      valid: valid,
      details: details
    });

  } catch (error) {
    console.error('Error in validation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Recipe format converter endpoint
router.post('/convert-format', async (req, res) => {
  try {
    const { recipe, targetFormat } = req.body;

    let converted;
    switch (targetFormat) {
      case 'cartsmash':
        // Already in CartSmash format
        converted = recipe;
        break;

      case 'schema.org':
        // Convert to Schema.org Recipe format
        converted = {
          '@context': 'https://schema.org/',
          '@type': 'Recipe',
          name: recipe.title,
          description: recipe.description,
          prepTime: `PT${recipe.prepTime}M`,
          cookTime: `PT${recipe.cookTime}M`,
          totalTime: `PT${recipe.totalTime}M`,
          recipeYield: recipe.servings,
          recipeIngredient: recipe.ingredients.map(i => i.original || `${i.quantity} ${i.unit} ${i.item}`),
          recipeInstructions: recipe.instructions.map(i => ({
            '@type': 'HowToStep',
            text: i.instruction
          })),
          nutrition: {
            '@type': 'NutritionInformation',
            calories: recipe.nutrition.calories,
            proteinContent: recipe.nutrition.protein,
            carbohydrateContent: recipe.nutrition.carbs,
            fatContent: recipe.nutrition.fat
          }
        };
        break;

      case 'markdown':
        // Convert to Markdown format
        converted = `# ${recipe.title}\n\n` +
          `${recipe.description}\n\n` +
          `**Prep Time:** ${recipe.prepTime} min | **Cook Time:** ${recipe.cookTime} min | **Servings:** ${recipe.servings}\n\n` +
          `## Ingredients\n\n` +
          recipe.ingredients.map(i => `- ${i.original || `${i.quantity} ${i.unit} ${i.item}`}`).join('\n') +
          `\n\n## Instructions\n\n` +
          recipe.instructions.map((i, idx) => `${idx + 1}. ${i.instruction}`).join('\n') +
          `\n\n## Nutrition\n\n` +
          `- Calories: ${recipe.nutrition.calories}\n` +
          `- Protein: ${recipe.nutrition.protein}g\n` +
          `- Carbs: ${recipe.nutrition.carbs}g\n` +
          `- Fat: ${recipe.nutrition.fat}g`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid target format'
        });
    }

    res.json({
      success: true,
      format: targetFormat,
      converted: converted
    });

  } catch (error) {
    console.error('Error in format conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;