// client/src/hooks/useCart.js - Cart Management Hook for React
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCart = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Load cart
  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart`);
      const data = await response.json();
      
      if (data.success) {
        setCart(data.items);
        return data.items;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add items to cart
  const addItems = async (items, validateItems = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/items`, {
        method: 'POST',
        body: JSON.stringify({ items, validateItems })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add items');
      }
      
      if (data.success) {
        await loadCart(); // Reload cart
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Parse grocery list
  const parseList = async (listText, action = 'merge', useAI = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/parse`, {
        method: 'POST',
        body: JSON.stringify({ listText, action, useAI })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse list');
      }
      
      if (data.success) {
        setCart(data.cart);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update item
  const updateItem = async (itemId, updates) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(prevCart => 
          prevCart.map(item => 
            item.id === itemId ? data.item : item
          )
        );
        return data.item;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (itemId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/item/${itemId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Validate all items
  const validateAll = async (useAI = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/validate-all`, {
        method: 'POST',
        body: JSON.stringify({ useAI })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(data.items);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/clear`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart([]);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Save cart as list
  const saveAsList = async (name) => {
    try {
      setLoading(true);
      setError(null);
      
      const estimatedTotal = cart.reduce((sum, item) => {
        return sum + ((item.price || 3.99) * (item.quantity || 1));
      }, 0);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          items: cart,
          estimatedTotal: estimatedTotal.toFixed(2)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.list;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create meal plan from cart
  const createMealPlan = async (mealData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/meals`, {
        method: 'POST',
        body: JSON.stringify({
          ...mealData,
          items: cart
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.meal;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Record shopping trip
  const recordShopping = async (tripData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/history`, {
        method: 'POST',
        body: JSON.stringify({
          ...tripData,
          items: cart
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await clearCart();
        return data.entry;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, []);

  return {
    cart,
    loading,
    error,
    loadCart,
    addItems,
    parseList,
    updateItem,
    deleteItem,
    validateAll,
    clearCart,
    saveAsList,
    createMealPlan,
    recordShopping,
    setCart
  };
};