// client/src/components/InstacartCheckoutMobile.js
// Mobile-optimized version of Instacart checkout
import React, { useState, useEffect } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './InstacartCheckoutMobile.css';

const InstacartCheckoutMobile = ({
  items = [],
  onClose,
  initialRetailer = null,
  initialLocation = '95670',
  mode = 'cart'
}) => {
  // Same state as main component but optimized for mobile
  const [currentStep, setCurrentStep] = useState('retailer-selection');
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(initialRetailer);
  const [location, setLocation] = useState(initialLocation);
  const [checkoutItems, setCheckoutItems] = useState(items);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mobile-specific features
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Load retailers
  const loadRetailers = async () => {
    setLoading(true);
    try {
      const result = await instacartCheckoutService.getAvailableRetailers(location, 'US');
      if (result.success && result.retailers) {
        setRetailers(result.retailers);
      }
    } catch (err) {
      setError('Failed to load retailers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetailers();
  }, [location]);

  // Mobile-optimized retailer selection
  const renderMobileRetailerSelection = () => (
    <div className="mobile-step">
      <div className="mobile-step-header">
        <h2>Choose Store</h2>
        <p className="mobile-subtitle">Select where to shop</p>
      </div>

      <div className="mobile-location-input">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="ZIP Code"
          className="mobile-input"
        />
      </div>

      <div className="mobile-retailers-list">
        {retailers.slice(0, 6).map((retailer) => (
          <div
            key={retailer.id}
            className="mobile-retailer-card"
            onClick={() => {
              setSelectedRetailer(retailer);
              setCurrentStep('item-review');
            }}
          >
            <div className="mobile-retailer-logo">
              {retailer.logo ? (
                <img src={retailer.logo} alt={retailer.name} />
              ) : (
                <span>🏪</span>
              )}
            </div>
            <div className="mobile-retailer-info">
              <h4>{retailer.name}</h4>
              <p>{retailer.estimatedDelivery}</p>
              {retailer.address && (
                <p className="mobile-address">📍 {retailer.address}</p>
              )}
              <p className="mobile-fees">
                ${retailer.delivery_fee || 'Free'} delivery
              </p>
            </div>
            <div className="mobile-retailer-arrow">›</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Mobile-optimized item review
  const renderMobileItemReview = () => (
    <div className="mobile-step">
      <div className="mobile-step-header">
        <button
          className="mobile-back-btn"
          onClick={() => setCurrentStep('retailer-selection')}
        >
          ‹ Back
        </button>
        <div>
          <h2>Review Items</h2>
          <p className="mobile-subtitle">{selectedRetailer?.name}</p>
        </div>
      </div>

      <div className="mobile-items-list">
        {checkoutItems.map((item, index) => (
          <div key={item.id || index} className="mobile-checkout-item">
            <div className="mobile-item-main">
              <h4>{item.productName || item.name}</h4>
              <p className="mobile-item-details">
                {item.quantity} {item.unit || 'each'}
              </p>
            </div>
            <div className="mobile-item-actions">
              <button
                className="mobile-qty-btn"
                onClick={() => {
                  const newQty = Math.max(1, (item.quantity || 1) - 1);
                  handleItemUpdate(index, { quantity: newQty });
                }}
              >
                −
              </button>
              <span className="mobile-qty">{item.quantity || 1}</span>
              <button
                className="mobile-qty-btn"
                onClick={() => {
                  const newQty = (item.quantity || 1) + 1;
                  handleItemUpdate(index, { quantity: newQty });
                }}
              >
                +
              </button>
              <button
                className="mobile-remove-btn"
                onClick={() => handleItemRemove(index)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mobile-bottom-action">
        <button
          className="mobile-checkout-btn"
          onClick={() => setCurrentStep('checkout-ready')}
          disabled={checkoutItems.length === 0}
        >
          Continue to Checkout ({checkoutItems.length} items)
        </button>
      </div>
    </div>
  );

  // Mobile-optimized checkout ready
  const renderMobileCheckoutReady = () => (
    <div className="mobile-step">
      <div className="mobile-step-header">
        <button
          className="mobile-back-btn"
          onClick={() => setCurrentStep('item-review')}
        >
          ‹ Back
        </button>
        <div>
          <h2>Ready to Shop</h2>
          <p className="mobile-subtitle">Complete your order</p>
        </div>
      </div>

      <div className="mobile-checkout-summary">
        <div className="mobile-summary-store">
          <div className="mobile-store-info">
            <span className="mobile-store-logo">🏪</span>
            <div>
              <h4>{selectedRetailer?.name}</h4>
              <p>{selectedRetailer?.estimatedDelivery}</p>
            </div>
          </div>
        </div>

        <div className="mobile-summary-items">
          <h4>{checkoutItems.length} Items</h4>
          {checkoutItems.slice(0, 3).map((item, index) => (
            <div key={index} className="mobile-summary-item">
              <span>{item.productName || item.name}</span>
              <span>{item.quantity} {item.unit || 'each'}</span>
            </div>
          ))}
          {checkoutItems.length > 3 && (
            <p className="mobile-more-items">
              +{checkoutItems.length - 3} more items
            </p>
          )}
        </div>
      </div>

      <div className="mobile-bottom-action">
        <button
          className="mobile-instacart-btn"
          onClick={proceedToInstacart}
        >
          <span>🛒</span>
          Open in Instacart
        </button>
      </div>
    </div>
  );

  // Mobile-specific item update
  const handleItemUpdate = (itemIndex, updates) => {
    const updatedItems = [...checkoutItems];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
    setCheckoutItems(updatedItems);
  };

  // Mobile-specific item removal
  const handleItemRemove = (itemIndex) => {
    const updatedItems = checkoutItems.filter((_, index) => index !== itemIndex);
    setCheckoutItems(updatedItems);
  };

  // Proceed to Instacart
  const proceedToInstacart = async () => {
    setLoading(true);
    try {
      // Same checkout logic as desktop version
      const result = await instacartCheckoutService.createInstacartCart(
        checkoutItems,
        selectedRetailer,
        mode
      );

      if (result.success && result.checkoutUrl) {
        // Open in new tab for mobile
        window.open(result.checkoutUrl, '_blank');
        onClose?.();
      }
    } catch (err) {
      setError('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-checkout-overlay">
      <div className="mobile-checkout-container">
        {/* Mobile-specific header */}
        <div className="mobile-header">
          <button className="mobile-close-btn" onClick={onClose}>
            ✕
          </button>
          <h1>Instacart Checkout</h1>
          <div className="mobile-step-indicator">
            {currentStep === 'retailer-selection' && '1/3'}
            {currentStep === 'item-review' && '2/3'}
            {currentStep === 'checkout-ready' && '3/3'}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mobile-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="mobile-loading-overlay">
            <div className="mobile-spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {/* Step content */}
        <div className="mobile-content">
          {currentStep === 'retailer-selection' && renderMobileRetailerSelection()}
          {currentStep === 'item-review' && renderMobileItemReview()}
          {currentStep === 'checkout-ready' && renderMobileCheckoutReady()}
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckoutMobile;