// server/routes/account.js - Complete Account Management Routes
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateUser, validateCartOperation } = require('../middleware/auth');
const AIProductParser = require('../utils/aiProductParser');

const db = admin.firestore();
const aiParser = new AIProductParser();

// ============================================
// USER PROFILE MANAGEMENT
// ============================================

// GET /api/account/profile - Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user profile from Firestore
    const profileDoc = await db.collection('profiles').doc(userId).get();
    
    if (!profileDoc.exists) {
      // Create default profile if doesn't exist
      const defaultProfile = {
        userId: userId,
        email: req.user.email,
        displayName: req.user.displayName || '',
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
      
      await db.collection('profiles').doc(userId).set(defaultProfile);
      
      return res.json({
        success: true,
        profile: defaultProfile
      });
    }
    
    res.json({
      success: true,
      profile: profileDoc.data()
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// PUT /api/account/profile - Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const updates = req.body;
    
    // Validate updates
    const allowedFields = [
      'displayName', 'phone', 'defaultStore', 'dietaryPreferences',
      'familySize', 'weeklyBudget', 'notifications'
    ];
    
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }
    
    filteredUpdates.updatedAt = new Date().toISOString();
    
    // Update profile in Firestore
    await db.collection('profiles').doc(userId).update(filteredUpdates);
    
    // Get updated profile
    const profileDoc = await db.collection('profiles').doc(userId).get();
    
    res.json({
      success: true,
      profile: profileDoc.data(),
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// ============================================
// SAVED LISTS MANAGEMENT
// ============================================

// GET /api/account/lists - Get all saved lists
router.get('/lists', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const listsSnapshot = await db.collection('savedLists')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const lists = [];
    listsSnapshot.forEach(doc => {
      lists.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      lists: lists,
      count: lists.length
    });
  } catch (error) {
    console.error('Error fetching saved lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved lists',
      message: error.message
    });
  }
});

// POST /api/account/lists - Save a new list
router.post('/lists', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, items, estimatedTotal } = req.body;
    
    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid list data'
      });
    }
    
    const newList = {
      userId: userId,
      name: name,
      items: items,
      estimatedTotal: estimatedTotal || 0,
      itemCount: items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shared: false,
      shareId: null
    };
    
    const docRef = await db.collection('savedLists').add(newList);
    
    res.json({
      success: true,
      list: {
        id: docRef.id,
        ...newList
      },
      message: 'List saved successfully'
    });
  } catch (error) {
    console.error('Error saving list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save list',
      message: error.message
    });
  }
});

// PUT /api/account/lists/:listId - Update a saved list
router.put('/lists/:listId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { listId } = req.params;
    const updates = req.body;
    
    // Verify ownership
    const listDoc = await db.collection('savedLists').doc(listId).get();
    
    if (!listDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }
    
    if (listDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this list'
      });
    }
    
    // Update list
    updates.updatedAt = new Date().toISOString();
    if (updates.items) {
      updates.itemCount = updates.items.length;
    }
    
    await db.collection('savedLists').doc(listId).update(updates);
    
    const updatedDoc = await db.collection('savedLists').doc(listId).get();
    
    res.json({
      success: true,
      list: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      },
      message: 'List updated successfully'
    });
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update list',
      message: error.message
    });
  }
});

// DELETE /api/account/lists/:listId - Delete a saved list
router.delete('/lists/:listId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { listId } = req.params;
    
    // Verify ownership
    const listDoc = await db.collection('savedLists').doc(listId).get();
    
    if (!listDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }
    
    if (listDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this list'
      });
    }
    
    await db.collection('savedLists').doc(listId).delete();
    
    res.json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete list',
      message: error.message
    });
  }
});

// POST /api/account/lists/:listId/share - Share a list
router.post('/lists/:listId/share', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { listId } = req.params;
    
    // Verify ownership
    const listDoc = await db.collection('savedLists').doc(listId).get();
    
    if (!listDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }
    
    if (listDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to share this list'
      });
    }
    
    // Generate share ID
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.collection('savedLists').doc(listId).update({
      shared: true,
      shareId: shareId
    });
    
    const shareUrl = `${process.env.CLIENT_URL}/shared/${shareId}`;
    
    res.json({
      success: true,
      shareUrl: shareUrl,
      shareId: shareId
    });
  } catch (error) {
    console.error('Error sharing list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share list',
      message: error.message
    });
  }
});

// POST /api/account/lists/:listId/load - Load a list into current cart
router.post('/lists/:listId/load', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { listId } = req.params;
    const { merge = false } = req.body;
    
    // Get the list
    const listDoc = await db.collection('savedLists').doc(listId).get();
    
    if (!listDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }
    
    const listData = listDoc.data();
    
    // Verify ownership or shared access
    if (listData.userId !== userId && !listData.shared) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this list'
      });
    }
    
    // Get current cart
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    let currentItems = [];
    if (cartDoc.exists && merge) {
      currentItems = cartDoc.data().items || [];
    }
    
    // Prepare items from saved list
    const listItems = listData.items.map(item => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      fromList: listData.name,
      fromListId: listId
    }));
    
    // Combine items
    const finalItems = merge ? [...currentItems, ...listItems] : listItems;
    
    // Update cart
    await cartRef.set({
      items: finalItems,
      lastUpdated: new Date().toISOString(),
      userId: userId
    }, { merge: true });
    
    res.json({
      success: true,
      itemsAdded: listItems.length,
      totalItems: finalItems.length,
      message: `List "${listData.name}" loaded into cart`
    });
  } catch (error) {
    console.error('Error loading list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load list',
      message: error.message
    });
  }
});

// ============================================
// MEAL PLANS MANAGEMENT
// ============================================

// GET /api/account/meals - Get all meal plans
router.get('/meals', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const mealsSnapshot = await db.collection('mealPlans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const meals = [];
    mealsSnapshot.forEach(doc => {
      meals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      meals: meals,
      count: meals.length
    });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meal plans',
      message: error.message
    });
  }
});

// POST /api/account/meals - Create a new meal plan
router.post('/meals', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, items, servings, prepTime, cookTime, description, tags, isImport, importData } = req.body;
    
    // Handle structured JSON meal plan import
    if (isImport && importData) {
      const { importStructuredMealPlan, validateMealPlanStructure, generateImportSummary } = require('../utils/mealPlanImporter');
      
      // Validate the import data
      const validation = validateMealPlanStructure(importData);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid meal plan structure',
          details: validation.errors
        });
      }
      
      // Import the structured meal plan
      const importedPlan = importStructuredMealPlan(importData, userId);
      const summary = generateImportSummary(importedPlan);
      
      // Save to Firestore
      const docRef = await db.collection('mealPlans').add(importedPlan);
      
      // Also save individual recipes to user's recipe collection
      const savedRecipeIds = [];
      for (const recipe of importedPlan.recipes || []) {
        try {
          const recipeData = {
            userId: userId,
            name: recipe.name,
            description: recipe.description || '',
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            prepTime: recipe.prepTime || 0,
            cookTime: recipe.cookTime || 0,
            servings: recipe.servings || 4,
            tags: [...(recipe.tags || []), 'imported', recipe.mealType || ''],
            source: 'meal_plan_import',
            difficulty: recipe.difficulty || 'medium',
            parsedIngredients: recipe.parsedIngredients || [],
            fromMealPlan: {
              id: docRef.id,
              name: importedPlan.name,
              day: recipe.day,
              mealType: recipe.mealType
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const recipeDocRef = await db.collection('recipes').add(recipeData);
          savedRecipeIds.push(recipeDocRef.id);
          console.log(`✅ Saved recipe: ${recipe.name} (${recipeDocRef.id})`);
        } catch (error) {
          console.error(`⚠️ Failed to save recipe ${recipe.name}:`, error.message);
        }
      }
      
      return res.json({
        success: true,
        meal: {
          id: docRef.id,
          ...importedPlan
        },
        summary: summary,
        recipesCreated: savedRecipeIds.length,
        message: `Meal plan "${importedPlan.name}" imported successfully with ${summary.totalMeals} meals, ${summary.shoppingItems} shopping items, and ${savedRecipeIds.length} individual recipes saved`
      });
    }
    
    // Handle regular meal plan creation
    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meal plan data'
      });
    }
    
    const newMeal = {
      userId: userId,
      name: name,
      items: items,
      servings: servings || 4,
      prepTime: prepTime || 30,
      cookTime: cookTime || 30,
      description: description || '',
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('mealPlans').add(newMeal);
    
    res.json({
      success: true,
      meal: {
        id: docRef.id,
        ...newMeal
      },
      message: 'Meal plan created successfully'
    });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meal plan',
      message: error.message
    });
  }
});

// POST /api/account/meals/:mealId/add-to-cart - Add meal items to cart
router.post('/meals/:mealId/add-to-cart', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { mealId } = req.params;
    const { scaleFactor = 1 } = req.body;
    
    // Get meal plan
    const mealDoc = await db.collection('mealPlans').doc(mealId).get();
    
    if (!mealDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }
    
    const mealData = mealDoc.data();
    
    // Verify ownership
    if (mealData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this meal plan'
      });
    }
    
    // Scale items if needed
    const scaledItems = mealData.items.map(item => ({
      ...item,
      quantity: (item.quantity || 1) * scaleFactor,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      fromMeal: mealData.name,
      fromMealId: mealId
    }));
    
    // Add to cart
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    let currentItems = [];
    if (cartDoc.exists) {
      currentItems = cartDoc.data().items || [];
    }
    
    const finalItems = [...currentItems, ...scaledItems];
    
    await cartRef.set({
      items: finalItems,
      lastUpdated: new Date().toISOString(),
      userId: userId
    }, { merge: true });
    
    res.json({
      success: true,
      itemsAdded: scaledItems.length,
      totalItems: finalItems.length,
      message: `Meal plan "${mealData.name}" added to cart`
    });
  } catch (error) {
    console.error('Error adding meal to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add meal to cart',
      message: error.message
    });
  }
});

// DELETE /api/account/meals/:mealId - Delete a meal plan
router.delete('/meals/:mealId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { mealId } = req.params;
    
    // Verify ownership
    const mealDoc = await db.collection('mealPlans').doc(mealId).get();
    
    if (!mealDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }
    
    if (mealDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this meal plan'
      });
    }
    
    await db.collection('mealPlans').doc(mealId).delete();
    
    res.json({
      success: true,
      message: 'Meal plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meal plan',
      message: error.message
    });
  }
});

// ============================================
// RECIPES MANAGEMENT
// ============================================

// GET /api/account/recipes - Get all saved recipes
router.get('/recipes', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const recipesSnapshot = await db.collection('recipes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const recipes = [];
    recipesSnapshot.forEach(doc => {
      recipes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      recipes: recipes,
      count: recipes.length
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes',
      message: error.message
    });
  }
});

// POST /api/account/recipes - Save a new recipe
router.post('/recipes', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { 
      name, 
      description, 
      ingredients, 
      instructions, 
      prepTime, 
      cookTime, 
      servings,
      image,
      tags,
      source
    } = req.body;
    
    if (!name || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe data'
      });
    }
    
    const newRecipe = {
      userId: userId,
      name: name,
      description: description || '',
      ingredients: ingredients,
      instructions: instructions || [],
      prepTime: prepTime || 30,
      cookTime: cookTime || 30,
      servings: servings || 4,
      image: image || null,
      tags: tags || [],
      source: source || 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('recipes').add(newRecipe);
    
    res.json({
      success: true,
      recipe: {
        id: docRef.id,
        ...newRecipe
      },
      message: 'Recipe saved successfully'
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save recipe',
      message: error.message
    });
  }
});

// POST /api/account/recipes/:recipeId/parse-ingredients - Parse recipe ingredients with AI
router.post('/recipes/:recipeId/parse-ingredients', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { recipeId } = req.params;
    
    // Get recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    
    if (!recipeDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    const recipeData = recipeDoc.data();
    
    // Verify ownership
    if (recipeData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this recipe'
      });
    }
    
    // Parse ingredients with AI
    const ingredientsText = recipeData.ingredients.join('\n');
    const parsedResult = await aiParser.parseGroceryProducts(ingredientsText, {
      context: 'recipe',
      recipeName: recipeData.name
    });
    
    // Update recipe with parsed ingredients
    await db.collection('recipes').doc(recipeId).update({
      parsedIngredients: parsedResult.products,
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      parsedIngredients: parsedResult.products,
      stats: aiParser.getParsingStats(parsedResult),
      message: 'Ingredients parsed successfully'
    });
  } catch (error) {
    console.error('Error parsing ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse ingredients',
      message: error.message
    });
  }
});

// POST /api/account/recipes/:recipeId/shop - Add recipe ingredients to cart
router.post('/recipes/:recipeId/shop', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { recipeId } = req.params;
    const { scaleFactor = 1 } = req.body;
    
    // Get recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    
    if (!recipeDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    const recipeData = recipeDoc.data();
    
    // Verify ownership
    if (recipeData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this recipe'
      });
    }
    
    // Use parsed ingredients if available, otherwise parse on the fly
    let ingredients = recipeData.parsedIngredients;
    
    if (!ingredients) {
      const ingredientsText = recipeData.ingredients.join('\n');
      const parsedResult = await aiParser.parseGroceryProducts(ingredientsText);
      ingredients = parsedResult.products;
    }
    
    // Scale and prepare items
    const cartItems = ingredients.map(item => ({
      ...item,
      quantity: (item.quantity || 1) * scaleFactor,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      fromRecipe: recipeData.name,
      fromRecipeId: recipeId
    }));
    
    // Add to cart
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    let currentItems = [];
    if (cartDoc.exists) {
      currentItems = cartDoc.data().items || [];
    }
    
    const finalItems = [...currentItems, ...cartItems];
    
    await cartRef.set({
      items: finalItems,
      lastUpdated: new Date().toISOString(),
      userId: userId
    }, { merge: true });
    
    res.json({
      success: true,
      itemsAdded: cartItems.length,
      totalItems: finalItems.length,
      message: `Recipe "${recipeData.name}" ingredients added to cart`
    });
  } catch (error) {
    console.error('Error shopping for recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add recipe ingredients to cart',
      message: error.message
    });
  }
});

// DELETE /api/account/recipes/:recipeId - Delete a recipe
router.delete('/recipes/:recipeId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { recipeId } = req.params;
    
    // Verify ownership
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    
    if (!recipeDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    if (recipeDoc.data().userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this recipe'
      });
    }
    
    await db.collection('recipes').doc(recipeId).delete();
    
    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recipe',
      message: error.message
    });
  }
});

// ============================================
// SHOPPING HISTORY
// ============================================

// GET /api/account/history - Get shopping history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, startDate, endDate } = req.query;
    
    let query = db.collection('shoppingHistory')
      .where('userId', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(parseInt(limit));
    
    if (startDate) {
      query = query.where('completedAt', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('completedAt', '<=', endDate);
    }
    
    const historySnapshot = await query.get();
    
    const history = [];
    historySnapshot.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      history: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shopping history',
      message: error.message
    });
  }
});

// POST /api/account/history - Record shopping trip
router.post('/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { 
      storeName, 
      items, 
      total, 
      savings, 
      paymentMethod,
      notes 
    } = req.body;
    
    if (!storeName || !items || !total) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shopping history data'
      });
    }
    
    const historyEntry = {
      userId: userId,
      storeName: storeName,
      items: items,
      itemCount: items.length,
      total: total,
      savings: savings || 0,
      paymentMethod: paymentMethod || 'unknown',
      notes: notes || '',
      completedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('shoppingHistory').add(historyEntry);
    
    // Update user stats
    await updateUserStats(userId, total, items.length);
    
    res.json({
      success: true,
      entry: {
        id: docRef.id,
        ...historyEntry
      },
      message: 'Shopping trip recorded'
    });
  } catch (error) {
    console.error('Error recording history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record shopping history',
      message: error.message
    });
  }
});

// POST /api/account/history/:historyId/reorder - Reorder items from history
router.post('/history/:historyId/reorder', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { historyId } = req.params;
    
    // Get history entry
    const historyDoc = await db.collection('shoppingHistory').doc(historyId).get();
    
    if (!historyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'History entry not found'
      });
    }
    
    const historyData = historyDoc.data();
    
    // Verify ownership
    if (historyData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this history'
      });
    }
    
    // Add items to cart
    const cartItems = historyData.items.map(item => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      fromHistory: historyId,
      reordered: true
    }));
    
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    let currentItems = [];
    if (cartDoc.exists) {
      currentItems = cartDoc.data().items || [];
    }
    
    const finalItems = [...currentItems, ...cartItems];
    
    await cartRef.set({
      items: finalItems,
      lastUpdated: new Date().toISOString(),
      userId: userId
    }, { merge: true });
    
    res.json({
      success: true,
      itemsAdded: cartItems.length,
      totalItems: finalItems.length,
      message: 'Items reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder items',
      message: error.message
    });
  }
});

// ============================================
// USER STATISTICS
// ============================================

// GET /api/account/stats - Get user statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get all collections data
    const [listsSnapshot, mealsSnapshot, recipesSnapshot, historySnapshot] = await Promise.all([
      db.collection('savedLists').where('userId', '==', userId).get(),
      db.collection('mealPlans').where('userId', '==', userId).get(),
      db.collection('recipes').where('userId', '==', userId).get(),
      db.collection('shoppingHistory').where('userId', '==', userId).get()
    ]);
    
    // Calculate stats
    const totalLists = listsSnapshot.size;
    const totalMeals = mealsSnapshot.size;
    const totalRecipes = recipesSnapshot.size;
    const totalTrips = historySnapshot.size;
    
    let totalItems = 0;
    let totalSpent = 0;
    let totalSaved = 0;
    const storeFrequency = {};
    
    listsSnapshot.forEach(doc => {
      const data = doc.data();
      totalItems += data.itemCount || 0;
    });
    
    historySnapshot.forEach(doc => {
      const data = doc.data();
      totalSpent += data.total || 0;
      totalSaved += data.savings || 0;
      
      if (data.storeName) {
        storeFrequency[data.storeName] = (storeFrequency[data.storeName] || 0) + 1;
      }
    });
    
    const favoriteStore = Object.keys(storeFrequency).reduce((a, b) => 
      storeFrequency[a] > storeFrequency[b] ? a : b, 
      'No data'
    );
    
    const avgListSize = totalLists > 0 ? Math.round(totalItems / totalLists) : 0;
    const avgTripCost = totalTrips > 0 ? (totalSpent / totalTrips).toFixed(2) : 0;
    
    // Calculate monthly spend
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    let monthlySpend = 0;
    
    historySnapshot.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.completedAt);
      if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
        monthlySpend += data.total || 0;
      }
    });
    
    res.json({
      success: true,
      stats: {
        totalLists,
        totalMeals,
        totalRecipes,
        totalTrips,
        totalItems,
        totalSpent: totalSpent.toFixed(2),
        totalSaved: totalSaved.toFixed(2),
        favoriteStore,
        avgListSize,
        avgTripCost,
        monthlySpend: monthlySpend.toFixed(2),
        storeFrequency
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// Helper function to update user stats
async function updateUserStats(userId, amount, itemCount) {
  try {
    const statsRef = db.collection('userStats').doc(userId);
    const statsDoc = await statsRef.get();
    
    if (!statsDoc.exists) {
      await statsRef.set({
        totalSpent: amount,
        totalItems: itemCount,
        tripCount: 1,
        lastUpdated: new Date().toISOString()
      });
    } else {
      const currentStats = statsDoc.data();
      await statsRef.update({
        totalSpent: (currentStats.totalSpent || 0) + amount,
        totalItems: (currentStats.totalItems || 0) + itemCount,
        tripCount: (currentStats.tripCount || 0) + 1,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// POST /api/account/logout - Logout user and clean up tokens
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`🚪 Processing logout for user: ${userId}`);
    
    // Import services (lazy loading to avoid circular dependencies)
    const KrogerAuthService = require('../services/KrogerAuthService');
    const authService = new KrogerAuthService();
    
    // Clean up Kroger OAuth tokens and states
    const result = await authService.logoutUser(userId);
    
    // Also clean up any cart data in Firestore
    await db.collection('carts').doc(userId).delete().catch(err => {
      console.warn(`⚠️ Could not clean up cart for ${userId}:`, err.message);
    });
    
    console.log(`✅ User ${userId} logged out successfully`);
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      details: result
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
      message: error.message
    });
  }
});

// GET /api/account/export - Export all user data
router.get('/export', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Fetch all user data
    const [profile, lists, meals, recipes, history, cart] = await Promise.all([
      db.collection('profiles').doc(userId).get(),
      db.collection('savedLists').where('userId', '==', userId).get(),
      db.collection('mealPlans').where('userId', '==', userId).get(),
      db.collection('recipes').where('userId', '==', userId).get(),
      db.collection('shoppingHistory').where('userId', '==', userId).get(),
      db.collection('carts').doc(userId).get()
    ]);
    
    const exportData = {
      profile: profile.exists ? profile.data() : null,
      savedLists: [],
      mealPlans: [],
      recipes: [],
      shoppingHistory: [],
      currentCart: cart.exists ? cart.data() : null,
      exportDate: new Date().toISOString(),
      userId: userId
    };
    
    lists.forEach(doc => {
      exportData.savedLists.push({ id: doc.id, ...doc.data() });
    });
    
    meals.forEach(doc => {
      exportData.mealPlans.push({ id: doc.id, ...doc.data() });
    });
    
    recipes.forEach(doc => {
      exportData.recipes.push({ id: doc.id, ...doc.data() });
    });
    
    history.forEach(doc => {
      exportData.shoppingHistory.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({
      success: true,
      data: exportData,
      message: 'Data exported successfully'
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: error.message
    });
  }
});

module.exports = router;