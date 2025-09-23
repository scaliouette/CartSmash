// client/src/services/aiMealPlanService.js
// Service functions for AI meal plan integration

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Generate a meal plan using AI
 */
export async function generateAIMealPlan(preferences, currentUser = null) {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    
    // Get auth token if user is provided
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser && typeof currentUser.getIdToken === 'function') {
      const token = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/api/meal-plans/generate-meal-plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        familySize: preferences.familySize || 4,
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        mealPreferences: preferences.mealPreferences || [],
        budget: preferences.budget || 'moderate',
        prepTimePreference: preferences.prepTimePreference || 'balanced',
        includeSnacks: preferences.includeSnacks !== false,
        daysCount: preferences.daysCount || 7
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating AI meal plan:', error);
    throw error;
  }
}

/**
 * Parse AI-generated meal plan text
 */
export async function parseAIMealPlan(aiResponse, userId) {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    
    const response = await fetch(`${API_URL}/api/meal-plans/parse-meal-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiResponse, userId })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to process meal plan');
    }

    return data.mealPlan;
  } catch (error) {
    console.error('Error processing AI meal plan:', error);
    throw error;
  }
}

/**
 * Save parsed meal plan to Firestore
 */
export async function saveParsedMealPlan(uid, mealPlan) {
  try {
    // Create main meal plan document with safe metadata access
    const metadata = mealPlan.metadata || {};
    const mealPlanRef = await addDoc(collection(db, 'users', uid, 'mealPlans'), {
      name: metadata.title || 'AI Generated Meal Plan',
      familySize: metadata.familySize || 4,
      source: 'ai-generated',
      status: 'draft',
      weekSchedule: mealPlan.weekSchedule || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Save recipes to user's recipe library (with safety check)
    const recipes = mealPlan.recipes || [];
    const recipePromises = recipes.map(recipe => 
      saveRecipeWithAssignment(uid, recipe, mealPlanRef.id)
    );
    
    await Promise.all(recipePromises);

    // Save shopping list (with safety check)
    const shoppingList = mealPlan.shoppingList || [];
    await saveShoppingList(uid, mealPlanRef.id, shoppingList);

    return mealPlanRef.id;
  } catch (error) {
    console.error('Error saving meal plan:', error);
    throw error;
  }
}

/**
 * Save individual recipe and assign to meal plan
 */
async function saveRecipeWithAssignment(uid, recipe, mealPlanId) {
  try {
    // Save to recipe library
    const recipeRef = doc(db, 'users', uid, 'recipes', recipe.id);
    await setDoc(recipeRef, {
      ...recipe,
      mealPlanIds: arrayUnion(mealPlanId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create meal assignment
    const assignmentRef = doc(
      db, 
      'users', 
      uid, 
      'mealPlans', 
      mealPlanId, 
      'assignments', 
      `${recipe.dayAssigned}-${recipe.mealType}`
    );
    
    await setDoc(assignmentRef, {
      recipeId: recipe.id,
      day: recipe.dayAssigned,
      slot: recipe.mealType,
      servings: recipe.servings,
      assignedAt: serverTimestamp()
    });

    return recipeRef.id;
  } catch (error) {
    console.error('Error saving recipe with assignment:', error);
    throw error;
  }
}

/**
 * Save shopping list for meal plan
 */
async function saveShoppingList(uid, mealPlanId, shoppingList) {
  try {
    const shoppingListRef = doc(
      db, 
      'users', 
      uid, 
      'mealPlans', 
      mealPlanId, 
      'shoppingList', 
      'items'
    );

    await setDoc(shoppingListRef, {
      items: shoppingList,
      totalItems: shoppingList.length,
      purchasedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return shoppingListRef.id;
  } catch (error) {
    console.error('Error saving shopping list:', error);
    throw error;
  }
}

/**
 * Bulk import recipes from AI meal plan
 */
export async function bulkImportRecipes(uid, recipes, mealPlanId = null) {
  try {
    const results = {
      successful: [],
      failed: []
    };

    for (const recipe of recipes) {
      try {
        const recipeData = {
          ...recipe,
          source: 'ai-generated',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (mealPlanId) {
          recipeData.mealPlanIds = arrayUnion(mealPlanId);
        }

        const recipeRef = doc(db, 'users', uid, 'recipes', recipe.id);
        await setDoc(recipeRef, recipeData);
        
        results.successful.push(recipe.id);
      } catch (error) {
        console.error(`Failed to import recipe ${recipe.id}:`, error);
        results.failed.push({ id: recipe.id, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in bulk import:', error);
    throw error;
  }
}

/**
 * Update meal plan with user modifications
 */
export async function updateMealPlan(uid, mealPlanId, updates) {
  try {
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', mealPlanId);
    
    await updateDoc(mealPlanRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error updating meal plan:', error);
    throw error;
  }
}

/**
 * Get AI meal plan by ID
 */
export async function getAIMealPlan(uid, mealPlanId) {
  try {
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', mealPlanId);
    const mealPlanDoc = await getDoc(mealPlanRef);

    if (!mealPlanDoc.exists()) {
      throw new Error('Meal plan not found');
    }

    const mealPlanData = {
      id: mealPlanDoc.id,
      ...mealPlanDoc.data()
    };

    // Fetch associated recipes
    const recipePromises = [];
    if (mealPlanData.weekSchedule) {
      Object.values(mealPlanData.weekSchedule).forEach(day => {
        Object.values(day.meals).forEach(recipeId => {
          if (recipeId) {
            recipePromises.push(getRecipe(uid, recipeId));
          }
        });
      });
    }

    const recipes = await Promise.all(recipePromises);
    mealPlanData.recipes = recipes.filter(r => r !== null);

    return mealPlanData;
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    throw error;
  }
}

/**
 * Get individual recipe
 */
async function getRecipe(uid, recipeId) {
  try {
    const recipeRef = doc(db, 'users', uid, 'recipes', recipeId);
    const recipeDoc = await getDoc(recipeRef);

    if (!recipeDoc.exists()) {
      return null;
    }

    return {
      id: recipeDoc.id,
      ...recipeDoc.data()
    };
  } catch (error) {
    console.error(`Error fetching recipe ${recipeId}:`, error);
    return null;
  }
}

/**
 * Export meal plan to various formats
 */
export async function exportMealPlan(uid, mealPlanId, format = 'json') {
  try {
    const mealPlan = await getAIMealPlan(uid, mealPlanId);

    switch (format) {
      case 'json':
        return JSON.stringify(mealPlan, null, 2);
      
      case 'pdf':
        // TODO: PDF generation service not yet implemented
        throw new Error('PDF export not yet available');
      
      case 'csv':
        // Convert to CSV format for shopping list
        return convertShoppingListToCSV(mealPlan.shoppingList);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting meal plan:', error);
    throw error;
  }
}

/**
 * Convert shopping list to CSV format
 */
function convertShoppingListToCSV(shoppingList) {
  const headers = ['Category', 'Item', 'Quantity', 'Unit', 'Purchased'];
  const rows = [headers.join(',')];

  shoppingList.forEach(item => {
    const row = [
      item.category,
      `"${item.item}"`,
      item.quantity || '',
      item.unit || '',
      item.purchased ? 'Yes' : 'No'
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Regenerate specific meals with AI
 */
export async function regenerateMeal(uid, mealPlanId, day, mealType, preferences, currentUser = null) {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    
    // Get auth token if user is provided
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser && typeof currentUser.getIdToken === 'function') {
      const token = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/api/meal-plans/regenerate-meal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: uid,
        mealPlanId,
        day,
        mealType,
        preferences
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to regenerate meal');
    }

    // Update the meal plan with new recipe
    await updateMealAssignment(uid, mealPlanId, day, mealType, data.recipe);

    return data.recipe;
  } catch (error) {
    console.error('Error regenerating meal:', error);
    throw error;
  }
}

/**
 * Create enhanced Instacart recipe page from AI-generated recipe
 */
export async function createInstacartRecipePage(recipe, preferences = {}) {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    
    // Map recipe data to enhanced Instacart format
    const recipePayload = {
      title: recipe.name || recipe.title,
      author: 'CartSmash AI',
      servings: recipe.servings || 4,
      instructions: recipe.instructions || [],
      ingredients: recipe.ingredients?.map(ingredient => ({
        name: ingredient.name || ingredient.item,
        quantity: ingredient.quantity || 1,
        unit: ingredient.unit || 'each',
        displayText: ingredient.displayText || ingredient.name || ingredient.item
      })) || [],
      dietaryRestrictions: preferences.dietaryRestrictions || [],
      partnerUrl: `https://cartsmash.com/recipe/${recipe.id || 'generated'}`,
      enablePantryItems: true,
      externalReferenceId: recipe.id
    };
    
    console.log('🍳 Creating enhanced Instacart recipe:', recipePayload.title);
    
    const response = await fetch(`${API_URL}/api/instacart/recipe/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipePayload)
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create Instacart recipe');
    }
    
    console.log('✅ Enhanced Instacart recipe created:', data.instacartUrl);
    return data;
  } catch (error) {
    console.error('Error creating enhanced Instacart recipe:', error);
    throw error;
  }
}


/**
 * Bulk create Instacart recipe pages for meal plan recipes
 */
export async function bulkCreateInstacartRecipes(recipes, preferences = {}) {
  try {
    const results = {
      successful: [],
      failed: []
    };
    
    for (const recipe of recipes) {
      try {
        const instacartResult = await createInstacartRecipePage(recipe, preferences);
        results.successful.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          instacartUrl: instacartResult.instacartUrl,
          cached: instacartResult.cached || false
        });
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to create Instacart recipe for ${recipe.name}:`, error);
        results.failed.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in bulk Instacart recipe creation:', error);
    throw error;
  }
}

/**
 * Update meal assignment in meal plan
 */
async function updateMealAssignment(uid, mealPlanId, day, mealType, recipe) {
  try {
    // Save new recipe to library
    await saveRecipeWithAssignment(uid, recipe, mealPlanId);

    // Update week schedule
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', mealPlanId);
    const updatePath = `weekSchedule.${day}.meals.${mealType}`;
    
    await updateDoc(mealPlanRef, {
      [updatePath]: recipe.id,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error updating meal assignment:', error);
    throw error;
  }
}