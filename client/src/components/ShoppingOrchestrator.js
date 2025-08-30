// client/src/components/ShoppingOrchestrator.js
import React, { useState, useEffect } from 'react';

function ShoppingOrchestrator({ items, recipe }) {
  const [vendors, setVendors] = useState([]);
  const [priceComparison, setPriceComparison] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('today');
  const [servingSize, setServingSize] = useState(recipe?.servings || 4);

  const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

  // Available shopping vendors
  const availableVendors = [
    { 
      id: 'instacart', 
      name: 'Instacart', 
      logo: '🛒',
      features: ['Multi-store', '1-hour delivery', 'Coupons'],
      stores: ['Kroger', 'Safeway', 'Costco', 'Target']
    },
    { 
      id: 'amazon-fresh', 
      name: 'Amazon Fresh', 
      logo: '📦',
      features: ['Free delivery $35+', 'Same-day', 'Subscribe & Save']
    },
    { 
      id: 'walmart-grocery', 
      name: 'Walmart Grocery', 
      logo: '🏪',
      features: ['Low prices', 'Pickup available', 'EBT accepted']
    },
    { 
      id: 'whole-foods', 
      name: 'Whole Foods', 
      logo: '🌿',
      features: ['Organic options', 'Prime discounts', 'Quality guarantee']
    },
    { 
      id: 'shipt', 
      name: 'Shipt', 
      logo: '🚚',
      features: ['Target + others', 'Member prices', 'Same-day']
    }
  ];

  useEffect(() => {
    analyzePricesAcrossVendors();
  }, [items]);

  // Get prices from multiple vendors
  const analyzePricesAcrossVendors = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${API_URL}/api/shopping/compare-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          vendors: availableVendors.map(v => v.id),
          zipCode: localStorage.getItem('userZipCode') || '95670'
        })
      });
      
      const data = await response.json();
      setPriceComparison(data.comparison);
      
      // Auto-select best value vendor
      const bestVendor = calculateBestValue(data.comparison);
      setSelectedVendor(bestVendor);
      
    } catch (error) {
      console.error('Price comparison failed:', error);
      // Fallback to estimated prices
      setPriceComparison(generateEstimatedPrices());
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate best value vendor
  const calculateBestValue = (comparison) => {
    let bestScore = Infinity;
    let bestVendor = null;
    
    Object.entries(comparison).forEach(([vendorId, data]) => {
      const score = data.totalPrice + data.deliveryFee - (data.savings || 0);
      if (score < bestScore) {
        bestScore = score;
        bestVendor = vendorId;
      }
    });
    
    return bestVendor;
  };

  // Generate estimated prices as fallback
  const generateEstimatedPrices = () => {
    const estimates = {};
    
    availableVendors.forEach(vendor => {
      const basePrice = items.reduce((sum, item) => {
        const avgPrice = 3.99; // Default estimate
        return sum + (avgPrice * (item.quantity || 1));
      }, 0);
      
      estimates[vendor.id] = {
        totalPrice: basePrice * (vendor.id === 'walmart-grocery' ? 0.9 : 1),
        deliveryFee: vendor.id === 'amazon-fresh' ? 0 : 4.99,
        availability: Math.floor(Math.random() * 20) + 80,
        savings: Math.random() * 10,
        estimatedDelivery: 'Today 4pm-6pm'
      };
    });
    
    return estimates;
  };

  // Adjust quantities for serving size
  const adjustServingSize = (newSize) => {
    const ratio = newSize / servingSize;
    const adjustedItems = items.map(item => ({
      ...item,
      quantity: Math.ceil((item.quantity || 1) * ratio)
    }));
    
    setServingSize(newSize);
    // Re-analyze with new quantities
    analyzePricesAcrossVendors();
    
    return adjustedItems;
  };

  // Send to selected vendor
  const proceedToCheckout = async (vendorId) => {
    const vendor = availableVendors.find(v => v.id === vendorId);
    const comparison = priceComparison[vendorId];
    
    // Create optimized cart for vendor
    const response = await fetch(`${API_URL}/api/shopping/create-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: vendorId,
        items: items,
        recipe: recipe,
        deliveryTime: deliveryTime,
        applySubstitutions: true
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Open vendor with pre-filled cart
      if (vendorId === 'instacart') {
        window.open(data.cartUrl, '_blank');
      } else {
        // Handle other vendors
        window.open(data.checkoutUrl, '_blank');
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          🛍️ Smart Shopping for: {recipe?.name || 'Your List'}
        </h2>
        
        {recipe && (
          <div style={styles.servingAdjuster}>
            <label>Adjust servings:</label>
            <input
              type="range"
              min="1"
              max="12"
              value={servingSize}
              onChange={(e) => adjustServingSize(parseInt(e.target.value))}
              style={styles.slider}
            />
            <span>{servingSize} servings</span>
          </div>
        )}
      </div>

      {isAnalyzing ? (
        <div style={styles.analyzing}>
          <div className="spinner"></div>
          <p>🔍 Comparing prices across {availableVendors.length} vendors...</p>
          <p style={styles.analyzeHint}>Finding best deals and availability</p>
        </div>
      ) : (
        <>
          <div style={styles.vendorGrid}>
            {availableVendors.map(vendor => {
              const comparison = priceComparison[vendor.id] || {};
              const isSelected = selectedVendor === vendor.id;
              const isBestPrice = comparison.isBestPrice;
              
              return (
                <div
                  key={vendor.id}
                  style={{
                    ...styles.vendorCard,
                    ...(isSelected ? styles.vendorCardSelected : {}),
                    ...(isBestPrice ? styles.vendorCardBest : {})
                  }}
                  onClick={() => setSelectedVendor(vendor.id)}
                >
                  {isBestPrice && (
                    <div style={styles.bestBadge}>💰 Best Value</div>
                  )}
                  
                  <div style={styles.vendorHeader}>
                    <span style={styles.vendorLogo}>{vendor.logo}</span>
                    <h3 style={styles.vendorName}>{vendor.name}</h3>
                  </div>
                  
                  <div style={styles.priceBreakdown}>
                    <div style={styles.priceRow}>
                      <span>Items ({items.length})</span>
                      <span>${comparison.totalPrice?.toFixed(2) || '--'}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span>Delivery</span>
                      <span>${comparison.deliveryFee?.toFixed(2) || '--'}</span>
                    </div>
                    {comparison.savings > 0 && (
                      <div style={styles.priceRow}>
                        <span>Savings</span>
                        <span style={styles.savings}>
                          -${comparison.savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div style={styles.totalRow}>
                      <span>Total</span>
                      <span style={styles.totalPrice}>
                        ${((comparison.totalPrice || 0) + 
                           (comparison.deliveryFee || 0) - 
                           (comparison.savings || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.vendorFeatures}>
                    {vendor.features.map((feature, idx) => (
                      <span key={idx} style={styles.feature}>
                        ✓ {feature}
                      </span>
                    ))}
                  </div>
                  
                  <div style={styles.availability}>
                    <div style={styles.availabilityBar}>
                      <div 
                        style={{
                          ...styles.availabilityFill,
                          width: `${comparison.availability || 85}%`
                        }}
                      />
                    </div>
                    <span style={styles.availabilityText}>
                      {comparison.availability || 85}% items available
                    </span>
                  </div>
                  
                  <div style={styles.deliveryTime}>
                    📅 {comparison.estimatedDelivery || 'Today 2-4pm'}
                  </div>
                  
                  <button
                    style={styles.selectButton}
                    onClick={() => proceedToCheckout(vendor.id)}
                  >
                    {isSelected ? '✓ Continue to Checkout' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>

          <SmartSubstitutions 
            items={items}
            vendor={selectedVendor}
            onSubstitute={(originalItem, substituteItem) => {
              // Handle substitution
            }}
          />
        </>
      )}
    </div>
  );
}