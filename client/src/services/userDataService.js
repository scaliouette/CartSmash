// client/src/services/userDataService.js
// Firebase integration service for user data (lists, meal plans, recipes)

import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';  // This imports from your firebase.js

class UserDataService {
  constructor() {
    this.currentUser = null;
  }

  // Initialize with current user
  async init() {
    this.currentUser = auth.currentUser;
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }
    return this.currentUser;
  }

  // =================== SHOPPING LISTS ===================

  /**
   * Save a parsed shopping list
   */
  async saveParsedList(listData) {
    if (!this.currentUser) await this.init();
    
    const listId = listData.id || `list_${Date.now()}`;
    const listRef = doc(db, 'users', this.currentUser.uid, 'shoppingLists', listId);
    
    const dataToSave = {
      ...listData,
      id: listId,
      userId: this.currentUser.uid,
      createdAt: listData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      items: listData.items.map(item => ({
        ...item,
        id: item.id || `item_${Date.now()}_${Math.random()}`,
        productName: item.productName || item.itemName || item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        category: item.category || 'other',
        confidence: item.confidence || 1,
        validated: item.validated || false
      }))
    };

    await setDoc(listRef, dataToSave);
    console.log('✅ Shopping list saved:', listId);
    return { success: true, listId };
  }

  /**
   * Get all shopping lists for current user
   */
  async getShoppingLists() {
    if (!this.currentUser) await this.init();
    
    const listsRef = collection(db, 'users', this.currentUser.uid, 'shoppingLists');
    const q = query(listsRef, orderBy('createdAt', 'desc'), limit(50));
    
    const snapshot = await getDocs(q);
    const lists = [];
    
    snapshot.forEach(doc => {
      lists.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📋 Retrieved ${lists.length} shopping lists`);
    return lists;
  }

  /**
   * Get a specific shopping list
   */
  async getShoppingList(listId) {
    if (!this.currentUser) await this.init();
    
    const listRef = doc(db, 'users', this.currentUser.uid, 'shoppingLists', listId);
    const listDoc = await getDoc(listRef);
    
    if (listDoc.exists()) {
      return { id: listDoc.id, ...listDoc.data() };
    } else {
      throw new Error('Shopping list not found');
    }
  }

  /**
   * Update a shopping list
   */
  async updateShoppingList(listId, updates) {
    if (!this.currentUser) await this.init();
    
    const listRef = doc(db, 'users', this.currentUser.uid, 'shoppingLists', listId);
    
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Shopping list updated:', listId);
    return { success: true };
  }

  /**
   * Delete a shopping list
   */
  async deleteShoppingList(listId) {
    if (!this.currentUser) await this.init();
    
    const listRef = doc(db, 'users', this.currentUser.uid, 'shoppingLists', listId);
    await deleteDoc(listRef);
    
    console.log('🗑️ Shopping list deleted:', listId);
    return { success: true };
  }

  // =================== MEAL PLANS ===================

  /**
   * Save a meal plan with recipes
   */
  async saveMealPlan(mealPlanData) {
    if (!this.currentUser) await this.init();
    
    const planId = mealPlanData.id || `plan_${Date.now()}`;
    const planRef = doc(db, 'users', this.currentUser.uid, 'mealPlans', planId);
    
    // Process meals to include recipe details and instructions
    const processedMeals = mealPlanData.meals.map(meal => ({
      ...meal,
      breakfast: meal.breakfast || '',
      lunch: meal.lunch || '',
      dinner: meal.dinner || '',
      recipes: {
        breakfast: meal.breakfastRecipe || null,
        lunch: meal.lunchRecipe || null,
        dinner: meal.dinnerRecipe || null
      },
      instructions: {
        breakfast: meal.breakfastInstructions || [],
        lunch: meal.lunchInstructions || [],
        dinner: meal.dinnerInstructions || []
      }
    }));
    
    const dataToSave = {
      ...mealPlanData,
      id: planId,
      userId: this.currentUser.uid,
      meals: processedMeals,
      createdAt: mealPlanData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      startDate: mealPlanData.startDate || new Date().toISOString().split('T')[0],
      endDate: mealPlanData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    await setDoc(planRef, dataToSave);
    console.log('✅ Meal plan saved:', planId);
    return { success: true, planId };
  }

  /**
   * Get all meal plans for current user
   */
  async getMealPlans() {
    if (!this.currentUser) await this.init();
    
    const plansRef = collection(db, 'users', this.currentUser.uid, 'mealPlans');
    const q = query(plansRef, orderBy('createdAt', 'desc'), limit(20));
    
    const snapshot = await getDocs(q);
    const plans = [];
    
    snapshot.forEach(doc => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📅 Retrieved ${plans.length} meal plans`);
    return plans;
  }

  /**
   * Get current week's meal plan
   */
  async getCurrentMealPlan() {
    if (!this.currentUser) await this.init();
    
    const today = new Date().toISOString().split('T')[0];
    const plansRef = collection(db, 'users', this.currentUser.uid, 'mealPlans');
    const q = query(
      plansRef,
      where('startDate', '<=', today),
      where('endDate', '>=', today),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    return null;
  }

  /**
   * Get a specific meal plan
   */
  async getMealPlan(planId) {
    if (!this.currentUser) await this.init();
    
    const planRef = doc(db, 'users', this.currentUser.uid, 'mealPlans', planId);
    const planDoc = await getDoc(planRef);
    
    if (planDoc.exists()) {
      return { id: planDoc.id, ...planDoc.data() };
    } else {
      throw new Error('Meal plan not found');
    }
  }

  /**
   * Generate shopping list from meal plan
   */
  async generateShoppingListFromMealPlan(mealPlanId) {
    if (!this.currentUser) await this.init();
    
    const mealPlan = await this.getMealPlan(mealPlanId);
    const ingredients = new Map();
    
    // Extract ingredients from all recipes in the meal plan
    mealPlan.meals.forEach(meal => {
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const recipe = meal.recipes?.[mealType];
        if (recipe && recipe.ingredients) {
          recipe.ingredients.forEach(ingredient => {
            // Parse ingredient (this could be more sophisticated)
            const parsed = this.parseIngredient(ingredient);
            const key = parsed.name.toLowerCase();
            
            if (ingredients.has(key)) {
              const existing = ingredients.get(key);
              existing.quantity += parsed.quantity;
            } else {
              ingredients.set(key, parsed);
            }
          });
        }
      });
    });
    
    // Create shopping list
    const shoppingList = {
      name: `Shopping for ${mealPlan.name}`,
      source: 'meal_plan',
      mealPlanId: mealPlanId,
      items: Array.from(ingredients.values())
    };
    
    const result = await this.saveParsedList(shoppingList);
    return { ...result, items: shoppingList.items };
  }

  /**
   * Parse ingredient string to extract quantity and name
   */
  parseIngredient(ingredientStr) {
    // Simple parsing - could be enhanced with AI
    const parts = ingredientStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s*(.+)$/);
    
    if (parts) {
      return {
        quantity: parseFloat(parts[1]) || 1,
        unit: parts[2] || 'each',
        name: parts[3] || ingredientStr,
        productName: parts[3] || ingredientStr,
        category: this.categorizeIngredient(parts[3] || ingredientStr)
      };
    }
    
    return {
      quantity: 1,
      unit: 'each',
      name: ingredientStr,
      productName: ingredientStr,
      category: this.categorizeIngredient(ingredientStr)
    };
  }

  /**
   * Simple ingredient categorization
   */
  categorizeIngredient(ingredient) {
    const lower = ingredient.toLowerCase();
    
    if (/chicken|beef|pork|fish|salmon|shrimp/.test(lower)) return 'meat';
    if (/milk|cheese|yogurt|butter|cream/.test(lower)) return 'dairy';
    if (/bread|flour|pasta|rice|cereal/.test(lower)) return 'bakery';
    if (/apple|banana|orange|tomato|lettuce|carrot/.test(lower)) return 'produce';
    if (/frozen|ice cream/.test(lower)) return 'frozen';
    if (/soda|juice|water|coffee|tea/.test(lower)) return 'beverages';
    if (/chips|cookies|candy/.test(lower)) return 'snacks';
    
    return 'pantry';
  }

  /**
   * Delete a meal plan
   */
  async deleteMealPlan(planId) {
    if (!this.currentUser) await this.init();
    
    const planRef = doc(db, 'users', this.currentUser.uid, 'mealPlans', planId);
    await deleteDoc(planRef);
    
    console.log('🗑️ Meal plan deleted:', planId);
    return { success: true };
  }

  // =================== RECIPES ===================

  /**
   * Save a recipe with full instructions
   */
  async saveRecipe(recipeData) {
    if (!this.currentUser) await this.init();
    
    const recipeId = recipeData.id || `recipe_${Date.now()}`;
    const recipeRef = doc(db, 'users', this.currentUser.uid, 'recipes', recipeId);
    
    const dataToSave = {
      ...recipeData,
      id: recipeId,
      userId: this.currentUser.uid,
      createdAt: recipeData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      instructions: recipeData.instructions || [],
      ingredients: recipeData.ingredients || [],
      nutritionInfo: recipeData.nutritionInfo || null,
      tags: recipeData.tags || [],
      source: recipeData.source || 'manual',
      imageUrl: recipeData.imageUrl || null
    };

    await setDoc(recipeRef, dataToSave);
    console.log('✅ Recipe saved:', recipeId);
    return { success: true, recipeId };
  }

  /**
   * Get all recipes for current user
   */
  async getRecipes() {
    if (!this.currentUser) await this.init();
    
    const recipesRef = collection(db, 'users', this.currentUser.uid, 'recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'), limit(100));
    
    const snapshot = await getDocs(q);
    const recipes = [];
    
    snapshot.forEach(doc => {
      recipes.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`👨‍🍳 Retrieved ${recipes.length} recipes`);
    return recipes;
  }

  /**
   * Get a specific recipe
   */
  async getRecipe(recipeId) {
    if (!this.currentUser) await this.init();
    
    const recipeRef = doc(db, 'users', this.currentUser.uid, 'recipes', recipeId);
    const recipeDoc = await getDoc(recipeRef);
    
    if (recipeDoc.exists()) {
      return { id: recipeDoc.id, ...recipeDoc.data() };
    } else {
      throw new Error('Recipe not found');
    }
  }

  /**
   * Search recipes by category or tags
   */
  async searchRecipes(searchCriteria) {
    if (!this.currentUser) await this.init();
    
    const recipesRef = collection(db, 'users', this.currentUser.uid, 'recipes');
    let q;
    
    if (searchCriteria.category) {
      q = query(recipesRef, where('category', '==', searchCriteria.category));
    } else if (searchCriteria.tags && searchCriteria.tags.length > 0) {
      q = query(recipesRef, where('tags', 'array-contains-any', searchCriteria.tags));
    } else {
      q = query(recipesRef, orderBy('createdAt', 'desc'), limit(50));
    }
    
    const snapshot = await getDocs(q);
    const recipes = [];
    
    snapshot.forEach(doc => {
      recipes.push({ id: doc.id, ...doc.data() });
    });
    
    return recipes;
  }

  /**
   * Import recipe from external source (AI or API)
   */
  async importRecipe(externalRecipeData) {
    // Process external recipe data
    const processedRecipe = {
      name: externalRecipeData.title || externalRecipeData.name,
      category: externalRecipeData.cuisine || 'Other',
      time: externalRecipeData.readyInMinutes ? `${externalRecipeData.readyInMinutes} min` : '30 min',
      servings: externalRecipeData.servings || 4,
      difficulty: this.calculateDifficulty(externalRecipeData),
      ingredients: externalRecipeData.extendedIngredients?.map(ing => ing.original) || externalRecipeData.ingredients || [],
      instructions: this.processInstructions(externalRecipeData.instructions || externalRecipeData.analyzedInstructions),
      source: 'imported',
      originalSource: externalRecipeData.sourceUrl || externalRecipeData.source || 'external',
      imageUrl: externalRecipeData.image || null,
      nutritionInfo: externalRecipeData.nutrition || null
    };
    
    return await this.saveRecipe(processedRecipe);
  }

  /**
   * Process instructions from various formats
   */
  processInstructions(instructions) {
    if (typeof instructions === 'string') {
      // Split by periods or numbered steps
      return instructions.split(/\d+\.|\.(?=\s)/).filter(step => step.trim()).map(step => step.trim());
    } else if (Array.isArray(instructions)) {
      if (instructions[0]?.steps) {
        // Spoonacular format
        return instructions[0].steps.map(step => step.step);
      } else {
        return instructions;
      }
    }
    return [];
  }

  /**
   * Calculate recipe difficulty based on various factors
   */
  calculateDifficulty(recipeData) {
    const steps = recipeData.instructions?.length || 0;
    const ingredients = recipeData.extendedIngredients?.length || recipeData.ingredients?.length || 0;
    const time = recipeData.readyInMinutes || 30;
    
    if (steps > 10 || ingredients > 15 || time > 60) return 'Hard';
    if (steps > 5 || ingredients > 8 || time > 30) return 'Medium';
    return 'Easy';
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(recipeId) {
    if (!this.currentUser) await this.init();
    
    const recipeRef = doc(db, 'users', this.currentUser.uid, 'recipes', recipeId);
    await deleteDoc(recipeRef);
    
    console.log('🗑️ Recipe deleted:', recipeId);
    return { success: true };
  }

  // =================== USER PREFERENCES ===================

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences) {
    if (!this.currentUser) await this.init();
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    
    await updateDoc(userRef, {
      preferences: {
        ...preferences,
        updatedAt: serverTimestamp()
      }
    });
    
    console.log('✅ User preferences saved');
    return { success: true };
  }

  /**
   * Get user preferences
   */
  async getUserPreferences() {
    if (!this.currentUser) await this.init();
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().preferences || {};
    }
    
    return {};
  }

  // =================== STATISTICS ===================

  /**
   * Get user statistics
   */
  async getUserStats() {
    if (!this.currentUser) await this.init();
    
    try {
      const [lists, mealPlans, recipes] = await Promise.all([
        this.getShoppingLists().catch(() => []),
        this.getMealPlans().catch(() => []),
        this.getRecipes().catch(() => [])
      ]);
      
      // Calculate stats
      const stats = {
        totalLists: lists.length,
        totalMealPlans: mealPlans.length,
        totalRecipes: recipes.length,
        itemsParsed: lists.reduce((sum, list) => sum + (list.items?.length || 0), 0),
        currentWeekLists: lists.filter(list => {
          const listDate = new Date(list.createdAt?.seconds * 1000 || list.createdAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return listDate > weekAgo;
        }).length,
        favoriteCategories: this.calculateFavoriteCategories(lists),
        recentActivity: this.getRecentActivity(lists, mealPlans, recipes)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      // Return default stats on error
      return {
        totalLists: 0,
        totalMealPlans: 0,
        totalRecipes: 0,
        itemsParsed: 0,
        currentWeekLists: 0,
        favoriteCategories: [],
        recentActivity: []
      };
    }
  }

  /**
   * Calculate favorite shopping categories
   */
  calculateFavoriteCategories(lists) {
    const categoryCount = {};
    
    lists.forEach(list => {
      list.items?.forEach(item => {
        const category = item.category || 'other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });
    
    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * Get recent activity
   */
  getRecentActivity(lists, mealPlans, recipes) {
    const activities = [];
    
    // Add recent lists
    lists.slice(0, 3).forEach(list => {
      activities.push({
        type: 'list',
        name: list.name || 'Untitled List',
        date: list.createdAt,
        id: list.id
      });
    });
    
    // Add recent meal plans
    mealPlans.slice(0, 2).forEach(plan => {
      activities.push({
        type: 'mealplan',
        name: plan.name || 'Untitled Plan',
        date: plan.createdAt,
        id: plan.id
      });
    });
    
    // Add recent recipes
    recipes.slice(0, 2).forEach(recipe => {
      activities.push({
        type: 'recipe',
        name: recipe.name || 'Untitled Recipe',
        date: recipe.createdAt,
        id: recipe.id
      });
    });
    
    // Sort by date
    return activities.sort((a, b) => {
      const dateA = a.date?.seconds || new Date(a.date).getTime() / 1000 || 0;
      const dateB = b.date?.seconds || new Date(b.date).getTime() / 1000 || 0;
      return dateB - dateA;
    });
  }
}

// Export singleton instance
const userDataService = new UserDataService();
export default userDataService;