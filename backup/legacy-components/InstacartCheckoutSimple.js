// client/src/components/InstacartCheckoutSimple.js
// Ultra-simplified mobile-first Instacart checkout
import React, { useState, useEffect } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './InstacartCheckoutSimple.css';

const InstacartCheckoutSimple = ({
  items = [],
  onClose,
  initialLocation = '95670'
}) => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRetailers();
  }, []);

  const loadRetailers = async () => {
    try {
      setLoading(true);
      const result = await instacartCheckoutService.getAvailableRetailers(initialLocation, 'US');
      if (result.success && result.retailers) {
        // Only show top 3 popular retailers for simplicity
        const topRetailers = result.retailers
          .filter(r => ['safeway', 'costco', 'walmart', 'kroger', 'whole-foods'].includes(r.retailer_key))
          .slice(0, 3);
        setRetailers(topRetailers.length > 0 ? topRetailers : result.retailers.slice(0, 3));
      }
    } catch (err) {
      setError('Unable to load stores');
    } finally {
      setLoading(false);
    }
  };

  const proceedToInstacart = async (retailer) => {
    setLoading(true);
    try {
      const result = await instacartCheckoutService.createInstacartCart(
        items,
        retailer.id || retailer.retailer_key,
        {
          zipCode: initialLocation,
          userId: 'mobile_user',
          metadata: { source: 'MobileSimple' }
        }
      );

      if (result.success && result.checkoutUrl) {
        // Open Instacart directly
        window.open(result.checkoutUrl, '_blank');
        onClose?.();
      } else {
        setError('Checkout failed. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="simple-checkout-overlay">
        <div className="simple-loading">
          <div className="simple-spinner"></div>
          <p>Finding nearby stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-checkout-overlay">
      <div className="simple-checkout-container">
        {/* Minimal Header */}
        <div className="simple-header">
          <button className="simple-close" onClick={onClose}>✕</button>
          <h1>Shop with Instacart</h1>
        </div>

        {error && (
          <div className="simple-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Simplified Content */}
        <div className="simple-content">
          <div className="simple-cart-summary">
            <h2>{items.length} items ready to shop</h2>
            <div className="simple-items-preview">
              {items.slice(0, 3).map((item, index) => (
                <span key={index} className="simple-item-chip">
                  {item.productName || item.name}
                </span>
              ))}
              {items.length > 3 && (
                <span className="simple-more-chip">+{items.length - 3} more</span>
              )}
            </div>
          </div>

          <div className="simple-store-selection">
            <h3>Choose your store:</h3>
            <div className="simple-stores-grid">
              {retailers.map((retailer, index) => (
                <button
                  key={retailer.id || retailer.retailer_key || index}
                  className="simple-store-card"
                  onClick={() => proceedToInstacart(retailer)}
                  disabled={loading}
                >
                  <div className="simple-store-logo">
                    {(retailer.logo || retailer.retailer_logo_url) ? (
                      <img src={retailer.logo || retailer.retailer_logo_url} alt={retailer.name} />
                    ) : (
                      <span>🏪</span>
                    )}
                  </div>
                  <div className="simple-store-info">
                    <h4>{retailer.name}</h4>
                    <p>{retailer.estimatedDelivery || '2-4 hours'}</p>
                  </div>
                  <div className="simple-store-action">
                    <span>Shop →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {retailers.length > 0 && (
            <div className="simple-footer-note">
              <p>💡 Tap a store to add your items to Instacart and complete checkout there</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckoutSimple;