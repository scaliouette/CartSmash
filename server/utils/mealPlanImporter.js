// server/utils/mealPlanImporter.js
// Utility to convert structured JSON meal plans into CartSmash format

/**
 * Converts structured meal plan JSON to CartSmash format
 * @param {Object} jsonMealPlan - The structured meal plan from user
 * @param {string} userId - User ID for Firebase storage
 * @returns {Object} CartSmash-compatible meal plan object
 */
function importStructuredMealPlan(jsonMealPlan, userId) {
  const mealPlan = jsonMealPlan.mealPlan;
  
  if (!mealPlan || !mealPlan.days) {
    throw new Error('Invalid meal plan structure: missing mealPlan.days');
  }

  // Convert days array to CartSmash day object structure
  const days = {};
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let totalMeals = 0;
  let allItems = [];
  let allRecipes = [];
  
  mealPlan.days.forEach((day, index) => {
    const dayName = dayNames[index] || `Day ${index + 1}`;
    days[dayName] = {};
    
    // Convert meals for each day
    if (day.meals) {
      Object.entries(day.meals).forEach(([mealType, meal]) => {
        if (meal && meal.name) {
          totalMeals++;
          
          // Convert ingredients to CartSmash item format
          const items = meal.ingredients ? meal.ingredients.map(ingredient => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productName: ingredient.item,
            name: ingredient.item,
            quantity: ingredient.amount || 1,
            unit: ingredient.unit || 'each',
            category: getCategoryFromIngredient(ingredient),
            fromRecipe: meal.name,
            prep: ingredient.prep || null,
            note: ingredient.note || null
          })) : [];
          
          allItems = [...allItems, ...items];
          
          days[dayName][mealType] = {
            name: meal.name,
            recipeId: null, // No existing recipe ID
            prepTime: meal.prepTime || 0,
            cookTime: meal.cookTime || 0,
            servings: meal.servings || 4,
            instructions: meal.instructions || [],
            tags: meal.tags || [],
            items: items,
            // Full recipe details
            recipe: {
              name: meal.name,
              description: meal.description || '',
              ingredients: meal.ingredients || [],
              instructions: meal.instructions || [],
              prepTime: meal.prepTime || 0,
              cookTime: meal.cookTime || 0,
              totalTime: (meal.prepTime || 0) + (meal.cookTime || 0),
              servings: meal.servings || 4,
              difficulty: meal.difficulty || 'medium',
              tags: meal.tags || [],
              nutritionInfo: meal.nutritionInfo || null,
              source: 'imported_meal_plan',
              notes: meal.notes || '',
              variations: meal.variations || []
            }
          };
          
          allRecipes.push({
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: meal.name,
            description: meal.description || '',
            mealType: mealType,
            day: dayName,
            prepTime: meal.prepTime || 0,
            cookTime: meal.cookTime || 0,
            totalTime: (meal.prepTime || 0) + (meal.cookTime || 0),
            servings: meal.servings || 4,
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            tags: meal.tags || [],
            difficulty: meal.difficulty || 'medium',
            nutritionInfo: meal.nutritionInfo || null,
            source: 'imported_meal_plan',
            notes: meal.notes || '',
            variations: meal.variations || [],
            parsedIngredients: items // Already processed ingredients
          });
        }
      });
    }
  });

  // Convert shopping list if provided
  const shoppingList = {
    items: [],
    name: `${mealPlan.title || 'Imported Meal Plan'} - Shopping List`
  };

  if (mealPlan.shoppingList) {
    // Use provided shopping list structure
    Object.entries(mealPlan.shoppingList).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          shoppingList.items.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productName: item.item || item.name,
            name: item.item || item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            category: category,
            size: item.size || null
          });
        });
      }
    });
  } else {
    // Use collected items from meals
    shoppingList.items = consolidateItems(allItems);
  }

  // Build final meal plan object
  const finalMealPlan = {
    id: `mealplan_${Date.now()}`,
    userId: userId,
    name: mealPlan.title || 'Imported Meal Plan',
    weekOf: mealPlan.startDate || new Date().toISOString().split('T')[0],
    endDate: mealPlan.endDate || null,
    servings: mealPlan.servings || 4,
    days: days,
    totalMeals: totalMeals,
    totalItems: shoppingList.items.length,
    recipes: allRecipes,
    shoppingList: shoppingList,
    source: 'imported',
    importedData: {
      originalFormat: 'structured_json',
      importDate: new Date().toISOString(),
      originalTitle: mealPlan.title
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return finalMealPlan;
}

/**
 * Consolidates duplicate items in a shopping list
 * @param {Array} items - Array of items to consolidate
 * @returns {Array} Consolidated items array
 */
function consolidateItems(items) {
  const itemsMap = new Map();
  
  items.forEach(item => {
    const key = `${item.productName || item.name}_${item.unit}`.toLowerCase();
    
    if (itemsMap.has(key)) {
      const existing = itemsMap.get(key);
      existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    } else {
      itemsMap.set(key, { ...item });
    }
  });
  
  return Array.from(itemsMap.values());
}

/**
 * Maps ingredient types to CartSmash categories
 * @param {Object} ingredient - The ingredient object
 * @returns {string} Category name
 */
function getCategoryFromIngredient(ingredient) {
  const itemName = (ingredient.item || '').toLowerCase();
  const note = (ingredient.note || '').toLowerCase();
  
  // Category mappings
  if (itemName.includes('meat') || itemName.includes('chicken') || itemName.includes('beef') || 
      itemName.includes('pork') || itemName.includes('turkey') || itemName.includes('salmon') ||
      itemName.includes('fish') || itemName.includes('bacon')) {
    return 'meat';
  }
  
  if (itemName.includes('milk') || itemName.includes('cheese') || itemName.includes('yogurt') ||
      itemName.includes('butter') || itemName.includes('cream') || ingredient.item.includes('egg')) {
    return 'dairy';
  }
  
  if (itemName.includes('bread') || itemName.includes('rice') || itemName.includes('pasta') ||
      itemName.includes('oats') || itemName.includes('quinoa') || itemName.includes('flour') ||
      itemName.includes('tortilla') || itemName.includes('cereal')) {
    return 'grains';
  }
  
  if (itemName.includes('apple') || itemName.includes('banana') || itemName.includes('berry') ||
      itemName.includes('orange') || itemName.includes('lemon') || itemName.includes('grape') ||
      itemName.includes('tomato') || itemName.includes('onion') || itemName.includes('carrot') ||
      itemName.includes('pepper') || itemName.includes('lettuce') || itemName.includes('spinach') ||
      itemName.includes('potato') || itemName.includes('garlic') || itemName.includes('cucumber')) {
    return 'produce';
  }
  
  if (itemName.includes('can') || itemName.includes('jar') || itemName.includes('sauce') ||
      itemName.includes('beans') || itemName.includes('soup')) {
    return 'canned';
  }
  
  if (itemName.includes('frozen')) {
    return 'frozen';
  }
  
  if (itemName.includes('nuts') || itemName.includes('crackers') || itemName.includes('chips')) {
    return 'snacks';
  }
  
  // Default to pantry for seasonings, oils, etc.
  return 'pantry';
}

/**
 * Validates imported meal plan structure
 * @param {Object} jsonMealPlan - The meal plan to validate
 * @returns {Object} Validation result with success/errors
 */
function validateMealPlanStructure(jsonMealPlan) {
  const errors = [];
  
  if (!jsonMealPlan) {
    errors.push('Meal plan object is required');
    return { success: false, errors };
  }
  
  if (!jsonMealPlan.mealPlan) {
    errors.push('mealPlan property is required');
  }
  
  if (!jsonMealPlan.mealPlan?.days || !Array.isArray(jsonMealPlan.mealPlan.days)) {
    errors.push('mealPlan.days array is required');
  } else {
    // Validate each day has proper structure
    jsonMealPlan.mealPlan.days.forEach((day, index) => {
      if (!day.meals || typeof day.meals !== 'object') {
        errors.push(`Day ${index + 1}: meals object is required`);
      }
    });
  }
  
  if (!jsonMealPlan.mealPlan?.title && !jsonMealPlan.mealPlan?.name) {
    errors.push('Meal plan title is recommended');
  }
  
  return {
    success: errors.length === 0,
    errors: errors,
    warnings: []
  };
}

/**
 * Generates summary statistics for imported meal plan
 * @param {Object} importedPlan - The imported meal plan
 * @returns {Object} Summary statistics
 */
function generateImportSummary(importedPlan) {
  const daysCount = Object.keys(importedPlan.days || {}).length;
  const mealsCount = importedPlan.totalMeals || 0;
  const itemsCount = importedPlan.totalItems || 0;
  const recipesCount = importedPlan.recipes?.length || 0;
  
  return {
    daysPlanned: daysCount,
    totalMeals: mealsCount,
    uniqueRecipes: recipesCount,
    shoppingItems: itemsCount,
    servingsPlanned: importedPlan.servings || 4,
    planDuration: `${daysCount} days`,
    categories: getCategorySummary(importedPlan.shoppingList?.items || [])
  };
}

/**
 * Gets category breakdown for shopping list
 * @param {Array} items - Shopping list items
 * @returns {Object} Category counts
 */
function getCategorySummary(items) {
  const categoryCounts = {};
  
  items.forEach(item => {
    const category = item.category || 'other';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  return categoryCounts;
}

module.exports = {
  importStructuredMealPlan,
  validateMealPlanStructure,
  generateImportSummary,
  consolidateItems,
  getCategoryFromIngredient
};