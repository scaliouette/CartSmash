// server/services/databaseService.js
// Database service for meal plans and recipes

const admin = require('firebase-admin');

// Get Firestore instance from initialized admin
const getDB = () => {
  if (admin.apps.length === 0) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.firestore();
};

/**
 * Save recipe to user's library
 */
async function saveRecipeToDatabase(userId, recipe) {
  try {
    console.log('💾 Saving recipe to database:', { userId, recipeId: recipe.id, title: recipe.title });
    const db = getDB();
    const recipeRef = db.collection('users').doc(userId).collection('recipes').doc(recipe.id);
    await recipeRef.set({
      ...recipe,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Recipe saved successfully to database:', recipe.id);
    return recipe.id;
  } catch (error) {
    console.error('❌ Error saving recipe to database:', error);
    throw error;
  }
}

/**
 * Save meal plan to user account
 */
async function saveMealPlanToUser(userId, mealPlan) {
  try {
    const db = getDB();
    const planId = mealPlan.planId || `meal-plan-${Date.now()}`;
    const mealPlanRef = db.collection('users').doc(userId).collection('mealPlans').doc(planId);
    
    await mealPlanRef.set({
      ...mealPlan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return planId;
  } catch (error) {
    console.error('Error saving meal plan to database:', error);
    throw error;
  }
}

/**
 * Get meal plan by ID
 */
async function getMealPlan(userId, mealPlanId) {
  try {
    const db = getDB();
    const mealPlanRef = db.collection('users').doc(userId).collection('mealPlans').doc(mealPlanId);
    const doc = await mealPlanRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting meal plan from database:', error);
    throw error;
  }
}

/**
 * Get user's recipes
 */
async function getUserRecipes(userId) {
  try {
    const db = getDB();
    const recipesRef = db.collection('users').doc(userId).collection('recipes');
    const snapshot = await recipesRef.get();
    
    const recipes = [];
    snapshot.forEach(doc => {
      recipes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return recipes;
  } catch (error) {
    console.error('Error getting user recipes from database:', error);
    throw error;
  }
}

/**
 * Get user's meal plans
 */
async function getUserMealPlans(userId) {
  try {
    const db = getDB();
    const mealPlansRef = db.collection('users').doc(userId).collection('mealPlans');
    const snapshot = await mealPlansRef.get();
    
    const mealPlans = [];
    snapshot.forEach(doc => {
      mealPlans.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return mealPlans;
  } catch (error) {
    console.error('Error getting user meal plans from database:', error);
    throw error;
  }
}

module.exports = {
  saveRecipeToDatabase,
  saveMealPlanToUser,
  getMealPlan,
  getUserRecipes,
  getUserMealPlans
};