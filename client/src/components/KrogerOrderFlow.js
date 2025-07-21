// client/src/components/KrogerOrderFlow.js - Complete component with OAuth integration
import React, { useState, useEffect } from 'react';

function KrogerOrderFlow({ cartItems, currentUser, onClose }) {
  const [step, setStep] = useState('start'); // start, auth, cart, order, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartResult, setCartResult] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [orderSettings, setOrderSettings] = useState({
    storeId: '',
    modality: 'PICKUP',
    pickupTime: '',
    deliveryAddress: {}
  });
  const [userStores, setUserStores] = useState([]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    loadUserStores();
  }, []);

  /**
   * Check if user is already authenticated with Kroger
   */
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking Kroger authentication status...');
      
      const response = await fetch('/api/auth/kroger/status', {
        headers: {
          'User-ID': currentUser?.uid || 'demo-user'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.authenticated) {
        console.log('✅ User already authenticated with Kroger');
        setStep('cart'); // Skip auth step
      } else {
        console.log('🔐 User needs to authenticate with Kroger');
        setStep('start');
      }
      
    } catch (error) {
      console.error('❌ Auth status check failed:', error);
      setStep('start'); // Default to start step
    }
  };

  const loadUserStores = async () => {
    try {
      // Load user's preferred Kroger stores
      const zipCode = '90210'; // Get from user profile or geolocation
      const response = await fetch(`/api/kroger/stores?zipCode=${zipCode}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setUserStores(data.stores);
        if (data.stores.length > 0) {
          setOrderSettings(prev => ({
            ...prev,
            storeId: data.stores[0].locationId
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load stores:', error);
    }
  };

  /**
   * Start Kroger OAuth authentication flow
   */
  const startKrogerAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Starting Kroger OAuth authentication...');
      
      // Step 1: Get authorization URL from our server
      const response = await fetch('/api/auth/kroger/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': currentUser?.uid || 'demo-user'
        },
        body: JSON.stringify({
          scopes: ['cart.basic:write', 'order.basic:write'],
          forceReauth: false
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Auth URL generated, opening popup...');
        setStep('auth');
        
        // Step 2: Open Kroger authentication in popup window
        const authWindow = window.open(
          data.authURL,
          'kroger-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        // Step 3: Listen for authentication completion
        const authListener = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'KROGER_AUTH_SUCCESS') {
            console.log('✅ Kroger authentication successful!');
            handleAuthSuccess(event.data.result);
            authWindow.close();
            window.removeEventListener('message', authListener);
          } else if (event.data.type === 'KROGER_AUTH_ERROR') {
            console.error('❌ Kroger authentication failed:', event.data.error);
            setError('Authentication failed: ' + event.data.error);
            authWindow.close();
            window.removeEventListener('message', authListener);
            setLoading(false);
          }
        };
        
        window.addEventListener('message', authListener);
        
        // Check if window was closed manually
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', authListener);
            setLoading(false);
            setStep('start');
          }
        }, 1000);
        
      } else {
        setError(data.error || 'Failed to start authentication');
      }
      
    } catch (error) {
      setError('Failed to start Kroger authentication');
      console.error('Auth start error:', error);
    } finally {
      if (!error) setLoading(false);
    }
  };

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = (authResult) => {
    console.log('🎉 Processing successful authentication:', authResult);
    setStep('cart');
    setError('');
    setLoading(false);
  };

  /**
   * Send cart to Kroger using new auth system
   */
  const sendCartToKroger = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🛒 Sending cart to Kroger...');
      
      const response = await fetch('/api/kroger-orders/cart/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': currentUser?.uid || 'demo-user'
        },
        body: JSON.stringify({
          cartItems: cartItems,
          storeId: orderSettings.storeId,
          modality: orderSettings.modality,
          clearExistingCart: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCartResult(data);
        setStep('order');
        
        if (data.itemsFailed > 0) {
          setError(`${data.itemsFailed} items could not be added to Kroger cart`);
        }
      } else {
        if (data.needsAuth) {
          setStep('start');
          setError('Kroger authentication expired. Please authenticate again.');
        } else {
          setError(data.message || 'Failed to send cart to Kroger');
        }
      }
      
    } catch (error) {
      setError('Failed to send cart to Kroger');
      console.error('Send cart error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Place order with Kroger
   */
  const placeOrder = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🛍️ Placing order with Kroger...');
      
      const orderDetails = {
        storeId: orderSettings.storeId,
        modality: orderSettings.modality
      };
      
      if (orderSettings.modality === 'PICKUP' && orderSettings.pickupTime) {
        orderDetails.pickupTime = orderSettings.pickupTime;
      }
      
      if (orderSettings.modality === 'DELIVERY' && orderSettings.deliveryAddress) {
        orderDetails.deliveryAddress = orderSettings.deliveryAddress;
      }
      
      const response = await fetch('/api/kroger-orders/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': currentUser?.uid || 'demo-user'
        },
        body: JSON.stringify(orderDetails)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrderResult(data.order);
        setStep('complete');
      } else {
        if (data.needsAuth) {
          setStep('start');
          setError('Please authenticate with Kroger first');
        } else {
          setError(data.message || 'Failed to place order');
        }
      }
      
    } catch (error) {
      setError('Failed to place order with Kroger');
      console.error('Place order error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete workflow (auth + cart + optional order)
   */
  const completeWorkflow = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🚀 Starting complete Kroger workflow...');
      
      const response = await fetch('/api/kroger-orders/workflow/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': currentUser?.uid || 'demo-user'
        },
        body: JSON.stringify({
          cartItems: cartItems,
          storeId: orderSettings.storeId,
          modality: orderSettings.modality,
          orderDetails: {
            pickupTime: orderSettings.pickupTime,
            deliveryAddress: orderSettings.deliveryAddress
          },
          autoPlaceOrder: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCartResult(data.cart);
        setOrderResult(data.order);
        setStep('complete');
      } else {
        if (data.needsAuth) {
          setStep('start');
          setError('Please authenticate with Kroger first');
        } else {
          setError(data.message || 'Workflow failed');
        }
      }
      
    } catch (error) {
      setError('Complete workflow failed');
      console.error('Complete workflow error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render methods
  const renderStartStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>🏪 Order with Kroger</h3>
        <p style={styles.stepSubtitle}>
          Send your Cart Smash directly to Kroger for pickup or delivery
        </p>
      </div>

      <div style={styles.benefitsGrid}>
        <div style={styles.benefit}>
          <span style={styles.benefitIcon}>✅</span>
          <span>Real products with actual pricing</span>
        </div>
        <div style={styles.benefit}>
          <span style={styles.benefitIcon}>🚗</span>
          <span>Convenient pickup or delivery</span>
        </div>
        <div style={styles.benefit}>
          <span style={styles.benefitIcon}>💳</span>
          <span>Secure payment through Kroger</span>
        </div>
        <div style={styles.benefit}>
          <span style={styles.benefitIcon}>📱</span>
          <span>Track your order in real-time</span>
        </div>
      </div>

      <div style={styles.cartPreview}>
        <h4 style={styles.previewTitle}>Cart Preview ({cartItems.length} items)</h4>
        <div style={styles.previewItems}>
          {cartItems.slice(0, 3).map((item, index) => (
            <div key={index} style={styles.previewItem}>
              <span>{item.quantity || 1}x {item.productName || item.itemName}</span>
              {item.realPrice && (
                <span style={styles.previewPrice}>${item.realPrice.toFixed(2)}</span>
              )}
            </div>
          ))}
          {cartItems.length > 3 && (
            <div style={styles.previewMore}>
              ...and {cartItems.length - 3} more items
            </div>
          )}
        </div>
      </div>

      <div style={styles.stepActions}>
        <button
          onClick={startKrogerAuth}
          disabled={loading}
          style={styles.primaryButton}
        >
          {loading ? '🔄 Connecting...' : '🔐 Connect to Kroger'}
        </button>
        <button onClick={onClose} style={styles.secondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  );

  const renderAuthStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>🔐 Kroger Authentication</h3>
        <p style={styles.stepSubtitle}>
          Complete authentication in the popup window
        </p>
      </div>

      <div style={styles.authInstructions}>
        <div style={styles.instruction}>
          <span style={styles.stepNumber}>1</span>
          <span>Sign in to your Kroger account in the popup window</span>
        </div>
        <div style={styles.instruction}>
          <span style={styles.stepNumber}>2</span>
          <span>Authorize Cart Smash to access your Kroger account</span>
        </div>
        <div style={styles.instruction}>
          <span style={styles.stepNumber}>3</span>
          <span>Return to this window to continue</span>
        </div>
      </div>

      <div style={styles.authStatus}>
        <div style={styles.spinner} />
        <span>Waiting for authentication...</span>
      </div>

      <div style={styles.stepActions}>
        <button onClick={startKrogerAuth} style={styles.secondaryButton}>
          🔄 Restart Authentication
        </button>
        <button onClick={onClose} style={styles.secondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  );

  const renderCartStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>🛒 Send Cart to Kroger</h3>
        <p style={styles.stepSubtitle}>
          Choose your store and delivery options
        </p>
      </div>

      <div style={styles.orderSettings}>
        <div style={styles.settingGroup}>
          <label style={styles.settingLabel}>Select Kroger Store:</label>
          <select
            value={orderSettings.storeId}
            onChange={(e) => setOrderSettings(prev => ({
              ...prev,
              storeId: e.target.value
            }))}
            style={styles.settingSelect}
          >
            {userStores.map(store => (
              <option key={store.locationId} value={store.locationId}>
                {store.name} - {store.address?.city}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.settingGroup}>
          <label style={styles.settingLabel}>Fulfillment Method:</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioOption}>
              <input
                type="radio"
                value="PICKUP"
                checked={orderSettings.modality === 'PICKUP'}
                onChange={(e) => setOrderSettings(prev => ({
                  ...prev,
                  modality: e.target.value
                }))}
              />
              <span>🚗 Store Pickup</span>
            </label>
            <label style={styles.radioOption}>
              <input
                type="radio"
                value="DELIVERY"
                checked={orderSettings.modality === 'DELIVERY'}
                onChange={(e) => setOrderSettings(prev => ({
                  ...prev,
                  modality: e.target.value
                }))}
              />
              <span>🚚 Home Delivery</span>
            </label>
          </div>
        </div>

        {orderSettings.modality === 'PICKUP' && (
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>Preferred Pickup Time:</label>
            <input
              type="datetime-local"
              value={orderSettings.pickupTime}
              onChange={(e) => setOrderSettings(prev => ({
                ...prev,
                pickupTime: e.target.value
              }))}
              style={styles.settingInput}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}
      </div>

      <div style={styles.cartSummary}>
        <h4 style={styles.summaryTitle}>Cart Summary</h4>
        <div style={styles.summaryStats}>
          <div style={styles.summaryItem}>
            <span>Total Items:</span>
            <span>{cartItems.length}</span>
          </div>
          <div style={styles.summaryItem}>
            <span>Estimated Total:</span>
            <span>
              {cartItems.some(item => item.realPrice) ? 
                `$${cartItems.reduce((sum, item) => sum + (item.realPrice || 0) * (item.quantity || 1), 0).toFixed(2)}` :
                'Calculated at checkout'
              }
            </span>
          </div>
        </div>
      </div>

      <div style={styles.stepActions}>
        <button
          onClick={sendCartToKroger}
          disabled={loading || !orderSettings.storeId}
          style={styles.primaryButton}
        >
          {loading ? '🔄 Sending Cart...' : '📤 Send to Kroger'}
        </button>
        <button
          onClick={completeWorkflow}
          disabled={loading || !orderSettings.storeId}
          style={styles.successButton}
        >
          {loading ? '⚡ Processing...' : '⚡ Send & Order Now'}
        </button>
      </div>
    </div>
  );

  const renderOrderStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>✅ Cart Sent Successfully</h3>
        <p style={styles.stepSubtitle}>
          Your items are now in your Kroger cart
        </p>
      </div>

      {cartResult && (
        <div style={styles.resultSummary}>
          <div style={styles.resultGrid}>
            <div style={styles.resultCard}>
              <div style={styles.resultValue}>{cartResult.itemsAdded}</div>
              <div style={styles.resultLabel}>Items Added</div>
            </div>
            <div style={styles.resultCard}>
              <div style={styles.resultValue}>{cartResult.itemsFailed}</div>
              <div style={styles.resultLabel}>Items Failed</div>
            </div>
            <div style={styles.resultCard}>
              <div style={styles.resultValue}>{cartResult.totalItems}</div>
              <div style={styles.resultLabel}>Total in Cart</div>
            </div>
          </div>

          {cartResult.itemsFailed > 0 && (
            <div style={styles.warningBox}>
              <h4>⚠️ Some items couldn't be added</h4>
              <p>
                {cartResult.itemsFailed} items weren't found in Kroger's catalog. 
                You can add similar items manually in your Kroger cart.
              </p>
            </div>
          )}
        </div>
      )}

      <div style={styles.nextSteps}>
        <h4 style={styles.nextStepsTitle}>What's Next?</h4>
        <div style={styles.optionGrid}>
          <div style={styles.option}>
            <h5>🛍️ Complete Order Here</h5>
            <p>Place your order directly through Cart Smash</p>
            <button
              onClick={placeOrder}
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading ? '🔄 Placing Order...' : '🛍️ Place Order'}
            </button>
          </div>
          <div style={styles.option}>
            <h5>📱 Continue in Kroger App</h5>
            <p>Review and modify your cart in the Kroger app or website</p>
            <a
              href="https://www.kroger.com/cart"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.externalLink}
            >
              🔗 Open Kroger Cart
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>🎉 Order Placed Successfully!</h3>
        <p style={styles.stepSubtitle}>
          Your Kroger order has been placed and is being processed
        </p>
      </div>

      {orderResult && (
        <div style={styles.orderDetails}>
          <div style={styles.orderInfo}>
            <h4 style={styles.orderInfoTitle}>Order Information</h4>
            <div style={styles.orderField}>
              <span style={styles.fieldLabel}>Order ID:</span>
              <span style={styles.fieldValue}>{orderResult.orderId}</span>
            </div>
            {orderResult.orderNumber && (
              <div style={styles.orderField}>
                <span style={styles.fieldLabel}>Order Number:</span>
                <span style={styles.fieldValue}>{orderResult.orderNumber}</span>
              </div>
            )}
            <div style={styles.orderField}>
              <span style={styles.fieldLabel}>Status:</span>
              <span style={styles.fieldValue}>{orderResult.status}</span>
            </div>
            {orderResult.total && (
              <div style={styles.orderField}>
                <span style={styles.fieldLabel}>Total:</span>
                <span style={styles.fieldValue}>${orderResult.total.toFixed(2)}</span>
              </div>
            )}
            {orderResult.estimatedTime && (
              <div style={styles.orderField}>
                <span style={styles.fieldLabel}>Estimated Ready:</span>
                <span style={styles.fieldValue}>{orderResult.estimatedTime}</span>
              </div>
            )}
          </div>

          <div style={styles.trackingInfo}>
            <h4 style={styles.trackingTitle}>📱 Track Your Order</h4>
            <p>You can track your order status and get updates:</p>
            <div style={styles.trackingLinks}>
              <button
                onClick={() => window.open(`https://www.kroger.com/orders/${orderResult.orderId}`, '_blank')}
                style={styles.trackingButton}
              >
                🔗 Track on Kroger.com
              </button>
              <button
                onClick={() => {
                  // Add to calendar functionality
                  const event = {
                    title: `Kroger Order Pickup - ${orderResult.orderNumber}`,
                    start: orderResult.estimatedTime,
                    description: `Order ID: ${orderResult.orderId}`
                  };
                  // Implement calendar integration
                }}
                style={styles.calendarButton}
              >
                📅 Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.completionActions}>
        <button
          onClick={() => {
            onClose();
            // Optionally clear the cart or redirect
          }}
          style={styles.primaryButton}
        >
          ✅ Done
        </button>
        <button
          onClick={() => setStep('start')}
          style={styles.secondaryButton}
        >
          🔄 Place Another Order
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🏪 Kroger Order Integration</h2>
          <div style={styles.headerInfo}>
            <div style={styles.stepIndicator}>
              Step {['start', 'auth', 'cart', 'order', 'complete'].indexOf(step) + 1} of 5
            </div>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${((['start', 'auth', 'cart', 'order', 'complete'].indexOf(step) + 1) / 5) * 100}%`
            }}
          />
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorMessage}>
              ❌ {error}
            </div>
          )}

          {step === 'start' && renderStartStep()}
          {step === 'auth' && renderAuthStep()}
          {step === 'cart' && renderCartStep()}
          {step === 'order' && renderOrderStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerInfo}>
            <span>🔒 Secure connection to Kroger</span>
            <span>•</span>
            <span>✅ Real-time order tracking</span>
            <span>•</span>
            <span>🏪 {userStores.length} stores available</span>
          </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5000,
    padding: '20px'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '95%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px 35px 15px',
    borderBottom: '1px solid #e5e7eb'
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },

  stepIndicator: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  progressBar: {
    height: '4px',
    backgroundColor: '#f3f4f6',
    position: 'relative'
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease'
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '30px 35px'
  },

  errorMessage: {
    padding: '15px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '20px',
    fontSize: '14px'
  },

  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  stepHeader: {
    textAlign: 'center'
  },

  stepTitle: {
    margin: '0 0 10px 0',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  stepSubtitle: {
    margin: 0,
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5'
  },

  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },

  benefit: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  benefitIcon: {
    fontSize: '20px'
  },

  cartPreview: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  previewTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151'
  },

  previewItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  previewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#6b7280'
  },

  previewPrice: {
    fontWeight: 'bold',
    color: '#10b981'
  },

  previewMore: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },

  stepActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  successButton: {
    padding: '12px 24px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  authInstructions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  instruction: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '16px',
    color: '#374151'
  },

  stepNumber: {
    width: '32px',
    height: '32px',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px'
  },

  authStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  orderSettings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  settingLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },

  settingSelect: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  settingInput: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },

  radioGroup: {
    display: 'flex',
    gap: '20px'
  },

  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },

  cartSummary: {
    backgroundColor: '#f0f9ff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #bae6fd'
  },

  summaryTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#0c4a6e'
  },

  summaryStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#0c4a6e'
  },

  resultSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  },

  resultCard: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd'
  },

  resultValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0c4a6e'
  },

  resultLabel: {
    fontSize: '12px',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  warningBox: {
    padding: '15px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fbbf24'
  },

  nextSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  nextStepsTitle: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#374151'
  },

  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },

  option: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  },

  externalLink: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500'
  },

  orderDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  orderInfo: {
    backgroundColor: '#f0f9ff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #bae6fd'
  },

  orderInfoTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#0c4a6e'
  },

  orderField: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e0f2fe'
  },

  fieldLabel: {
    fontWeight: '500',
    color: '#0369a1'
  },

  fieldValue: {
    fontWeight: 'bold',
    color: '#0c4a6e'
  },

  trackingInfo: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  trackingTitle: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#374151'
  },

  trackingLinks: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },

  trackingButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  calendarButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  completionActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center'
  },

  footer: {
    padding: '15px 35px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },

  footerInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: '#6b7280'
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default KrogerOrderFlow;