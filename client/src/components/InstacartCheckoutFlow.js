// client/src/components/InstacartCheckoutFlow.js
import React, { useState, useEffect } from 'react';

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

  const handleZipSearch = () => {
    if (zipCode.length === 5) {
      setSearchingStores(true);
      setTimeout(() => {
        setStores(availableStores);
        setSearchingStores(false);
      }, 1000);
    }
  };

  const handleContinue = () => {
    if (currentStep === 'store' && selectedStore) {
      setCurrentStep('match');
      // Simulate matching products
      setTimeout(() => {
        setMatchedProducts(currentCart.map(item => ({
          ...item,
          matched: true,
          instacartProduct: { name: item.productName, price: 5.99 }
        })));
      }, 500);
    } else if (currentStep === 'match') {
      setCurrentStep('complete');
    }
  };

  const handleFinalCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      window.open('https://www.instacart.com', '_blank');
      onClose();
    }, 1500);
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
            background: 'linear-gradient(135deg, #002244 0%, #FB4F14 100%)',
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
            borderBottom: '2px solid #FB4F14'
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
              backgroundColor: currentStep === 'store' ? '#FB4F14' : currentStep !== 'store' ? '#002244' : '#E5E5E5',
              color: currentStep === 'store' || currentStep !== 'store' ? 'white' : '#999',
              boxShadow: currentStep === 'store' ? '0 4px 12px rgba(251, 79, 20, 0.3)' : 'none'
            }}>
              {currentStep !== 'store' ? '✓' : '1'}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#002244' }}>
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
              backgroundColor: currentStep === 'match' ? '#FB4F14' : currentStep === 'complete' ? '#002244' : '#E5E5E5',
              color: currentStep === 'match' || currentStep === 'complete' ? 'white' : '#999',
              boxShadow: currentStep === 'match' ? '0 4px 12px rgba(251, 79, 20, 0.3)' : 'none'
            }}>
              {currentStep === 'complete' ? '✓' : '2'}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#002244' }}>
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
              backgroundColor: currentStep === 'complete' ? '#FB4F14' : '#E5E5E5',
              color: currentStep === 'complete' ? 'white' : '#999',
              boxShadow: currentStep === 'complete' ? '0 4px 12px rgba(251, 79, 20, 0.3)' : 'none'
            }}>
              3
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#002244' }}>
              Complete
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {currentStep === 'store' && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#002244', marginBottom: '16px' }}>
                Choose Your Store
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Select where you'd like to shop and have your groceries delivered from
              </p>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#002244', marginBottom: '8px' }}>
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
                      border: '2px solid #002244',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    maxLength="5"
                  />
                  <button 
                    onClick={handleZipSearch} 
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#FB4F14',
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
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#002244', marginBottom: '16px' }}>
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
                          borderColor: selectedStore?.id === store.id ? '#FB4F14' : '#E5E5E5',
                          cursor: 'pointer',
                          textAlign: 'center',
                          backgroundColor: store.featured ? '#FB4F14' : selectedStore?.id === store.id ? '#FFF5F2' : 'white',
                          transform: selectedStore?.id === store.id ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: selectedStore?.id === store.id ? '0 4px 12px rgba(251, 79, 20, 0.2)' : 'none',
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
                          color: store.featured ? 'white' : '#002244'
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
                border: '2px solid #FB4F14'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#002244' }}>
                    Your Cart Items ({currentCart.length})
                  </div>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: showDebug ? '#FB4F14' : '#002244',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {showDebug ? 'Hide Debug' : 'Debug Items'}
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
                      Debug Information:
                    </div>
                    {currentCart.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#002244' }}>
                          Item #{idx + 1}: {item.productName}
                        </div>
                        <div style={{ color: '#666', marginTop: '4px' }}>
                          ID: {item.id ? `"${item.id}"` : '❌ NO ID'} ({typeof item.id})
                        </div>
                        <div style={{ color: '#666' }}>
                          Quantity: {item.quantity || 'N/A'}
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
                          ⚠️ ISSUE FOUND:
                        </div>
                        <div style={{ fontSize: '11px', color: '#cc0000', marginTop: '4px' }}>
                          MULTIPLE DATA SOURCES CONFLICT:<br/>
                          • App.js restores from localStorage<br/>
                          • CartContext restores from localStorage + server<br/>
                          • Firebase auto-saves deleted items<br/>
                          • MongoDB server may have conflicting data<br/>
                          Use nuclearClear() to clear ALL sources.
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
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#002244', marginBottom: '16px' }}>
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
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#002244', marginBottom: '16px' }}>
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
                border: '2px solid #FB4F14'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px', color: '#28A745' }}>✅</div>
                <p style={{ fontSize: '18px', color: '#002244', fontWeight: 'bold' }}>
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
          borderTop: '2px solid #FB4F14',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button 
            onClick={onClose} 
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#002244',
              border: '2px solid #002244',
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
              background: currentStep === 'store' && !selectedStore ? '#CCC' : 'linear-gradient(135deg, #FB4F14 0%, #FF6B35 100%)',
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