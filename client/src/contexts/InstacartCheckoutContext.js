// client/src/contexts/InstacartCheckoutContext.js
// Dedicated context for Instacart checkout state management

import React, { createContext, useContext, useState, useCallback } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';

const InstacartCheckoutContext = createContext();

export const useInstacartCheckout = () => {
  const context = useContext(InstacartCheckoutContext);
  if (!context) {
    throw new Error('useInstacartCheckout must be used within InstacartCheckoutProvider');
  }
  return context;
};

export const InstacartCheckoutProvider = ({ children }) => {
  // Core state
  const [checkoutState, setCheckoutState] = useState({
    items: [],
    selectedRetailer: null,
    location: '95670',
    searchResults: {},
    estimatedTotal: null,
    mode: 'cart', // 'cart', 'recipe', 'shopping-list'
    isLoading: false,
    error: null
  });

  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [checkoutHistory, setCheckoutHistory] = useState([]);

  // ============ STATE MANAGEMENT ============

  const updateCheckoutState = useCallback((updates) => {
    setCheckoutState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const setError = useCallback((error) => {
    updateCheckoutState({ error, isLoading: false });
  }, [updateCheckoutState]);

  const clearError = useCallback(() => {
    updateCheckoutState({ error: null });
  }, [updateCheckoutState]);

  const setLoading = useCallback((isLoading) => {
    updateCheckoutState({ isLoading });
  }, [updateCheckoutState]);

  // ============ ITEM MANAGEMENT ============

  const initializeCheckout = useCallback((items, options = {}) => {
    console.log(`🛒 Initializing Instacart checkout with ${items.length} items`);

    // Validate and format items
    const formattedItems = items.map((item, index) => ({
      id: item.id || `checkout_${Date.now()}_${index}`,
      productName: item.productName || item.name || 'Unknown Item',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'each',
      category: item.category || 'other',
      price: parseFloat(item.price) || 0,
      confidence: item.confidence || 0.5,
      original: item.original || item.productName || item.name,
      ...item
    }));

    updateCheckoutState({
      items: formattedItems,
      mode: options.mode || 'cart',
      location: options.location || '95670',
      selectedRetailer: options.retailer || null,
      searchResults: {},
      estimatedTotal: null,
      error: null
    });

    return formattedItems;
  }, [updateCheckoutState]);

  const updateItem = useCallback((itemId, updates) => {
    setCheckoutState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      estimatedTotal: null // Reset estimate to trigger recalculation
    }));
  }, []);

  const removeItem = useCallback((itemId) => {
    setCheckoutState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
      estimatedTotal: null
    }));
  }, []);

  const addItem = useCallback((item) => {
    const newItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productName: item.productName || item.name || 'New Item',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'each',
      category: item.category || 'other',
      price: parseFloat(item.price) || 0,
      ...item
    };

    setCheckoutState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      estimatedTotal: null
    }));

    return newItem;
  }, []);

  const clearItems = useCallback(() => {
    updateCheckoutState({
      items: [],
      searchResults: {},
      estimatedTotal: null
    });
  }, [updateCheckoutState]);

  // ============ RETAILER MANAGEMENT ============

  const loadRetailers = useCallback(async (location) => {
    setLoading(true);
    clearError();

    try {
      console.log(`🏪 Loading retailers for ${location}`);
      const result = await instacartCheckoutService.getAvailableRetailers(location, 'US');

      if (result.success && result.retailers) {
        setAvailableRetailers(result.retailers);

        // Auto-select first available retailer if none selected
        if (!checkoutState.selectedRetailer && result.retailers.length > 0) {
          const firstAvailable = result.retailers.find(r => r.available) || result.retailers[0];
          updateCheckoutState({ selectedRetailer: firstAvailable });
        }

        console.log(`✅ Loaded ${result.retailers.length} retailers`);
        return result.retailers;
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (error) {
      console.error('❌ Error loading retailers:', error);
      setError('Failed to load nearby retailers');
      return [];
    } finally {
      setLoading(false);
    }
  }, [checkoutState.selectedRetailer, updateCheckoutState, setLoading, clearError, setError]);

  const selectRetailer = useCallback((retailer) => {
    console.log(`🏪 Selected retailer: ${retailer.name}`);
    updateCheckoutState({
      selectedRetailer: retailer,
      searchResults: {}, // Clear previous search results
      estimatedTotal: null
    });
  }, [updateCheckoutState]);

  const updateLocation = useCallback((newLocation) => {
    updateCheckoutState({
      location: newLocation,
      selectedRetailer: null, // Clear selection when location changes
      searchResults: {}
    });
  }, [updateCheckoutState]);

  // ============ PRODUCT SEARCH ============

  const searchProductsForItems = useCallback(async () => {
    if (!checkoutState.selectedRetailer || checkoutState.items.length === 0) {
      console.warn('Cannot search products: missing retailer or items');
      return {};
    }

    setLoading(true);
    clearError();

    try {
      console.log(`🔍 Searching products for ${checkoutState.items.length} items`);

      const searchItems = checkoutState.items.map(item => ({
        name: item.productName || item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      }));

      const results = await instacartCheckoutService.batchSearchProducts(
        searchItems,
        checkoutState.selectedRetailer.id || checkoutState.selectedRetailer.retailer_key
      );

      if (results.success) {
        const searchMap = {};
        results.results.forEach((result, index) => {
          const originalItem = checkoutState.items[index];
          if (originalItem) {
            searchMap[originalItem.id] = result;
          }
        });

        updateCheckoutState({ searchResults: searchMap });
        console.log(`✅ Product search completed: ${results.summary.itemsWithMatches} matches found`);
        return searchMap;
      } else {
        throw new Error(results.error || 'Product search failed');
      }
    } catch (error) {
      console.error('❌ Error searching products:', error);
      setError('Failed to find matching products');
      return {};
    } finally {
      setLoading(false);
    }
  }, [checkoutState.selectedRetailer, checkoutState.items, updateCheckoutState, setLoading, clearError, setError]);

  // ============ CART ESTIMATION ============

  const calculateEstimate = useCallback(() => {
    if (!checkoutState.selectedRetailer || checkoutState.items.length === 0) {
      return null;
    }

    const estimate = instacartCheckoutService.calculateEstimatedTotal(
      checkoutState.items,
      checkoutState.selectedRetailer
    );

    updateCheckoutState({ estimatedTotal: estimate });
    return estimate;
  }, [checkoutState.selectedRetailer, checkoutState.items, updateCheckoutState]);

  // ============ CHECKOUT PROCESS ============

  const createCheckout = useCallback(async (options = {}) => {
    if (!checkoutState.selectedRetailer || checkoutState.items.length === 0) {
      throw new Error('Missing retailer or items for checkout');
    }

    setLoading(true);
    clearError();

    try {
      console.log(`🛒 Creating checkout for ${checkoutState.items.length} items`);

      // Validate items
      const validation = instacartCheckoutService.validateCheckoutItems(checkoutState.items);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Convert items to Instacart format
      const instacartItems = instacartCheckoutService.convertCartItemsToInstacart(
        checkoutState.items,
        checkoutState.searchResults
      );

      let result;

      // Create checkout based on mode
      if (checkoutState.mode === 'recipe') {
        result = await createRecipeCheckout(instacartItems, options);
      } else if (checkoutState.mode === 'shopping-list') {
        result = await createShoppingListCheckout(instacartItems, options);
      } else {
        result = await instacartCheckoutService.createInstacartCart(
          instacartItems,
          checkoutState.selectedRetailer.id || checkoutState.selectedRetailer.retailer_key,
          {
            zipCode: checkoutState.location,
            userId: options.userId || 'instacart_checkout_user',
            metadata: {
              source: 'InstacartCheckout',
              mode: checkoutState.mode,
              retailer: checkoutState.selectedRetailer.name,
              ...options.metadata
            }
          }
        );
      }

      if (result.success) {
        // Add to checkout history
        const checkoutRecord = {
          id: `checkout_${Date.now()}`,
          timestamp: new Date().toISOString(),
          retailer: checkoutState.selectedRetailer,
          items: checkoutState.items,
          mode: checkoutState.mode,
          result: result,
          total: checkoutState.estimatedTotal?.total || 0
        };

        setCheckoutHistory(prev => [checkoutRecord, ...prev.slice(0, 9)]); // Keep last 10

        console.log('✅ Checkout created successfully');
        return result;
      } else {
        throw new Error(result.error || 'Checkout creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating checkout:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkoutState, setLoading, clearError, setError]);

  const createRecipeCheckout = useCallback(async (instacartItems, options) => {
    const recipeData = {
      title: options.recipeTitle || 'My CartSmash Recipe',
      ingredients: instacartItems.map(item => ({
        name: item.name,
        measurements: [{
          quantity: item.quantity,
          unit: 'each'
        }]
      })),
      instructions: options.instructions || ['Enjoy cooking with your CartSmash ingredients!'],
      author: options.author || 'CartSmash User',
      servings: options.servings || 4
    };

    return await instacartCheckoutService.createRecipePage(recipeData, {
      retailerKey: checkoutState.selectedRetailer.id || checkoutState.selectedRetailer.retailer_key,
      partnerUrl: 'https://cartsmash.com'
    });
  }, [checkoutState.selectedRetailer]);

  const createShoppingListCheckout = useCallback(async (instacartItems, options) => {
    const listData = {
      title: options.listTitle || 'My CartSmash Shopping List',
      items: instacartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: 'each'
      })),
      instructions: options.instructions || ['Shopping list created with CartSmash']
    };

    return await instacartCheckoutService.createShoppingList(listData, {
      partnerUrl: 'https://cartsmash.com',
      expiresIn: options.expiresIn || 30
    });
  }, []);

  // ============ UTILITY METHODS ============

  const resetCheckout = useCallback(() => {
    updateCheckoutState({
      items: [],
      selectedRetailer: null,
      searchResults: {},
      estimatedTotal: null,
      error: null,
      isLoading: false
    });
  }, [updateCheckoutState]);

  const getCheckoutSummary = useCallback(() => {
    return {
      itemCount: checkoutState.items.length,
      retailer: checkoutState.selectedRetailer?.name || 'None selected',
      location: checkoutState.location,
      mode: checkoutState.mode,
      hasSearchResults: Object.keys(checkoutState.searchResults).length > 0,
      estimatedTotal: checkoutState.estimatedTotal?.total || 0,
      readyForCheckout: checkoutState.selectedRetailer && checkoutState.items.length > 0
    };
  }, [checkoutState]);

  // Context value
  const value = {
    // State
    ...checkoutState,
    availableRetailers,
    checkoutHistory,

    // Item management
    initializeCheckout,
    updateItem,
    removeItem,
    addItem,
    clearItems,

    // Retailer management
    loadRetailers,
    selectRetailer,
    updateLocation,

    // Product search
    searchProductsForItems,

    // Cart estimation
    calculateEstimate,

    // Checkout process
    createCheckout,

    // Utility
    updateCheckoutState,
    resetCheckout,
    getCheckoutSummary,
    setError,
    clearError,
    setLoading
  };

  return (
    <InstacartCheckoutContext.Provider value={value}>
      {children}
    </InstacartCheckoutContext.Provider>
  );
};

export default InstacartCheckoutContext;