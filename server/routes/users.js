// server/routes/users.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// In-memory storage with size limits to prevent memory leaks
class BoundedMap {
  constructor(maxSize = 1000) {
    this.map = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      // Remove oldest entry (FIFO)
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
  
  get(key) {
    return this.map.get(key);
  }
  
  has(key) {
    return this.map.has(key);
  }
  
  delete(key) {
    return this.map.delete(key);
  }
  
  size() {
    return this.map.size;
  }
}

const userProfiles = new BoundedMap(1000);
const userLists = new BoundedMap(1000);
const userMeals = new BoundedMap(1000);
const userRecipes = new BoundedMap(1000);
const userHistory = new BoundedMap(2000); // More history entries

// GET /api/users/:userId/profile - Get user profile
router.get('/:userId/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is accessing their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let profile = userProfiles.get(userId);
    
    // Create default profile if doesn't exist
    if (!profile) {
      profile = {
        userId,
        displayName: req.user.displayName || req.user.email,
        email: req.user.email,
        phone: '',
        defaultStore: 'kroger',
        dietaryPreferences: [],
        familySize: 4,
        weeklyBudget: 150,
        notifications: {
          email: true,
          sms: false,
          deals: true,
          mealPlans: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      userProfiles.set(userId, profile);
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/:userId/profile - Update user profile
router.put('/:userId/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is updating their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const profile = userProfiles.get(userId) || {};
    const updatedProfile = {
      ...profile,
      ...req.body,
      userId,
      email: req.user.email, // Email can't be changed here
      updatedAt: new Date().toISOString()
    };
    
    userProfiles.set(userId, updatedProfile);
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/:userId/lists - Get user's saved lists
router.get('/:userId/lists', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const lists = userLists.get(userId) || [];
    res.json(lists);
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/users/:userId/lists - Save a new list
router.post('/:userId/lists', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const lists = userLists.get(userId) || [];
    const newList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: req.body.name || `List ${lists.length + 1}`,
      items: req.body.items || [],
      estimatedTotal: req.body.estimatedTotal || 0,
      tags: req.body.tags || [],
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    lists.unshift(newList);
    userLists.set(userId, lists);
    
    res.json(newList);
  } catch (error) {
    console.error('Error saving list:', error);
    res.status(500).json({ error: 'Failed to save list' });
  }
});

// DELETE /api/users/:userId/lists/:listId - Delete a list
router.delete('/:userId/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const { userId, listId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const lists = userLists.get(userId) || [];
    const filteredLists = lists.filter(list => list.id !== listId);
    
    if (lists.length === filteredLists.length) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    userLists.set(userId, filteredLists);
    
    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// GET /api/users/:userId/meals - Get user's meal plans
router.get('/:userId/meals', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const meals = userMeals.get(userId) || {};
    res.json(meals);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// POST /api/users/:userId/meals - Save a meal plan
router.post('/:userId/meals', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const meals = userMeals.get(userId) || {};
    const mealName = req.body.name || `Meal ${Object.keys(meals).length + 1}`;
    
    const newMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: mealName,
      items: req.body.items || [],
      servings: req.body.servings || 4,
      prepTime: req.body.prepTime || '30 min',
      description: req.body.description || '',
      tags: req.body.tags || [],
      createdAt: new Date().toISOString()
    };
    
    meals[mealName] = newMeal.items;
    userMeals.set(userId, meals);
    
    res.json(newMeal);
  } catch (error) {
    console.error('Error saving meal:', error);
    res.status(500).json({ error: 'Failed to save meal' });
  }
});

// DELETE /api/users/:userId/meals/:mealName - Delete a meal plan
router.delete('/:userId/meals/:mealName', authMiddleware, async (req, res) => {
  try {
    const { userId, mealName } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const meals = userMeals.get(userId) || {};
    
    if (!meals[mealName]) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    delete meals[mealName];
    userMeals.set(userId, meals);
    
    res.json({ success: true, message: 'Meal deleted' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// GET /api/users/:userId/recipes - Get user's recipes
router.get('/:userId/recipes', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const recipes = userRecipes.get(userId) || [];
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// POST /api/users/:userId/recipes - Save a recipe
router.post('/:userId/recipes', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const recipes = userRecipes.get(userId) || [];
    const newRecipe = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: req.body.name || 'Untitled Recipe',
      description: req.body.description || '',
      ingredients: req.body.ingredients || [],
      instructions: req.body.instructions || [],
      prepTime: req.body.prepTime || '30 min',
      cookTime: req.body.cookTime || '30 min',
      servings: req.body.servings || 4,
      difficulty: req.body.difficulty || 'medium',
      tags: req.body.tags || [],
      image: req.body.image || null,
      nutrition: req.body.nutrition || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    recipes.unshift(newRecipe);
    userRecipes.set(userId, recipes);
    
    res.json(newRecipe);
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// DELETE /api/users/:userId/recipes/:recipeId - Delete a recipe
router.delete('/:userId/recipes/:recipeId', authMiddleware, async (req, res) => {
  try {
    const { userId, recipeId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const recipes = userRecipes.get(userId) || [];
    const filteredRecipes = recipes.filter(recipe => recipe.id !== recipeId);
    
    if (recipes.length === filteredRecipes.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    userRecipes.set(userId, filteredRecipes);
    
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// GET /api/users/:userId/history - Get shopping history
router.get('/:userId/history', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const history = userHistory.get(userId) || [];
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/users/:userId/history - Add to shopping history
router.post('/:userId/history', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const history = userHistory.get(userId) || [];
    const newEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      date: req.body.date || new Date().toISOString(),
      storeName: req.body.storeName || 'Grocery Store',
      itemCount: req.body.itemCount || 0,
      total: req.body.total || 0,
      savings: req.body.savings || 0,
      items: req.body.items || [],
      action: req.body.action || 'Shopping trip completed',
      value: req.body.value || '',
      createdAt: new Date().toISOString()
    };
    
    history.unshift(newEntry);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(100);
    }
    
    userHistory.set(userId, history);
    
    res.json(newEntry);
  } catch (error) {
    console.error('Error adding history:', error);
    res.status(500).json({ error: 'Failed to add history' });
  }
});

// GET /api/users/:userId/stats - Get user statistics
router.get('/:userId/stats', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const lists = userLists.get(userId) || [];
    const meals = userMeals.get(userId) || {};
    const recipes = userRecipes.get(userId) || [];
    const history = userHistory.get(userId) || [];
    
    // Calculate statistics
    const totalItems = lists.reduce((sum, list) => sum + (list.items?.length || 0), 0);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlySpend = history
      .filter(entry => {
        const date = new Date(entry.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((sum, entry) => sum + (entry.total || 0), 0);
    
    const stats = {
      totalLists: lists.length,
      totalMeals: Object.keys(meals).length,
      totalRecipes: recipes.length,
      totalItems,
      totalTrips: history.length,
      monthlySpend,
      averageListSize: lists.length > 0 ? Math.round(totalItems / lists.length) : 0,
      totalSaved: history.reduce((sum, entry) => sum + (entry.savings || 0), 0)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

module.exports = router;