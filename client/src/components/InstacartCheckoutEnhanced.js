// client/src/components/InstacartCheckoutEnhanced.js
// Enhanced Recipe Checkout Flow with Progress Indicators
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, ShoppingCart, Store, Plus, CheckCircle, X } from 'lucide-react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './InstacartCheckoutEnhanced.css';

const InstacartCheckoutEnhanced = ({ items = [], onClose, mode = 'recipe', initialLocation = '95670' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStore, setSelectedStore] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // Recipe data derived from items
  const recipeData = {
    name: mode === 'recipe' ? 'My CartSmash Recipe' : 'Shopping List',
    chef: 'CartSmash Chef',
    servings: 4,
    time: 30,
    ingredients: items.map(item => ({
      name: item.productName || item.name,
      amount: `${item.quantity || 1}${item.unit ? ` ${item.unit}` : ''}`,
      price: item.price || 2.99,
      checked: true
    }))
  };

  const steps = [
    { number: 1, title: 'Review Recipe', icon: ShoppingCart },
    { number: 2, title: 'Select Store', icon: Store },
    { number: 3, title: 'Create', icon: Plus },
    { number: 4, title: 'Done', icon: CheckCircle }
  ];

  // Load retailers on component mount
  useEffect(() => {
    loadRetailers();
  }, []);

  const loadRetailers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🏪 Loading retailers for ${initialLocation}`);
      const result = await instacartCheckoutService.getAvailableRetailers(initialLocation, 'US');

      if (result.success && result.retailers) {
        // Transform retailers with estimated pricing
        const retailersWithPricing = result.retailers.slice(0, 4).map((retailer, index) => ({
          id: retailer.id || retailer.retailer_key,
          name: retailer.name,
          logo: retailer.retailer_logo_url || retailer.logo,
          distance: `${(1.0 + index * 0.3).toFixed(1)} mi`,
          estimatedPrice: getTotalPrice() + (index * 2.50), // Vary prices slightly
          deliveryTime: retailer.estimatedDelivery || `${2 + index}hr`,
          available: retailer.available !== false
        }));
        setRetailers(retailersWithPricing);
        console.log(`✅ Loaded ${retailersWithPricing.length} retailers`);
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (err) {
      console.error('❌ Error loading retailers:', err);
      setError('Failed to load nearby retailers. Using sample stores.');
      // Use sample data as fallback
      setRetailers([
        { id: 'whole-foods', name: 'Whole Foods', estimatedPrice: getTotalPrice() + 5.00, distance: '0.8 mi', available: true },
        { id: 'kroger', name: 'Kroger', estimatedPrice: getTotalPrice() - 2.00, distance: '1.2 mi', available: true },
        { id: 'safeway', name: 'Safeway', estimatedPrice: getTotalPrice() + 1.50, distance: '1.5 mi', available: true },
        { id: 'target', name: 'Target', estimatedPrice: getTotalPrice() - 1.00, distance: '2.0 mi', available: true }
      ]);
    } finally {
      setLoading(false);
    }
  }, [initialLocation]);

  const getTotalPrice = () => {
    return recipeData.ingredients.reduce((total, item) => total + (item.checked ? item.price : 0), 0);
  };

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

  const createCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const selectedRetailer = retailers.find(r => r.id === selectedStore);
      const checkedIngredients = recipeData.ingredients.filter(item => item.checked);

      let result;

      if (mode === 'recipe') {
        // Create a recipe page with ingredients
        console.log(`🧾 Creating recipe page "${recipeData.name}" with ${checkedIngredients.length} ingredients`);

        const recipePayload = {
          title: recipeData.name,
          ingredients: checkedIngredients.map(ingredient => ({
            name: ingredient.name,
            measurements: [{
              quantity: ingredient.amount.split(' ')[0] || '1',
              unit: ingredient.amount.split(' ').slice(1).join(' ') || 'each'
            }]
          })),
          instructions: [
            `Enjoy cooking with your ${recipeData.name}!`,
            'Follow the preparation steps for each ingredient.',
            'Combine ingredients according to your preferred method.',
            'Serve and enjoy your homemade meal!'
          ],
          author: recipeData.chef,
          servings: recipeData.servings,
          cooking_time_minutes: recipeData.time
        };

        result = await instacartCheckoutService.createRecipePage(recipePayload, {
          retailerKey: selectedRetailer.id,
          partnerUrl: 'https://cartsmash.com'
        });
      } else {
        // Create a shopping cart for shopping list mode
        console.log(`🛒 Creating shopping cart for ${checkedIngredients.length} items at ${selectedRetailer.name}`);

        const instacartItems = checkedIngredients.map(ingredient => ({
          name: ingredient.name,
          quantity: 1,
          unit: 'each'
        }));

        result = await instacartCheckoutService.createInstacartCart(
          instacartItems,
          selectedRetailer.id,
          {
            zipCode: initialLocation,
            userId: 'enhanced_checkout_user',
            metadata: {
              source: 'EnhancedCheckout',
              mode: mode,
              retailer: selectedRetailer.name,
              recipeTitle: recipeData.name
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

  const handleIngredientToggle = (index) => {
    const updatedIngredients = [...recipeData.ingredients];
    updatedIngredients[index].checked = !updatedIngredients[index].checked;
    recipeData.ingredients = updatedIngredients;
    // Force re-render by updating a state
    setError(null);
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="checkout-step-content">
            <h3 className="checkout-title">{recipeData.name}</h3>

            <div className="recipe-meta">
              <span className="meta-item">
                <span>👨‍🍳</span> {recipeData.chef}
              </span>
              <span className="meta-item">
                <span>🍽️</span> {recipeData.servings} servings
              </span>
              <span className="meta-item">
                <span>⏱️</span> {recipeData.time} minutes
              </span>
            </div>

            <div className="ingredients-section">
              <h4 className="ingredients-title">Ingredients ({recipeData.ingredients.length})</h4>
              <div className="ingredients-list">
                {recipeData.ingredients.map((ingredient, index) => (
                  <div key={index} className="ingredient-item">
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
                      </div>
                    </div>
                    <span className="ingredient-price">${ingredient.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="total-section">
              <div className="total-row">
                <span>Estimated Total:</span>
                <span className="total-amount">${getTotalPrice().toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="checkout-step-content">
            <h3 className="checkout-title">Choose Your Store</h3>

            {loading ? (
              <div className="loading-section">
                <div className="spinner"></div>
                <p>Loading nearby stores...</p>
              </div>
            ) : (
              <div className="stores-list">
                {retailers.map((store) => (
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
                        <div>
                          <h4 className="store-name">{store.name}</h4>
                          <p className="store-distance">{store.distance} away • {store.deliveryTime || '2hr'} delivery</p>
                        </div>
                      </div>
                      <div className="store-pricing">
                        <p className="store-price">${store.estimatedPrice.toFixed(2)}</p>
                        <p className="price-label">estimated total</p>
                      </div>
                    </div>
                  </div>
                ))}
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
              <h3 className="loading-title">Creating your shopping list...</h3>
              <p className="loading-subtitle">
                We're adding all ingredients to your cart at {retailers.find(s => s.id === selectedStore)?.name}
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
        return (
          <div className="checkout-step-content success-step">
            <div className="success-content">
              <div className="success-icon">
                <CheckCircle className="success-check" />
              </div>
              <h3 className="success-title">Shopping List Created!</h3>
              <p className="success-subtitle">
                Your ingredients have been added to your cart at {retailers.find(s => s.id === selectedStore)?.name}
              </p>

              <div className="success-actions">
                <button
                  onClick={() => checkoutUrl ? window.open(checkoutUrl, '_blank') : handleProceedToCheckout()}
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

  const handleProceedToCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
    onClose?.();
  };

  const handleContinueShopping = () => {
    onClose?.();
  };

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        {/* Progress Steps */}
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
              {currentStep > 1 ? 'Back' : 'Cancel'}
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

export default InstacartCheckoutEnhanced;