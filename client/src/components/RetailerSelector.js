// client/src/components/RetailerSelector.js
// Dedicated retailer selection component for Instacart checkout

import React, { useState, useEffect, useCallback } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import './RetailerSelector.css';

const RetailerSelector = ({
  onRetailerSelect,
  selectedRetailer = null,
  location = '95670',
  onLocationChange,
  compact = false
}) => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRetailers();
  }, [location, loadRetailers]);

  const loadRetailers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🏪 Loading retailers for ${location}`);
      const result = await instacartCheckoutService.getAvailableRetailers(location, 'US');

      if (result.success && result.retailers) {
        setRetailers(result.retailers);
        console.log(`✅ Loaded ${result.retailers.length} retailers`);

        // Auto-select first available retailer if none selected
        if (!selectedRetailer && result.retailers.length > 0) {
          const firstAvailable = result.retailers.find(r => r.available) || result.retailers[0];
          onRetailerSelect(firstAvailable);
        }
      } else {
        throw new Error('Failed to load retailers');
      }
    } catch (err) {
      console.error('❌ Error loading retailers:', err);
      setError('Failed to load nearby retailers');

      // Use fallback retailers
      const fallbackRetailers = getFallbackRetailers();
      setRetailers(fallbackRetailers);
      if (!selectedRetailer && fallbackRetailers.length > 0) {
        onRetailerSelect(fallbackRetailers[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [location, selectedRetailer, onRetailerSelect]);

  const getFallbackRetailers = () => [
    {
      id: 'safeway',
      retailer_key: 'safeway',
      name: 'Safeway',
      logo: '🏪',
      estimatedDelivery: '2 hours',
      service_fee: 3.99,
      delivery_fee: 5.99,
      distance: 1.2,
      available: true
    },
    {
      id: 'kroger',
      retailer_key: 'kroger',
      name: 'Kroger',
      logo: '🛒',
      estimatedDelivery: '2-3 hours',
      service_fee: 2.99,
      delivery_fee: 4.99,
      distance: 1.8,
      available: true
    },
    {
      id: 'whole_foods',
      retailer_key: 'whole_foods',
      name: 'Whole Foods Market',
      logo: '🥬',
      estimatedDelivery: '1-2 hours',
      service_fee: 3.99,
      delivery_fee: 7.99,
      distance: 2.1,
      available: true
    }
  ];

  const handleRetailerClick = (retailer) => {
    if (retailer.available) {
      onRetailerSelect(retailer);
    }
  };

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    loadRetailers();
  };

  if (compact) {
    return (
      <div className="retailer-selector compact">
        <div className="current-retailer">
          {selectedRetailer ? (
            <div className="selected-retailer-display">
              <span className="retailer-logo">{selectedRetailer.logo || '🏪'}</span>
              <div className="retailer-details">
                <span className="retailer-name">{selectedRetailer.name}</span>
                <span className="delivery-info">{selectedRetailer.estimatedDelivery}</span>
              </div>
            </div>
          ) : (
            <div className="no-retailer">Select a store</div>
          )}
        </div>

        <div className="retailers-dropdown">
          <select
            value={selectedRetailer?.id || selectedRetailer?.retailer_key || ''}
            onChange={(e) => {
              const retailer = retailers.find(r => r.id === e.target.value || r.retailer_key === e.target.value);
              if (retailer) handleRetailerClick(retailer);
            }}
            disabled={loading}
          >
            <option value="">Choose store...</option>
            {retailers.map(retailer => (
              <option
                key={retailer.id || retailer.retailer_key}
                value={retailer.id || retailer.retailer_key}
                disabled={!retailer.available}
              >
                {retailer.name} - {retailer.estimatedDelivery}
                {!retailer.available && ' (Unavailable)'}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="retailer-selector">
      <div className="selector-header">
        <h3>Select Your Store</h3>
        <form onSubmit={handleLocationSubmit} className="location-form">
          <label>
            ZIP Code:
            <input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Enter ZIP"
              pattern="[0-9]{5}"
              maxLength="5"
            />
          </label>
          <button type="submit" disabled={loading}>
            Update
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Finding nearby stores...</span>
        </div>
      )}

      <div className="retailers-grid">
        {retailers.map(retailer => (
          <div
            key={retailer.id || retailer.retailer_key}
            className={`retailer-card ${
              !retailer.available ? 'unavailable' : ''
            } ${
              (selectedRetailer?.id === retailer.id ||
               selectedRetailer?.retailer_key === retailer.retailer_key) ? 'selected' : ''
            }`}
            onClick={() => handleRetailerClick(retailer)}
          >
            <div className="retailer-logo">
              {retailer.logo || retailer.retailer_logo_url ? (
                retailer.retailer_logo_url ? (
                  <img src={retailer.retailer_logo_url} alt={retailer.name} />
                ) : (
                  <span>{retailer.logo}</span>
                )
              ) : (
                '🏪'
              )}
            </div>

            <div className="retailer-info">
              <h4>{retailer.name}</h4>
              <div className="delivery-time">
                📦 {retailer.estimatedDelivery || 'Delivery available'}
              </div>
              <div className="fees">
                💰 Delivery: ${retailer.delivery_fee || 'N/A'} |
                Service: ${retailer.service_fee || 'N/A'}
              </div>
              {retailer.distance && (
                <div className="distance">
                  📍 {retailer.distance} miles away
                </div>
              )}
            </div>

            {(selectedRetailer?.id === retailer.id ||
              selectedRetailer?.retailer_key === retailer.retailer_key) && (
              <div className="selected-indicator">✓</div>
            )}

            {!retailer.available && (
              <div className="unavailable-overlay">
                Currently Unavailable
              </div>
            )}
          </div>
        ))}
      </div>

      {retailers.length === 0 && !loading && (
        <div className="no-retailers">
          <div className="no-retailers-icon">🏪</div>
          <h4>No stores found</h4>
          <p>Try a different ZIP code or check your internet connection.</p>
        </div>
      )}

      <div className="retailer-info-footer">
        <p>💡 Delivery times and fees may vary based on location and store availability</p>
        <p>🔒 Secure checkout powered by Instacart</p>
      </div>
    </div>
  );
};

export default RetailerSelector;