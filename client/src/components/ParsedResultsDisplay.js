// client/src/components/ParsedResultsDisplay.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import ProductValidator from './ProductValidator';
import RecipeManager from './RecipeManager';
import InstacartProductMatcher from './InstacartProductMatcher';
import productValidationService from '../services/productValidationService';




function ParsedResultsDisplay({ items, onItemsChange, onDeleteItem, currentUser, parsingStats, savedRecipes, setSavedRecipes, saveCartAsList, selectedRetailer, userZipCode, onShowPriceHistory }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const recipeLogOnceRef = useRef(false);
  const [recipeExpanded, setRecipeExpanded] = useState(false);
  
  // Recipe panel disabled - recipes are handled in SmartAIAssistant
  const SHOW_RECIPE_PANEL = false;

  // Memoize recipe source to avoid recomputation and noisy logs on every render
  const sourceRecipe = useMemo(() => {
    return parsingStats?.sourceRecipe || items[0]?._sourceRecipe || '';
  }, [parsingStats?.sourceRecipe, items]);

  // Gate debug logs behind development environment
  useEffect(() => {
    if (!isDev) return;
    console.debug('ParsedResultsDisplay received currentUser:', currentUser?.email || 'No user');
    console.debug('ParsedResultsDisplay received items:', items?.length || 0, 'items');
    if (items && items.length > 0) {
      console.debug('First few items:', items.slice(0, 3));
    }
  }, [currentUser, items, isDev]);

  // Single-time debug logging for recipe display (dev only)
  useEffect(() => {
    if (!isDev || recipeLogOnceRef.current) return;
    console.debug('Recipe display source', {
      fromParsingStats: !!parsingStats?.sourceRecipe,
      fromFirstItem: !!items[0]?._sourceRecipe,
      hasSource: !!sourceRecipe
    });
    recipeLogOnceRef.current = true;
  }, [isDev, parsingStats?.sourceRecipe, items, sourceRecipe]);
  
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [fetchingPrices, setFetchingPrices] = useState(new Set());
  const [exportingCSV, setExportingCSV] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showListCreator, setShowListCreator] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showValidationPage, setShowValidationPage] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [editingRecipeData, setEditingRecipeData] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchingItem, setSearchingItem] = useState(null);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [comparingItem, setComparingItem] = useState(null);
  const [vendorPrices, setVendorPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // AI Product Validation state
  const [validationResults, setValidationResults] = useState(new Map());
  const [validatingItems, setValidatingItems] = useState(new Set());
  const [cartValidationSummary, setCartValidationSummary] = useState(null);
  const [autoValidationEnabled, setAutoValidationEnabled] = useState(false);

  // Enhanced catalog data state

  // Safe function to get product display name for rendering
  const getProductDisplayName = (item) => {
    // Handle various possible structures
    if (typeof item.productName === 'string') {
      return item.productName;
    }
    
    if (typeof item.productName === 'object' && item.productName !== null) {
      // If productName is an object, try to extract the actual text
      const extractedName = item.productName.text || 
                           item.productName.name || 
                           item.productName.value ||
                           item.productName.original ||
                           item.productName.displayName ||
                           item.productName.title ||
                           item.productName.label;
      
      if (extractedName) {
        return extractedName;
      }
      
      // If still no meaningful text, check if it's a simple object with a single property
      const objectKeys = Object.keys(item.productName);
      if (objectKeys.length === 1 && typeof item.productName[objectKeys[0]] === 'string') {
        return item.productName[objectKeys[0]];
      }
      
      // Last resort - return a more user-friendly fallback instead of [object Object]
      return 'Unknown Product (Object)';
    }
    
    // Fallback to other possible fields
    return item.itemName || 
           item.name || 
           item.item || 
           item.original || 
           item.text || 
           'Unknown Item';
  };

  // Calculate package equivalents for better shopping experience
  const getPackageEquivalent = (quantity, unit, productName) => {
    const qty = parseFloat(quantity) || 1;
    const unitLower = (unit || '').toLowerCase();
    const productLower = (productName || '').toLowerCase();

    // Common package size mappings
    const packageSizes = {
      // Liquids
      'milk': { 'fl oz': 64, 'cup': 8 }, // Half gallon = 64 fl oz
      'juice': { 'fl oz': 64, 'cup': 8 },
      'broth': { 'fl oz': 32, 'cup': 4 }, // 32 oz carton
      'stock': { 'fl oz': 32, 'cup': 4 },

      // Dry goods
      'flour': { 'lb': 5, 'cup': 20 }, // 5 lb bag
      'sugar': { 'lb': 4, 'cup': 16 }, // 4 lb bag
      'rice': { 'lb': 2, 'cup': 8 }, // 2 lb bag

      // Canned goods
      'tomato': { 'oz': 14.5, 'cup': 1.75 }, // Standard can size
      'beans': { 'oz': 15, 'cup': 1.75 },
      'corn': { 'oz': 15, 'cup': 1.75 },

      // Dairy
      'butter': { 'lb': 1, 'stick': 4, 'cup': 2 }, // 1 lb = 4 sticks
      'cheese': { 'lb': 1, 'oz': 16 }, // 1 lb block

      // Default sizes for common units
      'default': {
        'fl oz': 32, // 32 oz container
        'oz': 16,    // 1 lb package
        'lb': 1,     // 1 lb package
        'cup': 4     // 4 cup container
      }
    };

    // Find matching product type
    let packageSize = null;
    for (const [product, sizes] of Object.entries(packageSizes)) {
      if (product !== 'default' && productLower.includes(product)) {
        packageSize = sizes[unitLower];
        break;
      }
    }

    // Fall back to default if no specific product match
    if (!packageSize) {
      packageSize = packageSizes.default[unitLower];
    }

    if (packageSize && qty > 0) {
      const packages = Math.ceil(qty / packageSize);

      if (packages === 1) {
        return `1 item`;
      } else {
        return `${packages} items`;
      }
    }

    // For items that don't have standard packaging or are already in package units
    if (unitLower === 'each' || unitLower === 'item' || unitLower === 'package' ||
        unitLower === 'jar' || unitLower === 'can' || unitLower === 'bottle' ||
        unitLower === 'box' || unitLower === 'bag') {
      return qty === 1 ? '1 item' : `${qty} items`;
    }

    // Default: return original quantity and unit
    return `${qty} ${unit || 'items'}`;
  };

  // Track latest items to prevent race conditions in price fetches
  const latestItemsRef = useRef(items);
  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  // Auto-generate prices for new items without prices
  useEffect(() => {
    const itemsWithoutPrices = items.filter(item =>
      !item.realPrice && !fetchingPrices.has(item.id)
    );

    if (itemsWithoutPrices.length > 0) {
      // Stagger requests to avoid overwhelming the API
      itemsWithoutPrices.forEach((item, index) => {
        setTimeout(() => {
          generateAutomaticPrice(item);
        }, index * 500); // 500ms delay between each request
      });
    }
  }, [items.length]); // Only trigger when new items are added


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
      if (isDev) console.debug('No items to fetch prices for');
      return;
    }
    
    const itemIds = itemsToFetch.map(item => item.id);
    const alreadyFetching = itemIds.some(id => fetchingPrices.has(id));
    
    if (alreadyFetching) {
      if (isDev) console.debug('Some items are already being fetched, skipping duplicate request');
      return;
    }
    
    if (isDev) console.debug(`Starting to fetch prices for ${itemsToFetch.length} items`);
    setFetchingPrices(prev => new Set([...prev, ...itemIds]));

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      if (isDev) console.debug(`Making request to: ${API_URL}/api/cart/fetch-prices`);
      
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
        if (isDev) console.debug('Received price response:', data);

        // Use latest items from ref to prevent race conditions with deletes
        const latest = latestItemsRef.current;
        const latestIdSet = new Set(latest.map(i => i.id));
        let touched = false;

        const updatedItems = latest.map(item => {
          const priceData = data.prices?.[item.id];
          if (priceData && latestIdSet.has(item.id)) {
            touched = true;
            
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
              // Add product data needed for cart adding
              upc: priceData.upc,
              productId: priceData.productId,
              matchedName: priceData.matchedName,
              brand: priceData.brand,
              size: priceData.size,
              storeId: priceData.storeId
            };
          }
          return item;
        });

        // Only call onItemsChange if we actually touched items that still exist
        if (touched) {
          onItemsChange(updatedItems);
          // ✅ REMOVED: Direct localStorage write - cart authority handles persistence
          
          const itemsWithPrices = updatedItems.filter(item => item.realPrice).length;
          if (isDev) console.debug(`Updated ${updatedItems.length} items with price data`);
          if (isDev) console.debug(`${itemsWithPrices} items now have pricing and can be added to cart`);
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
  }, [onItemsChange, fetchingPrices, isDev]);

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
    
    if (isDev) console.debug(`Initial check: ${itemsNeedingPrices.length} items need prices out of ${items.length} total items`);
    
    // Only auto-fetch on initial load and if reasonable number of items
    if (itemsNeedingPrices.length > 0 && itemsNeedingPrices.length <= 3) {
      const timeoutId = setTimeout(() => {
        if (isDev) console.debug('Auto-fetching prices for initial items:', itemsNeedingPrices.map(item => item.productName || item.itemName || item.name));
        fetchRealTimePrices(itemsNeedingPrices);
      }, 1000); // Reduced to 1 second delay

      return () => clearTimeout(timeoutId);
    } else if (itemsNeedingPrices.length > 3) {
      if (isDev) console.debug(`Too many items (${itemsNeedingPrices.length}) - use manual refresh for pricing`);
    }
  }, [items, fetchingPrices, isDev, fetchRealTimePrices]); // Add required dependencies


  // Auto-save to localStorage whenever items change
  useEffect(() => {
    if (items && items.length > 0) {
      try {
        // ✅ REMOVED: Direct localStorage write - cart authority handles persistence
        console.log('✅ Cart state updated');
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
        if (selectedItems.size > 0) {
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
            confidence: Math.max(Math.min((item.confidence || 0.7) + 0.2, 1), 0.65),
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
      // ✅ REMOVED: Direct localStorage write - cart authority handles persistence
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
      if ((currentSection === 'ingredients' && trimmed.match(/^[-•*]\s*/)) || trimmed.match(/^\d+\.\s*/)) {
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

  // Save individual recipe - now opens recipe editor first
  const handleSaveRecipe = async (content) => {
    if (!content) return;
    
    try {
      // Parse the recipe content to extract structured data
      const recipe = parseRecipeContent(content);
      
      // Prepare recipe data for editing
      const recipeForEditing = {
        name: recipe.title || 'Untitled Recipe',
        ingredients: recipe.ingredients?.join('\n') || content,
        instructions: recipe.instructions?.join('\n') || ''
      };
      
      // Show the recipe editor with parsed data
      setEditingRecipeData(recipeForEditing);
      setShowRecipeEditor(true);
      
    } catch (error) {
      console.error('❌ Error processing recipe:', error);
      alert('❌ Failed to process recipe. Please try again.');
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
      
      const currentSavedRecipes = savedRecipes || [];
      
      if (isMealPlan) {
        // Extract individual recipes from meal plan
        const recipes = extractMealPlanRecipes(content);
        
        // Save each recipe individually
        const newRecipes = recipes.map(recipe => ({
          id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...recipe,
          savedAt: new Date().toISOString(),
          source: 'meal_plan',
          mealPlanId: `plan_${Date.now()}`
        }));
        
        const updatedSavedRecipes = [...currentSavedRecipes, ...newRecipes];
        
        // Update parent state - parent handles Firestore persistence
        if (setSavedRecipes) {
          setSavedRecipes(updatedSavedRecipes);
          console.log('✅ Meal plan recipes delegated to parent component for Firestore storage');
        } else {
          console.warn('⚠️ No setSavedRecipes callback provided - meal plan not saved');
        }
        
        alert(`✅ Meal plan saved with ${recipes.length} recipes!`);
        
      } else {
        // Single recipe - just save it
        await handleSaveRecipe(content);
        return;
      }
      
      // Optional: Save to Firebase if user is logged in
      if (currentUser) {
        console.log('✅ Meal plan recipes saved to Firestore via parent component');
      }
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('❌ Failed to save meal plan. Please try again.');
    }
  };

  // Add items to new list using proper parent callback
  const addToNewList = async (listName) => {
    if (!listName || selectedItems.size === 0) return;
    if (!saveCartAsList) {
      console.error('❌ saveCartAsList function not provided');
      alert('Unable to save list. Please try again.');
      return;
    }

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
      // Use proper parent callback to save selected items (saves to Firebase + local state)
      const newList = await saveCartAsList(listName, selectedItemsList);
      
      if (newList) {
        setSelectedItems(new Set());
        setNewListName('');
        alert(`✅ Created new list "${listName}" with ${selectedItemsList.length} items!`);
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
    { value: 'clove', label: 'clove' },
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

    // ✅ REMOVED: Direct localStorage write - cart authority handles persistence

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
    console.log('🗑️ handleRemoveItem called with ID:', itemId);
    console.log('📋 Current items:', items.map(item => ({id: item.id, name: item.productName})));
    
    setUpdatingItems(prev => new Set([...prev, itemId]));
    
    try {
      // Always use parent onDeleteItem handler for consistent state management
      if (onDeleteItem && typeof onDeleteItem === 'function') {
        console.log('✅ Using parent onDeleteItem handler for proper hydration');
        onDeleteItem(itemId);
      } else {
        console.warn('⚠️ No parent onDeleteItem handler - using local fallback');
        // Fallback: Remove from local state immediately
        const updatedItems = items.filter(item => item.id !== itemId);
        onItemsChange(updatedItems);
      }
      
      // Clear any ongoing price fetch for this item
      setFetchingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      console.log(`✅ Successfully removed item ${itemId} from shopping list display`);
    } catch (error) {
      console.error('❌ Error removing item from display:', error);
    } finally {
      // Always clear updating state
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

  const handleSaveList = async () => {
    const listName = prompt('Enter a name for this list:', `Shopping List ${new Date().toLocaleDateString()}`);
    if (!listName) return;
    
    // Check if saveCartAsList prop is provided
    if (!saveCartAsList || typeof saveCartAsList !== 'function') {
      console.error('❌ saveCartAsList function not provided');
      alert('Unable to save list. Please try again.');
      return;
    }
    
    try {
      // Use the parent's saveCartAsList function
      const newList = await saveCartAsList(listName, items);
      
      if (newList) {
        alert(`✅ List "${listName}" saved successfully!`);
      } else {
        throw new Error('Failed to save list');
      }
    } catch (error) {
      console.error('Error saving list:', error);
      alert('Failed to save list. Please try again.');
    }
  };

  // Product search handlers
  const handleOpenProductSearch = (item) => {
    setSearchingItem(item);
    setShowProductSearch(true);
  };

  const handleCloseProductSearch = () => {
    setShowProductSearch(false);
    setSearchingItem(null);
  };

  const handleProductSelected = (selectedProduct) => {
    if (!searchingItem || !selectedProduct) return;

    // Update the item with the selected product
    const updatedItems = items.map(item => {
      if (item.id === searchingItem.id) {
        return {
          ...item,
          productName: selectedProduct.name,
          realPrice: selectedProduct.price,
          confidence: selectedProduct.confidence || 95,
          brand: selectedProduct.brand,
          size: selectedProduct.size,
          sku: selectedProduct.sku,
          _aiRefined: true,
          _refinedAt: new Date().toISOString()
        };
      }
      return item;
    });

    onItemsChange(updatedItems);
    handleCloseProductSearch();
  };

  // Automatic price generation for items
  const generateAutomaticPrice = async (item) => {
    if (item.realPrice || fetchingPrices.has(item.id)) {
      return; // Skip if already has price or currently fetching
    }

    setFetchingPrices(prev => new Set([...prev, item.id]));

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/product-validation/multi-store-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: getProductDisplayName(item),
          productId: item.id,
          category: item.category,
          zipCode: userZipCode || '95670'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.pricing) {
          // Get the best price from all retailers
          const prices = Object.values(data.pricing).map(retailer => retailer.price).filter(p => p > 0);
          if (prices.length > 0) {
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

            // Update the item with the average price
            const updatedItems = items.map(i =>
              i.id === item.id ? { ...i, realPrice: avgPrice } : i
            );
            onItemsChange(updatedItems);
          }
        }
      } else {
        // Generate fallback estimated price based on category
        const estimatedPrice = generateEstimatedPrice(item);
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, realPrice: estimatedPrice } : i
        );
        onItemsChange(updatedItems);
      }
    } catch (error) {
      console.error('Error generating automatic price:', error);
      // Generate fallback estimated price
      const estimatedPrice = generateEstimatedPrice(item);
      const updatedItems = items.map(i =>
        i.id === item.id ? { ...i, realPrice: estimatedPrice } : i
      );
      onItemsChange(updatedItems);
    } finally {
      setFetchingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Generate estimated price based on product category and name
  const generateEstimatedPrice = (item) => {
    const productName = getProductDisplayName(item).toLowerCase();
    const category = (item.category || '').toLowerCase();

    // Base prices by category
    const categoryPrices = {
      produce: 2.50,
      meat: 8.00,
      dairy: 4.50,
      pantry: 3.00,
      frozen: 4.00,
      bakery: 3.50,
      beverages: 2.00,
      snacks: 3.50,
      default: 3.00
    };

    // Specific product modifiers
    let basePrice = categoryPrices[category] || categoryPrices.default;

    // Adjust based on product name keywords
    if (productName.includes('organic')) basePrice *= 1.5;
    if (productName.includes('premium') || productName.includes('gourmet')) basePrice *= 1.8;
    if (productName.includes('beef') || productName.includes('steak')) basePrice *= 2.0;
    if (productName.includes('salmon') || productName.includes('seafood')) basePrice *= 1.7;
    if (productName.includes('generic') || productName.includes('store brand')) basePrice *= 0.8;

    // Add some realistic variance (±20%)
    const variance = (Math.random() - 0.5) * 0.4 * basePrice;
    return Math.max(0.99, basePrice + variance);
  };

  // Price comparison handlers
  const handleOpenPriceComparison = async (item) => {
    setComparingItem(item);
    setShowPriceComparison(true);
    setLoadingPrices(true);

    try {
      // Fetch prices from multiple vendors/retailers
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/product-validation/multi-store-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: getProductDisplayName(item),
          productId: item.id,
          category: item.category,
          zipCode: userZipCode || '95670'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Convert new API format to expected vendor format
        if (data.success && data.pricing) {
          const vendors = Object.values(data.pricing).map(retailer => ({
            retailer: retailer.retailerName,
            retailerId: retailer.retailerName.toLowerCase().replace(/\s+/g, '_'),
            price: retailer.price,
            availability: retailer.availability,
            brand: item.brand || 'Generic',
            size: item.size || 'Standard',
            logo: retailer.thumbnail
          }));
          setVendorPrices(vendors);
        } else {
          setVendorPrices([]);
        }
      } else {
        console.error('Failed to fetch vendor prices');
        // Fallback to mock data for demo
        setVendorPrices([
          {
            retailer: 'Safeway',
            retailerId: 'safeway',
            price: item.realPrice * 0.95,
            availability: 'in-stock',
            brand: item.brand || 'Generic',
            size: item.size || 'Standard',
            logo: 'https://logos-world.net/wp-content/uploads/2020/09/Safeway-Logo.png'
          },
          {
            retailer: 'Target',
            retailerId: 'target',
            price: item.realPrice * 1.05,
            availability: 'in-stock',
            brand: item.brand || 'Market Pantry',
            size: item.size || 'Standard',
            logo: 'https://logos-world.net/wp-content/uploads/2020/04/Target-Logo.png'
          },
          {
            retailer: 'Whole Foods',
            retailerId: 'whole-foods',
            price: item.realPrice * 1.15,
            availability: 'limited',
            brand: item.brand || '365 Everyday Value',
            size: item.size || 'Organic',
            logo: 'https://logos-world.net/wp-content/uploads/2020/08/Whole-Foods-Market-Logo.png'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching vendor prices:', error);
      setVendorPrices([]);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleClosePriceComparison = () => {
    setShowPriceComparison(false);
    setComparingItem(null);
    setVendorPrices([]);
  };

  const handleSelectVendorPrice = (vendor) => {
    if (!comparingItem) return;

    // Update the item with selected vendor's price and info
    const updatedItems = items.map(item => {
      if (item.id === comparingItem.id) {
        return {
          ...item,
          realPrice: vendor.price,
          brand: vendor.brand,
          size: vendor.size,
          retailer: vendor.retailer,
          retailerId: vendor.retailerId,
          _vendorSelected: true,
          _selectedAt: new Date().toISOString()
        };
      }
      return item;
    });

    onItemsChange(updatedItems);
    handleClosePriceComparison();
  };

  // AI Product Validation Functions
  const validateCartItems = useCallback(async () => {
    if (!items || items.length === 0) return;

    console.log('🔍 Starting AI-powered cart validation...');
    setValidatingAll(true);

    try {
      const validationResult = await productValidationService.validateCartItems(items, {
        includeAlternatives: true,
        minConfidence: 0.4,
        maxAlternatives: 3,
        includePricing: true,
        includeMultipleStores: true
      });

      if (validationResult.success) {
        const resultsMap = new Map();
        validationResult.validatedItems.forEach(item => {
          resultsMap.set(item.originalItem.id, item);
        });

        setValidationResults(resultsMap);
        setCartValidationSummary(validationResult.summary);

        console.log('✅ Cart validation completed:', validationResult.summary);
      } else {
        console.error('❌ Cart validation failed:', validationResult.error);
      }
    } catch (error) {
      console.error('❌ Cart validation error:', error);
    } finally {
      setValidatingAll(false);
    }
  }, [items]);

  const validateSingleItem = useCallback(async (item) => {
    if (!item) return;

    console.log(`🔍 Validating single item: "${item.name || item.productName}"`);
    setValidatingItems(prev => new Set([...prev, item.id]));

    try {
      const validationResult = await productValidationService.validateSingleItem(item, {
        includeAlternatives: true,
        minConfidence: 0.4,
        maxAlternatives: 3,
        includePricing: true,
        includeMultipleStores: true
      });

      setValidationResults(prev => new Map([...prev, [item.id, validationResult]]));

      console.log(`✅ Item validation completed for "${item.name}":`, validationResult.confidenceLevel);
    } catch (error) {
      console.error(`❌ Item validation failed for "${item.name}":`, error);
    } finally {
      setValidatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, []);

  // Auto-validate items when cart changes
  useEffect(() => {
    if (autoValidationEnabled && items && items.length > 0) {
      const timer = setTimeout(() => {
        validateCartItems();
      }, 1000); // Debounce validation by 1 second

      return () => clearTimeout(timer);
    }
  }, [items, autoValidationEnabled, validateCartItems]);

  // Get validation data for an item
  const getItemValidation = (itemId) => {
    return validationResults.get(itemId) || null;
  };

  // Get enhanced confidence score (original + validation)
  const getEnhancedConfidence = (item) => {
    const validation = getItemValidation(item.id);
    const originalConfidence = item.confidence || 0;
    const validationConfidence = validation?.confidence || 0;

    // Use validation confidence if available and higher, otherwise use original
    return validationConfidence > 0 ? Math.max(originalConfidence, validationConfidence) : originalConfidence;
  };

  // Get product thumbnail with fallbacks
  const getProductThumbnail = (item) => {
    const validation = getItemValidation(item.id);

    // Priority: validation thumbnail -> best match thumbnail -> category-based thumbnail
    if (validation?.bestMatch?.thumbnail) {
      return validation.bestMatch.thumbnail;
    }

    if (validation?.bestMatch?.image_url) {
      return validation.bestMatch.image_url;
    }

    if (item.thumbnail || item.image_url) {
      return item.thumbnail || item.image_url;
    }

    // Generate category-based thumbnail
    return getCategoryThumbnail(item.category);
  };

  // Get category-based thumbnail
  const getCategoryThumbnail = (category) => {
    const categoryImages = {
      'produce': 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=100&h=100&fit=crop',
      'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop',
      'meat': 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=100&h=100&fit=crop',
      'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop',
      'beverages': 'https://images.unsplash.com/photo-1623065422902-4fa88dc2584b?w=100&h=100&fit=crop',
      'frozen': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop',
      'snacks': 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=100&h=100&fit=crop',
      'default': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100&h=100&fit=crop'
    };

    return categoryImages[category?.toLowerCase()] || categoryImages.default;
  };

  const renderItem = (item, index) => {
    const isUpdating = updatingItems.has(item.id);
    const isFetchingPrice = fetchingPrices.has(item.id);
    const isSelected = selectedItems.has(item.id);

    return (
      <div key={item.id || index}>
        <div
          style={{
            ...(isMobile ? styles.itemRowMobile : styles.itemRow),
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

          <div style={styles.itemThumbnail}>
            <img
              src={getProductThumbnail(item)}
              alt={getProductDisplayName(item)}
              style={styles.thumbnailImage}
              onError={(e) => {
                e.target.src = getCategoryThumbnail(item.category);
              }}
            />
          </div>

          <div style={styles.itemName}>
            {editingItem === item.id ? (
              <input
                type="text"
                value={getProductDisplayName(item)}
                onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
                onBlur={() => setEditingItem(null)}
                onKeyPress={(e) => e.key === 'Enter' && setEditingItem(null)}
                style={styles.itemNameInput}
                autoFocus
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span
                  onClick={() => setEditingItem(item.id)}
                  style={styles.itemNameText}
                  title="Click to edit"
                >
                  {getProductDisplayName(item)}
                </span>
              </div>
            )}
          </div>

          <div style={styles.itemQuantity}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={item.quantity || 1}
                onChange={(e) => handleItemEdit(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                style={styles.quantityInput}
                min="0"
                step="0.25"
                disabled={isUpdating}
              />
              {item.quantityRange && item.quantityRange.min != null && item.quantityRange.max != null && (
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  {item.quantityRange.min}–{item.quantityRange.max}
                </span>
              )}
            </div>
          </div>

          <div style={styles.itemUnit}>
            <span style={styles.packageEquivalent}>
              {getPackageEquivalent(item.quantity, item.unit, getProductDisplayName(item))}
            </span>
          </div>

          <div style={styles.itemPrice}>
            {isFetchingPrice ? (
              <InlineSpinner text="" color="#FB4F14" />
            ) : item.realPrice ? (
              <>
                <button
                  onClick={() => handleOpenPriceComparison(item)}
                  style={styles.clickablePrice}
                  title="💰 Compare Prices - Click for details"
                >
                  ${(item.realPrice * (item.quantity || 1)).toFixed(2)}
                  {item._vendorSelected && (
                    <span style={styles.vendorSelectedIcon}>✓</span>
                  )}
                  <span style={styles.priceCompareIcon}>💰</span>
                </button>
              </>
            ) : (
              <span style={{ color: '#9ca3af' }}>--</span>
            )}
          </div>

          <div style={styles.itemActions}>
            {isUpdating ? (
              <InlineSpinner text="" color="#002244" />
            ) : (
              <>
                <button
                  onClick={() => handleOpenProductSearch(item)}
                  style={styles.searchButton}
                  title="Search for better matches"
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f0f8ff';
                    e.target.style.borderColor = '#0066cc';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e0e0e0';
                  }}
                >
                  🔍
                </button>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  style={styles.removeButton}
                  title="Remove item"
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fff5f5';
                    e.target.style.borderColor = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e0e0e0';
                  }}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>

        
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
          🛒 Shopping List
          {parsingStats?.meta?.aiUsed && (
            <span style={styles.aiIndicator}> ✨ Parsed with AI</span>
          )}
          {parsingStats?.meta?.aiTried && !parsingStats?.meta?.aiUsed && (
            <span style={styles.fallbackIndicator}> 🔧 Fallback parsing</span>
          )}
        </h3>
        {stats.totalEstimatedPrice > 0 && (
          <div style={styles.headerTotal}>
            <div style={styles.totalLabel}>💰 Estimated Total:</div>
            <div style={styles.totalPrice}>${stats.totalEstimatedPrice.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Recipe Display */}
      {SHOW_RECIPE_PANEL && sourceRecipe && parsingStats?.sourceRecipe && !parsingStats.sourceRecipe.includes('MEAL PLAN') && (
        <div style={styles.recipeDisplay}>
          <div style={styles.recipeHeader}>
            <h4 style={styles.recipeTitle}>Original Recipe</h4>
            <button 
              style={styles.recipeToggleButton}
              onClick={() => setRecipeExpanded(prev => !prev)}
            >
              {recipeExpanded ? 'Show Less' : 'Show Full Recipe'}
            </button>
          </div>
          <div 
            style={{
              ...styles.recipeContent,
              maxHeight: recipeExpanded ? 'none' : '100px',
              overflow: recipeExpanded ? 'visible' : 'hidden'
            }}
          >
            <pre style={styles.recipeText}>
              {sourceRecipe}
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
            onClick={handleSaveList}
            style={styles.saveListButton}
            disabled={items.length === 0}
          >
            💾 Save List
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
        <div style={styles.headerThumbnail}></div>
        <div style={styles.headerName}>Product Name</div>
        <div style={styles.headerQuantity}>Qty</div>
        <div style={styles.headerUnit}>Items Needed</div>
        <div style={styles.headerPrice}>Price</div>
        <div style={styles.headerActions}></div>
      </div>

      {/* AI Validation Summary Panel */}
      {cartValidationSummary && (
        <div style={styles.validationSummaryPanel}>
          <div style={styles.validationHeader}>
            <h4 style={styles.validationTitle}>🔍 AI Product Validation Summary</h4>
            <div style={styles.validationActions}>
              <button
                onClick={validateCartItems}
                disabled={validatingAll}
                style={styles.validateButton}
              >
                {validatingAll ? '🔄 Validating...' : '🔍 Re-validate Cart'}
              </button>
              <button
                onClick={() => setAutoValidationEnabled(!autoValidationEnabled)}
                style={{
                  ...styles.toggleButton,
                  backgroundColor: autoValidationEnabled ? '#10b981' : '#6b7280'
                }}
              >
                Auto-Validate: {autoValidationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div style={styles.validationStatsGrid}>
            <div style={styles.validationStatCard}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>
                {cartValidationSummary.confidenceDistribution.excellent}
              </div>
              <div style={styles.statLabel}>Excellent Match</div>
            </div>

            <div style={styles.validationStatCard}>
              <div style={{ ...styles.statValue, color: '#f59e0b' }}>
                {cartValidationSummary.confidenceDistribution.good}
              </div>
              <div style={styles.statLabel}>Good Match</div>
            </div>

            <div style={styles.validationStatCard}>
              <div style={{ ...styles.statValue, color: '#ef4444' }}>
                {cartValidationSummary.confidenceDistribution.fair}
              </div>
              <div style={styles.statLabel}>Fair Match</div>
            </div>

            <div style={styles.validationStatCard}>
              <div style={{ ...styles.statValue, color: '#6b7280' }}>
                {cartValidationSummary.confidenceDistribution.poor}
              </div>
              <div style={styles.statLabel}>Poor Match</div>
            </div>

            <div style={styles.validationStatCard}>
              <div style={styles.statValue}>
                {cartValidationSummary.percentageGoodOrBetter}%
              </div>
              <div style={styles.statLabel}>Ready for Checkout</div>
            </div>

            <div style={styles.validationStatCard}>
              <div style={styles.statValue}>
                {cartValidationSummary.itemsNeedingAttention}
              </div>
              <div style={styles.statLabel}>Need Attention</div>
            </div>
          </div>

          {cartValidationSummary.itemsNeedingAttention > 0 && (
            <div style={styles.validationAlert}>
              <span>⚠️ {cartValidationSummary.itemsNeedingAttention} items have low confidence scores and may need manual review or alternative product selection.</span>
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      <div style={styles.itemsList}>
        {sortBy === 'category' ? renderGroupedItems() : filteredAndSortedItems.map((item, index) => renderItem(item, index))}
      </div>

      {/* Secondary Actions */}
      <div style={styles.actions}>
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
            // ✅ REMOVED: Direct localStorage write - cart authority handles persistence
          }}
          onClose={() => setShowValidationPage(false)}
        />
      )}

      {/* Recipe Editor Modal */}
      {showRecipeEditor && (
        <RecipeManager
          onClose={() => {
            setShowRecipeEditor(false);
            setEditingRecipeData(null);
          }}
          onRecipeSelect={() => {}} // Not used in this context
          savedRecipes={savedRecipes}
          onRecipeSave={(recipe) => {
            // Handle recipe save - delegate to parent component
            if (setSavedRecipes) {
              const currentSavedRecipes = savedRecipes || [];
              const updatedRecipes = [...currentSavedRecipes, recipe];
              setSavedRecipes(updatedRecipes);
              console.log('✅ Recipe saved through RecipeManager');
            }
            setShowRecipeEditor(false);
            setEditingRecipeData(null);
          }}
          onRecipeDelete={() => {}} // Not used in this context
          editingRecipe={editingRecipeData}
          initialTab="edit"
        />
      )}

      {/* Product Search Modal */}
      {showProductSearch && searchingItem && (
        <InstacartProductMatcher
          initialSearchTerm={getProductDisplayName(searchingItem)}
          onProductSelect={handleProductSelected}
          onClose={handleCloseProductSearch}
          retailerId={selectedRetailer?.id || 'default'}
          userZipCode={userZipCode || '95670'}
        />
      )}

      {/* Price Comparison Modal */}
      {showPriceComparison && comparingItem && (
        <div style={styles.priceComparisonModal}>
          <div style={styles.priceComparisonContent}>
            <div style={styles.priceComparisonHeader}>
              <h3 style={styles.priceComparisonTitle}>
                💰 Compare Prices for {getProductDisplayName(comparingItem)}
              </h3>
              <button
                onClick={handleClosePriceComparison}
                style={styles.priceComparisonClose}
              >
                ×
              </button>
            </div>

            <div style={styles.priceComparisonBody}>
              {loadingPrices ? (
                <div style={styles.priceComparisonLoading}>
                  <InlineSpinner text="Finding best prices..." color="#FB4F14" />
                </div>
              ) : (
                <div style={styles.vendorList}>
                  {vendorPrices.map((vendor, index) => (
                    <div key={vendor.retailerId} style={styles.vendorOption}>
                      <div style={styles.vendorInfo}>
                        <div style={styles.vendorHeader}>
                          <span style={styles.vendorName}>{vendor.retailer}</span>
                          <span style={styles.vendorPrice}>
                            ${(vendor.price * (comparingItem.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                        <div style={styles.vendorDetails}>
                          <span style={styles.vendorBrand}>{vendor.brand}</span>
                          <span style={styles.vendorSize}>{vendor.size}</span>
                          <span style={{
                            ...styles.vendorAvailability,
                            color: vendor.availability === 'in-stock' ? '#10B981' : '#F59E0B'
                          }}>
                            {vendor.availability}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectVendorPrice(vendor)}
                        style={styles.selectVendorButton}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                  {vendorPrices.length === 0 && (
                    <div style={styles.noPricesMessage}>
                      No alternative prices found. Try again later.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

  aiIndicator: {
    fontSize: '14px',
    color: '#10B981',
    fontWeight: 'normal',
    backgroundColor: '#ECFDF5',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '8px'
  },

  fallbackIndicator: {
    fontSize: '14px',
    color: '#F59E0B',
    fontWeight: 'normal',
    backgroundColor: '#FFFBEB',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '8px'
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
    gridTemplateColumns: '40px 40px 2fr 80px 120px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#002244',
    borderRadius: '8px 8px 0 0',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    borderBottom: '2px solid #FB4F14',
    alignItems: 'center',
    minWidth: '700px',
    overflow: 'hidden'
  },

  headerCheckbox: {
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center'
  },

  headerThumbnail: { textAlign: 'center' },
  headerCategory: { textAlign: 'center' },
  headerName: {},
  headerQuantity: { textAlign: 'center' },
  headerUnit: { textAlign: 'center' },
  headerConfidence: { textAlign: 'center' },
  headerPrice: { textAlign: 'right' },

  itemsList: {
    maxHeight: '600px',
    overflowY: 'auto',
    overflowX: 'auto',
    borderRadius: '0 0 8px 8px',
    border: '2px solid #002244',
    borderTop: 'none',
    minWidth: '700px'
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
    gridTemplateColumns: '40px 40px 2fr 80px 120px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    transition: 'background-color 0.2s',
    cursor: 'default',
    minWidth: '700px',
    overflow: 'hidden'
  },

  itemRowMobile: {
    display: 'block',
    padding: '15px',
    borderBottom: '1px solid #f3f4f6',
    borderRadius: '8px',
    marginBottom: '8px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  itemContentMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  itemHeaderMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  itemDetailsMobile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },

  itemActionsMobile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px'
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
    borderColor: '#FB4F14',
    color: 'white'
  },

  itemCategory: {
    textAlign: 'center',
    fontSize: '18px'
  },

  itemThumbnail: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  validationIndicator: {
    fontSize: '10px',
    opacity: 0.7
  },

  itemName: {
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  },

  itemNameText: {
    cursor: 'pointer',
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block',
    textTransform: 'uppercase'
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

  packageEquivalent: {
    fontSize: '13px',
    color: '#002244',
    fontWeight: '500',
    textAlign: 'center',
    display: 'block'
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


  itemActions: {
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
  },

  searchButton: {
    background: 'white',
    color: '#0066cc',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  removeButton: {
    background: 'white',
    color: '#dc3545',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
  },

  // Enhanced Catalog Data Styles
  catalogButton: {
    padding: '4px 8px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    minWidth: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  catalogButtonActive: {
    backgroundColor: '#FB4F14',
    borderColor: '#FB4F14',
    color: 'white'
  },

  catalogButtonLoading: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6'
  },

  catalogPanel: {
    marginTop: '8px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa'
  },

  catalogHeader: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.2s'
  },

  catalogIcon: {
    fontSize: '16px'
  },

  catalogTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    flex: 1
  },

  catalogCount: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500'
  },

  catalogToggle: {
    fontSize: '12px',
    color: '#666'
  },

  catalogContent: {
    padding: '16px'
  },

  vendorSection: {
    marginBottom: '16px',
    '&:last-child': {
      marginBottom: 0
    }
  },

  vendorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid #dee2e6'
  },

  vendorName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#002244'
  },

  vendorCount: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500'
  },

  vendorStatus: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic'
  },

  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  productItem: {
    padding: '8px 12px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '13px'
  },

  productName: {
    fontWeight: '600',
    color: '#002244',
    marginBottom: '4px'
  },

  productDetails: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  productPrice: {
    color: '#FB4F14',
    fontWeight: '700'
  },

  productSize: {
    color: '#666',
    fontSize: '12px'
  },

  productSku: {
    color: '#999',
    fontSize: '11px'
  },

  productBrand: {
    color: '#666',
    fontSize: '12px',
    marginTop: '2px',
    fontStyle: 'italic'
  },

  catalogFooter: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center'
  },

  catalogTimestamp: {
    color: '#999',
    fontSize: '11px'
  },

  // Price comparison modal styles
  priceComparisonModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  priceComparisonContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
  },

  priceComparisonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },

  priceComparisonTitle: {
    margin: 0,
    color: '#002244',
    fontSize: '18px',
    fontWeight: '600'
  },

  priceComparisonClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  priceComparisonBody: {
    padding: '20px',
    maxHeight: '60vh',
    overflow: 'auto'
  },

  priceComparisonLoading: {
    textAlign: 'center',
    padding: '40px 20px'
  },

  vendorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  vendorOption: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    transition: 'all 0.2s'
  },

  vendorInfo: {
    flex: 1
  },


  vendorPrice: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#FB4F14'
  },

  vendorDetails: {
    display: 'flex',
    gap: '12px',
    fontSize: '14px',
    color: '#6b7280'
  },

  vendorBrand: {
    fontWeight: '500'
  },

  vendorSize: {},

  vendorAvailability: {
    fontWeight: '500',
    textTransform: 'capitalize'
  },

  selectVendorButton: {
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    marginLeft: '16px'
  },

  noPricesMessage: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
    padding: '40px 20px'
  },

  // Clickable price styles
  clickablePrice: {
    background: 'none',
    border: 'none',
    color: '#FB4F14',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'color 0.2s'
  },

  vendorSelectedIcon: {
    color: '#10B981',
    fontSize: '12px',
    fontWeight: 'bold'
  },

  priceCompareIcon: {
    fontSize: '11px',
    opacity: 0.7,
    marginLeft: '4px'
  },

  // AI Validation Summary Panel Styles
  validationSummaryPanel: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },

  validationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },

  validationTitle: {
    color: '#1e293b',
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  validationActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },


  validationStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },

  validationStatCard: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },


  validationAlert: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '12px',
    color: '#92400e',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

};

export default ParsedResultsDisplay;
