// client/src/components/InstacartCheckout.js
// New Instacart-based checkout system - separate from existing cart

import React, { useState, useEffect, useCallback } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './InstacartCheckout.css';

const InstacartCheckout = ({
  items = [],
  onClose,
  initialRetailer = null,
  initialLocation = '95670',
  mode = 'cart' // 'cart', 'recipe', or 'shopping-list'
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState('retailer-selection');
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(initialRetailer);
  const [location, setLocation] = useState(initialLocation);
  const [checkoutItems, setCheckoutItems] = useState(items);
  const [searchResults, setSearchResults] = useState({});
  const [cartEstimate, setCartEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // Load retailers on component mount
  useEffect(() => {
    loadRetailers();
  }, [location]);

  // Load initial retailer selection
  useEffect(() => {
    if (retailers.length > 0 && !selectedRetailer) {
      // Auto-select first available retailer
      const firstRetailer = retailers.find(r => r.available) || retailers[0];
      setSelectedRetailer(firstRetailer);
    }
  }, [retailers, selectedRetailer]);

  // Update cart estimate when retailer or items change
  useEffect(() => {
    if (selectedRetailer && checkoutItems.length > 0) {
      updateCartEstimate();
    }
  }, [selectedRetailer, checkoutItems]);

  // ============ RETAILER MANAGEMENT ============

  const loadRetailers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🏪 Loading retailers for ${location}`);
      const result = await instacartCheckoutService.getAvailableRetailers(location, 'US');

      if (result.success && result.retailers) {
        setRetailers(result.retailers);
        console.log(`✅ Loaded ${result.retailers.length} retailers`);
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (err) {
      console.error('❌ Error loading retailers:', err);
      setError('Failed to load nearby retailers. Please try again.');
      // Use mock data as fallback
      setRetailers([
        {
          id: 'safeway',
          name: 'Safeway',
          logo: '🏪',
          estimatedDelivery: '2 hours',
          service_fee: 3.99,
          delivery_fee: 5.99,
          available: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetailerSelect = async (retailer) => {
    console.log(`🏪 Selected retailer: ${retailer.name}`);
    setSelectedRetailer(retailer);
    setCurrentStep('item-review');

    // Start searching for products if we have items
    if (checkoutItems.length > 0) {
      await searchProductsForItems();
    }
  };

  // ============ PRODUCT SEARCH ============

  const searchProductsForItems = async () => {
    if (!selectedRetailer || checkoutItems.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Searching products for ${checkoutItems.length} items at ${selectedRetailer.name}`);

      const searchItems = checkoutItems.map(item => ({
        name: item.productName || item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      }));

      const results = await instacartCheckoutService.batchSearchProducts(
        searchItems,
        selectedRetailer.id || selectedRetailer.retailer_key
      );

      if (results.success) {
        const searchMap = {};
        results.results.forEach((result, index) => {
          const originalItem = checkoutItems[index];
          if (originalItem) {
            searchMap[originalItem.id || index] = result;
          }
        });

        setSearchResults(searchMap);
        console.log(`✅ Product search completed: ${results.summary.itemsWithMatches} matches found`);
      } else {
        throw new Error(results.error || 'Product search failed');
      }
    } catch (err) {
      console.error('❌ Error searching products:', err);
      setError('Failed to find matching products. You can still proceed to checkout.');
    } finally {
      setLoading(false);
    }
  };

  // ============ CART MANAGEMENT ============

  const updateCartEstimate = () => {
    if (!selectedRetailer || checkoutItems.length === 0) return;

    const estimate = instacartCheckoutService.calculateEstimatedTotal(
      checkoutItems,
      selectedRetailer
    );
    setCartEstimate(estimate);
  };

  const handleItemUpdate = (itemIndex, updates) => {
    const updatedItems = [...checkoutItems];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
    setCheckoutItems(updatedItems);
  };

  const handleItemRemove = (itemIndex) => {
    const updatedItems = checkoutItems.filter((_, index) => index !== itemIndex);
    setCheckoutItems(updatedItems);
  };

  // ============ CHECKOUT PROCESS ============

  const proceedToInstacart = async () => {
    if (!selectedRetailer || checkoutItems.length === 0) {
      setError('Please select a retailer and ensure you have items to checkout');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🛒 Creating Instacart checkout for ${checkoutItems.length} items`);

      // Validate items
      const validation = instacartCheckoutService.validateCheckoutItems(checkoutItems);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Checkout warnings:', validation.warnings);
      }

      // Convert items to Instacart format
      const instacartItems = instacartCheckoutService.convertCartItemsToInstacart(
        checkoutItems,
        searchResults
      );

      // Create cart or recipe/shopping list based on mode
      let result;

      if (mode === 'recipe') {
        result = await createRecipeCheckout(instacartItems);
      } else if (mode === 'shopping-list') {
        result = await createShoppingListCheckout(instacartItems);
      } else {
        result = await instacartCheckoutService.createInstacartCart(
          instacartItems,
          selectedRetailer.id || selectedRetailer.retailer_key,
          {
            zipCode: location,
            userId: 'instacart_checkout_user',
            metadata: {
              source: 'InstacartCheckout',
              mode: mode,
              retailer: selectedRetailer.name
            }
          }
        );
      }

      if (result.success && result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        setCurrentStep('checkout-ready');
        console.log('✅ Checkout prepared successfully');
      } else {
        throw new Error(result.error || 'Failed to create checkout');
      }
    } catch (err) {
      console.error('❌ Error creating checkout:', err);
      setError(`Checkout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createRecipeCheckout = async (instacartItems) => {
    const recipeData = {
      title: 'My CartSmash Recipe',
      ingredients: instacartItems.map(item => ({
        name: item.name,
        measurements: [{
          quantity: item.quantity,
          unit: 'each'
        }]
      })),
      instructions: ['Enjoy cooking with your CartSmash ingredients!'],
      author: 'CartSmash User',
      servings: 4
    };

    return await instacartCheckoutService.createRecipePage(recipeData, {
      retailerKey: selectedRetailer.id || selectedRetailer.retailer_key,
      partnerUrl: 'https://cartsmash.com'
    });
  };

  const createShoppingListCheckout = async (instacartItems) => {
    const listData = {
      title: 'My CartSmash Shopping List',
      items: instacartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: 'each'
      })),
      instructions: ['Shopping list created with CartSmash']
    };

    return await instacartCheckoutService.createShoppingList(listData, {
      partnerUrl: 'https://cartsmash.com',
      expiresIn: 30
    });
  };

  const openInstacartCheckout = () => {
    if (checkoutUrl) {
      console.log('🔗 Opening Instacart checkout:', checkoutUrl);
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // ============ RENDER HELPERS ============

  const renderRetailerSelection = () => (
    <div className="instacart-step">
      <h3>Select Your Store</h3>
      <div className="location-input">
        <label>
          Delivery Location (ZIP Code):
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={loadRetailers}
            placeholder="Enter ZIP code"
          />
        </label>
      </div>

      {loading && <div className="loading">Loading nearby stores...</div>}

      <div className="retailers-grid">
        {retailers.map(retailer => (
          <div
            key={retailer.id || retailer.retailer_key}
            className={`retailer-card ${!retailer.available ? 'unavailable' : ''}`}
            onClick={() => retailer.available && handleRetailerSelect(retailer)}
          >
            <div className="retailer-logo">{retailer.logo || '🏪'}</div>
            <div className="retailer-info">
              <h4>{retailer.name}</h4>
              <p className="delivery-time">{retailer.estimatedDelivery}</p>
              <p className="fees">
                Delivery: ${retailer.delivery_fee || 'N/A'} |
                Service: ${retailer.service_fee || 'N/A'}
              </p>
              <p className="distance">{retailer.distance || 'Unknown'} miles away</p>
            </div>
            {!retailer.available && (
              <div className="unavailable-overlay">Currently Unavailable</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderItemReview = () => (
    <div className="instacart-step">
      <div className="step-header">
        <h3>Review Your Items</h3>
        <div className="selected-retailer">
          <span>{selectedRetailer.logo || '🏪'} {selectedRetailer.name}</span>
          <button
            className="change-retailer"
            onClick={() => setCurrentStep('retailer-selection')}
          >
            Change Store
          </button>
        </div>
      </div>

      {loading && <div className="loading">Finding products...</div>}

      <div className="items-list">
        {checkoutItems.map((item, index) => {
          const searchResult = searchResults[item.id || index];
          const hasMatches = searchResult?.matches?.length > 0;

          return (
            <div key={item.id || index} className="checkout-item">
              <div className="item-info">
                <h4>{item.productName || item.name}</h4>
                <p>Quantity: {item.quantity} {item.unit || 'each'}</p>
                {item.category && <span className="category">{item.category}</span>}
              </div>

              {hasMatches && (
                <div className="product-matches">
                  <h5>Found at {selectedRetailer.name}:</h5>
                  <div className="match-item">
                    <span className="match-name">{searchResult.matches[0].name}</span>
                    <span className="match-price">${searchResult.matches[0].price}</span>
                  </div>
                </div>
              )}

              <div className="item-actions">
                <input
                  type="number"
                  value={item.quantity}
                  min="1"
                  step="0.1"
                  onChange={(e) => handleItemUpdate(index, { quantity: parseFloat(e.target.value) })}
                />
                <button
                  className="remove-item"
                  onClick={() => handleItemRemove(index)}
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cartEstimate && (
        <div className="cart-estimate">
          <h4>Estimated Total</h4>
          <div className="estimate-breakdown">
            <div>Subtotal: ${cartEstimate.subtotal}</div>
            <div>Service Fee: ${cartEstimate.serviceFee}</div>
            <div>Delivery Fee: ${cartEstimate.deliveryFee}</div>
            <div>Est. Tax: ${cartEstimate.tax}</div>
            <div className="total">Total: ${cartEstimate.total}</div>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button
          className="btn-primary proceed-btn"
          onClick={proceedToInstacart}
          disabled={loading || checkoutItems.length === 0}
        >
          {loading ? 'Preparing Checkout...' : `Checkout with Instacart`}
        </button>
      </div>
    </div>
  );

  const renderCheckoutReady = () => (
    <div className="instacart-step checkout-ready">
      <div className="success-icon">✅</div>
      <h3>Ready to Checkout!</h3>
      <p>Your cart has been prepared on Instacart.</p>

      <div className="checkout-summary">
        <div className="summary-row">
          <span>Store:</span>
          <span>{selectedRetailer.name}</span>
        </div>
        <div className="summary-row">
          <span>Items:</span>
          <span>{checkoutItems.length}</span>
        </div>
        {cartEstimate && (
          <div className="summary-row total">
            <span>Estimated Total:</span>
            <span>${cartEstimate.total}</span>
          </div>
        )}
      </div>

      <div className="checkout-actions">
        <button
          className="btn-primary checkout-btn"
          onClick={openInstacartCheckout}
        >
          Open Instacart Checkout
        </button>
        <button
          className="btn-secondary"
          onClick={() => setCurrentStep('item-review')}
        >
          Back to Review
        </button>
      </div>

      <div className="checkout-info">
        <p>🔗 You'll be redirected to Instacart to complete your purchase</p>
        <p>💡 The checkout link will open in a new window</p>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============

  return (
    <div className="instacart-checkout-overlay">
      <div className="instacart-checkout-modal">
        <div className="modal-header">
          <h2>Instacart Checkout</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="checkout-progress">
          <div className={`step ${currentStep === 'retailer-selection' ? 'active' : 'completed'}`}>
            1. Select Store
          </div>
          <div className={`step ${currentStep === 'item-review' ? 'active' : currentStep === 'checkout-ready' ? 'completed' : ''}`}>
            2. Review Items
          </div>
          <div className={`step ${currentStep === 'checkout-ready' ? 'active' : ''}`}>
            3. Checkout
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {currentStep === 'retailer-selection' && renderRetailerSelection()}
          {currentStep === 'item-review' && renderItemReview()}
          {currentStep === 'checkout-ready' && renderCheckoutReady()}
        </div>

        <div className="modal-footer">
          <div className="instacart-branding">
            <span>Powered by</span>
            <div className="instacart-logo">
              <span style={{color: '#228B22', fontWeight: 'bold'}}>Instacart</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckout;