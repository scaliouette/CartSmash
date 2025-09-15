// client/src/components/ShoppingOrchestrator.js
import React, { useState, useEffect } from 'react';
import instacartService from '../services/instacartService';
import InstacartCheckout from './InstacartCheckout';
import { InstacartCheckoutProvider } from '../contexts/InstacartCheckoutContext';
import { useCart } from '../contexts/CartContext';

function ShoppingOrchestrator({ items, recipe }) {
  const { currentCart } = useCart();

  const [vendors, setVendors] = useState([]);
  const [priceComparison, setPriceComparison] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('today');
  const [servingSize, setServingSize] = useState(recipe?.servings || 4);

  // Instacart-specific state
  const [instacartRetailers, setInstacartRetailers] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [showNewInstacartCheckout, setShowNewInstacartCheckout] = useState(false);

  // Use cart items if available, otherwise use passed items (for recipe shopping)
  const effectiveItems = currentCart.length > 0 ? currentCart : items;

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
    loadInstacartRetailers();
  }, [effectiveItems]);

  // Load Instacart retailers when user selects Instacart
  const loadInstacartRetailers = async () => {
    setIsLoadingRetailers(true);
    
    try {
      const userZipCode = localStorage.getItem('userZipCode') || '95670';
      const response = await instacartService.getNearbyRetailers(userZipCode);
      
      if (response.success) {
        setInstacartRetailers(response.retailers);
        console.log('✅ Loaded', response.retailers.length, 'Instacart retailers');
      }
    } catch (error) {
      console.error('❌ Error loading Instacart retailers:', error);
    } finally {
      setIsLoadingRetailers(false);
    }
  };

  // Get prices from multiple vendors
  const analyzePricesAcrossVendors = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${API_URL}/api/shopping/compare-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: effectiveItems,
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
      const basePrice = effectiveItems.reduce((sum, item) => {
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
    const adjustedItems = effectiveItems.map(item => ({
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
    
    // Handle Instacart differently using our service
    if (vendorId === 'instacart') {
      return await proceedToInstacart();
    }
    
    // Create optimized cart for other vendors
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
    
    try {
      const data = await response.json();
      
      if (data && data.success) {
        // Open vendor with pre-filled cart
        if (vendorId === 'instacart' && data?.cartUrl) {
          window.open(data.cartUrl, '_blank');
        } else if (data?.checkoutUrl) {
          // Handle other vendors
          window.open(data.checkoutUrl, '_blank');
        } else {
          console.error('Missing checkout/cart URL in response:', data);
          alert('Unable to open vendor checkout - missing URL in response');
        }
      } else {
        console.error('API request failed:', data);
        alert('Unable to create cart: ' + (data?.error || 'Unknown error'));
      }
    } catch (parseError) {
      console.error('Error parsing API response:', parseError);
      alert('Error processing checkout response');
    }
  };

  // Instacart-specific checkout process
  const proceedToInstacart = async () => {
    try {
      if (!selectedRetailer) {
        alert('Please select a store first');
        return;
      }

      console.log('🛒 Starting Instacart checkout process...');
      
      // If we have a recipe, use enhanced recipe API instead of shopping list
      if (recipe && recipe.name && recipe.instructions) {
        console.log('🍳 Creating enhanced Instacart recipe page...');
        
        try {
          // Import the AI meal plan service for recipe creation
          const { createInstacartRecipePage } = await import('../services/aiMealPlanService');
          
          // Transform items to ingredients format
          const recipeData = {
            name: recipe.name,
            title: recipe.name,
            instructions: recipe.instructions || ['Follow the recipe instructions'],
            ingredients: effectiveItems.map(item => ({
              name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit || 'each',
              displayText: `${item.quantity || 1} ${item.unit || 'each'} ${item.name}`
            })),
            servings: recipe.servings || 4,
            id: recipe.id || `recipe-${Date.now()}`
          };
          
          const recipeResult = await createInstacartRecipePage(recipeData);
          
          if (recipeResult.success && recipeResult.instacartUrl) {
            console.log('✅ Enhanced Instacart recipe created:', recipeResult.instacartUrl);
            window.open(recipeResult.instacartUrl, '_blank');
            alert(`✅ Recipe page created! Opening Instacart recipe: "${recipe.name}"`);
            return;
          }
        } catch (recipeError) {
          console.log('Recipe creation failed, falling back to shopping list:', recipeError);
        }
      }
      
      // Fallback: Create shopping list for non-recipe items or if recipe creation fails
      const listName = recipe?.name ? `${recipe.name} - CartSmash` : 'CartSmash Grocery List';
      const listResponse = await instacartService.createShoppingList(items, listName);
      
      if (listResponse.success) {
        console.log('✅ Created Instacart shopping list:', listResponse.list_id);
        
        // Try to add items to cart (if available)
        try {
          const cartResponse = await instacartService.addToCart(items, selectedRetailer.id);
          
          if (cartResponse.success && cartResponse.checkout_url) {
            // Open Instacart with pre-filled cart
            window.open(cartResponse.checkout_url, '_blank');
            alert(`✅ Cart created with ${cartResponse.items_added} items! Opening Instacart...`);
          } else {
            // Fallback to shopping list
            window.open(listResponse.share_url, '_blank');
            alert('✅ Shopping list created! Opening Instacart...');
          }
        } catch (cartError) {
          console.log('Cart creation failed, using shopping list instead');
          window.open(listResponse.share_url, '_blank');
          alert('✅ Shopping list created! Opening Instacart...');
        }
      } else {
        throw new Error('Failed to create shopping list');
      }
    } catch (error) {
      console.error('❌ Instacart checkout failed:', error);
      alert('Unable to connect to Instacart. Please try again later.');
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
                      <span>Items ({effectiveItems.length})</span>
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

          {/* Instacart Store Selection */}
          {selectedVendor === 'instacart' && (
            <div style={styles.instacartSection}>
              <h3 style={styles.sectionTitle}>
                🛒 Choose Your Instacart Store
              </h3>
              
              {isLoadingRetailers ? (
                <div style={styles.loadingStores}>
                  <div className="spinner"></div>
                  <p>Loading nearby stores...</p>
                </div>
              ) : (
                <div style={styles.retailerGrid}>
                  {instacartRetailers.map(retailer => (
                    <div
                      key={retailer.id}
                      style={{
                        ...styles.retailerCard,
                        ...(selectedRetailer?.id === retailer.id ? styles.retailerCardSelected : {})
                      }}
                      onClick={() => setSelectedRetailer(retailer)}
                    >
                      <div style={styles.retailerHeader}>
                        <h4 style={styles.retailerName}>{retailer.name}</h4>
                        <span style={styles.retailerDistance}>{retailer.distance} mi</span>
                      </div>
                      
                      <p style={styles.retailerAddress}>{retailer.address}</p>
                      
                      <div style={styles.retailerDetails}>
                        <div style={styles.detailRow}>
                          <span>Delivery Fee:</span>
                          <span>${retailer.delivery_fee?.toFixed(2) || 'Free'}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Min Order:</span>
                          <span>${retailer.minimum_order?.toFixed(2) || '35.00'}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Delivery:</span>
                          <span>{retailer.estimated_delivery || '1-2 hours'}</span>
                        </div>
                      </div>
                      
                      {selectedRetailer?.id === retailer.id && (
                        <div style={styles.selectedBadge}>✓ Selected</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {selectedRetailer && effectiveItems.length > 0 && (
                <div style={styles.instacartActions}>
                  <button
                    style={styles.instacartButton}
                    onClick={() => proceedToInstacart()}
                  >
                    Get Recipe Ingredients (Legacy)
                  </button>
                  <button
                    style={{...styles.instacartButton, backgroundColor: '#667eea', marginLeft: '10px'}}
                    onClick={() => setShowNewInstacartCheckout(true)}
                  >
                    Enhanced Checkout ✨
                  </button>
                </div>
              )}
              {selectedRetailer && effectiveItems.length === 0 && (
                <div style={{textAlign: 'center', padding: '20px', color: '#666', fontStyle: 'italic'}}>
                  No items to checkout. Add items to your cart first.
                </div>
              )}
            </div>
          )}

          {/* TODO: Add SmartSubstitutions component when available */}
          {/* <SmartSubstitutions
            items={items}
            vendor={selectedVendor}
            onSubstitute={(originalItem, substituteItem) => {
              // Handle substitution
            }}
          /> */}
        </>
      )}

      {/* New Enhanced Instacart Checkout */}
      {showNewInstacartCheckout && (
        <InstacartCheckoutProvider>
          <InstacartCheckout
            items={effectiveItems}
            mode="cart"
            initialRetailer={selectedRetailer}
            onClose={() => setShowNewInstacartCheckout(false)}
            onSuccess={(result) => {
              console.log('✅ Enhanced Instacart checkout successful:', result);
              setShowNewInstacartCheckout(false);
              // Optional: Show success notification
            }}
            onError={(error) => {
              console.error('❌ Enhanced checkout failed:', error);
              // Keep checkout open for retry
            }}
          />
        </InstacartCheckoutProvider>
      )}
    </div>
  );
}

// Styles for the component
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px'
  },
  servingAdjuster: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '15px'
  },
  slider: {
    width: '150px'
  },
  analyzing: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  },
  analyzeHint: {
    fontSize: '14px',
    opacity: 0.8
  },
  vendorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  vendorCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fff',
    position: 'relative'
  },
  vendorCardSelected: {
    borderColor: '#FF6B35',
    boxShadow: '0 4px 20px rgba(255, 107, 53, 0.2)'
  },
  vendorCardBest: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  bestBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  vendorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },
  vendorLogo: {
    fontSize: '32px'
  },
  vendorName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  priceBreakdown: {
    marginBottom: '15px'
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '2px solid #e5e7eb',
    fontWeight: 'bold',
    marginTop: '5px'
  },
  savings: {
    color: '#10b981',
    fontWeight: 'bold'
  },
  totalPrice: {
    color: '#FF6B35',
    fontSize: '18px'
  },
  vendorFeatures: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '15px'
  },
  feature: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  availability: {
    marginBottom: '10px'
  },
  availabilityBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '5px'
  },
  availabilityFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s'
  },
  availabilityText: {
    fontSize: '12px',
    color: '#666'
  },
  deliveryTime: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px'
  },
  selectButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  // Instacart-specific styles
  instacartSection: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center'
  },
  loadingStores: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  retailerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  retailerCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fff',
    position: 'relative'
  },
  retailerCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff7f4'
  },
  retailerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  retailerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  retailerDistance: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#e5e7eb',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  retailerAddress: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 12px 0'
  },
  retailerDetails: {
    fontSize: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0'
  },
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: '#FF6B35',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  instacartActions: {
    textAlign: 'center',
    marginTop: '20px'
  },
  instacartButton: {
    backgroundColor: '#003D29',
    color: 'white',
    border: 'none',
    padding: '0 16px',
    height: '46px',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    textTransform: 'none'
  }
};

export default ShoppingOrchestrator;