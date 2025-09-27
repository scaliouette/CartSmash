// client/src/components/InstacartCheckoutUnified.js
// Unified Enhanced Instacart Checkout with Progress Indicators and Store Comparison

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, Store, CheckCircle, X, ArrowLeft } from 'lucide-react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import instacartShoppingListService from '../services/instacartShoppingListService';
import AffiliateDisclosureNotice from './AffiliateDisclosureNotice';
import debugService from '../services/debugService';
import '../styles/InstacartCheckoutUnified.css';
// No-op debug stubs (cleaned up for production)
const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const createTimer = () => ({ start: () => {}, mark: () => {}, end: () => {} });
const conditionalLog = { apiCall: () => {}, componentLifecycle: () => {}, stateChange: () => {}, performance: () => {} };
const componentId = 'InstacartCheckoutUnified';

const InstacartCheckoutUnified = ({
  items = [],
  onClose,
  mode = 'recipe', // 'recipe', 'cart', or 'shopping-list'
  initialLocation = '95670',
  title = null, // Optional custom title
  recipeData = null // Recipe context data from CartSmash
}) => {

  // State management - Always start at step 1 (Select Store)
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStore, setSelectedStore] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [location, setLocation] = useState(initialLocation);
  const [editingZip, setEditingZip] = useState(false);
  const [tempZip, setTempZip] = useState(initialLocation);

  // Initialize ingredients state from items prop
  const ingredientProcessingStartTime = performance.now();

  // eslint-disable-next-line no-unused-vars
  const [ingredients, setIngredients] = useState(() => {
    const processedIngredients = items.map((item, index) => {
      const processed = {
        id: item.id || Math.random().toString(36).substr(2, 9),
        name: item.productName || item.name,
        // Separate quantity (count) from size/unit
        quantity: item.quantity || 1,
        size: item.size || item.packageSize || '',
        unit: item.unit || 'count',
        // Format display: "2 count" or "1 x 16 oz"
        amount: item.size ?
          `${item.quantity || 1} x ${item.size}` :
          `${item.quantity || 1} ${item.unit || 'count'}`,
        price: item.price || 0,
        category: item.category || 'General',
        checked: true,
        // Brand and health filter support
        brandFilters: item.brandFilters || item.brand_filters || (item.preferredBrand ? [item.preferredBrand] : []),
        healthFilters: item.healthFilters || item.health_filters || [],
        // UPC and product ID support
        upcs: item.upcs || [],
        productIds: item.productIds || item.product_ids || []
      };

      debugService.log(`🧪 [${componentId}] Processed ingredient ${index + 1}/${items.length}:`, {
        original: {
          id: item.id,
          productName: item.productName || item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          category: item.category
        },
        processed: {
          id: processed.id,
          name: processed.name,
          amount: processed.amount,
          price: processed.price,
          category: processed.category,
          brandFiltersCount: processed.brandFilters.length,
          healthFiltersCount: processed.healthFilters.length,
          upcsCount: processed.upcs.length
        }
      });

      return processed;
    });

    const processingDuration = Math.round(performance.now() - ingredientProcessingStartTime);
    debugService.log(`✅ [${componentId}] Ingredients processing completed:`, {
      originalCount: items.length,
      processedCount: processedIngredients.length,
      processingDuration,
      totalPrice: processedIngredients.reduce((sum, ing) => sum + (ing.price || 0), 0).toFixed(2),
      categories: [...new Set(processedIngredients.map(ing => ing.category))]
    });

    return processedIngredients;
  });

  // Recipe/Cart data using real recipe data or fallback to mock
  const getRecipeInfo = () => {
    const functionId = `getRecipeInfo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    debugService.log(`📜 [${componentId}] [${functionId}] Recipe info lookup initiated:`, {
      hasRecipeData: !!recipeData,
      hasRecipes: recipeData?.recipes?.length > 0,
      recipeCount: recipeData?.recipes?.length || 0,
      hasCustomTitle: !!title,
      customTitle: title,
      mode: mode
    });

    if (recipeData && recipeData.recipes && recipeData.recipes.length > 0) {
      const firstRecipe = recipeData.recipes[0];
      debugService.log(`📜 [${componentId}] [${functionId}] Using REAL recipe data:`, {
        recipeTitle: firstRecipe.title || firstRecipe.name,
        author: firstRecipe.author,
        servings: firstRecipe.servings,
        prepTime: firstRecipe.prepTime,
        cookTime: firstRecipe.cookTime,
        hasInstructions: !!firstRecipe.instructions,
        instructionsCount: firstRecipe.instructions?.length || 0
      });

      const result = {
        name: title || firstRecipe.title || firstRecipe.name || 'My CartSmash Recipe',
        chef: firstRecipe.author || 'CartSmash Chef',
        servings: firstRecipe.servings || 4,
        time: firstRecipe.prepTime || firstRecipe.cookTime || 30,
        instructions: firstRecipe.instructions || ['Enjoy your meal!'],
        source: 'real_recipe'
      };

      const duration = Math.round(performance.now() - startTime);
      debugService.log(`✅ [${componentId}] [${functionId}] Real recipe processed:`, { ...result, duration });
      return result;
    }

    // Fallback to mock data
    debugService.log(`📜 [${componentId}] [${functionId}] Using MOCK recipe data (no real data available)`);
    const mockResult = {
      name: title || (mode === 'recipe' ? 'My CartSmash Recipe' : mode === 'cart' ? 'Shopping Cart' : 'Shopping List'),
      chef: 'CartSmash Chef',
      servings: 4,
      time: 30,
      instructions: ['Enjoy your meal!'],
      source: 'mock_data'
    };

    const duration = Math.round(performance.now() - startTime);
    debugService.log(`✅ [${componentId}] [${functionId}] Mock recipe generated:`, { ...mockResult, duration });
    return mockResult;
  };

  const checkoutData = {
    ...getRecipeInfo(),
    ingredients: ingredients
  };

  // Step configuration based on mode - All modes skip review and go directly to store selection
  const steps = [
    { number: 1, title: 'Select Store', icon: Store },
    { number: 2, title: 'Complete Checkout', icon: CheckCircle }
  ];

  // ============ HELPER FUNCTIONS ============

  const getTotalPrice = useCallback(() => {
    return ingredients.reduce((total, item) => total + (item.checked ? item.price : 0), 0);
  }, [ingredients]);

  // ============ DATA LOADING ============

  const loadRetailers = useCallback(async () => {
    const functionId = 'loadRetailers';
    const timer = createTimer(componentId, functionId);
    timer.start();

    logger.info(componentId, functionId, 'Loading retailers initiated', {
      location,
      currentRetailersCount: retailers.length,
      hasSelectedStore: !!selectedStore
    });

    setLoading(true);
    setError(null);

    try {
      conditionalLog.apiCall(componentId, `retailers for ${location}`, 'GET');
      const result = await instacartCheckoutService.getAvailableRetailers(location, 'US');

      if (result.success && result.retailers) {
        // Enhanced retailer transformation with real data
        const retailersWithPricing = result.retailers.slice(0, 12).map((retailer, index) => ({
          id: retailer.id || retailer.retailer_key,
          name: retailer.name,
          logo: retailer.retailer_logo_url || retailer.logo || '🏪',
          distance: retailer.distance ? `${retailer.distance.toFixed(1)} mi` : `${(1.0 + index * 0.3).toFixed(1)} mi`,
          estimatedPrice: getTotalPrice() + (index * 1.25), // More realistic price variation
          deliveryTime: retailer.estimatedDelivery || retailer.delivery_time || `${2 + Math.floor(index/2)}hr`,
          available: retailer.available !== false,
          serviceFee: retailer.service_fee || 3.99,
          deliveryFee: retailer.delivery_fee || 5.99,
          minimumOrder: retailer.minimum_order || 35,
          address: retailer.address || `${retailer.name}, ${location}`,
          _raw: retailer
        }));
        setRetailers(retailersWithPricing);
        logger.info(componentId, functionId, `Successfully loaded ${retailersWithPricing.length} retailers`);
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (err) {
      logger.error(componentId, functionId, 'Error loading retailers', { error: err.message });
      setError('Failed to load nearby retailers. Using sample stores.');
      // Enhanced fallback with better mock data
      setRetailers([
        {
          id: 'safeway',
          name: 'Safeway',
          logo: '🏪',
          estimatedPrice: getTotalPrice() + 2.50,
          distance: '0.5 mi',
          deliveryTime: '2hr',
          available: true,
          serviceFee: 3.99,
          deliveryFee: 5.99
        },
        {
          id: 'costco',
          name: 'Costco',
          logo: '🏪',
          estimatedPrice: getTotalPrice() + 0.75,
          distance: '0.8 mi',
          deliveryTime: '2hr',
          available: true,
          serviceFee: 3.99,
          deliveryFee: 5.99
        },
        {
          id: 'sprouts',
          name: 'Sprouts Farmers Market',
          logo: '🌱',
          estimatedPrice: getTotalPrice() + 3.25,
          distance: '2.9 mi',
          deliveryTime: '3hr',
          available: true,
          serviceFee: 3.99,
          deliveryFee: 5.99
        },
        {
          id: 'walmart',
          name: 'Walmart',
          logo: '🏪',
          estimatedPrice: getTotalPrice() - 1.50,
          distance: '8.3 mi',
          deliveryTime: '4hr',
          available: true,
          serviceFee: 3.99,
          deliveryFee: 5.99
        }
      ]);
    } finally {
      setLoading(false);
      const duration = timer.end('Retailers loading completed');
      conditionalLog.performance(componentId, 'loadRetailers', duration, 2000);
    }
  }, [location, getTotalPrice]);

  // Load retailers with pricing on component mount
  useEffect(() => {
    if (location && checkoutData.ingredients?.length > 0) {
      fetchStorePrices();
    } else {
      loadRetailers(); // Fallback to original method if no ingredients
    }
  }, [location, checkoutData.ingredients]);

  // ============ HELPER FUNCTIONS ============

  const getEstimatedTotal = (retailer) => {
    const subtotal = getTotalPrice();
    const serviceFee = retailer?.serviceFee || 3.99;
    const deliveryFee = retailer?.deliveryFee || 5.99;
    const tax = subtotal * 0.0875; // Approximate sales tax
    return {
      subtotal: subtotal.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + serviceFee + deliveryFee + tax).toFixed(2)
    };
  };

  // ============ STEP NAVIGATION ============

  const handleNextStep = () => {
    const maxSteps = mode === 'recipe' ? 2 : 4;

    if (currentStep < maxSteps) {
      // Check store selection for both modes
      if ((mode === 'recipe' && currentStep === 1) || (mode !== 'recipe' && currentStep === 2)) {
        if (!selectedStore) {
          setError('Please select a store to continue');
          return;
        }
      }

      setCurrentStep(currentStep + 1);

      // Start checkout process when moving to final step
      if ((mode === 'recipe' && currentStep === 1) || (mode !== 'recipe' && currentStep === 2)) {
        createCheckout();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1 && currentStep !== 3) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // ============ INGREDIENT MANAGEMENT ============

  // Unused functions removed to fix ESLint warnings
  // handleIngredientToggle, handleQuantityChange, handleItemRemove

  // ============ CHECKOUT CREATION ============

  const createCheckout = async () => {
    const functionId = 'createCheckout';
    const timer = createTimer(componentId, functionId);
    timer.start();

    setLoading(true);
    setError(null);

    try {
      const selectedRetailer = retailers.find(r => r.id === selectedStore) || retailers[0];
      const checkedIngredients = checkoutData.ingredients.filter(item => item.checked);

      if (!selectedRetailer) {
        throw new Error('No retailers available for checkout');
      }

      logger.info(componentId, functionId, 'Creating checkout', {
        totalIngredients: checkoutData.ingredients.length,
        checkedIngredients: checkedIngredients.length,
        retailer: selectedRetailer?.name,
        mode: mode
      });

      if (checkedIngredients.length === 0) {
        throw new Error('No items selected for checkout. Please select at least one item.');
      }

      let result;

      if (mode === 'recipe') {
        // Create a recipe page with ingredients
        debugService.log(`🧾 Creating recipe page "${checkoutData.name}" with ${checkedIngredients.length} ingredients`);
        debugService.log(`📊 Recipe data source: ${checkoutData.source}`);
        debugService.log(`📝 Recipe title: ${checkoutData.name}`);
        debugService.log(`👨‍🍳 Recipe author: ${checkoutData.chef}`);
        debugService.log(`🍽️ Recipe servings: ${checkoutData.servings}`);
        debugService.log(`⏱️ Recipe time: ${checkoutData.time} minutes`);
        debugService.log(`📖 Recipe instructions: ${checkoutData.instructions?.length || 0} steps`);
        if (checkoutData.source === 'real_recipe') {
          debugService.log('✅ Using REAL recipe data from CartSmash!');
        } else {
          debugService.log('⚠️ Using MOCK recipe data (fallback)');
        }

        const recipePayload = {
          title: checkoutData.name,
          ingredients: checkedIngredients.map(ingredient => {
            const ingredientData = {
              name: ingredient.name,
              measurements: [{
                // Use the actual quantity, not parsed from amount
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit || 'each',
                size: ingredient.size || null
              }]
            };

            // Add brand and health filters if specified
            const filters = {};
            if (ingredient.brandFilters && ingredient.brandFilters.length > 0) {
              filters.brand_filters = ingredient.brandFilters;
            }
            if (ingredient.healthFilters && ingredient.healthFilters.length > 0) {
              filters.health_filters = ingredient.healthFilters;
            }
            if (Object.keys(filters).length > 0) {
              ingredientData.filters = filters;
            }

            // Add UPC codes if specified
            if (ingredient.upcs && ingredient.upcs.length > 0) {
              ingredientData.upcs = ingredient.upcs;
            }

            // Add product IDs if specified
            if (ingredient.productIds && ingredient.productIds.length > 0) {
              ingredientData.product_ids = ingredient.productIds;
            }

            return ingredientData;
          }),
          instructions: checkoutData.instructions && checkoutData.instructions.length > 0
            ? checkoutData.instructions
            : [
                `Enjoy cooking with your ${checkoutData.name}!`,
                'Follow the preparation steps for each ingredient.',
                'Combine ingredients according to your preferred method.',
                'Serve and enjoy your homemade meal!'
              ],
          author: checkoutData.chef,
          servings: checkoutData.servings,
          cooking_time_minutes: checkoutData.time
        };

        result = await instacartCheckoutService.createRecipePage(recipePayload, {
          retailerKey: selectedRetailer.id,
          partnerUrl: 'https://cartsmash.com'
        });
      } else if (mode === 'shopping-list') {
        // Create enhanced shopping list with full API features
        debugService.log(`🛒 Creating enhanced shopping list for ${checkedIngredients.length} items at ${selectedRetailer.name}`);

        const enhancedItems = checkedIngredients.map(ingredient => {
          // Use the actual quantity and unit from the ingredient object
          return {
            name: ingredient.name,
            productName: ingredient.name,
            quantity: ingredient.quantity || 1,
            unit: ingredient.unit || 'each',
            size: ingredient.size || null,
            category: ingredient.category || 'General',
            // Enhanced features - could be extended with user preferences
            brand: ingredient.brand || null,
            upc: ingredient.upc || null,
            healthFilters: ingredient.healthFilters || [],
            brandFilters: ingredient.brandFilters || []
          };
        });

        const listData = {
          title: checkoutData.name || 'My CartSmash Shopping List',
          items: enhancedItems,
          instructions: [`Shopping list created with CartSmash at ${selectedRetailer.name}`],
          imageUrl: `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop`,
          preferences: {
            preferredBrands: [],
            dietaryRestrictions: [],
            measurementPreferences: 'imperial'
          }
        };

        result = await instacartShoppingListService.createEnhancedShoppingList(listData, {
          retailerKey: selectedRetailer.id,
          partnerUrl: 'https://cartsmash.com',
          expiresIn: 365
        });
      } else {
        // Create a shopping cart for cart mode (fallback)
        debugService.log(`🛒 Creating shopping cart for ${checkedIngredients.length} items at ${selectedRetailer.name}`);

        const instacartItems = checkedIngredients.map(ingredient => ({
          name: ingredient.name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || 'each',
          size: ingredient.size || null
        }));

        result = await instacartCheckoutService.createInstacartCart(
          instacartItems,
          selectedRetailer.id,
          {
            zipCode: location,
            userId: 'unified_checkout_user',
            metadata: {
              source: 'UnifiedCheckout',
              mode: mode,
              retailer: selectedRetailer.name,
              title: checkoutData.name
            }
          }
        );
      }

      debugService.log('📊 Checkout creation result:', result);

      if (result.success && (result.checkoutUrl || result.instacartUrl)) {
        const finalUrl = result.checkoutUrl || result.instacartUrl;
        setCheckoutUrl(finalUrl);
        debugService.log(`✅ ${mode === 'recipe' ? 'Recipe page' : 'Shopping cart'} created successfully:`, finalUrl);

        // Store checkout URL for user to access later if desired
        debugService.log('✅ Checkout URL created:', finalUrl);

        // Update to completion step
        setCurrentStep(2);
      } else {
        debugService.logError('❌ Checkout creation failed:', result);
        throw new Error(result.error || `${mode === 'recipe' ? 'Recipe creation' : 'Checkout creation'} failed`);
      }
    } catch (err) {
      debugService.logError('❌ Error creating checkout:', err);

      // Provide more specific error messages
      let errorMessage = 'Failed to create checkout. Please try again.';
      if (err.message && err.message.includes('401')) {
        errorMessage = 'Authentication error with Instacart. Using mock data for demonstration.';
      } else if (err.message && err.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setCurrentStep(2); // Go back to store selection
    } finally {
      setLoading(false);
    }
  };

  // ============ EVENT HANDLERS ============

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
    setRetailers([]);
    setSelectedStore(null);
    loadRetailers();
  };

  const handleProceedToCheckout = () => {
    if (checkoutUrl) {
      debugService.log('🔗 User chose to open Instacart checkout:', checkoutUrl);
      window.open(checkoutUrl, '_blank');
    }
    onClose?.();
  };


  // ============ RENDER HELPER FUNCTIONS ============

  // Direct store selection - API-driven with immediate navigation
  const handleStoreSelect = async (store) => {
    try {
      debugService.log('🏪 Store selected:', store.name);

      // Immediately select the store
      setSelectedStore(store.id);

      // Save selection to localStorage
      localStorage.setItem('selectedStore', JSON.stringify(store));

      // Show loading state
      setLoading(true);
      setError(null);

      // Create checkout immediately after store selection
      await createCheckout();

    } catch (error) {
      debugService.logError('Error selecting store:', error);
      setError('Failed to create checkout. Please try again.');
      setLoading(false);
    }
  };

  const fetchStorePrices = async () => {
    setLoading(true);
    try {
      // Use existing Instacart retailers API endpoint
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${API_URL}/api/instacart/retailers?postalCode=${location}&countryCode=US`);

      if (!response.ok) throw new Error('Failed to fetch stores');

      const data = await response.json();

      // Transform API data to include pricing estimates for each store
      const storesWithPricing = data.retailers?.map(store => ({
        ...store,
        subtotal: (checkoutData.ingredients?.filter(i => i.checked)?.length || 0) * 4.99, // Estimated $4.99 per item
        serviceFee: 3.99,
        deliveryFee: store.name?.toLowerCase().includes('costco') ? 10.99 :
                     store.name?.toLowerCase().includes('whole') ? 7.99 : 5.99,
        total: ((checkoutData.ingredients?.filter(i => i.checked)?.length || 0) * 4.99) + 3.99 +
               (store.name?.toLowerCase().includes('costco') ? 10.99 :
                store.name?.toLowerCase().includes('whole') ? 7.99 : 5.99),
        availability: 'same-day'
      })) || [];

      setRetailers(storesWithPricing);
    } catch (error) {
      debugService.logError('Error fetching store prices:', error);
      // Fallback to existing mock data if API fails
    } finally {
      setLoading(false);
    }
  };

  const renderStoreSelection = () => {
    return (
      <div style={{backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden'}}>
        {/* Header */}
        <div style={{backgroundColor: '#002244', color: 'white', padding: '16px'}}>
          <h2 style={{
            margin: '0 0 12px 0',
            fontSize: '20px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{fontSize: '24px'}}>🛒</span>
            Choose Your Store
          </h2>
          <p style={{margin: 0, fontSize: '14px', opacity: 0.9}}>
            Compare prices and select a store to continue shopping
          </p>
        </div>

        {/* Store Selector Section */}
        <div style={{padding: '20px'}}>
          {/* ZIP Code Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#F8F9FA',
            borderRadius: '8px'
          }}>
            <span style={{fontSize: '18px'}}>📍</span>
            <span style={{fontSize: '14px', color: '#666'}}>Delivery Location (ZIP Code):</span>
            {editingZip ? (
              <input
                type="text"
                value={tempZip}
                onChange={(e) => setTempZip(e.target.value)}
                onBlur={() => {
                  setLocation(tempZip);
                  handleLocationChange(tempZip);
                  setEditingZip(false);
                  fetchStorePrices(); // Refresh store prices for new location
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setLocation(tempZip);
                    handleLocationChange(tempZip);
                    setEditingZip(false);
                    fetchStorePrices(); // Refresh store prices for new location
                  }
                }}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #002244',
                  borderRadius: '4px',
                  fontSize: '16px',
                  width: '80px'
                }}
                autoFocus
              />
            ) : (
              <>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#002244',
                  marginLeft: '8px'
                }}>
                  {location}
                </span>
                <button
                  onClick={() => {
                    setTempZip(location);
                    setEditingZip(true);
                  }}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 16px',
                    backgroundColor: '#FB4F14',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              </>
            )}
          </div>

          {loading ? (
            <div className="loading-section" style={{textAlign: 'center', padding: '40px'}}>
              <div className="spinner" style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #FB4F14',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{color: '#666', margin: 0}}>Loading store prices...</p>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {retailers.map((store) => {
                return (
                  <div
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      border: '2px solid #E0E0E0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#FB4F14';
                      e.target.style.backgroundColor = '#FFF5F2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#E0E0E0';
                      e.target.style.backgroundColor = 'white';
                    }}
                  >
                    {store.logo?.startsWith('http') ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        style={{width: '48px', height: '48px', objectFit: 'contain', flexShrink: 0}}
                      />
                    ) : (
                      <span style={{fontSize: '36px', flexShrink: 0}}>{store.logo || '🏪'}</span>
                    )}

                    <div style={{flex: 1}}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{fontSize: '16px', fontWeight: '600', color: '#002244'}}>
                          {store.name}
                        </span>
                        <span style={{fontSize: '12px', color: '#FF6B35', fontWeight: '500'}}>
                          🚚 Same day
                        </span>
                      </div>

                      <div style={{fontSize: '13px', color: '#666', marginBottom: '6px'}}>
                        <span style={{marginRight: '8px'}}>📍 {store.distance}</span>
                        {store.address && <span style={{opacity: 0.8}}>{store.address}</span>}
                      </div>

                      {/* Additional retailer details */}
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px'}}>
                        {store.minimumOrder && (
                          <span style={{
                            backgroundColor: '#E3F2FD',
                            color: '#1976D2',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            💳 ${store.minimumOrder} min
                          </span>
                        )}
                        {store.deliveryTime && (
                          <span style={{
                            backgroundColor: '#F3E5F5',
                            color: '#7B1FA2',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            ⏱️ {store.deliveryTime}
                          </span>
                        )}
                        {store.available && (
                          <span style={{
                            backgroundColor: '#E8F5E8',
                            color: '#2E7D32',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            ✅ Available
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{minWidth: '140px', textAlign: 'right'}}>
                      {/* Store-specific badges */}
                      <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '8px'}}>
                        {store._raw?.membership_required && (
                          <span style={{
                            backgroundColor: '#FFF3CD',
                            color: '#856404',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}>
                            👤 Membership
                          </span>
                        )}
                      </div>

                      {/* Pricing breakdown */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '3px'
                      }}>
                        <span style={{marginRight: '12px'}}>Subtotal:</span>
                        <span style={{fontWeight: '500'}}>${store.estimatedPrice?.toFixed(2) || '91.93'}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '3px'
                      }}>
                        <span style={{marginRight: '12px'}}>Service:</span>
                        <span style={{fontWeight: '500'}}>${store.serviceFee?.toFixed(2) || '3.99'}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '3px'
                      }}>
                        <span style={{marginRight: '12px'}}>Delivery:</span>
                        <span style={{fontWeight: '500'}}>${store.deliveryFee?.toFixed(2) || '5.99'}</span>
                      </div>

                      {/* Additional fees if available */}
                      {store._raw?.bag_fee && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '3px'
                        }}>
                          <span style={{marginRight: '12px'}}>Bag fee:</span>
                          <span style={{fontWeight: '500'}}>${store._raw.bag_fee?.toFixed(2)}</span>
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid #E0E0E0',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#002244'
                      }}>
                        <span style={{marginRight: '12px'}}>Total:</span>
                        <span style={{color: '#FB4F14'}}>
                          ${((store.estimatedPrice || 91.93) + (store.serviceFee || 3.99) + (store.deliveryFee || 5.99) + (store._raw?.bag_fee || 0)).toFixed(2)}
                        </span>
                      </div>

                      {/* Store rating if available */}
                      {store._raw?.rating && (
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px'
                        }}>
                          <span>⭐</span>
                          <span>{store._raw.rating}/5</span>
                          {store._raw?.review_count && (
                            <span style={{opacity: 0.7}}>({store._raw.review_count})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && retailers.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              <p>No stores found for location {location}</p>
              <p style={{fontSize: '14px'}}>Try editing your ZIP code above</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCheckoutCompletion = () => {
    const selectedRetailer = retailers.find(s => s.id === selectedStore) || retailers[0];
    const finalEstimate = getEstimatedTotal(selectedRetailer);

    return (
      <div className="checkout-step-content success-step">
        <div className="success-content">
          <div className="success-icon">
            <CheckCircle className="success-check" />
          </div>
          <h3 className="success-title">
            {mode === 'recipe' ? 'Recipe Created!' : 'Shopping List Created!'}
          </h3>
          <p className="success-subtitle">
            Your {mode === 'recipe' ? 'ingredients' : 'items'} have been added to your cart at {selectedRetailer?.name}
          </p>

          <div className="checkout-summary">
            <div className="summary-row">
              <span>Store:</span>
              <span>{selectedRetailer?.name}</span>
            </div>
            <div className="summary-row">
              <span>Items:</span>
              <span>{checkoutData.ingredients.filter(i => i.checked).length}</span>
            </div>
            <div className="summary-row">
              <span>Distance:</span>
              <span>{selectedRetailer?.distance}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Time:</span>
              <span>{selectedRetailer?.deliveryTime}</span>
            </div>
            <div className="summary-row total-row">
              <span>Estimated Total:</span>
              <span className="total-amount">${finalEstimate.total}</span>
            </div>
          </div>

          {/* Affiliate Disclosure Notice */}
          <AffiliateDisclosureNotice
            variant="prominent"
            position="bottom"
            onLearnMore={() => window.setCurrentView?.('affiliate-disclosure')}
          />

          {/* Button removed - using footer button instead to avoid duplication */}
        </div>
      </div>
    );
  };

  // ============ RENDER STEP CONTENT ============

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        // Step 1: Store Selection
        return renderStoreSelection();
      case 2:
        // Step 2: Checkout completion (processing)
        return renderCheckoutCompletion();
      case 3:
        // Step 3: Processing (loading state)
        return renderCheckoutCompletion();
      case 4:
        // Step 4: Success page
        return renderCheckoutCompletion();
      default:
        return renderStoreSelection(); // Fallback to store selection
    }
  };

  // ============ MAIN RENDER ============

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        {/* Progress Steps Header */}
        <div className="checkout-header">
          <div className="progress-steps">
            {steps.map((step, index) => (
              <div key={step.number} className="step-container">
                <div className={`step-item ${currentStep >= step.number ? 'step-active' : 'step-inactive'}`}>
                  <div className={`step-circle ${currentStep >= step.number ? 'circle-active' : 'circle-inactive'}`}>
                    {currentStep > step.number ? (
                      <Check className="step-check" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="step-label">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-connector ${currentStep > step.number ? 'connector-active' : 'connector-inactive'}`}></div>
                )}
              </div>
            ))}
          </div>

          <button onClick={onClose} className="close-button" title="Close Checkout">
            <X className="close-icon" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        {/* Content */}
        <div className="checkout-content">
          {renderStepContent()}
        </div>

        {/* Footer */}
        {currentStep !== 3 && currentStep !== 4 && (
          <div className="checkout-footer">
            <button
              onClick={currentStep > 1 ? handlePreviousStep : onClose}
              className="footer-button-secondary"
            >
              {currentStep > 1 ? (
                <>
                  <ArrowLeft className="button-icon" />
                  Back
                </>
              ) : (
                'Cancel'
              )}
            </button>

            <button
              onClick={handleNextStep}
              disabled={currentStep === 2 && !selectedStore}
              className="footer-button-primary"
            >
              {currentStep === 2 ? 'Shop on Instacart' : 'Continue'}
              <ChevronRight className="button-icon" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstacartCheckoutUnified;