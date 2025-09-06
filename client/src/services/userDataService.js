// client/src/services/userDataService.js
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { auth } from '../firebase';

class UserDataService {
  constructor() {
    this.db = null;
    this.userId = null;
  }

  async init() {
    if (!this.db) {
      this.db = getFirestore();
    }
    
    if (auth.currentUser) {
      this.userId = auth.currentUser.uid;
    }
    
    return this.db;
  }

  // Save current cart/shopping list
  async saveShoppingList(list) {
    await this.init();
    if (!this.userId) {
      console.log('User not authenticated, saving to localStorage only');
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(list.items || []));
      return list;
    }

    try {
      const listRef = doc(this.db, 'users', this.userId, 'lists', list.id || 'current-cart');
      
      // Filter out undefined values to prevent Firestore errors
      const cleanList = Object.entries(list).reduce((clean, [key, value]) => {
        if (value !== undefined) {
          clean[key] = value;
        }
        return clean;
      }, {});
      
      await setDoc(listRef, {
        ...cleanList,
        userId: this.userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ List saved to Firestore:', list.id || 'current-cart');
      return list;
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      // Fallback to localStorage
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(list.items || []));
      throw error;
    }
  }

  // Save parsed list
  async saveParsedList(list) {
    return this.saveShoppingList(list);
  }

  // Get all shopping lists
  async getShoppingLists() {
    await this.init();
    if (!this.userId) {
      // Return from localStorage if not authenticated
      const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      return localLists;
    }

    try {
      const listsRef = collection(this.db, 'users', this.userId, 'lists');
      const q = query(listsRef, orderBy('updatedAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      
      const lists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Save to localStorage as backup
      localStorage.setItem('cartsmash-lists', JSON.stringify(lists));
      
      return lists;
    } catch (error) {
      console.error('Error fetching lists from Firestore:', error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
    }
  }

  // Save recipe
  async saveRecipe(recipe) {
    await this.init();
    
    // Validate recipe object
    if (!recipe || typeof recipe !== 'object') {
      throw new Error('Invalid recipe: recipe must be an object');
    }
    
    if (!recipe.id) {
      throw new Error('Invalid recipe: recipe must have an id');
    }
    
    if (!this.userId) {
      throw new Error('User not authenticated - cannot save recipe to Firestore');
    }

    try {
      const recipeRef = doc(this.db, 'users', this.userId, 'recipes', recipe.id);
      await setDoc(recipeRef, {
        ...recipe,
        userId: this.userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Recipe saved to Firestore:', recipe.id);
      
      return recipe;
    } catch (error) {
      console.error('Error saving recipe to Firestore:', error);
      throw error;
    }
  }

  // Get all recipes
  async getRecipes() {
    await this.init();
    if (!this.userId) {
      // Return empty array for unauthenticated users
      console.log('👤 User not authenticated - returning empty recipes array');
      return [];
    }

    try {
      const recipesRef = collection(this.db, 'users', this.userId, 'recipes');
      const q = query(recipesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Loaded ${recipes.length} recipes from Firestore`);
      return recipes;
    } catch (error) {
      console.error('Error fetching recipes from Firestore:', error);
      throw error; // Don't fall back to localStorage anymore
    }
  }

  // Save meal plan
  async saveMealPlan(mealPlan) {
    await this.init();
    if (!this.userId) {
      // Save to localStorage if not authenticated
      const localMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      const existingIndex = localMealPlans.findIndex(p => p.id === mealPlan.id);
      if (existingIndex >= 0) {
        localMealPlans[existingIndex] = mealPlan;
      } else {
        localMealPlans.push(mealPlan);
      }
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(localMealPlans));
      return mealPlan;
    }

    try {
      if (!this.userId) {
        throw new Error('User ID is not available for Firebase operation');
      }
      
      if (!mealPlan.id) {
        throw new Error('Meal plan ID is required for save operation');
      }
      
      const planRef = doc(this.db, 'users', this.userId, 'mealPlans', mealPlan.id);
      await setDoc(planRef, {
        ...mealPlan,
        userId: this.userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Meal plan saved to Firestore:', mealPlan.id);
      
      // Also save to localStorage as backup
      const localMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      const existingIndex = localMealPlans.findIndex(p => p.id === mealPlan.id);
      if (existingIndex >= 0) {
        localMealPlans[existingIndex] = mealPlan;
      } else {
        localMealPlans.push(mealPlan);
      }
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(localMealPlans));
      
      return mealPlan;
    } catch (error) {
      console.error('Error saving meal plan to Firestore:', error);
      // Fallback to localStorage
      const localMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      const existingIndex = localMealPlans.findIndex(p => p.id === mealPlan.id);
      if (existingIndex >= 0) {
        localMealPlans[existingIndex] = mealPlan;
      } else {
        localMealPlans.push(mealPlan);
      }
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(localMealPlans));
      throw error;
    }
  }

  // Get meal plans
  async getMealPlans() {
    await this.init();
    if (!this.userId) {
      // Return from localStorage if not authenticated
      return JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    }

    try {
      const plansRef = collection(this.db, 'users', this.userId, 'mealPlans');
      const q = query(plansRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const mealPlans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Save to localStorage as backup
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(mealPlans));
      
      return mealPlans;
    } catch (error) {
      console.error('Error fetching meal plans from Firestore:', error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    }
  }

  // Delete methods
  async deleteShoppingList(listId) {
    await this.init();
    if (!this.userId) {
      // Delete from localStorage if not authenticated
      const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const filtered = localLists.filter(l => l.id !== listId);
      localStorage.setItem('cartsmash-lists', JSON.stringify(filtered));
      return;
    }
    
    try {
      await deleteDoc(doc(this.db, 'users', this.userId, 'lists', listId));
      console.log('✅ List deleted from Firestore:', listId);
      
      // Also delete from localStorage
      const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const filtered = localLists.filter(l => l.id !== listId);
      localStorage.setItem('cartsmash-lists', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting list from Firestore:', error);
      throw error;
    }
  }

  async deleteRecipe(recipeId) {
    await this.init();
    if (!this.userId) {
      throw new Error('User not authenticated - cannot delete recipe from Firestore');
    }
    
    try {
      await deleteDoc(doc(this.db, 'users', this.userId, 'recipes', recipeId));
      console.log('✅ Recipe deleted from Firestore:', recipeId);
    } catch (error) {
      console.error('Error deleting recipe from Firestore:', error);
      throw error;
    }
  }

  async deleteMealPlan(planId) {
    await this.init();
    if (!this.userId) {
      // Delete from localStorage if not authenticated
      const localMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      const filtered = localMealPlans.filter(p => p.id !== planId);
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(filtered));
      return;
    }
    
    try {
      await deleteDoc(doc(this.db, 'users', this.userId, 'mealPlans', planId));
      console.log('✅ Meal plan deleted from Firestore:', planId);
      
      // Also delete from localStorage
      const localMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      const filtered = localMealPlans.filter(p => p.id !== planId);
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting meal plan from Firestore:', error);
      throw error;
    }
  }

  // Update shopping list
  async updateShoppingList(listId, updates) {
    await this.init();
    if (!this.userId) {
      // Update in localStorage if not authenticated
      const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const index = localLists.findIndex(l => l.id === listId);
      if (index >= 0) {
        localLists[index] = { ...localLists[index], ...updates };
        localStorage.setItem('cartsmash-lists', JSON.stringify(localLists));
      }
      return updates;
    }

    try {
      const listRef = doc(this.db, 'users', this.userId, 'lists', listId);
      await setDoc(listRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ List updated in Firestore:', listId);
      
      // Also update in localStorage
      const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const index = localLists.findIndex(l => l.id === listId);
      if (index >= 0) {
        localLists[index] = { ...localLists[index], ...updates };
        localStorage.setItem('cartsmash-lists', JSON.stringify(localLists));
      }
      
      return updates;
    } catch (error) {
      console.error('Error updating list in Firestore:', error);
      throw error;
    }
  }

  // Get user preferences
  async getUserPreferences() {
    await this.init();
    if (!this.userId) {
      // Return from localStorage if not authenticated
      return JSON.parse(localStorage.getItem('cartsmash-preferences') || '{}');
    }

    try {
      const prefRef = doc(this.db, 'users', this.userId);
      const prefDoc = await getDoc(prefRef);
      
      if (prefDoc.exists()) {
        const prefs = prefDoc.data();
        // Save to localStorage as backup
        localStorage.setItem('cartsmash-preferences', JSON.stringify(prefs));
        return prefs;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching preferences from Firestore:', error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('cartsmash-preferences') || '{}');
    }
  }

  // Alias for saveRecipe to maintain compatibility
  async saveUserRecipe(recipe) {
    return this.saveRecipe(recipe);
  }

  // Save user preferences
  async saveUserPreferences(preferences) {
    await this.init();
    if (!this.userId) {
      // Save to localStorage if not authenticated
      localStorage.setItem('cartsmash-preferences', JSON.stringify(preferences));
      return preferences;
    }

    try {
      const userRef = doc(this.db, 'users', this.userId);
      await setDoc(userRef, {
        ...preferences,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Preferences saved to Firestore');
      
      // Also save to localStorage as backup
      localStorage.setItem('cartsmash-preferences', JSON.stringify(preferences));
      
      return preferences;
    } catch (error) {
      console.error('Error saving preferences to Firestore:', error);
      // Fallback to localStorage
      localStorage.setItem('cartsmash-preferences', JSON.stringify(preferences));
      throw error;
    }
  }
}

const userDataService = new UserDataService();
export default userDataService;