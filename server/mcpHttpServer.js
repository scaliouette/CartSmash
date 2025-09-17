#!/usr/bin/env node

/**
 * CartSmash MCP HTTP Server
 * HTTP wrapper for CartSmash MCP functionality
 * Provides REST API endpoints that mirror MCP tools
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.MCP_PORT || process.env.PORT || 3002;
const CARTSMASH_API_BASE = process.env.CARTSMASH_API_URL || 'https://cartsmash-api.onrender.com';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cartsmash-mcp-http',
    version: '1.0.0',
    cartsmashApiBase: CARTSMASH_API_BASE,
    timestamp: new Date().toISOString()
  });
});

// List available MCP tools
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: "create_meal_plan",
        description: "Generate an AI-powered meal plan with recipes",
        endpoint: "/mcp/tools/create-meal-plan",
        method: "POST"
      },
      {
        name: "create_instacart_recipe",
        description: "Create an Instacart recipe page from recipe data",
        endpoint: "/mcp/tools/create-instacart-recipe",
        method: "POST"
      },
      {
        name: "find_retailers",
        description: "Find nearby grocery retailers using Instacart",
        endpoint: "/mcp/tools/find-retailers",
        method: "GET"
      },
      {
        name: "parse_recipe_from_text",
        description: "Parse a recipe from natural language text using AI",
        endpoint: "/mcp/tools/parse-recipe",
        method: "POST"
      },
      {
        name: "generate_shopping_list",
        description: "Generate a shopping list from recipe ingredients",
        endpoint: "/mcp/tools/generate-shopping-list",
        method: "POST"
      },
      {
        name: "analyze_nutrition",
        description: "Analyze nutritional information for recipes or ingredients",
        endpoint: "/mcp/tools/analyze-nutrition",
        method: "POST"
      }
    ]
  });
});

// MCP Tool Endpoints

// Create meal plan
app.post('/mcp/tools/create-meal-plan', async (req, res) => {
  try {
    const { preferences = {}, days = 7, mealsPerDay = 3 } = req.body;

    const response = await axios.post(`${CARTSMASH_API_BASE}/api/meal-plans/generate-meal-plan`, {
      preferences,
      days,
      mealsPerDay
    });

    const mealPlan = response.data;

    res.json({
      success: true,
      tool: "create_meal_plan",
      result: {
        mealPlan,
        summary: `Generated meal plan with ${mealPlan.meals?.length || 0} meals`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "create_meal_plan",
      error: error.message
    });
  }
});

// Create Instacart recipe
app.post('/mcp/tools/create-instacart-recipe', async (req, res) => {
  try {
    const { title, instructions, ingredients, servings, cookingTime, dietaryRestrictions } = req.body;

    const response = await axios.post(`${CARTSMASH_API_BASE}/api/instacart/recipe/create`, {
      title,
      instructions,
      ingredients,
      servings,
      cookingTime,
      dietaryRestrictions
    });

    const recipe = response.data;

    res.json({
      success: true,
      tool: "create_instacart_recipe",
      result: {
        recipe,
        summary: `Successfully created Instacart recipe: ${recipe.recipeId}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "create_instacart_recipe",
      error: error.message
    });
  }
});

// Find retailers
app.get('/mcp/tools/find-retailers', async (req, res) => {
  try {
    const { postalCode, countryCode = 'US' } = req.query;

    if (!postalCode) {
      return res.status(400).json({
        success: false,
        tool: "find_retailers",
        error: "postalCode parameter is required"
      });
    }

    const response = await axios.get(`${CARTSMASH_API_BASE}/api/instacart/retailers`, {
      params: { postalCode, countryCode }
    });

    const retailers = response.data;

    res.json({
      success: true,
      tool: "find_retailers",
      result: {
        retailers,
        summary: `Found ${retailers.length} retailers near ${postalCode}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "find_retailers",
      error: error.message
    });
  }
});

// Parse recipe from text
app.post('/mcp/tools/parse-recipe', async (req, res) => {
  try {
    const { recipeText, preferences = {} } = req.body;

    if (!recipeText) {
      return res.status(400).json({
        success: false,
        tool: "parse_recipe_from_text",
        error: "recipeText parameter is required"
      });
    }

    const response = await axios.post(`${CARTSMASH_API_BASE}/api/meal-plans/parse-meal-plan`, {
      recipeText,
      preferences
    });

    const parsedRecipe = response.data;

    res.json({
      success: true,
      tool: "parse_recipe_from_text",
      result: {
        parsedRecipe,
        summary: `Successfully parsed recipe: ${parsedRecipe.title || 'Untitled'}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "parse_recipe_from_text",
      error: error.message
    });
  }
});

// Generate shopping list
app.post('/mcp/tools/generate-shopping-list', async (req, res) => {
  try {
    const { recipes, consolidate = true } = req.body;

    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({
        success: false,
        tool: "generate_shopping_list",
        error: "recipes parameter must be an array"
      });
    }

    // Extract all ingredients from recipes
    const allIngredients = [];
    for (const recipe of recipes) {
      if (recipe.ingredients) {
        allIngredients.push(...recipe.ingredients.map(ing => ({
          ...ing,
          source: recipe.title
        })));
      }
    }

    let shoppingList = allIngredients;

    if (consolidate) {
      shoppingList = consolidateIngredients(allIngredients);
    }

    res.json({
      success: true,
      tool: "generate_shopping_list",
      result: {
        shoppingList,
        totalItems: shoppingList.length,
        summary: `Generated shopping list with ${shoppingList.length} items`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "generate_shopping_list",
      error: error.message
    });
  }
});

// Analyze nutrition
app.post('/mcp/tools/analyze-nutrition', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        tool: "analyze_nutrition",
        error: "ingredients parameter must be an array"
      });
    }

    const analysis = analyzeNutrition(ingredients);

    res.json({
      success: true,
      tool: "analyze_nutrition",
      result: {
        analysis,
        totalIngredients: ingredients.length,
        summary: `Analyzed nutrition for ${ingredients.length} ingredients`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: "analyze_nutrition",
      error: error.message
    });
  }
});

// Utility functions
function consolidateIngredients(ingredients) {
  const consolidated = new Map();

  ingredients.forEach(ing => {
    const key = ing.name.toLowerCase();
    if (consolidated.has(key)) {
      const existing = consolidated.get(key);
      existing.sources = existing.sources || [];
      if (ing.source) existing.sources.push(ing.source);
    } else {
      consolidated.set(key, {
        ...ing,
        sources: ing.source ? [ing.source] : []
      });
    }
  });

  return Array.from(consolidated.values());
}

function analyzeNutrition(ingredients) {
  const categories = {
    proteins: [],
    vegetables: [],
    grains: [],
    dairy: [],
    spices: [],
    other: []
  };

  ingredients.forEach(ing => {
    const name = ing.name.toLowerCase();
    if (name.includes('chicken') || name.includes('beef') || name.includes('fish') ||
        name.includes('egg') || name.includes('pork') || name.includes('turkey')) {
      categories.proteins.push(ing.name);
    } else if (name.includes('tomato') || name.includes('lettuce') || name.includes('carrot') ||
               name.includes('pepper') || name.includes('onion') || name.includes('spinach') ||
               name.includes('broccoli') || name.includes('potato')) {
      categories.vegetables.push(ing.name);
    } else if (name.includes('rice') || name.includes('pasta') || name.includes('bread') ||
               name.includes('flour') || name.includes('quinoa') || name.includes('oats')) {
      categories.grains.push(ing.name);
    } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') ||
               name.includes('butter') || name.includes('cream')) {
      categories.dairy.push(ing.name);
    } else if (name.includes('salt') || name.includes('pepper') || name.includes('garlic') ||
               name.includes('herbs') || name.includes('spice') || name.includes('basil') ||
               name.includes('oregano') || name.includes('thyme')) {
      categories.spices.push(ing.name);
    } else {
      categories.other.push(ing.name);
    }
  });

  return {
    categories,
    nutritionScore: calculateNutritionScore(categories),
    recommendations: generateNutritionRecommendations(categories)
  };
}

function calculateNutritionScore(categories) {
  let score = 50; // Base score

  // Add points for variety
  if (categories.proteins.length > 0) score += 15;
  if (categories.vegetables.length > 2) score += 20;
  if (categories.grains.length > 0) score += 10;
  if (categories.dairy.length > 0) score += 5;

  // Deduct points for imbalance
  if (categories.vegetables.length === 0) score -= 20;
  if (categories.proteins.length === 0) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function generateNutritionRecommendations(categories) {
  const recommendations = [];

  if (categories.vegetables.length < 2) {
    recommendations.push("Consider adding more vegetables for better nutrition balance");
  }
  if (categories.proteins.length === 0) {
    recommendations.push("Add a protein source for complete nutrition");
  }
  if (categories.grains.length === 0) {
    recommendations.push("Include whole grains for sustained energy");
  }

  return recommendations;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('MCP HTTP Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /mcp/tools',
      'POST /mcp/tools/create-meal-plan',
      'POST /mcp/tools/create-instacart-recipe',
      'GET /mcp/tools/find-retailers',
      'POST /mcp/tools/parse-recipe',
      'POST /mcp/tools/generate-shopping-list',
      'POST /mcp/tools/analyze-nutrition'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CartSmash MCP HTTP Server running on port ${PORT}`);
  console.log(`📋 Available at: http://localhost:${PORT}`);
  console.log(`🔗 CartSmash API: ${CARTSMASH_API_BASE}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛠️  Tools list: http://localhost:${PORT}/mcp/tools`);
});

module.exports = app;