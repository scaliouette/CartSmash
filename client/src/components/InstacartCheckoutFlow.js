// client/src/components/InstacartCheckoutFlow.js
import React, { useState, useEffect } from 'react';
import instacartService from '../services/instacartService';
import locationService from '../services/locationService';
import persistenceService from '../services/persistenceService';
import productResolutionService from '../services/productResolutionService';
import { validateCartForInstacart, repairCartItems, createValidationReport } from '../utils/cartValidation';

const InstacartCheckoutFlow = ({ currentCart, onClose }) => {
  const [currentStep, setCurrentStep] = useState('store');
  const [selectedStore, setSelectedStore] = useState(null);
  const [zipCode, setZipCode] = useState(locationService.getSavedZipCode());
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setMatchedProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const [resolutionResult, setResolutionResult] = useState(null);
  const [isResolvingProducts, setIsResolvingProducts] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [validationResult, setValidationResult] = useState(null);
  const [validatedCart, setValidatedCart] = useState(null);
  const [showAllResolved, setShowAllResolved] = useState(false);
  const [showAllUnresolved, setShowAllUnresolved] = useState(false);
  const [cartTotals, setCartTotals] = useState(null);
  const [productQuantities, setProductQuantities] = useState({});
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState(null);
  const [storeHours, setStoreHours] = useState(null);

  // Initialize location and connection monitoring
  useEffect(() => {
    const initializeLocation = async () => {
      // Check location permission status
      const permission = await locationService.getPermissionStatus();
      setLocationPermission(permission);
      
      // Get connection information
      setConnectionInfo(locationService.getConnectionInfo());
      
      // Auto-load ZIP if we have saved location data
      const savedZip = locationService.getSavedZipCode();
      if (savedZip && !zipCode) {
        console.log('📍 Loading saved ZIP code:', savedZip);
        setZipCode(savedZip);
        // Auto-search for stores if we have a saved ZIP
        setTimeout(() => {
          if (savedZip.length === 5) {
            handleZipSearch();
          }
        }, 100);
      } else if (permission === 'granted') {
        // Try to get current location automatically if permission granted
        console.log('📍 Permission granted, attempting to get current location...');
        try {
          const currentZip = await locationService.getZipFromCurrentLocation();
          if (currentZip && currentZip !== savedZip) {
            setZipCode(currentZip);
            locationService.saveZipCode(currentZip);
            console.log('✅ Auto-detected ZIP code:', currentZip);
            // Auto-search for stores
            setTimeout(() => handleZipSearch(), 100);
          }
        } catch (error) {
          console.log('⚠️ Could not auto-detect location:', error.message);
        }
      }
    };
    
    // Monitor online/offline status
    const handleOnlineChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    
    initializeLocation();
    
    return () => {
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  // Persist checkout state
  useEffect(() => {
    persistenceService.saveSessionData('checkout_state', {
      currentStep,
      selectedStore,
      zipCode,
      stores
    });
  }, [currentStep, selectedStore, zipCode, stores]);

  // Load persisted checkout state
  useEffect(() => {
    const savedState = persistenceService.loadSessionData('checkout_state');
    if (savedState && savedState.zipCode && !zipCode) {
      setZipCode(savedState.zipCode);
    }
  }, []);

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
      },
      checkLocationServices: () => {
        const locationInfo = {
          geolocationSupported: locationService.geolocationSupported,
          permission: locationPermission,
          currentLocation: currentLocation,
          savedZip: locationService.getSavedZipCode(),
          isOnline: isOnline,
          connectionInfo: connectionInfo
        };
        console.log('📍 Location Services Status:', locationInfo);
        return locationInfo;
      },
      testLocationAPI: async () => {
        try {
          console.log('🗺️ Testing location API...');
          const location = await locationService.getCurrentLocation();
          const zip = await locationService.coordinatesToZipCode(location.latitude, location.longitude);
          console.log('✅ Location test successful:', { location, zip });
          return { success: true, location, zip };
        } catch (error) {
          console.error('❌ Location test failed:', error);
          return { success: false, error: error.message };
        }
      }
    };
  }, [currentCart]);

  const availableStores = [
    { 
      id: 'kroger', 
      name: 'Kroger', 
      logo: '🛒', 
      price: null, 
      special: 'Click to Connect', 
      featured: true,
      hours: '6:00 AM - 11:00 PM',
      deliverySlots: ['8:00-10:00 AM', '12:00-2:00 PM', '4:00-6:00 PM', '6:00-8:00 PM']
    },
    { 
      id: 'safeway', 
      name: 'Safeway', 
      logo: '🏪', 
      price: '$4.99', 
      hasAPI: true,
      hours: '7:00 AM - 10:00 PM',
      deliverySlots: ['9:00-11:00 AM', '1:00-3:00 PM', '5:00-7:00 PM']
    },
    { 
      id: 'whole-foods', 
      name: 'Whole Foods', 
      logo: '🌿', 
      price: '$4.99',
      hours: '8:00 AM - 9:00 PM',
      deliverySlots: ['10:00-12:00 PM', '2:00-4:00 PM', '6:00-8:00 PM']
    },
    { 
      id: 'costco', 
      name: 'Costco', 
      logo: '📦', 
      price: 'Free', 
      membership: true,
      hours: '10:00 AM - 8:30 PM',
      deliverySlots: ['11:00-1:00 PM', '3:00-5:00 PM']
    },
    { 
      id: 'target', 
      name: 'Target', 
      logo: '🎯', 
      price: '$5.99',
      hours: '8:00 AM - 10:00 PM',
      deliverySlots: ['9:00-11:00 AM', '1:00-3:00 PM', '5:00-7:00 PM', '7:00-9:00 PM']
    },
    { 
      id: 'walmart', 
      name: 'Walmart', 
      logo: '🏬', 
      price: '$7.95',
      hours: '6:00 AM - 11:00 PM',
      deliverySlots: ['8:00-10:00 AM', '12:00-2:00 PM', '4:00-6:00 PM', '8:00-10:00 PM']
    }
  ];

  // Calculate cart totals
  const calculateCartTotals = () => {
    if (!resolutionResult || !resolutionResult.resolved) return null;

    let subtotal = 0;
    let itemCount = 0;

    resolutionResult.resolved.forEach(item => {
      const quantity = productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1;
      const price = parseFloat(item.instacartProduct.price) || 0;
      subtotal += price * quantity;
      itemCount += quantity;
    });

    const deliveryFee = selectedStore?.price === 'Free' ? 0 : parseFloat(selectedStore?.price?.replace('$', '')) || 4.99;
    const serviceFee = subtotal * 0.05; // 5% service fee
    const tip = subtotal * 0.18; // Suggested 18% tip
    const tax = subtotal * 0.0875; // 8.75% tax
    const total = subtotal + deliveryFee + serviceFee + tip + tax;

    return {
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      tip: tip.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      itemCount
    };
  };

  const handleZipSearch = async () => {
    if (zipCode.length === 5) {
      setSearchingStores(true);
      
      try {
        console.log('🏪 Searching for Instacart retailers near:', zipCode);
        
        // Use Instacart service to get nearby retailers
        const retailersResult = await instacartService.getNearbyRetailers(zipCode);
        
        if (retailersResult.success && retailersResult.retailers) {
          console.log('✅ Found retailers:', retailersResult.retailers);
          // Map Instacart retailers to our UI format with distance sorting
          const mappedStores = retailersResult.retailers
            .map(retailer => ({
              id: retailer.id,
              name: retailer.name,
              logo: getRetailerLogo(retailer.name),
              price: retailer.delivery_fee ? `$${retailer.delivery_fee}` : 'Free',
              hasAPI: true,
              distance: retailer.distance,
              address: retailer.address,
              distanceText: retailer.distance ? `${retailer.distance.toFixed(1)} miles` : 'Distance N/A'
            }))
            .filter(store => store.distance && store.distance <= 25) // Only show stores within 25 miles
            .sort((a, b) => (a.distance || 999) - (b.distance || 999)); // Sort by distance
          
          // Add fallback stores only if no API stores found or if user wants more options
          const allStores = mappedStores.length > 0 ? mappedStores : availableStores;
          setStores(allStores);
          console.log(`📍 Found ${mappedStores.length} stores within 25 miles`);
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

  // Handle location-based ZIP search
  const handleUseCurrentLocation = async () => {
    setSearchingStores(true);
    
    try {
      console.log('📍 Using current location for ZIP code...');
      const zip = await locationService.getZipFromCurrentLocation();
      setZipCode(zip);
      locationService.saveZipCode(zip);
      
      // Automatically search stores with the new ZIP
      await handleZipSearch();
    } catch (error) {
      console.error('❌ Location access failed:', error);
      alert(`Location access failed: ${error.message}. Please enter your ZIP code manually.`);
    } finally {
      setSearchingStores(false);
    }
  };

  const handleContinue = async () => {
    if (currentStep === 'store' && selectedStore) {
      setCurrentStep('match');
      
      // Start enhanced product resolution
      try {
        console.log('🔍 Starting enhanced product resolution...');
        setIsResolvingProducts(true);
        
        const resolution = await productResolutionService.resolveCartSmashItems(
          currentCart, 
          selectedStore?.id
        );
        
        setResolutionResult(resolution);
        setIsResolvingProducts(false);
        
        console.log('✅ Product resolution completed:', resolution.stats);
        
        // Set old matched products for backward compatibility
        const matchedItems = resolution.resolved.map(item => ({
          ...item.originalItem,
          matched: true,
          instacartProduct: {
            name: item.instacartProduct.name,
            price: item.instacartProduct.price,
            matchQuality: item.confidence,
            availability: item.instacartProduct.availability || 'in_stock'
          }
        }));
        
        // Add unresolved items as unmatched
        const unmatchedItems = resolution.unresolved.map(item => ({
          ...item.originalItem,
          matched: false,
          instacartProduct: {
            name: item.originalItem.productName || item.originalItem.name,
            price: 'N/A',
            matchQuality: 'low',
            availability: 'not_found'
          }
        }));
        
        setMatchedProducts([...matchedItems, ...unmatchedItems]);
        
      } catch (error) {
        console.error('❌ Product resolution failed:', error);
        setIsResolvingProducts(false);
        
        // Fallback to simple matching
        const fallbackItems = currentCart.map(item => {
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
        setMatchedProducts(fallbackItems);
        console.log('🔄 Using fallback matching results');
      }
    } else if (currentStep === 'match') {
      setCurrentStep('complete');
    }
  };

  const handleFinalCheckout = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🛒 Starting enhanced Instacart direct cart integration...');
      
      // Step 0: Validate and repair cart items
      console.log('🔍 Step 0: Validating cart for Instacart integration...');
      const validation = validateCartForInstacart(currentCart);
      setValidationResult(validation);
      
      console.log(createValidationReport(validation));
      
      let cartToUse = currentCart;
      if (!validation.valid) {
        console.log('⚠️ Cart validation issues found, attempting auto-repair...');
        cartToUse = repairCartItems(currentCart);
        const repairedValidation = validateCartForInstacart(cartToUse);
        
        if (!repairedValidation.valid) {
          console.error('❌ Cart still invalid after repair:', repairedValidation);
          throw new Error(`Cart validation failed: ${repairedValidation.issues.map(i => i.message).join(', ')}`);
        }
        console.log('✅ Cart successfully repaired and validated');
      }
      setValidatedCart(cartToUse);
      
      // Step 1: Resolve CartSmash items to Instacart products
      console.log('🔍 Step 1: Resolving products with enhanced matching...');
      setIsResolvingProducts(true);
      
      const resolution = await productResolutionService.resolveCartSmashItems(
        cartToUse, 
        selectedStore?.id
      );
      
      setResolutionResult(resolution);
      setIsResolvingProducts(false);
      
      console.log('🎯 Product resolution completed:', resolution.stats);
      console.log(`✅ Resolved ${resolution.resolved.length}/${resolution.stats.total} items (${resolution.stats.resolutionRate})`);
      
      if (resolution.resolved.length === 0) {
        console.log('⚠️ No items were resolved, falling back to recipe-based approach...');
        return handleRecipeBasedCheckout(resolution);
      }
      
      // Step 2: Create direct Instacart cart with resolved products
      console.log('🛒 Step 2: Creating direct Instacart cart...');
      
      // Prepare cart items with resolved product IDs
      const cartItems = resolution.resolved.map(item => ({
        product_id: item.instacartProduct.id,
        retailer_sku: item.instacartProduct.retailer_sku || item.instacartProduct.sku || item.instacartProduct.id,
        quantity: item.resolvedDetails?.quantity || item.originalItem?.quantity || 1,
        name: item.instacartProduct.name || item.resolvedDetails?.name,
        price: item.instacartProduct.price
      }));
      
      console.log('📦 Prepared cart items for Instacart API:', cartItems.map(item => ({
        product_id: item.product_id,
        retailer_sku: item.retailer_sku,
        quantity: item.quantity,
        name: item.name,
        price: item.price
      })));
      
      // Use InstacartService to create direct cart via backend API
      const cartResult = await instacartService.createDirectCart(
        cartItems,
        selectedStore?.id,
        zipCode,
        {
          userId: 'cartsmash_user', // You might want to get this from auth context
          resolutionStats: resolution.stats,
          originalItemCount: currentCart.length,
          resolvedItemCount: resolution.resolved.length
        }
      );
      
      if (cartResult.success && cartResult.checkoutUrl) {
        console.log('✅ Direct cart created successfully:', cartResult);
        console.log(`🛒 Cart ID: ${cartResult.cartId}`);
        console.log(`📦 Items added: ${cartResult.itemsAdded}`);
        
        // Open the direct checkout URL with items pre-added
        window.open(cartResult.checkoutUrl, '_blank');
      } else {
        console.log('⚠️ Direct cart creation failed, falling back to recipe-based approach...');
        return handleRecipeBasedCheckout(resolution);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Error in direct cart checkout:', error);
      console.log('🔄 Falling back to recipe-based checkout...');
      
      try {
        // Fallback to recipe-based approach
        const resolution = await productResolutionService.resolveCartSmashItems(currentCart, selectedStore?.id);
        await handleRecipeBasedCheckout(resolution);
      } catch (fallbackError) {
        console.error('❌ Recipe fallback also failed:', fallbackError);
        window.open('https://www.instacart.com', '_blank');
        onClose();
      }
    }
  };

  // Fallback recipe-based checkout method
  const handleRecipeBasedCheckout = async (resolution) => {
    try {
      console.log('📝 Using recipe-based checkout as fallback...');
      
      // Prepare ingredients list
      const enhancedIngredients = [];
      
      // Add successfully resolved items with detailed info
      resolution.resolved.forEach(item => {
        const ingredient = `${item.resolvedDetails.quantity} ${item.resolvedDetails.unit} ${item.resolvedDetails.name}`;
        enhancedIngredients.push(ingredient);
        console.log(`✅ Recipe ingredient: ${ingredient} ($${item.resolvedDetails.price})`);
      });
      
      // Add unresolved items as basic strings
      resolution.unresolved.forEach(item => {
        const basicItem = item.originalItem.productName || item.originalItem.name || item.originalItem.item;
        enhancedIngredients.push(basicItem);
        console.log(`⚠️ Unresolved ingredient: ${basicItem} (${item.reason})`);
      });
      
      // Create recipe using existing method
      const recipeResult = await instacartService.exportGroceryListAsRecipe(enhancedIngredients, {
        title: `CartSmash List - ${new Date().toLocaleDateString()}`,
        imageUrl: 'https://via.placeholder.com/400x300/FF6B35/white?text=CartSmash+List',
        preferredRetailer: selectedStore?.id === 'safeway' ? 'safeway' : undefined,
        partnerUrl: 'https://cartsmash.com',
        trackPantryItems: false,
        resolutionStats: resolution.stats
      });
      
      console.log('✅ Fallback recipe created:', recipeResult);
      
      if (recipeResult.success && recipeResult.instacartUrl) {
        window.open(recipeResult.instacartUrl, '_blank');
      } else {
        console.log('⚠️ Recipe creation failed, using general Instacart URL');
        window.open('https://www.instacart.com', '_blank');
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Recipe-based checkout failed:', error);
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
            {!isOnline && ' • OFFLINE MODE'}
          </p>
          {connectionInfo && (
            <div style={{
              fontSize: '12px',
              opacity: 0.8,
              marginTop: '4px',
              textAlign: 'center'
            }}>
              {connectionInfo.effectiveType} • {connectionInfo.downlink}Mbps • {connectionInfo.rtt}ms RTT
            </div>
          )}
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
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '8px' 
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FF6B35' }}>
                    Delivery Location
                  </div>
                  {locationPermission !== 'denied' && (
                    <button
                      onClick={handleUseCurrentLocation}
                      disabled={searchingStores}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: '#F7931E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: searchingStores ? 'not-allowed' : 'pointer',
                        opacity: searchingStores ? 0.7 : 1
                      }}
                    >
                      {searchingStores ? '📍...' : '📍'}
                    </button>
                  )}
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
                        {store.hours && (
                          <div style={{
                            fontSize: '11px',
                            color: store.featured ? 'rgba(255,255,255,0.8)' : '#999',
                            marginTop: '4px'
                          }}>
                            {store.hours}
                          </div>
                        )}
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
                        • window.checkoutDebug.checkLocationServices()<br/>
                        • window.checkoutDebug.testLocationAPI()<br/>
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
                          🔍 SYSTEM STATUS:
                        </div>
                        <div style={{ fontSize: '11px', color: '#cc0000', marginTop: '4px' }}>
                          ✅ Product Names: {currentCart.filter(item => item.productName && item.productName.length > 2).length}/{currentCart.length} items ready<br/>
                          ✅ Valid IDs: {currentCart.filter(item => item.id).length}/{currentCart.length} items have IDs<br/>
                          ✅ Connection: {isOnline ? 'Online' : 'Offline'} {connectionInfo ? `(${connectionInfo.effectiveType})` : ''}<br/>
                          ✅ Location: {locationPermission === 'granted' ? 'Enabled' : locationPermission === 'denied' ? 'Denied' : 'Unknown'}<br/>
                          ✅ ZIP Code: {zipCode || 'Not set'}<br/>
                          Use checkLocationServices() and verifyInstacartCompatibility() for detailed analysis.
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
                Enhanced Product Matching
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Using AI-powered resolution to find the best Instacart product matches for your CartSmash items.
              </p>
              
              {isResolvingProducts && (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFF5F2', borderRadius: '12px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF6B35', marginBottom: '8px' }}>
                    Resolving Products...
                  </p>
                  <p style={{ color: '#666' }}>
                    Analyzing {currentCart.length} items with {selectedStore?.name} catalog
                  </p>
                </div>
              )}
              
              {resolutionResult && !isResolvingProducts && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    backgroundColor: '#F0F9FF', 
                    border: '1px solid #3B82F6', 
                    borderRadius: '12px', 
                    padding: '20px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E40AF', marginBottom: '12px' }}>
                      🎯 Resolution Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                          {resolutionResult.resolved.length}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>Resolved</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>
                          {resolutionResult.unresolved.length}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>Unresolved</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7C3AED' }}>
                          {resolutionResult.stats.resolutionRate}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>Success Rate</div>
                      </div>
                    </div>
                  </div>
                  
                  {resolutionResult.resolved.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
                        ✅ Successfully Resolved Items:
                      </h4>
                      <div style={{ maxHeight: showAllResolved ? 'none' : '300px', overflowY: showAllResolved ? 'visible' : 'auto', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px' }}>
                        {(showAllResolved ? resolutionResult.resolved : resolutionResult.resolved.slice(0, 5)).map((item, index) => (
                          <div key={index} style={{ 
                            fontSize: '14px', 
                            color: '#166534', 
                            marginBottom: '8px',
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: '6px',
                            border: '1px solid #D1FAE5'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                                  {item.originalItem.productName || item.originalItem.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                  → {item.instacartProduct.name}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                                  ${item.instacartProduct.price}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                  {item.confidence || 'N/A'}% match
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>Qty:</span>
                                <button 
                                  onClick={() => {
                                    const newQty = Math.max(1, (productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1) - 1);
                                    setProductQuantities(prev => ({ ...prev, [item.instacartProduct.id]: newQty }));
                                  }}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '1px solid #D1FAE5',
                                    backgroundColor: '#FFF',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ 
                                  minWidth: '30px',
                                  textAlign: 'center',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}>
                                  {productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1}
                                </span>
                                <button 
                                  onClick={() => {
                                    const newQty = (productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1) + 1;
                                    setProductQuantities(prev => ({ ...prev, [item.instacartProduct.id]: newQty }));
                                  }}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '1px solid #D1FAE5',
                                    backgroundColor: '#FFF',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                {item.instacartProduct.availability === 'in_stock' ? '✅ In Stock' : 
                                 item.instacartProduct.availability === 'limited_stock' ? '⚠️ Limited' : 
                                 item.instacartProduct.availability === 'out_of_stock' ? '❌ Out of Stock' : '🔍 Checking...'}
                              </div>
                            </div>
                          </div>
                        ))}
                        {resolutionResult.resolved.length > 5 && (
                          <div style={{ textAlign: 'center', marginTop: '12px' }}>
                            <button
                              onClick={() => setShowAllResolved(!showAllResolved)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              {showAllResolved ? 
                                `Show Less (${resolutionResult.resolved.length} total)` : 
                                `Show All ${resolutionResult.resolved.length} Items`
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {resolutionResult.unresolved.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#DC2626', marginBottom: '8px' }}>
                        ⚠️ Items to Review:
                      </h4>
                      <div style={{ maxHeight: showAllUnresolved ? 'none' : '200px', overflowY: showAllUnresolved ? 'visible' : 'auto', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px' }}>
                        {(showAllUnresolved ? resolutionResult.unresolved : resolutionResult.unresolved.slice(0, 3)).map((item, index) => (
                          <div key={index} style={{ 
                            fontSize: '14px', 
                            color: '#991B1B', 
                            marginBottom: '8px',
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: '6px',
                            border: '1px solid #FECACA'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                              {item.originalItem.productName || item.originalItem.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                              {item.reason}
                            </div>
                            <div style={{ fontSize: '11px', color: '#DC2626' }}>
                              💡 Alternative suggestions:
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontStyle: 'italic' }}>
                              Try searching for: "{(item.originalItem.productName || item.originalItem.name).split(' ').slice(0, 2).join(' ')}"
                            </div>
                          </div>
                        ))}
                        {resolutionResult.unresolved.length > 3 && (
                          <div style={{ textAlign: 'center', marginTop: '12px' }}>
                            <button
                              onClick={() => setShowAllUnresolved(!showAllUnresolved)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#DC2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              {showAllUnresolved ? 
                                `Show Less (${resolutionResult.unresolved.length} total)` : 
                                `Show All ${resolutionResult.unresolved.length} Items`
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!isResolvingProducts && !resolutionResult && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <p>Preparing to match {currentCart.length} items with {selectedStore?.name} inventory...</p>
                </div>
              )}
            </>
          )}

          {currentStep === 'complete' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', height: '100%' }}>
                {/* Left Column - Cart Details */}
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF6B35', marginBottom: '16px' }}>
                    Review Your Cart
                  </h2>
                  <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                    Review items, quantities, and delivery details before checkout
                  </p>

                  {/* Store Info */}
                  <div style={{
                    backgroundColor: '#F8F9FA',
                    border: '1px solid #E9ECEF',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '32px' }}>{selectedStore?.logo}</div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF6B35' }}>
                          {selectedStore?.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>
                          {selectedStore?.hours}
                        </div>
                      </div>
                    </div>
                    
                    {/* Delivery Slots */}
                    {selectedStore?.deliverySlots && (
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          Select Delivery Time:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                          {selectedStore.deliverySlots.map((slot, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedDeliverySlot(slot)}
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: selectedDeliverySlot === slot ? '#FF6B35' : '#D1D5DB',
                                backgroundColor: selectedDeliverySlot === slot ? '#FF6B35' : 'white',
                                color: selectedDeliverySlot === slot ? 'white' : '#374151',
                                cursor: 'pointer',
                                fontWeight: selectedDeliverySlot === slot ? 'bold' : 'normal'
                              }}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Items */}
                  {resolutionResult && resolutionResult.resolved.length > 0 && (
                    <div style={{
                      backgroundColor: 'white',
                      border: '1px solid #E9ECEF',
                      borderRadius: '12px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ 
                        padding: '16px', 
                        borderBottom: '1px solid #E9ECEF',
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#374151' 
                      }}>
                        Cart Items ({resolutionResult.resolved.length})
                      </div>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {resolutionResult.resolved.map((item, index) => {
                          const quantity = productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1;
                          const price = parseFloat(item.instacartProduct.price) || 0;
                          const itemTotal = (price * quantity).toFixed(2);
                          
                          return (
                            <div key={index} style={{
                              padding: '16px',
                              borderBottom: index < resolutionResult.resolved.length - 1 ? '1px solid #F3F4F6' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              {/* Product Image Placeholder */}
                              <div style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: '#F3F4F6',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                              }}>
                                🏪
                              </div>
                              
                              {/* Product Info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                                  {item.instacartProduct.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                                  Originally: {item.originalItem.productName || item.originalItem.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#059669' }}>
                                  {item.confidence || 'N/A'}% match confidence
                                </div>
                              </div>
                              
                              {/* Quantity Controls */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button 
                                  onClick={() => {
                                    const newQty = Math.max(1, quantity - 1);
                                    setProductQuantities(prev => ({ ...prev, [item.instacartProduct.id]: newQty }));
                                  }}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ 
                                  minWidth: '40px',
                                  textAlign: 'center',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}>
                                  {quantity}
                                </span>
                                <button 
                                  onClick={() => {
                                    const newQty = quantity + 1;
                                    setProductQuantities(prev => ({ ...prev, [item.instacartProduct.id]: newQty }));
                                  }}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                              
                              {/* Price */}
                              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                                  ${itemTotal}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                  ${price.toFixed(2)} each
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Order Summary */}
                <div>
                  <div style={{
                    position: 'sticky',
                    top: '0',
                    backgroundColor: 'white',
                    border: '1px solid #E9ECEF',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151', marginBottom: '16px' }}>
                      Order Summary
                    </h3>
                    
                    {(() => {
                      const totals = calculateCartTotals();
                      return totals ? (
                        <>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                Subtotal ({totals.itemCount} items)
                              </span>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                ${totals.subtotal}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                Delivery Fee
                              </span>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                ${totals.deliveryFee}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                Service Fee
                              </span>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                ${totals.serviceFee}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                Estimated Tax
                              </span>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                ${totals.tax}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                Suggested Tip (18%)
                              </span>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                ${totals.tip}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            borderTop: '2px solid #E9ECEF', 
                            paddingTop: '16px',
                            marginBottom: '20px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                                Total
                              </span>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                                ${totals.total}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                          Add items to see total
                        </div>
                      );
                    })()}

                    {/* Delivery Info */}
                    {selectedDeliverySlot && (
                      <div style={{
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '4px' }}>
                          Selected Delivery Time:
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151' }}>
                          {selectedDeliverySlot}
                        </div>
                      </div>
                    )}

                    {/* Cart Summary Stats */}
                    {resolutionResult && (
                      <div style={{
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center' }}>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                              {resolutionResult.resolved.length}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>Items Ready</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7C3AED' }}>
                              {resolutionResult.stats.resolutionRate}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>Match Rate</div>
                          </div>
                        </div>
                        {resolutionResult.unresolved.length > 0 && (
                          <div style={{ 
                            marginTop: '8px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#DC2626'
                          }}>
                            {resolutionResult.unresolved.length} items will use fallback matching
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{
                      backgroundColor: '#FFF5F2',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.4' }}>
                        🛒 Powered by CartSmash + Instacart<br/>
                        Items will be added to your Instacart cart automatically
                      </div>
                    </div>
                  </div>
                </div>
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
            {isProcessing ? 'Creating Cart...' : 
             currentStep === 'complete' ? 'Create Instacart Cart' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckoutFlow;