// client/src/components/KrogerOrderFlow.js - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

function KrogerOrderFlow({ cartItems, currentUser, onClose }) {
  const [step, setStep] = useState('auth');
  const [selectedStore, setSelectedStore] = useState(null);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [modality] = useState('PICKUP');

  // Check for pre-selected store from StoresPage
  useEffect(() => {
    const savedStore = localStorage.getItem('selectedStore');
    if (savedStore) {
      try {
        const storeData = JSON.parse(savedStore);
        console.log('🏪 Found pre-selected store:', storeData);
        setSelectedStore({
          id: storeData.locationId,
          name: storeData.name,
          address: storeData.address,
          phone: storeData.phone
        });
      } catch (error) {
        console.error('Error loading selected store:', error);
      }
    }
  }, []);

  // 🔧 FIX: Make getUserId a useCallback to avoid dependency issues
  const getUserId = useCallback(() => {
    if (!currentUser) {
      console.log('⚠️ No currentUser provided');
      return 'anonymous';
    }
    
    // Try Firebase UID first, then email, then fallback
    const userId = currentUser.uid || currentUser.email || 'anonymous';
    console.log('🔐 Using user ID:', userId);
    console.log('   User details:', {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    });
    return userId;
  }, [currentUser]);

  // 🔧 FIX: Define loadNearbyStores before checkAuthStatus
  const loadNearbyStores = useCallback(async () => {
    setLoadingStores(true);
    setError('');
    const userId = getUserId();
    
    try {
      console.log('📍 Loading stores for user:', userId);
      
      // Try to get user's location
      let latitude, longitude;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoError) {
        console.log('📍 Geolocation failed, using defaults');
        // Default to Sacramento area
        latitude = 38.5816;
        longitude = -121.4944;
      }
      
      const response = await fetch(`${API_URL}/api/kroger/stores/nearby?lat=${latitude}&lng=${longitude}`, {
        headers: {
          'User-ID': userId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNearbyStores(data.stores || []);
        
        if (data.stores && data.stores.length > 0) {
          setSelectedStore(data.stores[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      
      // Fallback stores
      setNearbyStores([
        {
          id: '01400943',
          name: 'Kroger - Zinfandel',
          address: '10075 Bruceville Rd, Elk Grove, CA 95757',
          distance: '2.1 miles',
          services: ['Pickup', 'Delivery']
        },
        {
          id: '01400376',
          name: 'Kroger - Elk Grove',
          address: '8465 Elk Grove Blvd, Elk Grove, CA 95758',
          distance: '3.5 miles',
          services: ['Pickup', 'Delivery']
        }
      ]);
    } finally {
      setLoadingStores(false);
    }
  }, [getUserId]);

  // 🔧 FIX: Check auth with proper dependencies
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    const userId = getUserId();
    
    try {
      console.log('🔍 Checking auth for user:', userId);
      
      const response = await fetch(`${API_URL}/api/auth/kroger/status?userId=${encodeURIComponent(userId)}`, {
        headers: {
          'User-ID': userId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Auth status response:', data);
        
        if (data.authenticated) {
          console.log('✅ User is authenticated');
          // If store already selected, skip to review
          if (selectedStore) {
            console.log('🏪 Store already selected, going to review');
            setStep('review');
          } else {
            console.log('🏪 No store selected, going to store selection');
            setStep('store-select');
            loadNearbyStores();
          }
        } else {
          console.log('❌ User not authenticated, showing auth step');
          setStep('auth');
        }
      }
    } catch (error) {
      console.error('Failed to check Kroger auth:', error);
      setError('Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  }, [getUserId, loadNearbyStores]);

  // 🔧 FIX: Add debug logging for currentUser
  useEffect(() => {
    console.log('🚀 KrogerOrderFlow mounted');
    console.log('   currentUser prop:', currentUser);
    console.log('   Type of currentUser:', typeof currentUser);
    console.log('   currentUser keys:', currentUser ? Object.keys(currentUser) : 'null');
    
    // Only check auth if we have a real user
    if (currentUser && currentUser.uid) {
      checkAuthStatus();
    } else {
      console.log('⚠️ No valid currentUser, staying on auth step');
      setStep('auth');
      setIsLoading(false);
    }
  }, [currentUser, checkAuthStatus]);

  const handleKrogerAuth = async (event) => {
    if (event) {
      event.preventDefault();
    }
    
    setIsLoading(true);
    setError('');
    
    const userId = getUserId();
    
    if (userId === 'anonymous') {
      setError('Please log in to connect to Kroger');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('🔐 Starting Kroger auth for user:', userId);
      
      // Build the OAuth URL with actual user ID
         
      const authUrl = `${API_URL}/api/auth/kroger/login?userId=${encodeURIComponent(userId)}`;
      
      console.log('🔗 Opening Kroger OAuth URL:', authUrl);
      
      // Open popup window
      const popup = window.open(
        authUrl,
        'kroger-auth',
        'width=600,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
      );
      
      if (!popup || popup.closed || typeof popup.closed == 'undefined') {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      }
      
      popup.focus();
      
      // Listen for completion message
      const handleMessage = (event) => {
        console.log('📨 Received message:', event.data);
        
        
        // if (event.origin !== new URL(API_URL).origin) {
//   return;
        
        if (event.origin !== new URL(API_URL).origin) {
            return;
}
        
        if (event.data.type === 'KROGER_AUTH_SUCCESS') {
          console.log('✅ Kroger auth successful for user:', event.data.userId);
          popup.close();
          setIsLoading(false);
          
          // If store already selected from StoresPage, skip to review
          if (selectedStore) {
            console.log('🏪 Store already selected, skipping to review:', selectedStore);
            setStep('review');
          } else {
            setStep('store-select');
            loadNearbyStores();
          }
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'KROGER_AUTH_ERROR') {
          console.error('❌ Kroger auth failed:', event.data.error);
          popup.close();
          setIsLoading(false);
          setError(event.data.error || 'Authentication failed');
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          window.removeEventListener('message', handleMessage);
          // Re-check auth status after popup closes
          setTimeout(() => checkAuthStatus(), 500);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Kroger auth error:', error);
      setError(error.message || 'Failed to start Kroger authentication');
      setIsLoading(false);
    }
  };

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setStep('review');
  };

  const sendToKrogerCart = async (event) => {
    if (event) {
      event.preventDefault();
    }
    
    setStep('sending');
    setError('');
    const userId = getUserId();
    
    try {
      console.log('🛒 Sending cart to Kroger for user:', userId);
      console.log('   Store:', selectedStore.id);
      console.log('   Items:', cartItems.length);
      
      const response = await fetch(`${API_URL}/api/kroger-orders/cart/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': userId
        },
        body: JSON.stringify({
          cartItems: cartItems,
          storeId: selectedStore.id,
          modality: modality,
          clearExistingCart: false
        })
      });
      
      const data = await response.json();
      console.log('📦 Send response:', data);
      
      if (response.ok && data.success) {
        setOrderResult(data);
        setStep('success');
      } else if (data.needsAuth) {
        // User needs to re-authenticate
        setError('Authentication expired. Please reconnect to Kroger.');
        setStep('auth');
      } else if (data.itemsFailed > 0 && data.itemsAdded === 0) {
        // All items failed (normal in cert environment)
        setOrderResult(data);
        setStep('success'); // Still show success for cert environment
      } else {
        throw new Error(data.error || 'Failed to add items to Kroger cart');
      }
    } catch (error) {
      console.error('Failed to send to Kroger:', error);
      setError(error.message || 'Failed to add items to your Kroger cart. Please try again.');
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
              
              {currentUser && currentUser.email && (
                <p style={styles.userInfo}>
                  Logged in as: <strong>{currentUser.email}</strong>
                </p>
              )}
              
              {!currentUser || !currentUser.uid ? (
                <div style={styles.warningBox}>
                  ⚠️ Please log in to your account first before connecting to Kroger
                </div>
              ) : (
                <>
                  <p style={styles.authDescription}>
                    Sign in with your Kroger account to send your cart directly to their website for easy checkout.
                  </p>
                  
                  {error && (
                    <div style={styles.errorMessage}>
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleKrogerAuth}
                    disabled={isLoading || !currentUser?.uid}
                    style={styles.authButton}
                  >
                    {isLoading ? <ButtonSpinner /> : '🏪'} Connect Kroger Account
                  </button>
                </>
              )}
              
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
                  {selectedStore.address?.addressLine1 || selectedStore.address}
                  {selectedStore.address?.city && (
                    <><br />{selectedStore.address.city}, {selectedStore.address.state} {selectedStore.address.zipCode}</>
                  )}
                  {selectedStore.phone && <><br />📞 {selectedStore.phone}</>}
                </p>
                <div style={styles.storeSource}>
                  {selectedStore.address?.addressLine1 ? 
                    '✅ Selected from Stores page' : 
                    '📍 Selected from nearby stores'
                  }
                </div>
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
                type="button"
                onClick={() => setStep('store-select')}
                style={styles.backButton}
              >
                ← Change Store
              </button>
              <button
                type="button"
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
              <h3 style={styles.successTitle}>
                {orderResult?.itemsAdded > 0 ? 'Success!' : 'Cart Processed!'}
              </h3>
              
              {orderResult?.itemsAdded > 0 ? (
                <p style={styles.successDescription}>
                  Your items have been added to your Kroger cart.
                </p>
              ) : (
                <p style={styles.successDescription}>
                  Note: Test environment has limited products. In production, your items would be added to your Kroger cart.
                </p>
              )}
              
              <div style={styles.successSummary}>
                <div style={styles.successStat}>
                  <span style={styles.statNumber}>{orderResult?.itemsAdded || 0}</span>
                  <span style={styles.statLabel}>Items Added</span>
                </div>
                <div style={styles.successStat}>
                  <span style={styles.statNumber}>{orderResult?.itemsFailed || cartItems.length}</span>
                  <span style={styles.statLabel}>Items Not Found</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => window.open('https://www.kroger.com/cart', '_blank')}
                style={styles.viewCartButton}
              >
                🛒 View Kroger Cart
              </button>
              
              <button
                type="button"
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
          <button type="button" onClick={onClose} style={styles.closeButton}>×</button>
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

// Styles object
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

  userInfo: {
    fontSize: '14px',
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '8px 16px',
    borderRadius: '8px',
    margin: 0
  },

  warningBox: {
    fontSize: '14px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #fbbf24',
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

  // Other styles remain the same...
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
  },

  storeSource: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '500',
    marginTop: '8px'
  }
};

export default KrogerOrderFlow;