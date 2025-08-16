// server/routes/recipes.js
const express = require('express');
const router = express.Router();

// Simple recipe URL import endpoint
router.post('/import-url', async (req, res) => {
  const { url, userId } = req.body;
  
  console.log('Recipe import requested for URL:', url);
  
  try {
    // For now, return a message to use text import
    // In production, you would use puppeteer or recipe-scrapers here
    // to actually scrape the recipe from the URL
    
    // Check if it's a supported site
    const supportedSites = [
      'allrecipes.com',
      'foodnetwork.com',
      'seriouseats.com',
      'bonappetit.com',
      'epicurious.com',
      'simplyrecipes.com',
      'budgetbytes.com',
      'cookinglight.com',
      'delish.com',
      'tasty.co'
    ];
    
    const isSupportedSite = supportedSites.some(site => url.includes(site));
    
    if (isSupportedSite) {
      // In a real implementation, you would scrape the recipe here
      // For now, we'll return a message to use text import
      res.json({
        success: false,
        message: 'URL import coming soon. Please use text import for now.',
        fallbackToText: true
      });
    } else {
      res.json({
        success: false,
        message: 'This website is not yet supported. Please use text import.',
        fallbackToText: true
      });
    }
  } catch (error) {
    console.error('Recipe import error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallbackToText: true
    });
  }
});

// Parse recipe from text
router.post('/parse-text', async (req, res) => {
  const { recipeText, userId } = req.body;
  
  try {
    if (!recipeText || recipeText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipe text provided'
      });
    }
    
    // Parse the recipe text
    const lines = recipeText.split('\n').filter(l => l.trim());
    
    let recipeName = 'Imported Recipe';
    let ingredients = [];
    let instructions = [];
    let servings = 4;
    let inIngredients = false;
    let inInstructions = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect recipe name (usually first line)
      if (lines.indexOf(line) === 0 && !lowerLine.includes('ingredient')) {
        recipeName = line.replace(/recipe:?\s*/i, '').trim();
      }
      
      // Detect servings
      const servingsMatch = line.match(/(?:serves?|servings?|yield)[:\s]+(\d+)/i);
      if (servingsMatch) {
        servings = parseInt(servingsMatch[1]);
        continue;
      }
      
      // Detect sections
      if (lowerLine.includes('ingredient')) {
        inIngredients = true;
        inInstructions = false;
        continue;
      }
      if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('method')) {
        inIngredients = false;
        inInstructions = true;
        continue;
      }
      
      // Add to appropriate section
      if (inIngredients && line.trim()) {
        ingredients.push(line.trim());
      } else if (inInstructions && line.trim()) {
        instructions.push(line.trim());
      } else if (!inIngredients && !inInstructions && line.trim()) {
        // Assume ingredients if line contains common measurements
        if (/\d+|cup|tbsp|tsp|oz|lb|can|jar|bottle/i.test(line)) {
          ingredients.push(line.trim());
        }
      }
    }
    
    const recipe = {
      id: `recipe_${Date.now()}`,
      name: recipeName,
      ingredients: ingredients,
      instructions: instructions,
      servings: servings,
      source: 'text_import',
      createdAt: new Date().toISOString(),
      userId: userId
    };
    
    res.json({
      success: true,
      recipe: recipe
    });
    
  } catch (error) {
    console.error('Recipe parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all recipes for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // In a real implementation, you would fetch from database
    // For now, return empty array
    res.json({
      success: true,
      recipes: []
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save a recipe
router.post('/save', async (req, res) => {
  const { recipe, userId } = req.body;
  
  try {
    if (!recipe || !recipe.name) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe data'
      });
    }
    
    const savedRecipe = {
      ...recipe,
      id: recipe.id || `recipe_${Date.now()}`,
      userId: userId,
      createdAt: recipe.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In a real implementation, you would save to database
    console.log('Recipe saved:', savedRecipe.name);
    
    res.json({
      success: true,
      recipe: savedRecipe
    });
    
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a recipe
router.delete('/:recipeId', async (req, res) => {
  const { recipeId } = req.params;
  const { userId } = req.body;
  
  try {
    // In a real implementation, you would delete from database
    console.log(`Recipe ${recipeId} deleted for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;