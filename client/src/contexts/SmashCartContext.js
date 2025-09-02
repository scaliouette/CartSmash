// SmashCartContext.js - Context for managing SmashCart state and operations
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SmashCartContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

export const useSmashCart = () => {
  const context = useContext(SmashCartContext);
  if (!context) {
    throw new Error('useSmashCart must be used within a SmashCartProvider');
  }
  return context;
};

export const SmashCartProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartData, setCartData] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load SmashCart configuration on mount
  useEffect(() => {
    loadSmashCartConfig();
  }, [currentUser]);

  const loadSmashCartConfig = () => {
    try {
      const config = localStorage.getItem('smashCartConfig');
      const initialized = localStorage.getItem('smashCartInitialized') === 'true';
      
      if (config) {
        setStoreConfig(JSON.parse(config));
        setIsInitialized(initialized);
      }
    } catch (error) {
      console.error('Failed to load SmashCart config:', error);
    }
  };

  // Get API endpoint for user
  const getApiEndpoint = () => {
    if (!currentUser) return null;
    return `${API_BASE_URL}/api/smash-cart/${currentUser.uid}`;
  };

  // GET Cart - Retrieve cart with store information
  const getCart = async (options = {}) => {
    if (!currentUser || !isInitialized) {
      console.warn('SmashCart not initialized');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { includeStoreInfo = true, includeProductDetails = true } = options;
      const endpoint = getApiEndpoint();
      const params = new URLSearchParams({
        includeStoreInfo: includeStoreInfo.toString(),
        includeProductDetails: includeProductDetails.toString()
      });

      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setCartData(result.cart);
        return result;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to get cart:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // POST Cart - Add items to cart
  const addItemsToCart = async (items, options = {}) => {
    if (!currentUser || !isInitialized) {
      throw new Error('SmashCart not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getApiEndpoint();
      const { storeId, modality = 'PICKUP', clearExisting = false } = options;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          storeId: storeId || storeConfig?.storeId,
          modality,
          clearExisting
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCartData(result.cart);
        return result;
      } else {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to add items to cart:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // PUT Cart - Update cart items
  const updateCart = async (updates) => {
    if (!currentUser || !isInitialized) {
      throw new Error('SmashCart not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getApiEndpoint();

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      
      if (result.success) {
        setCartData(result.cart);
        return result;
      } else {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to update cart:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // DELETE Cart - Clear or remove cart
  const clearCart = async (removeCompletely = false) => {
    if (!currentUser || !isInitialized) {
      throw new Error('SmashCart not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getApiEndpoint();
      const params = new URLSearchParams({
        removeCompletely: removeCompletely.toString()
      });

      const response = await fetch(`${endpoint}?${params}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        if (removeCompletely) {
          setCartData(null);
        } else {
          setCartData({ ...cartData, items: [], itemCount: 0 });
        }
        return result;
      } else {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Search products
  const searchProducts = async (searchTerm, limit = 10) => {
    if (!currentUser || !isInitialized) {
      throw new Error('SmashCart not initialized');
    }

    try {
      const endpoint = `${getApiEndpoint()}/search`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm,
          storeId: storeConfig?.storeId,
          limit
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.products;
      } else {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to search products:', err);
      setError(err.message);
      throw err;
    }
  };

  // Quick add items by name
  const quickAddItems = async (productNames) => {
    if (!currentUser || !isInitialized) {
      throw new Error('SmashCart not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `${getApiEndpoint()}/quick-add`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productNames,
          storeId: storeConfig?.storeId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCartData(result.cart);
        return result;
      } else {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to quick add items:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get cart summary and analytics
  const getCartSummary = async () => {
    if (!currentUser || !isInitialized) {
      return null;
    }

    try {
      const endpoint = `${getApiEndpoint()}/summary`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to get cart summary:', err);
      setError(err.message);
      return null;
    }
  };

  // Get store information
  const getStoreInfo = async (storeId) => {
    if (!currentUser) return null;

    try {
      const targetStoreId = storeId || storeConfig?.storeId;
      if (!targetStoreId) return null;

      const endpoint = `${getApiEndpoint()}/store/${targetStoreId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        return result.store;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to get store info:', err);
      setError(err.message);
      return null;
    }
  };

  // Initialize SmashCart with store
  const initializeWithStore = (store) => {
    const config = {
      storeId: store.locationId,
      storeName: store.name,
      storeAddress: store.address,
      storePhone: store.phone,
      services: store.services || {},
      initializedAt: new Date().toISOString(),
      apiEndpoint: getApiEndpoint()
    };

    setStoreConfig(config);
    setIsInitialized(true);
    
    localStorage.setItem('smashCartConfig', JSON.stringify(config));
    localStorage.setItem('smashCartInitialized', 'true');
    
    console.log('🛒 SmashCart initialized with store:', store.name);
  };

  // Reset SmashCart
  const reset = () => {
    setCartData(null);
    setStoreConfig(null);
    setIsInitialized(false);
    setError(null);
    
    localStorage.removeItem('smashCartConfig');
    localStorage.removeItem('smashCartInitialized');
    localStorage.removeItem('lastCartCheck');
    
    console.log('🧹 SmashCart reset');
  };

  const value = {
    // State
    cartData,
    storeConfig,
    isInitialized,
    isLoading,
    error,
    
    // Cart operations
    getCart,
    addItemsToCart,
    updateCart,
    clearCart,
    
    // Product operations
    searchProducts,
    quickAddItems,
    
    // Information
    getCartSummary,
    getStoreInfo,
    
    // Management
    initializeWithStore,
    reset,
    loadSmashCartConfig
  };

  return (
    <SmashCartContext.Provider value={value}>
      {children}
    </SmashCartContext.Provider>
  );
};

export default SmashCartContext;