// client/src/components/KrogerOrderFlow.js - Updated with new OAuth integration
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
   * NEW: Check if user is already authenticated with Kroger
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
   * NEW: Start Kroger OAuth authentication flow
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
   * NEW: Handle successful authentication
   */
  const handleAuthSuccess = (authResult) => {
    console.log('🎉 Processing successful authentication:', authResult);
    setStep('cart');
    setError('');
    setLoading(false);
  };

  /**
   * UPDATED: Send cart to Kroger using new auth system
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
   * UPDATED: Place order with Kroger
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
   * NEW: Complete workflow (auth + cart + optional order)
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

  // All your existing render methods remain the same...
  const renderStartStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <h3 style={styles.stepTitle}>🏪 Order with Kroger</h3>
        <p style={styles.stepSubtitle}>
          Send your Smart