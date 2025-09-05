// server/routes/aiMealPlanRoutes.js
// Express API routes for AI meal plan integration

const express = require('express');
const router = express.Router();
const MealPlanParser = require('../services/aiMealPlanParser');
const { authenticateUser } = require('../middleware/auth');
const { generateWithAI } = require('../services/aiService');
const { saveMealPlanToUser, getMealPlan } = require('../services/databaseService');

/**
 * POST /api/ai/generate-meal-plan
 * Generate a new meal plan using AI
 */
router.post('/generate-meal-plan', authenticateUser, async (req, res) => {
  try {
    const {
      familySize = 4,
      dietaryRestrictions = [],
      mealPreferences = [],
      budget = 'moderate',
      prepTimePreference = 'balanced',
      includeSnacks = true,
      daysCount = 7
    } = req.body;

    // Build AI prompt
    const prompt = buildMealPlanPrompt({
      familySize,
      dietaryRestrictions,
      mealPreferences,
      budget,
      prepTimePreference,
      includeSnacks,
      daysCount
    });

    // Generate meal plan with AI
    const aiResponse = await generateWithAI(prompt);

    // Parse the AI response
    const parser = new MealPlanParser();
    const parsedPlan = parser.parseMealPlan(aiResponse);
    const cartsmashFormat = parser.toCartsmashFormat(parsedPlan);

    // Save to database
    const planId = await saveMealPlanToUser(req.user.uid, cartsmashFormat);

    res.json({
      success: true,
      planId,
      mealPlan: cartsmashFormat,
      rawResponse: aiResponse // Optional: for debugging
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/parse-meal-plan
 * Parse an AI-generated meal plan text
 */
router.post('/parse-meal-plan', async (req, res) => {
  try {
    const { aiResponse, userId } = req.body;

    if (!aiResponse) {
      return res.status(400).json({
        success: false,
        error: 'AI response text is required'
      });
    }

    const parser = new MealPlanParser();
    const parsedPlan = parser.parseMealPlan(aiResponse);
    const cartsmashFormat = parser.toCartsmashFormat(parsedPlan);

    res.json({
      success: true,
      mealPlan: cartsmashFormat
    });

  } catch (error) {
    console.error('Error parsing meal plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/regenerate-meal
 * Regenerate a specific meal in the plan
 */
router.post('/regenerate-meal', authenticateUser, async (req, res) => {
  try {
    const {
      mealPlanId,
      day,
      mealType,
      preferences = {}
    } = req.body;

    // Get existing meal plan
    const existingPlan = await getMealPlan(req.user.uid, mealPlanId);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }

    // Build prompt for single meal
    const prompt = buildSingleMealPrompt({
      day,
      mealType,
      familySize: existingPlan.metadata.familySize,
      existingMeals: existingPlan.recipes,
      preferences
    });

    // Generate new meal with AI
    const aiResponse = await generateWithAI(prompt);

    // Parse the single recipe
    const parser = new MealPlanParser();
    const recipe = parser.parseSingleRecipe(aiResponse);

    res.json({
      success: true,
      recipe
    });

  } catch (error) {
    console.error('Error regenerating meal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/suggest-substitutions
 * Get AI suggestions for ingredient substitutions
 */
router.post('/suggest-substitutions', authenticateUser, async (req, res) => {
  try {
    const { recipeId, ingredient, reason } = req.body;

    const prompt = `Suggest healthy substitutions for "${ingredient}" in a recipe. 
                   Reason for substitution: ${reason}.
                   Provide 3-5 alternatives with brief explanations.`;

    const aiResponse = await generateWithAI(prompt);

    // Parse substitutions
    const substitutions = parseSubstitutions(aiResponse);

    res.json({
      success: true,
      originalIngredient: ingredient,
      substitutions
    });

  } catch (error) {
    console.error('Error getting substitutions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/optimize-shopping-list
 * Optimize shopping list using AI
 */
router.post('/optimize-shopping-list', authenticateUser, async (req, res) => {
  try {
    const { shoppingList, budget, stores } = req.body;

    const prompt = buildShoppingOptimizationPrompt({
      items: shoppingList,
      budget,
      preferredStores: stores
    });

    const aiResponse = await generateWithAI(prompt);

    // Parse optimized list
    const optimizedList = parseOptimizedShoppingList(aiResponse);

    res.json({
      success: true,
      optimizedList,
      estimatedTotal: optimizedList.estimatedTotal,
      savingsTips: optimizedList.tips
    });

  } catch (error) {
    console.error('Error optimizing shopping list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/meal-plan/:planId
 * Get a specific meal plan
 */
router.get('/meal-plan/:planId', authenticateUser, async (req, res) => {
  try {
    const { planId } = req.params;

    const mealPlan = await getMealPlan(req.user.uid, planId);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }

    res.json({
      success: true,
      mealPlan
    });

  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/analyze-nutrition
 * Analyze nutritional balance of meal plan
 */
router.post('/analyze-nutrition', authenticateUser, async (req, res) => {
  try {
    const { mealPlanId } = req.body;

    const mealPlan = await getMealPlan(req.user.uid, mealPlanId);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }

    // Calculate nutritional totals
    const nutritionAnalysis = analyzeNutrition(mealPlan.recipes);

    // Get AI recommendations
    const prompt = buildNutritionAnalysisPrompt(nutritionAnalysis);
    const aiRecommendations = await generateWithAI(prompt);

    res.json({
      success: true,
      analysis: nutritionAnalysis,
      recommendations: parseNutritionRecommendations(aiRecommendations)
    });

  } catch (error) {
    console.error('Error analyzing nutrition:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to build meal plan prompt
 */
function buildMealPlanPrompt(preferences) {
  let prompt = `Create a healthy ${preferences.daysCount}-day meal plan for a family of ${preferences.familySize}. `;
  
  if (preferences.dietaryRestrictions.length > 0) {
    prompt += `Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}. `;
  }
  
  if (preferences.mealPreferences.length > 0) {
    prompt += `Meal preferences: ${preferences.mealPreferences.join(', ')}. `;
  }
  
  prompt += `Budget level: ${preferences.budget}. `;
  prompt += `Prep time preference: ${preferences.prepTimePreference}. `;
  
  if (preferences.includeSnacks) {
    prompt += `Include breakfast, lunch, dinner, and 2 snacks for each day. `;
  } else {
    prompt += `Include breakfast, lunch, and dinner for each day. `;
  }
  
  prompt += `For each recipe, provide:
    - Recipe name
    - List of ingredients with quantities
    - Prep time and cook time
    - Estimated calories per serving
    - Tags (e.g., vegetarian, quick, make-ahead)
    
  Also provide a complete grocery shopping list organized by category.
  
  Format the output with clear day headers and recipe sections.`;
  
  return prompt;
}

/**
 * Helper function to build single meal prompt
 */
function buildSingleMealPrompt({ day, mealType, familySize, existingMeals, preferences }) {
  const existingMealNames = existingMeals
    .filter(m => m.dayAssigned === day)
    .map(m => m.title)
    .join(', ');

  return `Generate a single ${mealType} recipe for ${day} for a family of ${familySize}.
          Other meals planned for this day: ${existingMealNames}.
          ${preferences.dietary ? `Dietary restriction: ${preferences.dietary}.` : ''}
          ${preferences.avoidIngredients ? `Avoid: ${preferences.avoidIngredients}.` : ''}
          ${preferences.maxPrepTime ? `Maximum prep time: ${preferences.maxPrepTime} minutes.` : ''}
          
          Provide recipe name, ingredients with quantities, prep/cook time, calories, and tags.`;
}

/**
 * Helper function to parse substitutions
 */
function parseSubstitutions(aiResponse) {
  // Implementation to parse AI substitution suggestions
  const lines = aiResponse.split('\n');
  const substitutions = [];
  
  lines.forEach(line => {
    if (line.match(/^\d+\./)) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        substitutions.push({
          item: parts[0].replace(/^\d+\./, '').trim(),
          explanation: parts[1].trim()
        });
      }
    }
  });
  
  return substitutions;
}

/**
 * Helper function to build shopping optimization prompt
 */
function buildShoppingOptimizationPrompt({ items, budget, preferredStores }) {
  return `Optimize this shopping list for a budget of ${budget}.
          Items: ${JSON.stringify(items)}
          ${preferredStores ? `Preferred stores: ${preferredStores.join(', ')}` : ''}
          
          Provide:
          1. Grouped items by store section
          2. Budget-friendly brand suggestions
          3. Seasonal alternatives for better prices
          4. Bulk buying recommendations
          5. Estimated total cost`;
}

/**
 * Helper function to parse optimized shopping list
 */
function parseOptimizedShoppingList(aiResponse) {
  // Implementation to parse AI-optimized shopping list
  return {
    sections: [],
    estimatedTotal: 0,
    tips: [],
    brandSuggestions: []
  };
}

/**
 * Helper function to analyze nutrition
 */
function analyzeNutrition(recipes) {
  const dailyTotals = {};
  const weeklyAverage = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  };

  recipes.forEach(recipe => {
    const day = recipe.dayAssigned;
    if (!dailyTotals[day]) {
      dailyTotals[day] = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      };
    }

    Object.keys(recipe.nutrition).forEach(nutrient => {
      dailyTotals[day][nutrient] += recipe.nutrition[nutrient] || 0;
      weeklyAverage[nutrient] += recipe.nutrition[nutrient] || 0;
    });
  });

  // Calculate averages
  Object.keys(weeklyAverage).forEach(nutrient => {
    weeklyAverage[nutrient] = Math.round(weeklyAverage[nutrient] / 7);
  });

  return {
    dailyTotals,
    weeklyAverage,
    mealsPerDay: recipes.length / 7
  };
}

/**
 * Helper function to build nutrition analysis prompt
 */
function buildNutritionAnalysisPrompt(nutritionData) {
  return `Analyze this weekly meal plan nutrition data and provide recommendations:
          ${JSON.stringify(nutritionData)}
          
          Evaluate:
          1. Macronutrient balance
          2. Caloric adequacy for a family
          3. Nutritional gaps
          4. Suggestions for improvement
          5. Foods to add or reduce`;
}

/**
 * Helper function to parse nutrition recommendations
 */
function parseNutritionRecommendations(aiResponse) {
  // Implementation to parse AI nutrition recommendations
  return {
    balance: '',
    gaps: [],
    suggestions: [],
    improvements: []
  };
}

module.exports = router;