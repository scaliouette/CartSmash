// client/src/components/InstacartCheckoutUnified.js
// Unified Enhanced Instacart Checkout with Progress Indicators and Store Comparison

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, ShoppingCart, Store, Plus, CheckCircle, X, ArrowLeft } from 'lucide-react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import instacartShoppingListService from '../services/instacartShoppingListService';
import './InstacartCheckoutEnhanced.css';

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

  // Initialize ingredients state from items prop
  const [ingredients, setIngredients] = useState(() =>
    items.map(item => ({
      id: item.id || Math.random().toString(36).substr(2, 9),
      name: item.productName || item.name,
      amount: `${item.quantity || 1}${item.unit ? ` ${item.unit}` : ''}`,
      price: item.price || 2.99,
      category: item.category || 'General',
      checked: true,
      // Brand and health filter support
      brandFilters: item.brandFilters || item.brand_filters || (item.preferredBrand ? [item.preferredBrand] : []),
      healthFilters: item.healthFilters || item.health_filters || [],
      // UPC and product ID support
      upcs: item.upcs || [],
      productIds: item.productIds || item.product_ids || []
    }))
  );

  // Recipe/Cart data using real recipe data or fallback to mock
  const getRecipeInfo = () => {
    console.log('🔍 Checking recipe data:', {
      hasRecipeData: !!recipeData,
      hasRecipes: recipeData?.recipes?.length > 0,
      recipeCount: recipeData?.recipes?.length || 0
    });

    if (recipeData && recipeData.recipes && recipeData.recipes.length > 0) {
      const firstRecipe = recipeData.recipes[0];
      return {
        name: title || firstRecipe.title || firstRecipe.name || 'My CartSmash Recipe',
        chef: firstRecipe.author || 'CartSmash Chef',
        servings: firstRecipe.servings || 4,
        time: firstRecipe.prepTime || firstRecipe.cookTime || 30,
        instructions: firstRecipe.instructions || ['Enjoy your meal!'],
        source: 'real_recipe'
      };
    }

    // Fallback to mock data
    return {
      name: title || (mode === 'recipe' ? 'My CartSmash Recipe' : mode === 'cart' ? 'Shopping Cart' : 'Shopping List'),
      chef: 'CartSmash Chef',
      servings: 4,
      time: 30,
      instructions: ['Enjoy your meal!'],
      source: 'mock_data'
    };
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
    setLoading(true);
    setError(null);

    try {
      console.log(`🏪 Loading retailers for ${location}`);
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
        console.log(`✅ Loaded ${retailersWithPricing.length} retailers`);
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (err) {
      console.error('❌ Error loading retailers:', err);
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
    }
  }, [location, getTotalPrice]);

  // Load retailers on component mount
  useEffect(() => {
    loadRetailers();
  }, [loadRetailers]);

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

  const handleIngredientToggle = (index) => {
    setIngredients(prev => prev.map((ingredient, i) =>
      i === index ? { ...ingredient, checked: !ingredient.checked } : ingredient
    ));
  };

  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity > 0) {
      setIngredients(prev => prev.map((ingredient, i) =>
        i === index
          ? { ...ingredient, amount: `${newQuantity}${ingredient.amount.replace(/^[\d.]+/, '')}` }
          : ingredient
      ));
    }
  };

  const handleItemRemove = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // ============ CHECKOUT CREATION ============

  const createCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const selectedRetailer = retailers.find(r => r.id === selectedStore);
      const checkedIngredients = checkoutData.ingredients.filter(item => item.checked);

      console.log('🛒 Creating checkout with:', {
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
        console.log(`🧾 Creating recipe page "${checkoutData.name}" with ${checkedIngredients.length} ingredients`);
        console.log(`📊 Recipe data source: ${checkoutData.source}`);
        console.log(`📝 Recipe title: ${checkoutData.name}`);
        console.log(`👨‍🍳 Recipe author: ${checkoutData.chef}`);
        console.log(`🍽️ Recipe servings: ${checkoutData.servings}`);
        console.log(`⏱️ Recipe time: ${checkoutData.time} minutes`);
        console.log(`📖 Recipe instructions: ${checkoutData.instructions?.length || 0} steps`);
        if (checkoutData.source === 'real_recipe') {
          console.log('✅ Using REAL recipe data from CartSmash!');
        } else {
          console.log('⚠️ Using MOCK recipe data (fallback)');
        }

        const recipePayload = {
          title: checkoutData.name,
          ingredients: checkedIngredients.map(ingredient => {
            const ingredientData = {
              name: ingredient.name,
              measurements: [{
                quantity: parseFloat(ingredient.amount.split(' ')[0]) || 1,
                unit: ingredient.amount.split(' ').slice(1).join(' ') || 'each'
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
        console.log(`🛒 Creating enhanced shopping list for ${checkedIngredients.length} items at ${selectedRetailer.name}`);

        const enhancedItems = checkedIngredients.map(ingredient => {
          const quantityMatch = ingredient.amount.match(/^(\d*\.?\d+)\s*(.*)$/);
          const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
          const unit = quantityMatch ? quantityMatch[2].trim() || 'each' : 'each';

          return {
            name: ingredient.name,
            productName: ingredient.name,
            quantity: quantity,
            unit: unit,
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
        console.log(`🛒 Creating shopping cart for ${checkedIngredients.length} items at ${selectedRetailer.name}`);

        const instacartItems = checkedIngredients.map(ingredient => ({
          name: ingredient.name,
          quantity: parseFloat(ingredient.amount.split(' ')[0]) || 1,
          unit: ingredient.amount.split(' ').slice(1).join(' ') || 'each'
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

      console.log('📊 Checkout creation result:', result);

      if (result.success && (result.checkoutUrl || result.instacartUrl)) {
        setCheckoutUrl(result.checkoutUrl || result.instacartUrl);
        console.log(`✅ ${mode === 'recipe' ? 'Recipe page' : 'Shopping cart'} created successfully:`, result.checkoutUrl || result.instacartUrl);

        // Simulate processing time for better UX
        setTimeout(() => {
          setCurrentStep(4);
        }, 2000);
      } else {
        console.error('❌ Checkout creation failed:', result);
        throw new Error(result.error || `${mode === 'recipe' ? 'Recipe creation' : 'Checkout creation'} failed`);
      }
    } catch (err) {
      console.error('❌ Error creating checkout:', err);

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
      window.open(checkoutUrl, '_blank');
    }
    onClose?.();
  };

  const handleContinueShopping = () => {
    onClose?.();
  };

  // ============ RENDER HELPER FUNCTIONS ============

  const renderStoreSelection = () => {
    return (
      <div className="checkout-step-content">
        <h3 className="checkout-title">Choose Your Store</h3>

        <div className="location-input">
          <label>
            <span>📍 Delivery Location (ZIP Code):</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={() => handleLocationChange(location)}
              placeholder="Enter ZIP code"
            />
          </label>
        </div>

        {loading ? (
          <div className="loading-section">
            <div className="spinner"></div>
            <p>Loading nearby stores...</p>
          </div>
        ) : (
          <div className="stores-list">
            {retailers.map((store) => {
              const estimate = getEstimatedTotal(store);
              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store.id)}
                  className={`store-card ${selectedStore === store.id ? 'store-selected' : ''}`}
                >
                  <div className="store-info">
                    <div className="store-selection">
                      <div className={`radio-button ${selectedStore === store.id ? 'radio-selected' : ''}`}>
                        {selectedStore === store.id && <Check className="check-icon" />}
                      </div>
                      <div className="store-details">
                        <div className="store-header">
                          {store.logo.startsWith('http') ? (
                            <img src={store.logo} alt={store.name} className="store-logo" />
                          ) : (
                            <span className="store-emoji">{store.logo}</span>
                          )}
                          <span className="store-name">{store.name}</span>
                        </div>
                        <div className="store-meta">
                          <span className="store-distance">📍 {store.distance}</span>
                          <span className="store-delivery">🚚 {store.deliveryTime}</span>
                        </div>
                        {store.address && (
                          <div className="store-address">{store.address}</div>
                        )}
                      </div>
                    </div>
                    <div className="store-pricing">
                      <div className="price-breakdown">
                        <div className="price-row">
                          <span>Subtotal:</span>
                          <span>${estimate.subtotal}</span>
                        </div>
                        <div className="price-row">
                          <span>Service Fee:</span>
                          <span>${estimate.serviceFee}</span>
                        </div>
                        <div className="price-row">
                          <span>Delivery:</span>
                          <span>${estimate.deliveryFee}</span>
                        </div>
                        <div className="price-row total-row">
                          <span>Total:</span>
                          <span className="total-price">${estimate.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCheckoutCompletion = () => {
    const selectedRetailer = retailers.find(s => s.id === selectedStore);
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

          <div className="checkout-actions">
            <button onClick={handleProceedToCheckout} className="proceed-button">
              {checkoutUrl ? '🛒 Shop on Instacart' : '🔄 Processing...'}
            </button>
            <button onClick={handleContinueShopping} className="continue-button">
              Continue Shopping on CartSmash
            </button>
          </div>
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
        return renderSuccessStep();
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
              {currentStep === 2 ? 'Create List' : 'Continue'}
              <ChevronRight className="button-icon" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstacartCheckoutUnified;