// client/src/components/InstacartCheckoutUnified.js
// Unified Enhanced Instacart Checkout with Progress Indicators and Store Comparison

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, ShoppingCart, Store, Plus, CheckCircle, X, ArrowLeft } from 'lucide-react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './InstacartCheckoutEnhanced.css';

const InstacartCheckoutUnified = ({
  items = [],
  onClose,
  mode = 'recipe', // 'recipe', 'cart', or 'shopping-list'
  initialLocation = '95670',
  title = null // Optional custom title
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStore, setSelectedStore] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [location, setLocation] = useState(initialLocation);

  // Recipe/Cart data derived from items and mode
  const checkoutData = {
    name: title || (mode === 'recipe' ? 'My CartSmash Recipe' : mode === 'cart' ? 'Shopping Cart' : 'Shopping List'),
    chef: 'CartSmash Chef',
    servings: 4,
    time: 30,
    ingredients: items.map(item => ({
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
  };

  // Step configuration based on mode
  const steps = [
    { number: 1, title: mode === 'recipe' ? 'Review Recipe' : 'Review Items', icon: ShoppingCart },
    { number: 2, title: 'Select Store', icon: Store },
    { number: 3, title: 'Create', icon: Plus },
    { number: 4, title: 'Done', icon: CheckCircle }
  ];

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
  }, [location]);

  // Load retailers on component mount
  useEffect(() => {
    loadRetailers();
  }, [loadRetailers]);

  // ============ HELPER FUNCTIONS ============

  const getTotalPrice = () => {
    return checkoutData.ingredients.reduce((total, item) => total + (item.checked ? item.price : 0), 0);
  };

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
    if (currentStep < 4) {
      if (currentStep === 2 && !selectedStore) {
        setError('Please select a store to continue');
        return;
      }
      setCurrentStep(currentStep + 1);

      // Start checkout process when moving to step 3
      if (currentStep === 2) {
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
    const updatedData = { ...checkoutData };
    updatedData.ingredients[index].checked = !updatedData.ingredients[index].checked;
    // Force re-render by updating error state
    setError(null);
  };

  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity > 0) {
      checkoutData.ingredients[index].amount = `${newQuantity}${checkoutData.ingredients[index].amount.replace(/^[\d.]+/, '')}`;
      setError(null); // Force re-render
    }
  };

  // ============ CHECKOUT CREATION ============

  const createCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const selectedRetailer = retailers.find(r => r.id === selectedStore);
      const checkedIngredients = checkoutData.ingredients.filter(item => item.checked);

      let result;

      if (mode === 'recipe') {
        // Create a recipe page with ingredients
        console.log(`🧾 Creating recipe page "${checkoutData.name}" with ${checkedIngredients.length} ingredients`);

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
          instructions: [
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
      } else {
        // Create a shopping cart for cart/shopping-list mode
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

      if (result.success && (result.checkoutUrl || result.instacartUrl)) {
        setCheckoutUrl(result.checkoutUrl || result.instacartUrl);
        console.log(`✅ ${mode === 'recipe' ? 'Recipe page' : 'Shopping cart'} created successfully:`, result.checkoutUrl || result.instacartUrl);

        // Simulate processing time for better UX
        setTimeout(() => {
          setCurrentStep(4);
        }, 2000);
      } else {
        throw new Error(result.error || `${mode === 'recipe' ? 'Recipe creation' : 'Checkout creation'} failed`);
      }
    } catch (err) {
      console.error('❌ Error creating checkout:', err);
      setError('Failed to create checkout. Please try again.');
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

  // ============ RENDER STEP CONTENT ============

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="checkout-step-content">
            <h3 className="checkout-title">{checkoutData.name}</h3>

            {mode === 'recipe' && (
              <div className="recipe-meta">
                <span className="meta-item">
                  <span>👨‍🍳</span> {checkoutData.chef}
                </span>
                <span className="meta-item">
                  <span>🍽️</span> {checkoutData.servings} servings
                </span>
                <span className="meta-item">
                  <span>⏱️</span> {checkoutData.time} minutes
                </span>
              </div>
            )}

            <div className="ingredients-section">
              <h4 className="ingredients-title">
                {mode === 'recipe' ? 'Ingredients' : 'Items'} ({checkoutData.ingredients.length})
              </h4>
              <div className="ingredients-list">
                {checkoutData.ingredients.map((ingredient, index) => (
                  <div key={ingredient.id} className="ingredient-item">
                    <div className="ingredient-info">
                      <input
                        type="checkbox"
                        checked={ingredient.checked}
                        onChange={() => handleIngredientToggle(index)}
                        className="ingredient-checkbox"
                      />
                      <div>
                        <span className="ingredient-name">{ingredient.name}</span>
                        <span className="ingredient-amount">({ingredient.amount})</span>
                        {ingredient.category && (
                          <span className="ingredient-category">{ingredient.category}</span>
                        )}
                        <div className="ingredient-filters">
                          {ingredient.brandFilters && ingredient.brandFilters.length > 0 && (
                            <div className="brand-filters">
                              {ingredient.brandFilters.map((brand, index) => (
                                <span key={index} className="brand-filter-tag">
                                  🏷️ {brand}
                                </span>
                              ))}
                            </div>
                          )}
                          {ingredient.healthFilters && ingredient.healthFilters.length > 0 && (
                            <div className="health-filters">
                              {ingredient.healthFilters.map((health, index) => (
                                <span key={index} className="health-filter-tag">
                                  🌱 {health}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ingredient-actions">
                      <input
                        type="number"
                        value={parseFloat(ingredient.amount.split(' ')[0]) || 1}
                        min="0.1"
                        step="0.1"
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value))}
                        className="quantity-input"
                      />
                      <span className="ingredient-price">${ingredient.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="total-section">
              <div className="total-row">
                <span>Estimated Subtotal:</span>
                <span className="total-amount">${getTotalPrice().toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case 2:
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
                              <h4 className="store-name">{store.name}</h4>
                            </div>
                            <p className="store-distance">
                              {store.distance} away • {store.deliveryTime} delivery
                            </p>
                            {store.address && (
                              <p className="store-address">📍 {store.address}</p>
                            )}
                          </div>
                        </div>
                        <div className="store-pricing">
                          <p className="store-price">${estimate.total}</p>
                          <p className="price-label">estimated total</p>
                          <div className="price-breakdown">
                            <small>Items: ${estimate.subtotal}</small>
                            <small>Fees: ${(parseFloat(estimate.serviceFee) + parseFloat(estimate.deliveryFee)).toFixed(2)}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pricing-note">
              <p>💡 Prices may vary based on availability and current promotions at each store.</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="checkout-step-content loading-step">
            <div className="loading-animation">
              <div className="spinner-large"></div>
              <h3 className="loading-title">
                Creating your {mode === 'recipe' ? 'recipe page' : 'shopping list'}...
              </h3>
              <p className="loading-subtitle">
                We're adding all {mode === 'recipe' ? 'ingredients' : 'items'} to your cart at {retailers.find(s => s.id === selectedStore)?.name}
              </p>
              <button
                onClick={onClose}
                className="loading-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 4:
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
                <div className="summary-row total">
                  <span>Estimated Total:</span>
                  <span>${finalEstimate.total}</span>
                </div>
              </div>

              <div className="success-actions">
                <button
                  onClick={handleProceedToCheckout}
                  className="primary-button"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={handleContinueShopping}
                  className="secondary-button"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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