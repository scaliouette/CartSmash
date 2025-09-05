// client/src/services/mealPlanService.js
// Service functions for meal plan management

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Create a new meal plan
 */
export async function createMealPlan({ uid, name, startDate, familySize, description = '' }) {
  try {
    const mealPlanData = {
      name,
      startDate,
      familySize,
      description,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const mealPlanRef = await addDoc(collection(db, 'users', uid, 'mealPlans'), mealPlanData);
    return mealPlanRef.id;
  } catch (error) {
    console.error('Error creating meal plan:', error);
    throw error;
  }
}

/**
 * Get all meal plans for a user
 */
export async function getUserMealPlans(uid) {
  try {
    const mealPlansRef = collection(db, 'users', uid, 'mealPlans');
    const q = query(mealPlansRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const mealPlans = [];
    snapshot.forEach(doc => {
      mealPlans.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return mealPlans;
  } catch (error) {
    console.error('Error getting meal plans:', error);
    throw error;
  }
}

/**
 * Get a specific meal plan
 */
export async function getMealPlan(uid, mealPlanId) {
  try {
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', mealPlanId);
    const mealPlanDoc = await getDoc(mealPlanRef);

    if (!mealPlanDoc.exists()) {
      throw new Error('Meal plan not found');
    }

    return {
      id: mealPlanDoc.id,
      ...mealPlanDoc.data()
    };
  } catch (error) {
    console.error('Error getting meal plan:', error);
    throw error;
  }
}

/**
 * Update meal plan
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
 * Delete meal plan
 */
export async function deleteMealPlan(uid, mealPlanId) {
  try {
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', mealPlanId);
    await deleteDoc(mealPlanRef);
    return true;
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    throw error;
  }
}

/**
 * Assign recipe to meal plan
 */
export async function assignRecipeToMeal({ uid, planId, day, slot, servings, recipeId }) {
  try {
    // Create meal assignment document
    const assignmentRef = doc(
      db, 
      'users', 
      uid, 
      'mealPlans', 
      planId, 
      'assignments', 
      `${day}-${slot}`
    );
    
    await setDoc(assignmentRef, {
      recipeId,
      day,
      slot,
      servings: servings || 4,
      assignedAt: serverTimestamp()
    });

    // Update meal plan's week schedule
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', planId);
    const updatePath = `weekSchedule.${day}.meals.${slot}`;
    
    await updateDoc(mealPlanRef, {
      [updatePath]: recipeId,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error assigning recipe to meal:', error);
    throw error;
  }
}

/**
 * Remove recipe from meal plan
 */
export async function removeRecipeFromMeal({ uid, planId, day, slot }) {
  try {
    // Delete meal assignment document
    const assignmentRef = doc(
      db, 
      'users', 
      uid, 
      'mealPlans', 
      planId, 
      'assignments', 
      `${day}-${slot}`
    );
    
    await deleteDoc(assignmentRef);

    // Update meal plan's week schedule
    const mealPlanRef = doc(db, 'users', uid, 'mealPlans', planId);
    const updatePath = `weekSchedule.${day}.meals.${slot}`;
    
    await updateDoc(mealPlanRef, {
      [updatePath]: null,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error removing recipe from meal:', error);
    throw error;
  }
}

/**
 * Get meal assignments for a plan
 */
export async function getMealAssignments(uid, mealPlanId) {
  try {
    const assignmentsRef = collection(db, 'users', uid, 'mealPlans', mealPlanId, 'assignments');
    const snapshot = await getDocs(assignmentsRef);
    
    const assignments = [];
    snapshot.forEach(doc => {
      assignments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return assignments;
  } catch (error) {
    console.error('Error getting meal assignments:', error);
    throw error;
  }
}

/**
 * Generate shopping list from meal plan
 */
export async function generateShoppingListFromMealPlan(uid, mealPlanId) {
  try {
    // Get meal plan and assignments
    const mealPlan = await getMealPlan(uid, mealPlanId);
    const assignments = await getMealAssignments(uid, mealPlanId);
    
    // Collect all recipe IDs
    const recipeIds = assignments.map(a => a.recipeId).filter(Boolean);
    
    // Fetch all recipes
    const recipes = [];
    for (const recipeId of recipeIds) {
      try {
        const recipeRef = doc(db, 'users', uid, 'recipes', recipeId);
        const recipeDoc = await getDoc(recipeRef);
        if (recipeDoc.exists()) {
          recipes.push({
            id: recipeDoc.id,
            ...recipeDoc.data()
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch recipe ${recipeId}:`, error);
      }
    }
    
    // Aggregate ingredients
    const ingredientMap = new Map();
    
    recipes.forEach(recipe => {
      if (recipe.ingredients) {
        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.item.toLowerCase();
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            // Simple quantity aggregation (could be more sophisticated)
            existing.quantity += ingredient.quantity || 0;
          } else {
            ingredientMap.set(key, {
              ...ingredient,
              recipes: [recipe.title]
            });
          }
        });
      }
    });
    
    // Convert to array and categorize
    const shoppingList = Array.from(ingredientMap.values()).map((ingredient, index) => ({
      id: `item-${index + 1}`,
      item: `${ingredient.quantity || 1} ${ingredient.unit || 'unit'} ${ingredient.item}`,
      category: categorizeIngredient(ingredient.item),
      checked: false,
      purchased: false,
      addedAt: new Date().toISOString(),
      recipes: ingredient.recipes
    }));
    
    return shoppingList;
  } catch (error) {
    console.error('Error generating shopping list:', error);
    throw error;
  }
}

/**
 * Simple ingredient categorization
 */
function categorizeIngredient(itemName) {
  const item = itemName.toLowerCase();
  
  if (item.match(/chicken|beef|pork|fish|turkey|salmon|tuna|meat|bacon/)) {
    return 'proteins';
  }
  if (item.match(/milk|cheese|yogurt|butter|cream|egg/)) {
    return 'dairy';
  }
  if (item.match(/bread|rice|pasta|flour|oats|quinoa|cereal/)) {
    return 'grains';
  }
  if (item.match(/apple|banana|orange|berry|fruit|vegetable|onion|garlic|tomato|lettuce|carrot|broccoli/)) {
    return 'produce';
  }
  if (item.match(/oil|vinegar|salt|pepper|sauce|spice|herb|seasoning/)) {
    return 'pantry';
  }
  
  return 'other';
}

/**
 * Save shopping list to meal plan
 */
export async function saveShoppingListToMealPlan(uid, mealPlanId, shoppingList) {
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
      generatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error saving shopping list:', error);
    throw error;
  }
}

/**
 * Get shopping list for meal plan
 */
export async function getShoppingListForMealPlan(uid, mealPlanId) {
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

    const shoppingListDoc = await getDoc(shoppingListRef);
    
    if (!shoppingListDoc.exists()) {
      // Generate shopping list if it doesn't exist
      const generatedList = await generateShoppingListFromMealPlan(uid, mealPlanId);
      await saveShoppingListToMealPlan(uid, mealPlanId, generatedList);
      return generatedList;
    }

    return shoppingListDoc.data().items || [];
  } catch (error) {
    console.error('Error getting shopping list:', error);
    throw error;
  }
}

/**
 * Update shopping list item
 */
export async function updateShoppingListItem(uid, mealPlanId, itemId, updates) {
  try {
    // Get current shopping list
    const shoppingList = await getShoppingListForMealPlan(uid, mealPlanId);
    
    // Update the specific item
    const updatedList = shoppingList.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    // Save back to database
    await saveShoppingListToMealPlan(uid, mealPlanId, updatedList);
    
    return true;
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    throw error;
  }
}

/**
 * Duplicate meal plan
 */
export async function duplicateMealPlan(uid, sourceMealPlanId, newName) {
  try {
    // Get source meal plan
    const sourceMealPlan = await getMealPlan(uid, sourceMealPlanId);
    const assignments = await getMealAssignments(uid, sourceMealPlanId);
    
    // Create new meal plan
    const newMealPlanId = await createMealPlan({
      uid,
      name: newName || `${sourceMealPlan.name} (Copy)`,
      startDate: new Date().toISOString(),
      familySize: sourceMealPlan.familySize,
      description: sourceMealPlan.description
    });
    
    // Copy assignments
    for (const assignment of assignments) {
      await assignRecipeToMeal({
        uid,
        planId: newMealPlanId,
        day: assignment.day,
        slot: assignment.slot,
        servings: assignment.servings,
        recipeId: assignment.recipeId
      });
    }
    
    return newMealPlanId;
  } catch (error) {
    console.error('Error duplicating meal plan:', error);
    throw error;
  }
}