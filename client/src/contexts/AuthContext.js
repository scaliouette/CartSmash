// client/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('cartsmash-token');
    const user = localStorage.getItem('cartsmash-user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        loadUserProfile(userData.id);
      } catch (error) {
        console.error('Error loading user session:', error);
        localStorage.removeItem('cartsmash-token');
        localStorage.removeItem('cartsmash-user');
      }
    }
    setLoading(false);
  }, []);

  // Load user profile from backend
  const loadUserProfile = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        
        // Load user-specific data
        loadUserData(userId);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Load all user data (lists, meals, recipes, etc.)
  const loadUserData = async (userId) => {
    try {
      // Load saved lists
      const listsResponse = await fetch(`/api/users/${userId}/lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        }
      });
      
      if (listsResponse.ok) {
        const lists = await listsResponse.json();
        localStorage.setItem('cartsmash-saved-lists', JSON.stringify(lists));
      }

      // Load meal plans
      const mealsResponse = await fetch(`/api/users/${userId}/meals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        }
      });
      
      if (mealsResponse.ok) {
        const meals = await mealsResponse.json();
        localStorage.setItem('cartsmash-meal-groups', JSON.stringify(meals));
      }

      // Load recipes
      const recipesResponse = await fetch(`/api/users/${userId}/recipes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        }
      });
      
      if (recipesResponse.ok) {
        const recipes = await recipesResponse.json();
        localStorage.setItem('cartsmash-recipes', JSON.stringify(recipes));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Sign up
  const signup = async (email, password, displayName) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store token and user
        localStorage.setItem('cartsmash-token', data.token);
        localStorage.setItem('cartsmash-user', JSON.stringify(data.user));
        
        setCurrentUser(data.user);
        loadUserProfile(data.user.id);
        
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  };

  // Sign in
  const signin = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store token and user
        localStorage.setItem('cartsmash-token', data.token);
        localStorage.setItem('cartsmash-user', JSON.stringify(data.user));
        
        setCurrentUser(data.user);
        loadUserProfile(data.user.id);
        
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: 'Failed to sign in' };
    }
  };

  // Sign out
  const signout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('cartsmash-token');
      localStorage.removeItem('cartsmash-user');
      
      // Clear user state
      setCurrentUser(null);
      setUserProfile(null);
      
      // Optional: Call backend logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Signout error:', error);
      return { success: false, error: 'Failed to sign out' };
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setUserProfile(updatedProfile);
        
        // Update current user if display name changed
        if (updates.displayName) {
          const updatedUser = { ...currentUser, displayName: updates.displayName };
          setCurrentUser(updatedUser);
          localStorage.setItem('cartsmash-user', JSON.stringify(updatedUser));
        }
        
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  // Save shopping list
  const saveShoppingList = async (listData) => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        },
        body: JSON.stringify(listData)
      });

      if (response.ok) {
        const savedList = await response.json();
        
        // Update local storage
        const lists = JSON.parse(localStorage.getItem('cartsmash-saved-lists') || '[]');
        lists.unshift(savedList);
        localStorage.setItem('cartsmash-saved-lists', JSON.stringify(lists));
        
        return { success: true, list: savedList };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Save list error:', error);
      return { success: false, error: 'Failed to save list' };
    }
  };

  // Save meal plan
  const saveMealPlan = async (mealData) => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        },
        body: JSON.stringify(mealData)
      });

      if (response.ok) {
        const savedMeal = await response.json();
        
        // Update local storage
        const meals = JSON.parse(localStorage.getItem('cartsmash-meal-groups') || '{}');
        meals[savedMeal.name] = savedMeal.items;
        localStorage.setItem('cartsmash-meal-groups', JSON.stringify(meals));
        
        return { success: true, meal: savedMeal };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Save meal error:', error);
      return { success: false, error: 'Failed to save meal plan' };
    }
  };

  // Save recipe
  const saveRecipe = async (recipeData) => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        },
        body: JSON.stringify(recipeData)
      });

      if (response.ok) {
        const savedRecipe = await response.json();
        
        // Update local storage
        const recipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
        recipes.unshift(savedRecipe);
        localStorage.setItem('cartsmash-recipes', JSON.stringify(recipes));
        
        return { success: true, recipe: savedRecipe };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Save recipe error:', error);
      return { success: false, error: 'Failed to save recipe' };
    }
  };

  // Add to shopping history
  const addToHistory = async (historyData) => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cartsmash-token')}`
        },
        body: JSON.stringify(historyData)
      });

      if (response.ok) {
        const historyEntry = await response.json();
        
        // Update local storage
        const history = JSON.parse(localStorage.getItem('cartsmash-history') || '[]');
        history.unshift(historyEntry);
        localStorage.setItem('cartsmash-history', JSON.stringify(history));
        
        return { success: true, entry: historyEntry };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Add history error:', error);
      return { success: false, error: 'Failed to add to history' };
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    signin,
    signout,
    updateUserProfile,
    saveShoppingList,
    saveMealPlan,
    saveRecipe,
    addToHistory
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}