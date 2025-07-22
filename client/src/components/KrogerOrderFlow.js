// client/src/components/KrogerOrderFlow.js
import React, { useState, useEffect } from 'react';
import LoadingSpinner, { ButtonSpinner, OverlaySpinner } from './LoadingSpinner';

function KrogerOrderFlow({ cartItems, currentUser, onClose }) {
  const [step, setStep] = useState('auth'); // 'auth', 'store-select', 'review', 'sending', 'success'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [loadingStores, setLoadingStores] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/kroger/status', {
        headers: {
          'User-ID': currentUser?.uid || 'demo-user'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        
        if (data.authenticated) {
          setStep('store-select');
          loadNearbyStores();
        }
      }
    } catch (error) {
      console.error('Failed to check Kroger auth:', error);
      setError('Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKrogerAuth = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Redirect to Kroger OAuth
      window.location.href = `/api/auth/kroger/login?userId=${currentUser?.uid || 'demo-user'}`;
    } catch (error) {
      console.error('Kroger auth failed:', error);
      setError('Failed to start Kroger authentication');
      setIsLoading(false);
    }
  };

  const loadNearbyStores = async () => {
    setLoadingStores(true);
    setError('');
    
    try {
      // Get user's location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      
      const response = await fetch(`/api/kroger/stores/nearby?lat=${latitude}&lng=${longitude}`, {
        headers: {
          'User-ID': currentUser?.uid || 'demo-user'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNearbyStores(data.stores || []);
        
        // Auto-select first store if available
        if (data.stores && data.stores.length > 0) {
          setSelectedStore(data.stores[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      
      // Fallback to demo stores
      setNearbyStores([
        {
          id: 'demo-1',
          name: 'Kroger - Main St',
          address: '123 Main St, Rancho Cordova, CA 95670',
          distance: '1.2 miles',
          services: ['Pickup', 'Delivery']
        },
        {
          id: 'demo-2',
          name: 'Kroger - Oak Ave',
          address: '456 Oak Ave, Rancho Cordova, CA 95670',
          distance: '2.5 miles',
          services: ['Pickup', 'Delivery']
        }
      ]);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setStep('review');
  };

  const sendToKrogerCart = async () => {
    setStep('sending');
    setError('');
    
    try {
      const response = await fetch('/api/kroger/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': currentUser?.uid || 'demo-user'
        },
        body: JSON.stringify({
          items: cartItems,
          storeId: selectedStore.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderResult(data);
        setStep('success');
      } else {
        throw new Error('Failed to add items to Kroger cart');
      }
    } catch (error) {
      console.error('Failed to send to Kroger:', error);
      setError('Failed to add items to your Kroger cart. Please try again.');
      setStep('review');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'auth':
        return (
          <div style={styles.stepContent}>
            <div style={styles.authStep}>
              <div style={styles.authIcon}>🔐</div>
              <h3 style={styles.authTitle}>Connect to Kroger</h3>
              <p style={styles.authDescription}>
                Sign in with your Kroger account to send your cart directly to their website for easy checkout.
              </p>
              
              {error && (
                <div style={styles.errorMessage}>
                  {error}
                </div>
              )}
              
              <button
                onClick={handleKrogerAuth}
                disabled={isLoading}
                style={styles.authButton}
              >
                {isLoading ? <ButtonSpinner /> : '🏪'} Connect Kroger Account
              </button>
              
              <div style={styles.authInfo}>
                <p style={styles.infoText}>
                  ✅ Secure authentication via Kroger<br />
                  ✅ Your credentials are never stored<br />
                  ✅ One-click cart transfer
                </p>
              </div>
            </div>
          </div>
        );

      case 'store-select':
        return (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Select Your Kroger Store</h3>
            
            {loadingStores ? (
              <div style={styles.loadingContainer}>
                <LoadingSpinner text="Finding nearby stores..." />
              </div>
            ) : (
              <div style={styles.storesList}>
                {nearbyStores.map(store => (
                  <div
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    style={{
                      ...styles.storeCard,
                      ...(selectedStore?.id === store.id ? styles.storeCardSelected : {})
                    }}
                  >
                    <div style={styles.storeInfo}>
                      <h4 style={styles.storeName}>{store.name}</h4>
                      <p style={styles.storeAddress}>{store.address}</p>
                      <p style={styles.storeDistance}>📍 {store.distance}</p>
                    </div>
                    <div style={styles.storeServices}>
                      {store.services.map(service => (
                        <span key={service} style={styles.serviceTag}>
                          {service === 'Pickup' ? '🚗' : '🚚'} {service}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Review Your Order</h3>
            
            <div style={styles.orderSummary}>
              <div style={styles.summarySection}>
                <h4 style={styles.sectionTitle}>📍 Selected Store</h4>
                <p style={styles.sectionContent}>
                  {selectedStore.name}<br />
                  {selectedStore.address}
                </p>
              </div>
              
              <div style={styles.summarySection}>
                <h4 style={styles.sectionTitle}>🛒 Cart Summary</h4>
                <div style={styles.cartSummary}>
                  <div style={styles.summaryRow}>
                    <span>Total Items:</span>
                    <span>{cartItems.length}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Items with Pricing:</span>
                    <span>{cartItems.filter(item => item.realPrice).length}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Estimated Total:</span>
                    <span style={styles.totalPrice}>
                      ${cartItems.reduce((sum, item) => 
                        sum + (item.realPrice || 0) * (item.quantity || 1), 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div style={styles.errorMessage}>
                {error}
              </div>
            )}
            
            <div style={styles.reviewActions}>
              <button
                onClick={() => setStep('store-select')}
                style={styles.backButton}
              >
                ← Change Store
              </button>
              <button
                onClick={sendToKrogerCart}
                style={styles.sendButton}
              >
                🚀 Send to Kroger Cart
              </button>
            </div>
          </div>
        );

      case 'sending':
        return (
          <div style={styles.stepContent}>
            <div style={styles.sendingStep}>
              <LoadingSpinner 
                size="large" 
                text="Sending items to your Kroger cart..." 
              />
              <p style={styles.sendingText}>
                This may take a few moments as we add each item to your cart.
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div style={styles.stepContent}>
            <div style={styles.successStep}>
              <div style={styles.successIcon}>✅</div>
              <h3 style={styles.successTitle}>Success!</h3>
              <p style={styles.successDescription}>
                Your items have been added to your Kroger cart.
              </p>
              
              <div style={styles.successSummary}>
                <div style={styles.successStat}>
                  <span style={styles.statNumber}>{orderResult?.itemsAdded || cartItems.length}</span>
                  <span style={styles.statLabel}>Items Added</span>
                </div>
                {orderResult?.estimatedTotal && (
                  <div style={styles.successStat}>
                    <span style={styles.statNumber}>${orderResult.estimatedTotal}</span>
                    <span style={styles.statLabel}>Estimated Total</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => window.open('https://www.kroger.com/cart', '_blank')}
                style={styles.viewCartButton}
              >
                🛒 View Kroger Cart
              </button>
              
              <button
                onClick={onClose}
                style={styles.doneButton}
              >
                Done
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            🏪 Kroger Quick Order
          </h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Progress Steps */}
        <div style={styles.progressSteps}>
          <div style={{
            ...styles.progressStep,
            ...(step === 'auth' ? styles.progressStepActive : styles.progressStepComplete)
          }}>
            <div style={styles.stepNumber}>1</div>
            <span style={styles.stepLabel}>Connect</span>
          </div>
          
          <div style={styles.progressLine} />
          
          <div style={{
            ...styles.progressStep,
            ...(step === 'store-select' ? styles.progressStepActive : 
               ['review', 'sending', 'success'].includes(step) ? styles.progressStepComplete : {})
          }}>
            <div style={styles.stepNumber}>2</div>
            <span style={styles.stepLabel}>Select Store</span>
          </div>
          
          <div style={styles.progressLine} />
          
          <div style={{
            ...styles.progressStep,
            ...(step === 'review' ? styles.progressStepActive : 
               ['sending', 'success'].includes(step) ? styles.progressStepComplete : {})
          }}>
            <div style={styles.stepNumber}>3</div>
            <span style={styles.stepLabel}>Review</span>
          </div>
          
          <div style={styles.progressLine} />
          
          <div style={{
            ...styles.progressStep,
            ...(step === 'success' ? styles.progressStepActive : {})
          }}>
            <div style={styles.stepNumber}>4</div>
            <span style={styles.stepLabel}>Complete</span>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 50px rgba(0,0,0,0.3)',
    overflow: 'hidden'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #10b981, #059669)'
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white'
  },

  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'white',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  },

  progressSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },

  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    opacity: 0.5,
    transition: 'opacity 0.3s'
  },

  progressStepActive: {
    opacity: 1
  },

  progressStepComplete: {
    opacity: 0.8
  },

  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px'
  },

  stepLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },

  progressLine: {
    width: '60px',
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '0 8px'
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },

  stepContent: {
    padding: '32px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },

  // Auth Step Styles
  authStep: {
    textAlign: 'center',
    maxWidth: '400px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px'
  },

  authIcon: {
    fontSize: '64px',
    marginBottom: '8px'
  },

  authTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },

  authDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: 0
  },

  authButton: {
    padding: '16px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s'
  },

  authInfo: {
    backgroundColor: '#f0f9ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #3b82f6'
  },

  infoText: {
    margin: 0,
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.6'
  },

  // Store Selection Styles
  stepTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    textAlign: 'center'
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px'
  },

  storesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  storeCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white'
  },

  storeCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },

  storeInfo: {
    marginBottom: '12px'
  },

  storeName: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  storeAddress: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#6b7280'
  },

  storeDistance: {
    margin: 0,
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500'
  },

  storeServices: {
    display: 'flex',
    gap: '8px'
  },

  serviceTag: {
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151'
  },

  // Review Step Styles
  orderSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px'
  },

  summarySection: {
    marginBottom: '20px'
  },

  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151'
  },

  sectionContent: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5'
  },

  cartSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#6b7280'
  },

  totalPrice: {
    fontWeight: 'bold',
    color: '#10b981',
    fontSize: '16px'
  },

  reviewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    marginTop: 'auto'
  },

  backButton: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  sendButton: {
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  // Sending Step Styles
  sendingStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '40px',
    textAlign: 'center'
  },

  sendingText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },

  // Success Step Styles
  successStep: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '40px'
  },

  successIcon: {
    fontSize: '64px',
    marginBottom: '8px'
  },

  successTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#10b981',
    margin: 0
  },

  successDescription: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },

  successSummary: {
    display: 'flex',
    gap: '32px',
    justifyContent: 'center'
  },

  successStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },

  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },

  viewCartButton: {
    padding: '16px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  doneButton: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  errorMessage: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    fontSize: '14px',
    marginBottom: '16px'
  }
};

export default KrogerOrderFlow;