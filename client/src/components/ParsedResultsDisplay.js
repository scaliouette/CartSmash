// client/src/components/ParsedResultsDisplay.js
import React, { useState, useEffect, useCallback } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import KrogerOrderFlow from './KrogerOrderFlow';
import ProductValidator from './ProductValidator';




function ParsedResultsDisplay({ items, onItemsChange, currentUser, parsingStats }) {
  // Debug log to verify currentUser is being received
  useEffect(() => {
    console.log('🔍 ParsedResultsDisplay received currentUser:', currentUser?.email || 'No user');
    console.log('🔍 ParsedResultsDisplay received items:', items?.length || 0, 'items');
    if (items && items.length > 0) {
      console.log('🔍 First few items:', items.slice(0, 3));
    }
  }, [currentUser, items]);

  // Debug logging for parsingStats and recipe display
  useEffect(() => {
    console.log('🔍 ParsedResultsDisplay received parsingStats:', {
      hasParsingStats: !!parsingStats,
      hasSourceRecipe: !!parsingStats?.sourceRecipe,
      sourceRecipeLength: parsingStats?.sourceRecipe?.length,
      firstChars: parsingStats?.sourceRecipe?.substring(0, 50)
    });
  }, [parsingStats]);
  
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showInstacart, setShowInstacart] = useState(false);
  const [showKroger, setShowKroger] = useState(false);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [fetchingPrices, setFetchingPrices] = useState(new Set());
  const [exportingCSV, setExportingCSV] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [priceHistory, setPriceHistory] = useState({});
  const [showPriceHistory, setShowPriceHistory] = useState(null);
  const [showListCreator, setShowListCreator] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showValidationPage, setShowValidationPage] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);

  // const trackEvent = (action, category, label, value) => {
  //   if (window.gtag) {
  //     window.gtag('event', action, {
  //       event_category: category,
  //       event_label: label,
  //       value: value
  //     });
  //   }
  // };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch real-time prices for items - Use useCallback to fix dependency warning
  const fetchRealTimePrices = useCallback(async (itemsToFetch) => {
    // Prevent duplicate fetches and check for valid items
    if (!itemsToFetch || itemsToFetch.length === 0) {
      console.log(`💰 [FETCH DEBUG] No items to fetch prices for`);
      return;
    }
    
    const itemIds = itemsToFetch.map(item => item.id);
    const alreadyFetching = itemIds.some(id => fetchingPrices.has(id));
    
    if (alreadyFetching) {
      console.log(`💰 [FETCH DEBUG] Some items are already being fetched, skipping duplicate request`);
      return;
    }
    
    console.log(`💰 [FETCH DEBUG] Starting to fetch prices for ${itemsToFetch.length} items`);
    setFetchingPrices(prev => new Set([...prev, ...itemIds]));

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      console.log(`💰 [FETCH DEBUG] Making request to: ${API_URL}/api/cart/fetch-prices`);
      
      const response = await fetch(`${API_URL}/api/cart/fetch-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToFetch.map(item => ({
            id: item.id,
            name: item.productName || item.itemName
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`💰 [FETCH DEBUG] Received response:`, data);

        // Only update if items still exist in current state (avoid race conditions)
        const currentItemIds = new Set(items.map(item => item.id));
        const updatedItems = items.map(item => {
          const priceData = data.prices?.[item.id];
          if (priceData && currentItemIds.has(item.id)) {
            // Save to price history
            setPriceHistory(prev => ({
              ...prev,
              [item.id]: [
                ...(prev[item.id] || []),
                {
                  date: new Date().toISOString(),
                  price: priceData.price,
                  salePrice: priceData.salePrice
                }
              ]
            }));

            return {
              ...item,
              realPrice: priceData.price,
              salePrice: priceData.salePrice,
              availability: priceData.availability,
              // Add Kroger product data needed for cart adding
              upc: priceData.upc,
              productId: priceData.productId,
              krogerProduct: priceData.krogerProduct,
              matchedName: priceData.matchedName,
              brand: priceData.brand,
              size: priceData.size,
              storeId: priceData.storeId
            };
          }
          return item;
        });

        // Only call onItemsChange if we actually have updates to avoid unnecessary re-renders
        const hasUpdates = updatedItems.some((item, index) => 
          item.realPrice !== items[index]?.realPrice
        );
        
        if (hasUpdates) {
          onItemsChange(updatedItems);
          localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
          
          const itemsWithPrices = updatedItems.filter(item => item.realPrice).length;
          console.log(`💰 [FETCH DEBUG] Updated ${updatedItems.length} items with price data`);
          console.log(`💰 [FETCH DEBUG] ${itemsWithPrices} items now have Kroger pricing and can be added to cart`);
        }
      } else {
        console.error(`💰 [FETCH DEBUG] Request failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error(`💰 [FETCH DEBUG] Error response:`, errorText);
      }
    } catch (error) {
      console.error('💰 [FETCH DEBUG] Failed to fetch prices:', error);
    } finally {
      // Always clean up fetching state
      setFetchingPrices(prev => {
        const newSet = new Set(prev);
        itemIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [items, onItemsChange, fetchingPrices]);

  // Fetch real-time prices on mount - Fixed dependencies
  // Auto-fetch prices on mount only - removed constant polling to prevent interference
  useEffect(() => {
    // Only run once when component mounts and has items
    if (items.length === 0) return;
    
    // Check if we need to fetch prices (only on first load)
    const itemsNeedingPrices = items.filter(item => 
      !item.realPrice && 
      (item.productName || item.itemName || item.name) &&
      !fetchingPrices.has(item.id)
    );
    
    console.log(`💰 [PRICE DEBUG] Initial check: ${itemsNeedingPrices.length} items need prices out of ${items.length} total items`);
    
    // Only auto-fetch on initial load and if reasonable number of items
    if (itemsNeedingPrices.length > 0 && itemsNeedingPrices.length <= 3) {
      const timeoutId = setTimeout(() => {
        console.log(`💰 [PRICE DEBUG] Auto-fetching prices for initial items:`, itemsNeedingPrices.map(item => item.productName || item.itemName || item.name));
        fetchRealTimePrices(itemsNeedingPrices);
      }, 1000); // Reduced to 1 second delay

      return () => clearTimeout(timeoutId);
    } else if (itemsNeedingPrices.length > 3) {
      console.log(`💰 [PRICE DEBUG] Too many items (${itemsNeedingPrices.length}) - use manual refresh for pricing`);
    }
  }, []); // Empty dependency array - only run once on mount


  // Auto-save to localStorage whenever items change
  useEffect(() => {
    if (items && items.length > 0) {
      try {
        localStorage.setItem('cartsmash-current-cart', JSON.stringify(items));
        console.log('✅ Cart saved locally');
      } catch (e) {
        console.error('Failed to save cart locally:', e);
      }
    }
  }, [items]);

  // Smart unit detection using AI logic
  const smartDetectUnit = (itemText) => {
    const unitPatterns = {
      weight: {
        pattern: /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|oz|ounces?|kg|kilograms?|g|grams?)/i,
        units: ['lb', 'oz', 'kg', 'g']
      },
      volume: {
        pattern: /(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|ml|milliliters?|l|liters?|gal|gallons?|qt|quarts?|pt|pints?|fl\s*oz)/i,
        units: ['cup', 'tbsp', 'tsp', 'ml', 'l', 'gal', 'qt', 'pt', 'fl oz']
      },
      container: {
        pattern: /(cans?|bottles?|jars?|boxes?|bags?|packages?|containers?|cartons?|bunches?|heads?|loaves?)\s+of/i,
        units: ['can', 'bottle', 'jar', 'box', 'bag', 'package', 'container']
      },
      count: {
        pattern: /(\d+)\s*(dozen|pack|piece|clove)/i,
        units: ['dozen', 'pack', 'piece', 'clove']
      }
    };

    for (const [, config] of Object.entries(unitPatterns)) {
      const match = itemText.match(config.pattern);
      if (match) {
        const unit = match[2] || match[1];
        if (unit.toLowerCase().includes('pound')) return 'lb';
        if (unit.toLowerCase().includes('ounce')) return 'oz';
        if (unit.toLowerCase().includes('gram')) return 'g';
        if (unit.toLowerCase().includes('kilogram')) return 'kg';
        if (unit.toLowerCase().includes('tablespoon')) return 'tbsp';
        if (unit.toLowerCase().includes('teaspoon')) return 'tsp';
        return unit.toLowerCase();
      }
    }
    return 'each';
  };

  // Batch operations
  const handleBulkOperation = (operation) => {
    let updatedItems = [...items];
    let message = '';

    switch (operation) {
      case 'delete-low-confidence':
        const lowConfItems = items.filter(item => (item.confidence || 0) < 0.6);
        if (lowConfItems.length > 0 && window.confirm(`Remove ${lowConfItems.length} low confidence items?`)) {
          updatedItems = items.filter(item => (item.confidence || 0) >= 0.6);
          message = `Removed ${lowConfItems.length} items`;
        }
        break;

      case 'delete-selected':
        if (selectedItems.size > 0 && window.confirm(`Remove ${selectedItems.size} selected items?`)) {
          updatedItems = items.filter(item => !selectedItems.has(item.id));
          message = `Removed ${selectedItems.size} items`;
          setSelectedItems(new Set());
        }
        break;

      case 'validate-all':
        setValidatingAll(true);
        updatedItems = items.map(item => {
          const detectedUnit = smartDetectUnit(item.original || item.itemName || item.name);
          return {
            ...item,
            unit: item.unit === 'unit' || !item.unit ? detectedUnit : item.unit,
            confidence: Math.min((item.confidence || 0.7) + 0.2, 1),
            needsReview: false,
            validated: true
          };
        });
        message = 'All items validated and units detected';
        setTimeout(() => setValidatingAll(false), 1000);
        break;

      default:
        break;
    }

    if (message) {
      onItemsChange(updatedItems);
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
    }
  };

  // Parse recipe content into structured format
  const parseRecipeContent = (content) => {
    const lines = content.split('\n');
    const recipe = {
      title: '',
      ingredients: [],
      instructions: [],
      metadata: {}
    };
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect title (first meaningful line or lines starting with recipe name)
      if (!recipe.title && (trimmed.match(/^[A-Z]/) || trimmed.toLowerCase().includes('recipe'))) {
        recipe.title = trimmed.replace(/Recipe Name:\s*/i, '').replace(/^#+\s*/, '');
        continue;
      }
      
      // Detect sections
      if (trimmed.match(/^(ingredients?:?\s*$|##?\s*ingredients?)/i)) {
        currentSection = 'ingredients';
        continue;
      }
      if (trimmed.match(/^(instructions?:?\s*$|directions?:?\s*$|method:?\s*$|##?\s*(instructions?|directions?|method))/i)) {
        currentSection = 'instructions';
        continue;
      }
      
      // Extract metadata (serves, time, etc.)
      if (trimmed.match(/^(serves?|yield|prep time|cook time|total time):/i)) {
        const [key, ...valueParts] = trimmed.split(':');
        recipe.metadata[key.toLowerCase().trim()] = valueParts.join(':').trim();
        continue;
      }
      
      // Add to current section
      if (currentSection === 'ingredients' && trimmed.match(/^[-•*]\s*/) || trimmed.match(/^\d+\.\s*/)) {
        recipe.ingredients.push(trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (currentSection === 'instructions' && trimmed.match(/^\d+\.\s*/)) {
        recipe.instructions.push(trimmed.replace(/^\d+\.\s*/, ''));
      }
    }
    
    // If no title found, generate one
    if (!recipe.title) {
      recipe.title = 'Imported Recipe';
    }
    
    return recipe;
  };

  // Extract individual recipes from meal plan
  const extractMealPlanRecipes = (content) => {
    const recipes = [];
    const lines = content.split('\n');
    let currentDay = '';
    let currentMeal = '';
    let currentRecipe = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect day headers
      const dayMatch = trimmed.match(/^Day\s+(\d+)|^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch) {
        currentDay = dayMatch[0];
        continue;
      }
      
      // Detect meal types
      const mealMatch = trimmed.match(/^(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i);
      if (mealMatch) {
        currentMeal = mealMatch[1];
        const mealDescription = mealMatch[2];
        
        // Create a recipe for this meal
        currentRecipe = {
          title: `${currentDay} ${currentMeal}: ${mealDescription}`,
          day: currentDay,
          meal: currentMeal.toLowerCase(),
          description: mealDescription,
          ingredients: [],
          instructions: [],
          metadata: {}
        };
        recipes.push(currentRecipe);
      }
    }
    
    return recipes;
  };

  // Save individual recipe
  const handleSaveRecipe = async (content) => {
    if (!content) return;
    
    try {
      const recipe = parseRecipeContent(content);
      const savedRecipes = JSON.parse(localStorage.getItem('cartsmash-saved-recipes') || '[]');
      
      const newRecipe = {
        id: `recipe_${Date.now()}`,
        ...recipe,
        savedAt: new Date().toISOString(),
        source: 'ai_generated'
      };
      
      savedRecipes.push(newRecipe);
      localStorage.setItem('cartsmash-saved-recipes', JSON.stringify(savedRecipes));
      
      // Show success message
      alert('✅ Recipe saved successfully!');
      
      // Optional: Save to Firebase if user is logged in
      if (currentUser) {
        const userDataService = (await import('../services/userDataService')).default;
        await userDataService.saveUserRecipe(currentUser.uid, newRecipe);
        console.log('Recipe saved to Firebase');
      }
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('❌ Failed to save recipe. Please try again.');
    }
  };

  // Save meal plan (automatically saves individual recipes)
  const handleSaveMealPlan = async (content) => {
    if (!content) return;
    
    try {
      // Check if this is a meal plan or single recipe
      const isMealPlan = content.toLowerCase().includes('day ') && 
                        (content.toLowerCase().includes('breakfast') || 
                         content.toLowerCase().includes('lunch') || 
                         content.toLowerCase().includes('dinner'));
      
      const savedMealPlans = JSON.parse(localStorage.getItem('cartsmash-saved-meal-plans') || '[]');
      const savedRecipes = JSON.parse(localStorage.getItem('cartsmash-saved-recipes') || '[]');
      
      if (isMealPlan) {
        // Extract individual recipes from meal plan
        const recipes = extractMealPlanRecipes(content);
        
        // Save each recipe individually
        recipes.forEach(recipe => {
          const newRecipe = {
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...recipe,
            savedAt: new Date().toISOString(),
            source: 'meal_plan',
            mealPlanId: `plan_${Date.now()}`
          };
          savedRecipes.push(newRecipe);
        });
        
        // Save the meal plan
        const newMealPlan = {
          id: `plan_${Date.now()}`,
          title: 'Weekly Meal Plan',
          content: content,
          recipes: recipes.map(r => r.id),
          savedAt: new Date().toISOString(),
          source: 'ai_generated'
        };
        
        savedMealPlans.push(newMealPlan);
        localStorage.setItem('cartsmash-saved-meal-plans', JSON.stringify(savedMealPlans));
        localStorage.setItem('cartsmash-saved-recipes', JSON.stringify(savedRecipes));
        
        alert(`✅ Meal plan saved with ${recipes.length} recipes!`);
        
      } else {
        // Single recipe - just save it
        await handleSaveRecipe(content);
        return;
      }
      
      // Optional: Save to Firebase if user is logged in
      if (currentUser) {
        const userDataService = (await import('../services/userDataService')).default;
        const mealPlan = savedMealPlans[savedMealPlans.length - 1];
        await userDataService.saveMealPlan(currentUser.uid, mealPlan);
        console.log('Meal plan saved to Firebase');
      }
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('❌ Failed to save meal plan. Please try again.');
    }
  };

  // Add items to new list
  const addToNewList = async (listName) => {
    if (!listName || selectedItems.size === 0) return;

    const selectedItemsList = items
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        id: item.id,
        productName: item.productName || item.itemName,
        itemName: item.productName || item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        confidence: item.confidence,
        realPrice: item.realPrice,
        salePrice: item.salePrice
      }));

    try {
      // Create new list object
      const newList = {
        id: `list_${Date.now()}`,
        name: listName,
        items: selectedItemsList,
        itemCount: selectedItemsList.length,
        createdAt: new Date().toISOString(),
        userId: currentUser?.uid || 'guest'
      };
      
      // Save to localStorage
      const existingLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const updatedLists = [...existingLists, newList];
      localStorage.setItem('cartsmash-lists', JSON.stringify(updatedLists));
      
      // Try to save to server if user is logged in
      if (currentUser?.uid) {
        const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
        fetch(`${API_URL}/api/cart/save-list`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid 
          },
          body: JSON.stringify(newList)
        }).catch(err => console.error('Failed to save to server, but saved locally:', err));
      }
      
      setSelectedItems(new Set());
      setNewListName('');
      alert(`✅ Created new list "${listName}" with ${selectedItemsList.length} items!`);
      
      if (window.refreshAccountData) {
        window.refreshAccountData();
      }
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list. Please try again.');
    }
  };

  // Toggle all items selection
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
    }
  };

  // Common units for dropdown
  const commonUnits = [
    { value: 'each', label: 'each' },
    { value: 'lb', label: 'lb' },
    { value: 'oz', label: 'oz' },
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'cup', label: 'cup' },
    { value: 'tbsp', label: 'tbsp' },
    { value: 'tsp', label: 'tsp' },
    { value: 'l', label: 'liter' },
    { value: 'ml', label: 'ml' },
    { value: 'gal', label: 'gallon' },
    { value: 'qt', label: 'quart' },
    { value: 'pt', label: 'pint' },
    { value: 'fl oz', label: 'fl oz' },
    { value: 'dozen', label: 'dozen' },
    { value: 'can', label: 'can' },
    { value: 'bottle', label: 'bottle' },
    { value: 'bag', label: 'bag' },
    { value: 'box', label: 'box' },
    { value: 'jar', label: 'jar' },
    { value: 'pack', label: 'pack' },
    { value: 'container', label: 'container' },
    { value: 'bunch', label: 'bunch' },
    { value: 'head', label: 'head' },
    { value: 'loaf', label: 'loaf' },
    { value: 'piece', label: 'piece' }
  ];

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      if (filterBy === 'all') return true;
      if (filterBy === 'high-confidence') return (item.confidence || 0) >= 0.8;
      if (filterBy === 'needs-review') return (item.confidence || 0) < 0.6;
      if (filterBy === item.category) return true;
      return false;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === 'category') {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      }
      if (sortBy === 'name') return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      if (sortBy === 'price') return (b.realPrice || 0) - (a.realPrice || 0);
      return 0;
    });

  // Calculate statistics
  const stats = {
    total: items.length,
    highConfidence: items.filter(item => (item.confidence || 0) >= 0.8).length,
    mediumConfidence: items.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
    lowConfidence: items.filter(item => (item.confidence || 0) < 0.6).length,
    categories: [...new Set(items.map(item => item.category))].length,
    averageConfidence: items.length > 0 ?
      items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length : 0,
    totalEstimatedPrice: items.reduce((sum, item) => {
      if (item.realPrice) {
        return sum + (item.realPrice * (item.quantity || 1));
      }
      return sum;
    }, 0),
    selectedCount: selectedItems.size
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#FB4F14'; // Orange for high
    if (confidence >= 0.6) return '#FFA500'; // Light orange for medium
    return '#002244'; // Navy blue for low
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Med';
    return 'Low';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'produce': '🥬',
      'dairy': '🥛',
      'meat': '🥩',
      'pantry': '🥫',
      'beverages': '🥤',
      'frozen': '🧊',
      'bakery': '🍞',
      'snacks': '🍿',
      'other': '📦'
    };
    return icons[category] || '📦';
  };

  const handleItemEdit = async (itemId, field, value) => {
    setUpdatingItems(prev => new Set([...prev, itemId]));

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onItemsChange(updatedItems);

    localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) {
        console.error('Failed to update item on server');
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdatingItems(prev => new Set([...prev, itemId]));
    
    try {
      // Remove from local state immediately
      const updatedItems = items.filter(item => item.id !== itemId);
      onItemsChange(updatedItems);
      
      // Clear any ongoing price fetch for this item
      setFetchingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      // Update localStorage
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
      
      console.log(`✅ Removed item ${itemId} from shopping list display`);
    } catch (error) {
      console.error('Error removing item from display:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const exportToCSV = async () => {
    setExportingCSV(true);
    try {
      const headers = ['Product Name', 'Quantity', 'Unit', 'Category', 'Confidence', 'Price'];
      const csvContent = [
        headers.join(','),
        ...items.map(item => {
          const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

          return [
            esc(item.productName || item.itemName),
            item.quantity || 1,
            esc(item.unit || 'each'),
            esc(item.category || 'other'),
            esc(((item.confidence || 0) * 100).toFixed(0) + '%'),
            item.realPrice ? esc(`$${item.realPrice.toFixed(2)}`) : 'N/A'
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grocery-list-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCSV(false);
    }
  };

  const renderGroupedItems = () => {
    const grouped = {};
    filteredAndSortedItems.forEach(item => {
      const category = item.category || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    return Object.entries(grouped).map(([category, categoryItems]) => (
      <div key={category}>
        <div style={styles.categoryHeader}>
          <span style={styles.categoryIcon}>{getCategoryIcon(category)}</span>
          <span style={styles.categoryName}>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
          <span style={styles.categoryCount}>({categoryItems.length} items)</span>
        </div>
        {categoryItems.map((item, index) => renderItem(item, index))}
      </div>
    ));
  };

  const handleRefreshPrices = async () => {
    const itemsNeedingPrices = filteredAndSortedItems.filter(item => !item.realPrice && item.productName);
    if (itemsNeedingPrices.length > 0) {
      await fetchRealTimePrices(itemsNeedingPrices);
    } else {
      alert('All items already have pricing information!');
    }
  };

  const copyListToClipboard = () => {
    const listText = items.map(item =>
      `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`
    ).join('\n');
    navigator.clipboard.writeText(listText);
    alert('List copied to clipboard!');
  };

  const handleSaveList = () => {
    const listName = prompt('Enter a name for this list:', `Shopping List ${new Date().toLocaleDateString()}`);
    if (!listName) return;
    
    try {
      // Create list object
      const newList = {
        id: `list_${Date.now()}`,
        name: listName,
        items: [...items],
        itemCount: items.length,
        createdAt: new Date().toISOString(),
        userId: currentUser?.uid || 'guest'
      };
      
      // Save to localStorage
      const existingLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const updatedLists = [...existingLists, newList];
      localStorage.setItem('cartsmash-lists', JSON.stringify(updatedLists));
      
      // Try to save to server if user is logged in
      if (currentUser?.uid) {
        const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
        fetch(`${API_URL}/api/cart/save-list`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid 
          },
          body: JSON.stringify(newList)
        }).catch(err => console.error('Failed to save to server, but saved locally:', err));
      }
      
      alert(`✅ List "${listName}" saved successfully!`);
    } catch (error) {
      console.error('Error saving list:', error);
      alert('Failed to save list. Please try again.');
    }
  };

  const renderItem = (item, index) => {
    const isUpdating = updatingItems.has(item.id);
    const isFetchingPrice = fetchingPrices.has(item.id);
    const isSelected = selectedItems.has(item.id);
    const itemPriceHistory = priceHistory[item.id] || [];

    return (
      <div key={item.id || index}>
        <div
          style={{
            ...styles.itemRow,
            ...(index % 2 === 0 ? styles.itemRowEven : {}),
            ...(editingItem === item.id ? styles.itemRowEditing : {}),
            ...(isUpdating ? styles.itemRowUpdating : {}),
            ...(isSelected ? styles.itemRowSelected : {})
          }}
        >
          <div
            style={{
              ...styles.itemCheckbox,
              ...(isSelected ? styles.itemCheckboxSelected : {})
            }}
            onClick={() => {
              const newSelected = new Set(selectedItems);
              if (isSelected) {
                newSelected.delete(item.id);
              } else {
                newSelected.add(item.id);
              }
              setSelectedItems(newSelected);
            }}
          >
            <div style={{
              ...styles.checkboxVisual,
              ...(isSelected ? styles.checkboxVisualSelected : {})
            }}>
              {isSelected && '✓'}
            </div>
          </div>

          <div style={styles.itemCategory}>
            <span title={item.category}>{getCategoryIcon(item.category)}</span>
          </div>

          <div style={styles.itemName}>
            {editingItem === item.id ? (
              <input
                type="text"
                value={item.productName || item.itemName || ''}
                onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
                onBlur={() => setEditingItem(null)}
                onKeyPress={(e) => e.key === 'Enter' && setEditingItem(null)}
                style={styles.itemNameInput}
                autoFocus
              />
            ) : (
              <span
                onClick={() => setEditingItem(item.id)}
                style={styles.itemNameText}
                title="Click to edit"
              >
                {item.productName || item.itemName || item.name || ''}
              </span>
            )}
          </div>

          <div style={styles.itemQuantity}>
            <input
              type="number"
              value={item.quantity || 1}
              onChange={(e) => handleItemEdit(item.id, 'quantity', parseFloat(e.target.value) || 1)}
              style={styles.quantityInput}
              min="0"
              step="0.25"
              disabled={isUpdating}
            />
          </div>

          <div style={styles.itemUnit}>
            <select
              value={item.unit || 'each'}
              onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
              style={styles.unitSelect}
              disabled={isUpdating}
            >
              {commonUnits.map(unit => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.itemConfidence}>
            <span
              style={{
                ...styles.confidenceBadge,
                backgroundColor: getConfidenceColor(item.confidence || 0),
                color: item.confidence >= 0.6 ? 'white' : 'white'
              }}
            >
              {getConfidenceLabel(item.confidence || 0)}
            </span>
          </div>

          <div style={styles.itemPrice}>
            {isFetchingPrice ? (
              <InlineSpinner text="" color="#FB4F14" />
            ) : item.realPrice ? (
              <>
                <span>${(item.realPrice * (item.quantity || 1)).toFixed(2)}</span>
                {itemPriceHistory.length > 0 && (
                  <button
                    onClick={() => setShowPriceHistory(showPriceHistory === item.id ? null : item.id)}
                    style={styles.priceHistoryButton}
                    title="View price history"
                  >
                    📈
                  </button>
                )}
              </>
            ) : (
              <span style={{ color: '#9ca3af' }}>--</span>
            )}
          </div>

          <div style={styles.itemActions}>
            {isUpdating ? (
              <InlineSpinner text="" color="#002244" />
            ) : (
              <button
                onClick={() => handleRemoveItem(item.id)}
                style={styles.removeButton}
                title="Remove item"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {showPriceHistory === item.id && itemPriceHistory.length > 0 && (
          <div style={styles.priceHistoryPanel}>
            <div style={styles.priceHistoryHeader}>📈 Price History:</div>
            <div style={styles.priceHistoryList}>
              {itemPriceHistory.slice(-5).reverse().map((history, idx) => (
                <div key={idx} style={styles.priceHistoryItem}>
                  <span>{new Date(history.date).toLocaleDateString()}</span>
                  <span>${history.price.toFixed(2)}</span>
                  {history.salePrice && <span style={styles.salePrice}>Sale: ${history.salePrice.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      ...styles.container,
      ...(isMobile ? styles.containerMobile : {})
    }}>
      {/* Header */}
      <div style={{
        ...styles.header,
        ...(isMobile ? styles.headerMobile : {})
      }}>
        <h3 style={styles.title}>
          🛒 Shopping List Results ({items.length} items)
        </h3>
        {stats.totalEstimatedPrice > 0 && (
          <div style={styles.headerTotal}>
            <div style={styles.totalLabel}>💰 Estimated Total:</div>
            <div style={styles.totalPrice}>${stats.totalEstimatedPrice.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Recipe Display */}
      {(() => {
        // Get recipe from either parsingStats or first item
        const sourceRecipe = parsingStats?.sourceRecipe || items[0]?._sourceRecipe;
        console.log('🔍 Recipe display check:', {
          fromParsingStats: !!parsingStats?.sourceRecipe,
          fromFirstItem: !!items[0]?._sourceRecipe,
          finalDecision: !!sourceRecipe
        });
        return sourceRecipe;
      })() && parsingStats?.sourceRecipe && !parsingStats.sourceRecipe.includes('MEAL PLAN') && (
        <div style={styles.recipeDisplay}>
          <div style={styles.recipeHeader}>
            <h4 style={styles.recipeTitle}>📝 Original Recipe</h4>
            <button 
              style={styles.recipeToggleButton}
              onClick={() => {
                const recipeContent = document.getElementById('recipe-content');
                const isExpanded = recipeContent.style.maxHeight === 'none';
                recipeContent.style.maxHeight = isExpanded ? '100px' : 'none';
                recipeContent.style.overflow = isExpanded ? 'hidden' : 'visible';
                document.querySelector('.recipe-toggle-text').textContent = isExpanded ? 'Show Full Recipe' : 'Show Less';
              }}
            >
              <span className="recipe-toggle-text">Show Full Recipe</span>
            </button>
          </div>
          <div 
            id="recipe-content"
            style={styles.recipeContent}
          >
            <pre style={styles.recipeText}>
              {parsingStats?.sourceRecipe || items[0]?._sourceRecipe}
            </pre>
          </div>
          
          {/* Save Options */}
          <div style={styles.saveOptions}>
            <button
              onClick={() => handleSaveRecipe(parsingStats?.sourceRecipe || items[0]?._sourceRecipe)}
              style={{...styles.saveButton, ...styles.saveRecipeButton}}
            >
              📝 Save Recipe
            </button>
            <button
              onClick={() => handleSaveMealPlan(parsingStats?.sourceRecipe || items[0]?._sourceRecipe)}
              style={{...styles.saveButton, ...styles.saveMealPlanButton}}
            >
              📅 Save to Meal Plan
            </button>
          </div>
        </div>
      )}

      {/* Batch Operations Bar */}
      {(selectedItems.size > 0 || items.some(i => (i.confidence || 0) < 0.6)) && (
        <div style={styles.batchOperationsBar}>
          <div style={styles.batchOperationsTitle}>
            {selectedItems.size > 0 ? `${selectedItems.size} items selected` : 'Batch Operations:'}
          </div>
          <div style={styles.batchOperationsButtons}>
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={() => handleBulkOperation('delete-selected')}
                  style={styles.batchButton}
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={() => setShowListCreator(true)}
                  style={styles.batchButton}
                >
                  📋 Add to List
                </button>
              </>
            )}
            <button
              onClick={() => handleBulkOperation('validate-all')}
              style={styles.batchButtonSuccess}
              disabled={validatingAll}
            >
              {validatingAll ? <InlineSpinner text="Validating..." /> : '✅ Validate All'}
            </button>
            {items.some(i => (i.confidence || 0) < 0.6) && (
              <button
                onClick={() => handleBulkOperation('delete-low-confidence')}
                style={styles.batchButtonDanger}
              >
                ⚠️ Remove Low Confidence
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Panel (Collapsible) */}
      {showStats && (
        <div style={styles.statsPanel}>
          <h4 style={styles.statsTitle}>📊 Parsing Statistics</h4>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Items</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#FB4F14' }}>{stats.highConfidence}</div>
              <div style={styles.statLabel}>High Confidence</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#FFA500' }}>{stats.mediumConfidence}</div>
              <div style={styles.statLabel}>Medium Confidence</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#002244' }}>{stats.lowConfidence}</div>
              <div style={styles.statLabel}>Need Review</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.categories}</div>
              <div style={styles.statLabel}>Categories</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>{(stats.averageConfidence * 100).toFixed(1)}%</div>
              <div style={styles.statLabel}>Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlsLeft}>
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="confidence">Confidence (High to Low)</option>
              <option value="category">Category (A to Z)</option>
              <option value="name">Name (A to Z)</option>
              <option value="price">Price (High to Low)</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Items</option>
              <option value="high-confidence">High Confidence Only</option>
              <option value="needs-review">Needs Review Only</option>
              <optgroup label="By Category">
                <option value="produce">🥬 Produce</option>
                <option value="dairy">🥛 Dairy</option>
                <option value="meat">🥩 Meat</option>
                <option value="pantry">🥫 Pantry</option>
                <option value="beverages">🥤 Beverages</option>
                <option value="frozen">🧊 Frozen</option>
                <option value="bakery">🍞 Bakery</option>
                <option value="snacks">🍿 Snacks</option>
                <option value="other">📦 Other</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div style={styles.controlsRight}>
          <button
            onClick={() => setShowStats(!showStats)}
            style={styles.statsButton}
          >
            {showStats ? '📊 Hide Stats' : '📊 Show Stats'}
          </button>
          <button
            onClick={() => setShowValidationPage(true)}
            style={styles.validateButton}
          >
            🔍 Validate Items
          </button>
        </div>
      </div>

      {/* List Header */}
      <div style={styles.listHeader}>
        <div
          style={styles.headerCheckbox}
          onClick={toggleSelectAll}
        >
          <div style={{
            ...styles.checkboxVisual,
            ...(selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 ? styles.checkboxVisualSelected : {})
          }}>
            {selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 && '✓'}
          </div>
        </div>
        <div style={styles.headerCategory}></div>
        <div style={styles.headerName}>Product Name</div>
        <div style={styles.headerQuantity}>Qty</div>
        <div style={styles.headerUnit}>Unit</div>
        <div style={styles.headerConfidence}>Status</div>
        <div style={styles.headerPrice}>Price</div>
        <div style={styles.headerActions}></div>
      </div>

      {/* Items List */}
      <div style={styles.itemsList}>
        {sortBy === 'category' ? renderGroupedItems() : filteredAndSortedItems.map((item, index) => renderItem(item, index))}
      </div>

      {/* Secondary Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleSaveList}
          style={styles.secondaryBtn}
        >
          💾 Save List
        </button>
        
        <button
          onClick={copyListToClipboard}
          style={styles.secondaryBtn}
        >
          📋 Copy List
        </button>
        
        <button
          onClick={handleRefreshPrices}
          style={styles.secondaryBtn}
          disabled={fetchingPrices.size > 0}
        >
          {fetchingPrices.size > 0 ? <InlineSpinner text="Fetching..." /> : '💰 Get Prices'}
        </button>
        
        <button
          onClick={exportToCSV}
          style={styles.secondaryBtn}
          disabled={exportingCSV}
        >
          {exportingCSV ? <InlineSpinner text="Exporting..." /> : '📄 Export CSV'}
        </button>
      </div>

      {/* Primary Checkout Action */}
      <div style={styles.checkoutSection}>
        <button
          onClick={() => setShowInstacart(true)}
          style={styles.checkoutBtn}
        >
          🛍️ Continue to Check Out
        </button>
      </div>


      {/* Instacart Modal */}
      {showInstacart && (
        <EnhancedInstacartModal
          items={items}
          currentUser={currentUser}
          onClose={() => setShowInstacart(false)}
          onOpenKroger={() => {
            setShowInstacart(false);
            setShowKroger(true);
          }}
        />
      )}

      {/* Kroger Modal */}
      {showKroger && (
        <KrogerOrderFlow
          cartItems={items}
          currentUser={currentUser}
          onClose={() => setShowKroger(false)}
        />
      )}

      {/* List Creator Modal */}
      {showListCreator && (
        <div style={styles.listCreatorModal}>
          <div style={styles.listCreatorContent}>
            <h4 style={styles.listCreatorTitle}>📋 Create New List</h4>
            <p>Creating a new list with {selectedItems.size} selected items:</p>

            <input
              type="text"
              placeholder="Enter list name (e.g., Weekly Groceries)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              style={styles.listNameInput}
            />

            <div style={styles.listCreatorActions}>
              <button
                onClick={() => {
                  if (newListName) {
                    addToNewList(newListName);
                    setShowListCreator(false);
                  }
                }}
                style={styles.listCreatorSave}
                disabled={!newListName}
              >
                Create List
              </button>
              <button
                onClick={() => setShowListCreator(false)}
                style={styles.listCreatorCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Validator */}
      {showValidationPage && (
        <ProductValidator
          items={items}
          onItemsUpdated={(updatedItems) => {
            onItemsChange(updatedItems);
            localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
          }}
          onClose={() => setShowValidationPage(false)}
        />
      )}

    </div>
  );
}

// Enhanced Instacart Modal Function
function EnhancedInstacartModal({ items, onClose, currentUser }) {
  const [selectedStore, setSelectedStore] = useState('safeway');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKrogerFlow, setShowKrogerFlow] = useState(false);

  const stores = [
    { 
      id: 'kroger', 
      name: 'Kroger', 
      logo: '🛒', 
      fee: 'Direct', 
      minOrder: 0,
      isNative: true,
      description: 'Send directly to Kroger cart'
    },
    { id: 'safeway', name: 'Safeway', logo: '🏪', fee: '$4.99', minOrder: 35 },
    { id: 'wholefoods', name: 'Whole Foods', logo: '🌿', fee: '$4.99', minOrder: 35 },
    { id: 'costco', name: 'Costco', logo: '📦', fee: 'Free', minOrder: 0, membership: true },
    { id: 'target', name: 'Target', logo: '🎯', fee: '$5.99', minOrder: 35 },
    { id: 'walmart', name: 'Walmart', logo: '🏬', fee: '$7.95', minOrder: 35 }
  ];

  const selectedStoreInfo = stores.find(s => s.id === selectedStore);

  const handleStoreClick = (store) => {
    if (store.id === 'kroger') {
      setShowKrogerFlow(true);
    } else {
      setSelectedStore(store.id);
    }
  };

  if (showKrogerFlow) {
    return (
      <KrogerOrderFlow
        cartItems={items}
        currentUser={currentUser}
        onClose={onClose}
      />
    );
  }

  const handleProceed = () => {
    setIsProcessing(true);

    const listText = items.map(item => 
      `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`
    ).join('\n');
    
    setTimeout(() => {
      navigator.clipboard.writeText(listText).then(() => {
        window.open('https://www.instacart.com/', '_blank');
        alert('Your list has been copied! Select your store on Instacart and paste your list.');
        onClose();
      });
    }, 800);
  };

  const estimatedTotal = items.reduce((sum, item) => {
    const avgPrice = 3.99;
    const each = (item.realPrice ?? avgPrice) * (item.quantity || 1);
    return sum + each;
  }, 0);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>

        <h2 style={styles.modalTitle}>
          <span style={{ fontSize: '28px' }}>🛍️</span>
          Choose Your Store
        </h2>

        <div style={styles.storeGrid}>
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => handleStoreClick(store)}
              style={{
                ...styles.storeCard,
                ...(selectedStore === store.id && store.id !== 'kroger' ? styles.storeCardActive : {}),
                ...(store.id === 'kroger' ? {
                  background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
                  color: 'white',
                  cursor: 'pointer',
                  position: 'relative',
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 15px rgba(251,79,20,0.3)'
                } : {})
              }}
            >
              <div style={{
                ...styles.storeLogo,
                ...(store.id === 'kroger' ? { fontSize: '32px' } : {})
              }}>
                {store.logo}
              </div>
              <div style={{
                ...styles.storeName,
                ...(store.id === 'kroger' ? { color: 'white', fontWeight: 'bold' } : {})
              }}>
                {store.name}
              </div>
              <div style={{
                ...styles.storeFee,
                ...(store.id === 'kroger' ? { color: '#FFE5D9' } : {})
              }}>
                {store.fee}
              </div>
              {store.membership && (
                <div style={styles.membershipBadge}>Membership</div>
              )}
              {store.isNative && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#FB4F14',
                  fontSize: '10px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>
                  API
                </div>
              )}
              {store.id === 'kroger' && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  color: '#FFE5D9',
                  whiteSpace: 'nowrap'
                }}>
                  Click to Connect
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.orderSummary}>
          <h3 style={styles.summaryTitle}>Your Cart</h3>
          <div style={styles.summaryRow}>
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Est. Total</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        {selectedStore !== 'kroger' && (
          <>
            <div style={styles.modalActions}>
              <button
                onClick={handleProceed}
                disabled={isProcessing}
                style={styles.proceedBtn}
              >
                {isProcessing ? '⏳ Opening Instacart...' : `📋 Copy List & Open Instacart`}
              </button>
            </div>
            <p style={styles.disclaimer}>
              Select {selectedStoreInfo?.name} on Instacart and paste your list
            </p>
          </>
        )}

        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#FFF5F2',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#002244'
        }}>
          <strong>🛒 Kroger:</strong> Direct API integration - sends items directly to your Kroger cart<br/>
          <strong>🛍️ Other Stores:</strong> Copies your list to clipboard for use with Instacart
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '2px solid #002244'
  },

  containerMobile: {
    margin: '10px 0',
    padding: '15px',
    borderRadius: '8px'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  headerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '15px'
  },

  title: {
    color: '#002244',
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },

  headerTotal: {
    backgroundColor: '#FFF5F2',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #FB4F14',
    textAlign: 'center'
  },

  totalLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    margin: '0 0 2px 0'
  },

  totalPrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#0066CC',
    margin: '0'
  },

  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },

  toggleButton: {
    padding: '8px 16px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  // Recipe Display Styles
  recipeDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e9ecef'
  },

  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#e9ecef'
  },

  recipeTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#002244'
  },

  recipeToggleButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },

  recipeContent: {
    padding: '16px',
    maxHeight: '100px',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease-in-out'
  },

  recipeText: {
    margin: 0,
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    lineHeight: '1.4',
    color: '#495057',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  },

  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Batch operations styles
  batchOperationsBar: {
    background: 'linear-gradient(135deg, #FFF5F0, #FFE5D9)',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    border: '1px solid #FB4F14'
  },

  batchOperationsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244'
  },

  batchOperationsButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },

  batchButton: {
    padding: '6px 12px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },

  batchButtonSuccess: {
    padding: '6px 12px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    minWidth: '110px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  batchButtonDanger: {
    padding: '6px 12px',
    backgroundColor: '#8B0000',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },

  statsPanel: {
    background: 'linear-gradient(135deg, #002244, #003366)',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    color: 'white'
  },

  statsTitle: {
    color: 'white',
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold'
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px'
  },

  statCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)'
  },

  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '4px'
  },

  statLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },

  controlsLeft: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },

  controlsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  controlLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#002244'
  },

  select: {
    padding: '6px 12px',
    border: '2px solid #002244',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  validateButton: {
    padding: '8px 16px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  statsButton: {
    padding: '8px 16px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  listHeader: {
    display: 'grid',
    gridTemplateColumns: '40px 40px 1fr 80px 120px 70px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#002244',
    borderRadius: '8px 8px 0 0',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    borderBottom: '2px solid #FB4F14',
    alignItems: 'center'
  },

  headerCheckbox: {
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center'
  },
  
  headerCategory: { textAlign: 'center' },
  headerName: {},
  headerQuantity: { textAlign: 'center' },
  headerUnit: { textAlign: 'center' },
  headerConfidence: { textAlign: 'center' },
  headerPrice: { textAlign: 'right' },

  itemsList: {
    maxHeight: '600px',
    overflowY: 'auto',
    overflowX: 'hidden',
    borderRadius: '0 0 8px 8px',
    border: '2px solid #002244',
    borderTop: 'none'
  },

  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 15px',
    backgroundColor: '#FFF5F2',
    borderBottom: '1px solid #FB4F14',
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },

  categoryIcon: {
    fontSize: '18px'
  },

  categoryName: {
    textTransform: 'capitalize'
  },

  categoryCount: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'normal'
  },

  itemRow: {
    display: 'grid',
    gridTemplateColumns: '40px 40px 1fr 80px 120px 70px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    transition: 'background-color 0.2s',
    cursor: 'default'
  },

  itemRowEven: {
    backgroundColor: '#fafafa'
  },

  itemRowEditing: {
    backgroundColor: '#FFF5F2',
    boxShadow: 'inset 0 0 0 2px #FB4F14'
  },

  itemRowUpdating: {
    opacity: 0.7,
    pointerEvents: 'none'
  },

  itemRowSelected: {
    backgroundColor: '#FFE5D9'
  },

  itemCheckbox: {
    textAlign: 'center',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  itemCheckboxSelected: {
    backgroundColor: 'rgba(251, 79, 20, 0.2)'
  },

  checkboxVisual: {
    width: '20px',
    height: '20px',
    border: '2px solid #002244',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white'
  },

  checkboxVisualSelected: {
    backgroundColor: '#FB4F14',
    borderColor: '#FB4F14'
  },

  itemCategory: {
    textAlign: 'center',
    fontSize: '18px'
  },

  itemName: {
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  itemNameText: {
    cursor: 'pointer',
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block'
  },

  itemNameInput: {
    width: '100%',
    padding: '4px 8px',
    border: '2px solid #FB4F14',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none'
  },

  itemQuantity: {
    textAlign: 'center'
  },

  quantityInput: {
    width: '60px',
    padding: '4px 8px',
    border: '1px solid #002244',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'center'
  },

  itemUnit: {
    textAlign: 'center'
  },

  unitSelect: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #002244',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  itemConfidence: {
    textAlign: 'center'
  },

  confidenceBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase'
  },

  itemPrice: {
    textAlign: 'right',
    fontWeight: '600',
    color: '#FB4F14',
    fontSize: '14px',
    minWidth: '80px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px'
  },

  priceHistoryButton: {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  },

  itemActions: {
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeButton: {
    background: '#8B0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s'
  },

  priceHistoryPanel: {
    background: '#FFF5F2',
    padding: '12px',
    marginLeft: '80px',
    marginRight: '15px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: '1px solid #FB4F14'
  },

  priceHistoryHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    marginBottom: '8px'
  },

  priceHistoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px'
  },

  priceHistoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'white',
    borderRadius: '4px'
  },

  salePrice: {
    color: '#FB4F14',
    fontWeight: '600'
  },

  totalSummary: {
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #002244',
    marginTop: '20px'
  },

  totalTitle: {
    color: 'white',
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 'bold'
  },

  totalNote: {
    color: '#FFE5D9',
    margin: 0,
    fontSize: '14px',
    fontStyle: 'italic'
  },

  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },

  primaryBtn: {
    padding: '12px 18px',
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(251,79,20,0.25)'
  },

  secondaryBtn: {
    padding: '12px 18px',
    background: 'white',
    color: '#002244',
    border: '2px solid #002244',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  checkoutSection: {
    marginTop: '20px',
    padding: '0',
    textAlign: 'center'
  },

  checkoutBtn: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(251,79,20,0.25)',
    transition: 'all 0.2s'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 2, 68, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4000,
    backdropFilter: 'blur(2px)'
  },

  modal: {
    background: 'white',
    borderRadius: '20px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '28px',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    border: '3px solid #002244'
  },

  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    background: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer'
  },

  modalTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#002244',
    marginBottom: '20px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },

  storeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px'
  },

  storeCard: {
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    position: 'relative'
  },

  storeCardActive: {
    borderColor: '#FB4F14',
    background: '#FFF5F2'
  },

  storeLogo: {
    fontSize: '28px',
    marginBottom: '6px'
  },

  storeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    marginBottom: '2px'
  },

  storeFee: {
    fontSize: '12px',
    color: '#6b7280'
  },

  membershipBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#FB4F14',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },

  orderSummary: {
    background: '#FFF5F2',
    padding: '14px',
    borderRadius: '12px',
    marginBottom: '18px'
  },

  summaryTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#002244',
    marginBottom: '10px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
    color: '#6b7280'
  },

  modalActions: {
    display: 'flex',
    gap: '10px'
  },

  proceedBtn: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(251,79,20,0.3)'
  },

  disclaimer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '12px'
  },

  // List creator modal styles
  listCreatorModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 2, 68, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000
  },

  listCreatorContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    border: '2px solid #002244'
  },

  listCreatorTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    color: '#002244'
  },

  listNameInput: {
    width: '100%',
    padding: '10px',
    border: '2px solid #002244',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '8px'
  },

  listCreatorActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },

  listCreatorSave: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },

  listCreatorCancel: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },

  // Save options styles
  saveOptions: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#fff',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  saveButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: '140px',
    justifyContent: 'center'
  },

  saveRecipeButton: {
    backgroundColor: '#FB4F14',
    color: 'white',
    boxShadow: '0 2px 8px rgba(251,79,20,0.2)'
  },

  saveMealPlanButton: {
    backgroundColor: '#002244',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,34,68,0.2)'
  }

};

export default ParsedResultsDisplay;