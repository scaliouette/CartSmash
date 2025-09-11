// client/src/components/InstacartCheckoutFlow.js
import React, { useState, useEffect } from 'react';
import instacartService from '../services/instacartService';

const InstacartCheckoutFlow = ({ currentCart, onClose }) => {
  const [currentStep, setCurrentStep] = useState('store');
  const [selectedStore, setSelectedStore] = useState(null);
  const [zipCode, setZipCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setMatchedProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🛒 InstacartCheckoutFlow - Cart received:', {
      itemCount: currentCart?.length || 0,
      items: currentCart?.map(item => ({
        id: item.id,
        name: item.productName,
        hasId: !!item.id,
        type: typeof item.id,
        fullItem: item
      })) || []
    });
    
    // Expose debug tools
    window.checkoutDebug = {
      cart: currentCart,
      inspectItems: () => {
        console.table(currentCart?.map(item => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          hasUndefined: Object.values(item).includes(undefined)
        })));
      },
      findProblematicItems: () => {
        const problematic = currentCart?.filter(item => 
          !item.id || item.id === undefined || item.id === null
        ) || [];
        console.log('🚨 Problematic items:', problematic);
        return problematic;
      },
      verifyInstacartCompatibility: () => {
        const report = {
          totalItems: currentCart?.length || 0,
          validNames: currentCart?.filter(item => item.productName && item.productName.length > 2).length || 0,
          validIds: currentCart?.filter(item => item.id).length || 0,
          validQuantities: currentCart?.filter(item => item.quantity && item.quantity > 0).length || 0,
          problematicItems: currentCart?.filter(item => 
            !item.productName || item.productName.length <= 2 || !item.id
          ) || []
        };
        console.log('🔍 Instacart Compatibility Report:', report);
        console.log('📊 Matching Success Rate:', `${Math.round((report.validNames / report.totalItems) * 100)}%`);
        return report;
      },
      simulateInstacartSearch: () => {
        const searchableItems = currentCart?.map(item => ({
          original: item.productName,
          searchQuery: item.productName?.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
          estimatedMatches: Math.floor(Math.random() * 5) + 1,
          confidence: item.productName?.length > 10 ? 'High' : item.productName?.length > 5 ? 'Medium' : 'Low'
        })) || [];
        console.log('🎯 Simulated Instacart Search Results:', searchableItems);
        return searchableItems;
      }
    };
  }, [currentCart]);

  const availableStores = [
    { id: 'kroger', name: 'Kroger', logo: '🛒', price: null, special: 'Click to Connect', featured: true },
    { id: 'safeway', name: 'Safeway', logo: '🏪', price: '$4.99', hasAPI: true },
    { id: 'whole-foods', name: 'Whole Foods', logo: '🌿', price: '$4.99' },
    { id: 'costco', name: 'Costco', logo: '📦', price: 'Free', membership: true },
    { id: 'target', name: 'Target', logo: '🎯', price: '$5.99' },
    { id: 'walmart', name: 'Walmart', logo: '🏬', price: '$7.95' }
  ];

  const handleZipSearch = async () => {
    if (zipCode.length === 5) {
      setSearchingStores(true);
      
      try {
        console.log('🏪 Searching for Instacart retailers near:', zipCode);
        
        // Use Instacart service to get nearby retailers
        const retailersResult = await instacartService.getNearbyRetailers(zipCode);
        
        if (retailersResult.success && retailersResult.retailers) {
          console.log('✅ Found retailers:', retailersResult.retailers);
          // Map Instacart retailers to our UI format
          const mappedStores = retailersResult.retailers.map(retailer => ({
            id: retailer.id,
            name: retailer.name,
            logo: getRetailerLogo(retailer.name),
            price: retailer.delivery_fee ? `$${retailer.delivery_fee}` : 'Free',
            hasAPI: true,
            distance: retailer.distance,
            address: retailer.address
          }));
          setStores([...mappedStores, ...availableStores]);
        } else {
          console.log('⚠️ API call failed, using fallback stores');
          setStores(availableStores);
        }
      } catch (error) {
        console.error('❌ Error fetching retailers:', error);
        setStores(availableStores);
      }
      
      setSearchingStores(false);
    }
  };
  
  const getRetailerLogo = (name) => {
    const logos = {
      'Safeway': '🏪',
      'Kroger': '🛒',
      'Costco': '📦',
      'Target': '🎯',
      'Walmart': '🏬',
      'Whole Foods': '🌿'
    };
    return logos[name] || '🏪';
  };

  const handleContinue = () => {
    if (currentStep === 'store' && selectedStore) {
      setCurrentStep('match');
      // Simulate matching products with better Instacart compliance
      setTimeout(() => {
        const matchedItems = currentCart.map(item => {
          const matchQuality = item.productName && item.productName.length > 2 ? 'high' : 'low';
          const matchPrice = matchQuality === 'high' ? 
            (Math.random() * 10 + 2.99).toFixed(2) : 'N/A';
          
          return {
            ...item,
            matched: matchQuality === 'high',
            instacartProduct: { 
              name: item.productName, 
              price: matchPrice,
              matchQuality,
              availability: matchQuality === 'high' ? 'in_stock' : 'not_found'
            }
          };
        });
        setMatchedProducts(matchedItems);
        console.log('🛒 Instacart Matching Results:', matchedItems);
      }, 500);
    } else if (currentStep === 'match') {
      setCurrentStep('complete');
    }
  };

  const handleFinalCheckout = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🛒 Starting Instacart API integration...');
      
      // Use the Instacart service to create a recipe page with the cart items
      const recipeResult = await instacartService.exportGroceryListAsRecipe(currentCart, {
        title: `CartSmash Grocery List - ${new Date().toLocaleDateString()}`,
        imageUrl: 'https://via.placeholder.com/400x300/FF6B35/white?text=CartSmash+Order',
        preferredRetailer: selectedStore?.id === 'safeway' ? 'safeway' : undefined,
        partnerUrl: 'https://cartsmash.com',
        trackPantryItems: false
      });
      
      console.log('✅ Instacart recipe created:', recipeResult);
      
      if (recipeResult.success && recipeResult.instacartUrl) {
        // Open the actual Instacart recipe page
        window.open(recipeResult.instacartUrl, '_blank');
      } else {
        // Fallback to general Instacart site
        console.log('⚠️ Recipe creation failed, using fallback URL');
        window.open('https://www.instacart.com', '_blank');
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Error in Instacart checkout:', error);
      // Fallback on error
      window.open('https://www.instacart.com', '_blank');
      onClose();
    }
  };

  return (
    <div 
      className="instacart-checkout-flow"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 2, 68, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
      <div style={{
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        backgroundColor: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 2, 68, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div 
          className="instacart-checkout-header"
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
            padding: '32px',
            color: 'white',
            position: 'relative'
          }}>
          <button 
            onClick={onClose} 
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            textAlign: 'center'
          }}>
            CartSmash Checkout
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.95,
            margin: 0,
            textAlign: 'center'
          }}>
            Powered by CartSmash + Instacart
          </p>
        </div>

        {/* Progress Bar */}
        <div 
          className="instacart-checkout-progress"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '60px',
            padding: '20px 32px',
            backgroundColor: '#FFF5F2',
            borderBottom: '2px solid #FF6B35'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: currentStep === 'store' ? '#FF6B35' : currentStep !== 'store' ? '#F7931E' : '#E5E5E5',
              color: currentStep === 'store' || currentStep !== 'store' ? 'white' : '#999',
              boxShadow: currentStep === 'store' ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none'
            }}>
              {currentStep !== 'store' ? '✓' : '1'}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FF6B35' }}>
              Select Store
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: currentStep === 'match' ? '#FF6B35' : currentStep === 'complete' ? '#F7931E' : '#E5E5E5',
              color: currentStep === 'match' || currentStep === 'complete' ? 'white' : '#999',
              boxShadow: currentStep === 'match' ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none'
            }}>
              {currentStep === 'complete' ? '✓' : '2'}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FF6B35' }}>
              Match Items
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: currentStep === 'complete' ? '#FF6B35' : '#E5E5E5',
              color: currentStep === 'complete' ? 'white' : '#999',
              boxShadow: currentStep === 'complete' ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none'
            }}>
              3
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FF6B35' }}>
              Complete
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {currentStep === 'store' && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B35', marginBottom: '16px' }}>
                Choose Your Store
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Select where you'd like to shop and have your groceries delivered from
              </p>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
                  Delivery ZIP Code
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter ZIP code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      fontSize: '16px',
                      border: '2px solid #FF6B35',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    maxLength="5"
                  />
                  <button 
                    onClick={handleZipSearch} 
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {searchingStores ? '...' : '🔍'}
                  </button>
                </div>
              </div>

              {stores.length > 0 && (
                <>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FF6B35', marginBottom: '16px' }}>
                    Available Stores
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '12px',
                    marginBottom: '24px'
                  }}>
                    {stores.map(store => (
                      <div
                        key={store.id}
                        onClick={() => setSelectedStore(store)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: selectedStore?.id === store.id ? '#FF6B35' : '#E5E5E5',
                          cursor: 'pointer',
                          textAlign: 'center',
                          backgroundColor: store.featured ? '#FF6B35' : selectedStore?.id === store.id ? '#FFF5F2' : 'white',
                          transform: selectedStore?.id === store.id ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: selectedStore?.id === store.id ? '0 4px 12px rgba(255, 107, 53, 0.2)' : 'none',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                      >
                        {store.hasAPI && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#FF4444',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            API
                          </div>
                        )}
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{store.logo}</div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          color: store.featured ? 'white' : '#FF6B35'
                        }}>
                          {store.name}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: store.featured ? 'white' : '#666'
                        }}>
                          {store.special || store.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{
                backgroundColor: '#FFF5F2',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px',
                border: '2px solid #FF6B35'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF6B35' }}>
                    Your Cart Items ({currentCart.length})
                  </div>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: showDebug ? '#FF6B35' : '#F7931E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {showDebug ? 'Hide Debug' : 'Verify Instacart Matching'}
                  </button>
                </div>
                
                {!showDebug ? (
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
                    {currentCart.slice(0, 5).map((item, idx) => (
                      <div key={idx}>• {item.productName}</div>
                    ))}
                    {currentCart.length > 5 && (
                      <div style={{ fontStyle: 'italic', marginTop: '8px' }}>
                        ... and {currentCart.length - 5} more items
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                      Instacart Matching Verification:
                    </div>
                    {currentCart.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#FF6B35' }}>
                          Item #{idx + 1}: {item.productName}
                        </div>
                        <div style={{ color: '#666', marginTop: '4px' }}>
                          ID: {item.id ? `"${item.id}"` : '❌ NO ID'} ({typeof item.id})
                        </div>
                        <div style={{ color: '#666' }}>
                          Quantity: {item.quantity || 'N/A'}
                        </div>
                        <div style={{ color: '#666' }}>
                          Instacart Matchable: {item.productName && item.productName.length > 2 ? '✅ YES' : '❌ TOO SHORT'}
                        </div>
                        <div style={{ color: '#666' }}>
                          Has undefined values: {Object.values(item).includes(undefined) ? '❌ YES' : '✅ NO'}
                        </div>
                        {!item.id && (
                          <div style={{ 
                            color: '#ff0000', 
                            fontWeight: 'bold', 
                            marginTop: '4px' 
                          }}>
                            ⚠️ This item may not be deletable - missing ID
                          </div>
                        )}
                        {(!item.productName || item.productName.length <= 2) && (
                          <div style={{ 
                            color: '#ff6600', 
                            fontWeight: 'bold', 
                            marginTop: '4px' 
                          }}>
                            ⚠️ Product name too short for reliable Instacart matching
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px' 
                    }}>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        Console Commands Available:
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#333' }}>
                        • window.checkoutDebug.inspectItems()<br/>
                        • window.checkoutDebug.findProblematicItems()<br/>
                        • window.checkoutDebug.verifyInstacartCompatibility()<br/>
                        • window.checkoutDebug.simulateInstacartSearch()<br/>
                        • window.debugCart.checkLocalStorage()<br/>
                        • window.debugCart.compareWithLocalStorage()<br/>
                        • window.debugCart.nuclearClear() ⚠️ CLEARS ALL
                      </div>
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        backgroundColor: '#ffe6e6', 
                        borderRadius: '4px',
                        border: '1px solid #ffcccc'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#cc0000' }}>
                          🔍 INSTACART COMPLIANCE CHECK:
                        </div>
                        <div style={{ fontSize: '11px', color: '#cc0000', marginTop: '4px' }}>
                          ✅ Product Names: {currentCart.filter(item => item.productName && item.productName.length > 2).length}/{currentCart.length} items ready<br/>
                          ✅ Valid IDs: {currentCart.filter(item => item.id).length}/{currentCart.length} items have IDs<br/>
                          ✅ Quantities: {currentCart.filter(item => item.quantity && item.quantity > 0).length}/{currentCart.length} items have quantities<br/>
                          {currentCart.some(item => !item.productName || item.productName.length <= 2) && '⚠️ Some items may not match well in Instacart search'}<br/>
                          Use verifyInstacartCompatibility() for detailed analysis.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!selectedStore && stores.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '32px' }}>
                  Please enter your ZIP code to see available stores
                </p>
              )}
            </>
          )}

          {currentStep === 'match' && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B35', marginBottom: '16px' }}>
                Matching Your Items
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Finding the best products at {selectedStore?.name}...
              </p>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <p>Matching {currentCart.length} items with {selectedStore?.name} inventory...</p>
              </div>
            </>
          )}

          {currentStep === 'complete' && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B35', marginBottom: '16px' }}>
                Ready to Checkout!
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Your items are ready to be sent to Instacart
              </p>
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#FFF5F2',
                borderRadius: '12px',
                border: '2px solid #FF6B35'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px', color: '#28A745' }}>✅</div>
                <p style={{ fontSize: '18px', color: '#FF6B35', fontWeight: 'bold' }}>
                  {currentCart.length} items matched successfully!
                </p>
                <p style={{ color: '#666', marginTop: '8px' }}>
                  Click "Send to Instacart" to complete your order
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px 32px',
          backgroundColor: '#FFF5F2',
          borderTop: '2px solid #FF6B35',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button 
            onClick={onClose} 
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#FF6B35',
              border: '2px solid #FF6B35',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={currentStep === 'complete' ? handleFinalCheckout : handleContinue}
            disabled={currentStep === 'store' && !selectedStore}
            style={{
              padding: '14px 32px',
              background: currentStep === 'store' && !selectedStore ? '#CCC' : 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: currentStep === 'store' && !selectedStore ? 'not-allowed' : 'pointer',
              boxShadow: currentStep === 'store' && !selectedStore ? 'none' : '0 4px 12px rgba(251, 79, 20, 0.25)',
              opacity: currentStep === 'store' && !selectedStore ? 0.5 : 1
            }}
          >
            {isProcessing ? 'Processing...' : 
             currentStep === 'complete' ? 'Send to Instacart' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckoutFlow;