// client/src/contexts/CartContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  // Core State
  const [currentCart, setCurrentCart] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load all user data on mount or user change
  useEffect(() => {
    if (currentUser) {
      loadAllUserData();
    } else {
      // Load from localStorage for non-authenticated users
      loadLocalData();
    }
  }, [currentUser]);

  // Load all data from server/localStorage
  const loadAllUserData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/data`, {
        headers: { 'user-id': currentUser?.uid }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentCart(data.cart || []);
        setSavedLists(data.lists || []);
        setSavedRecipes(data.recipes || []);
        setMealPlans(data.mealPlans || []);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      loadLocalData(); // Fallback to local
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalData = () => {
    const localCart = JSON.parse(localStorage.getItem('cartsmash-current-cart') || '[]');
    const localLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
    const localRecipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
    const localMeals = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    
    setCurrentCart(localCart);
    setSavedLists(localLists);
    setSavedRecipes(localRecipes);
    setMealPlans(localMeals);
  };

  // Save data to localStorage (backup)
  const saveToLocal = useCallback(() => {
    localStorage.setItem('cartsmash-current-cart', JSON.stringify(currentCart));
    localStorage.setItem('cartsmash-lists', JSON.stringify(savedLists));
    localStorage.setItem('cartsmash-recipes', JSON.stringify(savedRecipes));
    localStorage.setItem('cartsmash-mealplans', JSON.stringify(mealPlans));
  }, [currentCart, savedLists, savedRecipes, mealPlans]);

  // Auto-save to local storage
  useEffect(() => {
    saveToLocal();
  }, [currentCart, savedLists, savedRecipes, mealPlans, saveToLocal]);

  // ============ CART OPERATIONS ============

  // Parse and add items to cart
  const parseAndAddToCart = async (listText, options = {}) => {
    const { merge = true, recipeInfo = null } = options;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText,
          action: merge ? 'merge' : 'replace',
          userId: currentUser?.uid,
          recipeInfo,
          options: {
            mergeDuplicates: true,
            enhancedQuantityParsing: true,
            detectContainers: true
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentCart(data.cart);
        
        // If this was from a recipe, save it
        if (recipeInfo && recipeInfo.name) {
          await saveRecipe({
            ...recipeInfo,
            ingredients: listText,
            parsedItems: data.cart
          });
        }
        
        return data;
      }
      throw new Error(data.error || 'Failed to parse list');
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update cart item
  const updateCartItem = async (itemId, updates) => {
    const updatedCart = currentCart.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    setCurrentCart(updatedCart);
    
    // Sync to server if authenticated
    if (currentUser) {
      try {
        await fetch(`${API_URL}/api/cart/items/${itemId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid 
          },
          body: JSON.stringify(updates)
        });
      } catch (error) {
        console.error('Failed to sync item update:', error);
      }
    }
  };

  // Remove from cart
  const removeFromCart = async (itemId) => {
    // Remove from local state immediately for better UX
    setCurrentCart(prev => prev.filter(item => item.id !== itemId));
    
    // Also remove from server if user is authenticated
    try {
      if (currentUser?.uid) {
        const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'user-id': currentUser.uid
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to delete item from server, but removed locally');
        } else {
          console.log(`✅ Successfully deleted item ${itemId} from server`);
        }
      }
    } catch (error) {
      console.warn('Error deleting item from server:', error.message);
      // Don't re-add item to cart, keep the optimistic removal
    }
  };

  // Clear entire cart
  const clearCart = () => {
    setCurrentCart([]);
  };

  // ============ RECIPE OPERATIONS ============

  // Save a recipe
  const saveRecipe = async (recipe) => {
    const newRecipe = {
      id: `recipe_${Date.now()}`,
      ...recipe,
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid
    };
    
    setSavedRecipes(prev => [...prev, newRecipe]);
    
    // Sync to server
    if (currentUser) {
      try {
        await fetch(`${API_URL}/api/recipes`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid 
          },
          body: JSON.stringify(newRecipe)
        });
      } catch (error) {
        console.error('Failed to save recipe to server:', error);
      }
    }
    
    return newRecipe;
  };

  // Load recipe into cart
  const loadRecipeToCart = async (recipe, merge = false) => {
    if (!recipe.ingredients && !recipe.parsedItems) {
      setError('Recipe has no ingredients');
      return;
    }
    
    // If recipe has pre-parsed items, use those
    if (recipe.parsedItems) {
      if (merge) {
        setCurrentCart(prev => [...prev, ...recipe.parsedItems]);
      } else {
        setCurrentCart(recipe.parsedItems);
      }
      return { success: true, itemsAdded: recipe.parsedItems.length };
    }
    
    // Otherwise, parse the ingredients
    return await parseAndAddToCart(recipe.ingredients, { 
      merge, 
      recipeInfo: recipe 
    });
  };

  // Delete recipe
  const deleteRecipe = (recipeId) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  // ============ SHOPPING LIST OPERATIONS ============

  // Save current cart as a list
  const saveCartAsList = async (name, metadata = {}) => {
    if (currentCart.length === 0) {
      setError('Cart is empty');
      return null;
    }
    
    const newList = {
      id: `list_${Date.now()}`,
      name: name || `Shopping List ${new Date().toLocaleDateString()}`,
      items: [...currentCart],
      itemCount: currentCart.length,
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid,
      ...metadata
    };
    
    setSavedLists(prev => [...prev, newList]);
    
    // Sync to server
    if (currentUser) {
      try {
        await fetch(`${API_URL}/api/cart/save-list`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid 
          },
          body: JSON.stringify(newList)
        });
      } catch (error) {
        console.error('Failed to save list to server:', error);
      }
    }
    
    return newList;
  };

  // Load a saved list into cart
  const loadListToCart = (list, merge = false) => {
    if (!list.items || list.items.length === 0) {
      setError('List is empty');
      return;
    }
    
    if (merge) {
      setCurrentCart(prev => [...prev, ...list.items]);
    } else {
      setCurrentCart(list.items);
    }
    
    return { success: true, itemsLoaded: list.items.length };
  };

  // Delete a saved list
  const deleteList = (listId) => {
    setSavedLists(prev => prev.filter(l => l.id !== listId));
  };

  // ============ MEAL PLAN OPERATIONS ============

  // Create meal plan from current cart
  const createMealPlan = async (planData) => {
    const newPlan = {
      id: `meal_${Date.now()}`,
      ...planData,
      items: [...currentCart],
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid
    };
    
    setMealPlans(prev => [...prev, newPlan]);
    
    // Optionally save the meal plan's shopping list
    if (planData.saveAsList) {
      await saveCartAsList(`${planData.name} - Shopping List`, {
        mealPlanId: newPlan.id
      });
    }
    
    return newPlan;
  };

  // Load meal plan items to cart
  const loadMealPlanToCart = (mealPlan, merge = false) => {
    if (!mealPlan.items || mealPlan.items.length === 0) {
      setError('Meal plan has no items');
      return;
    }
    
    if (merge) {
      setCurrentCart(prev => [...prev, ...mealPlan.items]);
    } else {
      setCurrentCart(mealPlan.items);
    }
    
    return { success: true, itemsLoaded: mealPlan.items.length };
  };

  // ============ VALIDATION OPERATIONS ============

  // Validate all items in cart
  const validateCart = async () => {
    if (currentCart.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/cart/validate-all`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': currentUser?.uid 
        },
        body: JSON.stringify({ items: currentCart })
      });
      
      const data = await response.json();
      if (data.success && data.cart) {
        setCurrentCart(data.cart);
        return data.validation;
      }
    } catch (error) {
      setError('Validation failed');
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ STATISTICS ============

  const getStats = () => {
    const totalItems = currentCart.length;
    const totalLists = savedLists.length;
    const totalRecipes = savedRecipes.length;
    const totalMealPlans = mealPlans.length;
    
    const allParsedItems = [
      ...currentCart,
      ...savedLists.flatMap(l => l.items || []),
      ...mealPlans.flatMap(m => m.items || [])
    ];
    
    const uniqueProducts = new Set(
      allParsedItems.map(item => 
        (item.productName || item.name || '').toLowerCase()
      )
    ).size;
    
    return {
      totalItems,
      totalLists,
      totalRecipes,
      totalMealPlans,
      uniqueProducts,
      itemsParsed: allParsedItems.length
    };
  };

  // ============ QUICK ACTIONS ============

  // Convert recipe text to cart items quickly
  const quickAddRecipe = async (recipeText, recipeName = null) => {
    const result = await parseAndAddToCart(recipeText, {
      merge: true,
      recipeInfo: recipeName ? { name: recipeName } : null
    });
    
    if (recipeName && result.success) {
      await saveRecipe({
        name: recipeName,
        ingredients: recipeText,
        parsedItems: result.cart
      });
    }
    
    return result;
  };

  // Quick templates
  const applyTemplate = (templateName) => {
    const templates = {
      'Weekly Essentials': [
        { productName: 'Milk', quantity: 1, unit: 'gallon', category: 'dairy' },
        { productName: 'Bread', quantity: 2, unit: 'loaf', category: 'bakery' },
        { productName: 'Eggs', quantity: 1, unit: 'dozen', category: 'dairy' },
        { productName: 'Butter', quantity: 1, unit: 'stick', category: 'dairy' },
        { productName: 'Bananas', quantity: 6, unit: 'each', category: 'produce' }
      ],
      'Party Supplies': [
        { productName: 'Chips', quantity: 3, unit: 'bag', category: 'snacks' },
        { productName: 'Soda', quantity: 2, unit: '12-pack', category: 'beverages' },
        { productName: 'Napkins', quantity: 1, unit: 'package', category: 'household' },
        { productName: 'Paper plates', quantity: 1, unit: 'package', category: 'household' }
      ]
    };
    
    const items = templates[templateName];
    if (items) {
      const itemsWithIds = items.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setCurrentCart(prev => [...prev, ...itemsWithIds]);
      return { success: true, itemsAdded: items.length };
    }
    return { success: false, error: 'Template not found' };
  };

  const value = {
    // State
    currentCart,
    savedLists,
    savedRecipes,
    mealPlans,
    isLoading,
    error,
    
    // Cart operations
    parseAndAddToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setCurrentCart,
    
    // Recipe operations
    saveRecipe,
    loadRecipeToCart,
    deleteRecipe,
    
    // List operations
    saveCartAsList,
    loadListToCart,
    deleteList,
    
    // Meal plan operations
    createMealPlan,
    loadMealPlanToCart,
    
    // Utility operations
    validateCart,
    getStats,
    quickAddRecipe,
    applyTemplate,
    
    // Data management
    loadAllUserData,
    saveToLocal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};