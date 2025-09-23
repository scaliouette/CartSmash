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
  // eslint-disable-next-line no-unused-vars
  const [showDebug, setShowDebug] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // eslint-disable-next-line no-unused-vars
  const [validationResult, setValidationResult] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [validatedCart, setValidatedCart] = useState(null);
  const [showAllResolved, setShowAllResolved] = useState(false);
  const [showAllUnresolved, setShowAllUnresolved] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [cartTotals, setCartTotals] = useState(null);
  const [productQuantities, setProductQuantities] = useState({});
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [storeHours, setStoreHours] = useState(null);
  const [itemApprovals, setItemApprovals] = useState({});
  const [showingAlternatives, setShowingAlternatives] = useState({});
  const [pendingApprovals, setPendingApprovals] = useState(new Set());

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
          // Get current location first for distance calculations
          const location = await locationService.getCurrentLocation();
          setCurrentLocation(location);
          console.log('✅ Current location acquired for distance calculations');
          
          // Then try to get ZIP code
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
          // Even if ZIP detection fails, try to get location for distance calculations
          try {
            const location = await locationService.getCurrentLocation();
            setCurrentLocation(location);
            console.log('✅ Got current location for distance calculations (ZIP detection failed)');
          } catch (locationError) {
            console.log('⚠️ Could not get current location for distance calculations:', locationError.message);
          }
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

  // Production: No default stores - user must search for location
  // Stores will be populated when user searches by ZIP code

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

  // Production version: No fallback stores - use only real API data

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

  // Production: No mock store enhancement - real API provides all store data

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
              logo: retailer.logo || getRetailerLogo(retailer.name),
              price: retailer.delivery_fee ? `$${retailer.delivery_fee}` : 'Free',
              hasAPI: true,
              distance: retailer.distance,
              address: retailer.address,
              distanceText: retailer.distance ? `${retailer.distance.toFixed(1)} miles` : 'Distance N/A'
            }))
            .filter(store => !store.distance || store.distance <= 50) // Show stores within 50 miles, or all stores if no distance data
            .sort((a, b) => (a.distance || 999) - (b.distance || 999)); // Sort by distance
          
          // Production: Only use API stores, no fallback
          setStores(mappedStores);
          console.log(`📍 Found ${mappedStores.length} stores (expanded search to 50 miles or all available stores)`);
        } else {
          console.log('⚠️ No retailers found for this location');
          setStores([]);
        }
      } catch (error) {
        console.error('❌ Error fetching retailers:', error);
        setStores([]);
      }
      
      setSearchingStores(false);
    }
  };
  
  const getRetailerLogo = (name) => {
    const logos = {
      'Safeway': '🏪',
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

  const handleGoBack = () => {
    if (currentStep === 'match') {
      setCurrentStep('store');
      // Clear resolution results when going back
      setResolutionResult(null);
      setIsResolvingProducts(false);
    } else if (currentStep === 'complete') {
      setCurrentStep('match');
      // Clear cart totals when going back
      setCartTotals(null);
    }
  };

  const handleFinalCheckout = async () => {
    console.log('🛒 ===== FINAL CHECKOUT DEBUG =====');
    console.log('📝 Checkout state:', {
      currentStep,
      selectedStore,
      zipCode,
      cartItemsCount: currentCart?.length || 0,
      timestamp: new Date().toISOString()
    });
    console.log('📋 Current cart items:', currentCart?.map((item, index) => ({
      index,
      productName: item.productName || item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      id: item.id,
      hasRequiredFields: !!(item.productName || item.name) && !!item.quantity
    })));
    
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
      
      // Skip direct cart creation and use recipe-based approach for reliable results
      console.log('🛒 Step 2: Using recipe-based approach for reliable Instacart integration...');
      return handleRecipeBasedCheckout(resolution);
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

  // Enhanced recipe-based checkout using full recipe API integration
  const handleRecipeBasedCheckout = async (resolution) => {
    try {
      console.log('🚀 Using comprehensive recipe API integration...');
      
      // Prepare comprehensive ingredients list with enhanced data from resolution
      const enhancedIngredients = [];
      
      // Add successfully resolved items with full recipe API format
      resolution.resolved.forEach(item => {
        // Extract resolved product details
        const productDetails = item.instacartProduct;
        const originalItem = item.originalItem;
        const quantity = productQuantities[productDetails.id] || originalItem.quantity || 1;
        
        // Create comprehensive ingredient using recipe API specification
        const ingredient = {
          name: originalItem.productName || originalItem.name,
          display_text: productDetails.name || originalItem.productName || originalItem.name,
          measurements: [{
            quantity: quantity,
            unit: originalItem.unit || 'each'
          }]
        };
        
        // Add brand filters if we have brand information
        if (productDetails.brand) {
          ingredient.filters = {
            brand_filters: [productDetails.brand]
          };
        }
        
        // Add product IDs if available from real API response
        if (productDetails._metadata?.isRealApiResponse && productDetails.id) {
          ingredient.product_ids = [productDetails.id];
        }
        
        // Add UPCs if available
        if (productDetails.sku || productDetails.upc) {
          ingredient.upcs = [productDetails.sku || productDetails.upc];
        }
        
        enhancedIngredients.push(ingredient);
        console.log(`✅ Enhanced ingredient: ${ingredient.name} (${quantity} ${ingredient.measurements[0].unit}) - Brand: ${productDetails.brand || 'Any'}`);
      });
      
      // Add unresolved items with basic format but attempt intelligent parsing
      resolution.unresolved.forEach(item => {
        const originalName = item.originalItem.productName || item.originalItem.name || item.originalItem.item;
        const quantity = item.originalItem.quantity || 1;
        const unit = item.originalItem.unit || 'each';
        
        const ingredient = {
          name: originalName,
          display_text: originalName,
          measurements: [{
            quantity: quantity,
            unit: unit
          }]
        };
        
        enhancedIngredients.push(ingredient);
        console.log(`⚠️ Unresolved ingredient: ${originalName} (${quantity} ${unit}) - Reason: ${item.reason}`);
      });
      
      // Use enhanced server-side shopping list API with recipe API fallback
      const instacartShoppingListService = await import('../services/instacartShoppingListService');
      const { createInstacartRecipePage } = await import('../services/aiMealPlanService');
      
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
      
      // Prepare shopping list data (preferred approach)
      const shoppingListData = {
        title: `CartSmash Shopping List - ${currentDate}`,
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop',
        instructions: [
          '🛒 Welcome to your CartSmash shopping list!',
          `📅 Generated on ${currentDate} with ${enhancedIngredients.length} items.`,
          '✅ All items have been matched using advanced AI product resolution.',
          '🏪 Items will be automatically added to your Instacart cart.',
          '💳 Review quantities and complete your purchase on Instacart.',
          '🚚 Enjoy convenient delivery or pickup of your groceries!'
        ],
        lineItems: enhancedIngredients.map(ingredient => ({
          name: ingredient.name,
          display_text: ingredient.display_text,
          quantity: ingredient.measurements?.[0]?.quantity || 1,
          unit: ingredient.measurements?.[0]?.unit || 'each',
          line_item_measurements: ingredient.measurements,
          filters: ingredient.filters,
          upcs: ingredient.upcs,
          product_ids: ingredient.product_ids
        })),
        partnerUrl: 'https://cartsmash.com/checkout-success',
        expiresIn: 365
      };
      
      // Prepare recipe data as fallback
      const recipeData = {
        title: `CartSmash Shopping List - ${currentDate}`,
        author: 'CartSmash AI Assistant',
        servings: 1,
        cookingTime: null, // Not applicable for shopping lists
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop',
        instructions: [
          '🛒 Welcome to your CartSmash shopping list!',
          `📅 Generated on ${currentDate} with ${enhancedIngredients.length} items.`,
          '✅ All items have been matched using advanced AI product resolution.',
          '🏪 Items will be automatically added to your Instacart cart.',
          '💳 Review quantities and complete your purchase on Instacart.',
          '🚚 Enjoy convenient delivery or pickup of your groceries!'
        ],
        ingredients: enhancedIngredients,
        partnerUrl: 'https://cartsmash.com/checkout-success',
        enablePantryItems: false, // Shopping lists don't need pantry items
        retailerKey: selectedStore?.retailer_key || selectedStore?.id,
        dietaryRestrictions: [], // Could be expanded with user preferences
        externalReferenceId: `cartsmash-checkout-${Date.now()}`
      };
      
      console.log('🎯 Creating comprehensive shopping list with:', {
        lineItems: enhancedIngredients.length,
        retailer: selectedStore?.name,
        totalItems: resolution.resolved.length + resolution.unresolved.length,
        resolvedItems: resolution.resolved.length,
        unresolvedItems: resolution.unresolved.length
      });
      
      // Try shopping list API first, then fall back to recipe API
      let result;
      try {
        console.log('🛒 Attempting shopping list API first...');
        result = await instacartShoppingListService.default.createShoppingList(shoppingListData);
        console.log('✅ Shopping list API succeeded:', result);
      } catch (shoppingListError) {
        console.log('⚠️ Shopping list API failed, trying recipe API fallback...', shoppingListError.message);
        result = await createInstacartRecipePage(recipeData);
        result.usedFallback = true;
        console.log('✅ Recipe API fallback succeeded:', result);
      }
      
      console.log('✅ Comprehensive shopping list created:', result);
      
      if (result.success && result.instacartUrl) {
        // Add retailer key to URL if not already present and we have one
        let finalUrl = result.instacartUrl;
        const retailerKey = selectedStore?.retailer_key || selectedStore?.id;
        if (retailerKey && !finalUrl.includes('retailer_key=')) {
          const separator = finalUrl.includes('?') ? '&' : '?';
          finalUrl += `${separator}retailer_key=${retailerKey}`;
        }
        
        console.log('🌐 Opening Instacart URL:', finalUrl);
        window.open(finalUrl, '_blank');
        
        // Show success message
        setIsProcessing(false);
        const apiType = result.usedFallback ? 'Recipe API (fallback)' : 'Shopping List API';
        const itemId = result.shoppingListId || result.recipeId || 'N/A';
        
        alert(`🎉 Success! Your CartSmash list with ${enhancedIngredients.length} items has been sent to Instacart via ${apiType}. 
               
${result.usedFallback ? 'Recipe' : 'Shopping List'} ID: ${itemId}
Items Matched: ${resolution.resolved.length}/${resolution.resolved.length + resolution.unresolved.length}
Store: ${selectedStore?.name || 'Selected retailer'}
API Used: ${apiType}

The Instacart page is now opening where you can review and complete your order!`);
      } else {
        console.log('⚠️ Both shopping list and recipe creation failed, using direct retailer URL');
        const fallbackUrl = selectedStore?.retailer_key 
          ? `https://www.instacart.com/store/${selectedStore.retailer_key}`
          : 'https://www.instacart.com';
        window.open(fallbackUrl, '_blank');
        alert('Unable to create shopping list or recipe page. Opening Instacart store directly.');
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Enhanced recipe-based checkout failed:', error);
      
      // Enhanced fallback with retailer-specific URL
      const fallbackUrl = selectedStore?.retailer_key 
        ? `https://www.instacart.com/store/${selectedStore.retailer_key}`
        : 'https://www.instacart.com';
      window.open(fallbackUrl, '_blank');
      alert('Checkout process encountered an error. Opening Instacart directly.');
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
        backgroundColor: 'rgba(0, 34, 68, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
      <div style={{
        width: '95%',
        maxWidth: '1200px',
        maxHeight: '95vh',
        backgroundColor: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 34, 68, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div 
          className="instacart-checkout-header"
          style={{
            background: 'linear-gradient(135deg, #002244 0%, #003366 100%)',
            padding: '32px',
            color: 'white',
            position: 'relative'
          }}>
          {/* Back Button */}
          {currentStep !== 'store' && (
            <button 
              onClick={handleGoBack} 
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ←
            </button>
          )}
          
          {/* Close Button */}
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
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
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
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FB4F14' }}>
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
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FB4F14' }}>
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
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#FB4F14' }}>
              Complete
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {currentStep === 'store' && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FB4F14', marginBottom: '16px' }}>
                Choose Your Store
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Select where you'd like to shop and have your groceries delivered from
              </p>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#FB4F14', marginBottom: '8px' }}>
                  Delivery Location
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {locationPermission !== 'denied' && (
                    <button
                      onClick={handleUseCurrentLocation}
                      disabled={searchingStores}
                      style={{
                        padding: '12px 16px',
                        fontSize: '16px',
                        backgroundColor: 'white',
                        color: '#FB4F14',
                        border: '2px solid #FF6B35',
                        borderRadius: '8px',
                        cursor: searchingStores ? 'not-allowed' : 'pointer',
                        opacity: searchingStores ? 0.7 : 1,
                        fontWeight: 'bold'
                      }}
                    >
                      {searchingStores ? '📍...' : '📍'}
                    </button>
                  )}
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
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      color: '#FB4F14',
                      border: '2px solid #FF6B35',
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
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FB4F14', marginBottom: '16px' }}>
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
                        <div style={{ marginBottom: '8px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {store.logo && store.logo.startsWith('http') ? (
                            <img 
                              src={store.logo} 
                              alt={store.name}
                              style={{ 
                                maxHeight: '48px', 
                                maxWidth: '80px', 
                                objectFit: 'contain'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <div style={{ 
                            fontSize: '32px',
                            display: store.logo && store.logo.startsWith('http') ? 'none' : 'block'
                          }}>
                            {store.logo && !store.logo.startsWith('http') ? store.logo : '🏪'}
                          </div>
                        </div>
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
                        {store.distanceText && (
                          <div style={{
                            fontSize: '12px',
                            color: store.featured ? 'rgba(255,255,255,0.9)' : '#FF6B35',
                            marginTop: '4px',
                            fontWeight: 'bold'
                          }}>
                            📍 {store.distanceText}
                          </div>
                        )}
                        {store.address && (
                          <div style={{
                            fontSize: '12px',
                            color: store.featured ? 'rgba(255,255,255,0.9)' : '#666',
                            marginTop: '6px',
                            lineHeight: '1.3',
                            fontWeight: '500'
                          }}>
                            📍 {store.address}
                          </div>
                        )}
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


              {!selectedStore && stores.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '32px', padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <h3 style={{ color: '#FB4F14', marginBottom: '8px', fontSize: '18px' }}>No stores found</h3>
                  <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                    Enter your ZIP code above to find Instacart retailers in your area. We'll show you all available stores with real-time delivery options.
                  </p>
                </div>
              )}
            </>
          )}

          {currentStep === 'match' && (
            <>

              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FB4F14', marginBottom: '16px' }}>
                Enhanced Product Matching
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Using AI-powered resolution with real Instacart API to find the best product matches for your CartSmash items.
              </p>
              
              {isResolvingProducts && (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFF5F2', borderRadius: '12px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#FB4F14', marginBottom: '8px' }}>
                    Resolving Products...
                  </p>
                  <p style={{ color: '#666' }}>
                    Analyzing {currentCart.length} items with {selectedStore?.name} catalog
                  </p>
                </div>
              )}
              
              {resolutionResult && !isResolvingProducts && (
                <div style={{ marginBottom: '24px' }}>
                  
                  {resolutionResult.resolved.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
                        ✅ Successfully Resolved Items ({selectedStore?.name || 'Selected Vendor'}):
                      </h4>
                      <div style={{ maxHeight: showAllResolved ? 'none' : '400px', overflowY: showAllResolved ? 'visible' : 'auto', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px' }}>
                        {(showAllResolved ? resolutionResult.resolved : resolutionResult.resolved.slice(0, 5)).map((item, index) => {
                          const needsApproval = item.vendorSpecific?.needsApproval;
                          const itemId = item.instacartProduct.id;
                          const isApproved = itemApprovals[itemId];
                          const showAlternatives = showingAlternatives[itemId];
                          const isPending = pendingApprovals.has(itemId);
                          
                          return (
                            <div key={index} style={{ 
                              fontSize: '14px', 
                              color: '#1F2937', 
                              marginBottom: '16px',
                              padding: '20px',
                              backgroundColor: needsApproval && !isApproved ? '#FEF3C7' : '#FFFFFF',
                              borderRadius: '12px',
                              border: needsApproval && !isApproved ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                              position: 'relative',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                            }}>
                              {/* Vendor-specific badge */}
                              {item.vendorSpecific?.retailerId && (
                                <div style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  fontSize: '10px',
                                  backgroundColor: '#E5E7EB',
                                  color: '#374151',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  🏪 {selectedStore?.name?.split(' ')[0] || 'Vendor'}
                                </div>
                              )}
                              
                              {/* Real API Data Indicator */}
                              {item.instacartProduct._metadata?.isRealApiResponse && (
                                <div style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  fontSize: '10px',
                                  backgroundColor: '#10B981',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  ✅ REAL DATA
                                </div>
                              )}
                              
                              {/* Clean Product Display Card */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {/* Original Item Label */}
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#6B7280', 
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontWeight: '500'
                                  }}>
                                    Requested: {item.originalItem.productName || item.originalItem.name}
                                  </div>
                                  
                                  {/* Matched Product Name - Main Focus */}
                                  <div style={{ 
                                    fontSize: '18px', 
                                    color: '#1F2937', 
                                    fontWeight: 'bold', 
                                    marginBottom: '12px',
                                    lineHeight: '1.3'
                                  }}>
                                    {item.instacartProduct.name}
                                  </div>
                                  
                                  {/* Product Image - After Name */}
                                  <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginBottom: '12px',
                                    border: '2px solid #E5E7EB',
                                    flexShrink: 0,
                                    backgroundColor: '#F9FAFB'
                                  }}>
                                    {item.instacartProduct.image_url && item.instacartProduct.image_url !== '/placeholder-product.jpg' ? (
                                      <img 
                                        src={item.instacartProduct.image_url} 
                                        alt={item.instacartProduct.name}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div style={{
                                      width: '100%',
                                      height: '100%',
                                      backgroundColor: '#F3F4F6',
                                      display: item.instacartProduct.image_url && item.instacartProduct.image_url !== '/placeholder-product.jpg' ? 'none' : 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '28px'
                                    }}>
                                      🛒
                                    </div>
                                  </div>
                                  
                                  {/* Product Details Grid - Organized */}
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                                    gap: '8px 16px', 
                                    marginBottom: '12px',
                                    fontSize: '12px'
                                  }}>
                                    {item.instacartProduct.brand && (
                                      <div style={{ color: '#374151' }}>
                                        <span style={{ color: '#6B7280', fontWeight: '600' }}>Brand: </span>
                                        {item.instacartProduct.brand}
                                      </div>
                                    )}
                                    {item.instacartProduct.size && (
                                      <div style={{ color: '#374151' }}>
                                        <span style={{ color: '#6B7280', fontWeight: '600' }}>Size: </span>
                                        {item.instacartProduct.size}
                                      </div>
                                    )}
                                    <div style={{ color: '#374151' }}>
                                      <span style={{ color: '#6B7280', fontWeight: '600' }}>Match: </span>
                                      <span style={{ 
                                        color: (item.confidence || '').toLowerCase().includes('high') ? '#059669' : 
                                               (item.confidence || '').toLowerCase().includes('medium') ? '#F59E0B' : '#DC2626',
                                        fontWeight: '600'
                                      }}>
                                        {item.confidence || 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ color: '#6B7280', fontWeight: '600' }}>Status: </span>
                                      <span style={{ 
                                        color: item.instacartProduct.availability === 'in_stock' ? '#059669' : 
                                               item.instacartProduct.availability === 'limited_stock' ? '#F59E0B' : '#DC2626',
                                        fontWeight: '600'
                                      }}>
                                        {item.instacartProduct.availability === 'in_stock' ? '✅ In Stock' : 
                                         item.instacartProduct.availability === 'limited_stock' ? '⚠️ Limited' : 
                                         item.instacartProduct.availability === 'out_of_stock' ? '❌ Out of Stock' : '🔍 Checking...'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Price Display with Quantity - Prominent */}
                                <div style={{ textAlign: 'right', marginLeft: '16px', flexShrink: 0 }}>
                                  {/* Quantity Selector - Compact */}
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: '6px',
                                    marginBottom: '8px'
                                  }}>
                                    <button 
                                      onClick={() => {
                                        const newQty = Math.max(1, (productQuantities[itemId] || item.originalItem.quantity || 1) - 1);
                                        setProductQuantities(prev => ({ ...prev, [itemId]: newQty }));
                                      }}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '1px solid #FB4F14',
                                        backgroundColor: '#FFF',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#FB4F14',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseOver={(e) => {
                                        e.target.style.backgroundColor = '#FEF2F2';
                                      }}
                                      onMouseOut={(e) => {
                                        e.target.style.backgroundColor = '#FFF';
                                      }}
                                    >
                                      -
                                    </button>
                                    
                                    <div style={{ 
                                      minWidth: '40px',
                                      textAlign: 'center',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      color: '#1F2937',
                                      padding: '4px 8px',
                                      backgroundColor: '#F9FAFB',
                                      borderRadius: '4px',
                                      border: '1px solid #D1D5DB'
                                    }}>
                                      {productQuantities[itemId] || item.originalItem.quantity || 1}
                                    </div>
                                    
                                    <button 
                                      onClick={() => {
                                        const newQty = (productQuantities[itemId] || item.originalItem.quantity || 1) + 1;
                                        setProductQuantities(prev => ({ ...prev, [itemId]: newQty }));
                                      }}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '1px solid #FB4F14',
                                        backgroundColor: '#FFF',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#FB4F14',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseOver={(e) => {
                                        e.target.style.backgroundColor = '#FEF2F2';
                                      }}
                                      onMouseOut={(e) => {
                                        e.target.style.backgroundColor = '#FFF';
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Price Display */}
                                  <div style={{ 
                                    backgroundColor: '#F0FDF4',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #BBF7D0',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ 
                                      fontSize: '20px', 
                                      fontWeight: 'bold', 
                                      color: '#059669',
                                      marginBottom: '2px'
                                    }}>
                                      ${item.instacartProduct.price}
                                    </div>
                                    {item.instacartProduct.size && (
                                      <div style={{ 
                                        fontSize: '10px', 
                                        color: '#6B7280'
                                      }}>
                                        per {item.instacartProduct.size}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Search Analysis - Clean Collapsible Section */}
                              {item.vendorSpecific && (
                                <div style={{ 
                                  backgroundColor: '#F8FAFC', 
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px', 
                                  marginTop: '8px',
                                  fontSize: '16px'
                                }}>
                                  <div 
                                    style={{ 
                                      padding: '10px 12px',
                                      borderBottom: '1px solid #E2E8F0',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      backgroundColor: '#F1F5F9'
                                    }}
                                    onClick={() => {
                                      const toggleKey = `search_${itemId}`;
                                      setShowingAlternatives(prev => ({ ...prev, [toggleKey]: !prev[toggleKey] }));
                                    }}
                                  >
                                    <div style={{ color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>🔍</span>
                                      <span style={{ fontSize: '16px' }}>Search Details</span>
                                      <span style={{ 
                                        backgroundColor: '#10B981', 
                                        color: 'white', 
                                        padding: '2px 6px', 
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                      }}>
                                        {item.vendorSpecific.totalSearchResults} found
                                      </span>
                                    </div>
                                    <span style={{ color: '#94A3B8', fontSize: '10px' }}>
                                      {showingAlternatives[`search_${itemId}`] ? '▼' : '▶'}
                                    </span>
                                  </div>
                                  
                                  {showingAlternatives[`search_${itemId}`] && (
                                    <div style={{ padding: '12px' }}>
                                      <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                                        gap: '8px', 
                                        marginBottom: '12px' 
                                      }}>
                                        <div style={{ color: '#374151' }}>
                                          <span style={{ color: '#6B7280', fontWeight: '600' }}>Query: </span>
                                          "{item.vendorSpecific.searchQuery}"
                                        </div>
                                        <div style={{ color: '#374151' }}>
                                          <span style={{ color: '#6B7280', fontWeight: '600' }}>Reason: </span>
                                          {item.vendorSpecific.matchReason}
                                        </div>
                                      </div>
                                      
                                      {/* Alternative Products - Clean Cards */}
                                      {item.vendorSpecific.alternativeMatches && item.vendorSpecific.alternativeMatches.length > 0 && (
                                        <div>
                                          <div style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 'bold', 
                                            color: '#475569', 
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}>
                                            <span>🔄</span>
                                            <span>Alternative Options ({item.vendorSpecific.alternativeMatches.length} available)</span>
                                          </div>
                                          <div style={{ display: 'grid', gap: '6px' }}>
                                            {item.vendorSpecific.alternativeMatches.slice(0, 3).map((alt, altIndex) => (
                                              <div key={altIndex} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '11px',
                                                backgroundColor: 'white',
                                                padding: '8px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #E5E7EB'
                                              }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '2px' }}>
                                                    {alt.name}
                                                  </div>
                                                  <div style={{ color: '#6B7280', fontSize: '10px' }}>
                                                    {alt.brand && `${alt.brand}`}
                                                    {alt.brand && alt.size && ' • '}
                                                    {alt.size && alt.size}
                                                  </div>
                                                </div>
                                                <div style={{ 
                                                  fontWeight: 'bold', 
                                                  color: '#059669', 
                                                  fontSize: '12px',
                                                  marginLeft: '8px'
                                                }}>
                                                  ${alt.price}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Approval workflow for items that need validation */}
                              {needsApproval && !isApproved && (
                                <div style={{ 
                                  backgroundColor: '#FEF3C7', 
                                  border: '1px solid #F59E0B',
                                  borderRadius: '6px', 
                                  padding: '8px', 
                                  marginBottom: '8px' 
                                }}>
                                  <div style={{ fontSize: '12px', color: '#92400E', fontWeight: 'bold', marginBottom: '6px' }}>
                                    ⚠️ Please Review This Match
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <button
                                      onClick={() => {
                                        setItemApprovals(prev => ({ ...prev, [itemId]: true }));
                                        const newPending = new Set(pendingApprovals);
                                        newPending.delete(itemId);
                                        setPendingApprovals(newPending);
                                      }}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#059669',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      ✅ Approve Match
                                    </button>
                                    <button
                                      onClick={() => setShowingAlternatives(prev => ({ ...prev, [itemId]: !prev[itemId] }))}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#F59E0B',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      🔍 {showAlternatives ? 'Hide' : 'Show'} Alternatives
                                    </button>
                                  </div>
                                  
                                  {/* Alternative matches */}
                                  {showAlternatives && item.vendorSpecific?.alternativeMatches?.length > 0 && (
                                    <div style={{ 
                                      backgroundColor: 'white',
                                      border: '1px solid #E5E7EB',
                                      borderRadius: '4px',
                                      padding: '8px',
                                      marginTop: '8px'
                                    }}>
                                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                                        🔄 Alternative Product Options:
                                      </div>
                                      {item.vendorSpecific.alternativeMatches.map((alt, altIndex) => (
                                        <div key={altIndex} style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          padding: '8px',
                                          backgroundColor: '#F9FAFB',
                                          borderRadius: '6px',
                                          marginBottom: '6px',
                                          border: '1px solid #E5E7EB',
                                          fontSize: '11px'
                                        }}>
                                          {/* Alternative product image placeholder */}
                                          <div style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: '#E5E7EB',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '8px',
                                            fontSize: '16px',
                                            flexShrink: 0
                                          }}>
                                            🛒
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '2px' }}>
                                              {alt.name}
                                            </div>
                                            {alt.brand && (
                                              <div style={{ color: '#6B7280', fontSize: '10px', marginBottom: '1px' }}>
                                                Brand: {alt.brand}
                                              </div>
                                            )}
                                            {alt.size && (
                                              <div style={{ color: '#6B7280', fontSize: '10px', marginBottom: '2px' }}>
                                                Size: {alt.size}
                                              </div>
                                            )}
                                            <div style={{ color: alt.availability === 'in_stock' ? '#059669' : '#DC2626', fontSize: '10px' }}>
                                              {alt.availability === 'in_stock' ? '✅ In Stock' : 
                                               alt.availability === 'limited_stock' ? '⚠️ Limited Stock' : '❓ Check Availability'}
                                            </div>
                                          </div>
                                          <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#059669', marginBottom: '4px' }}>
                                              ${alt.price}
                                            </div>
                                            <button
                                              onClick={() => {
                                                // Switch to this alternative
                                                setItemApprovals(prev => ({ ...prev, [itemId]: true }));
                                                const newPending = new Set(pendingApprovals);
                                                newPending.delete(itemId);
                                                setPendingApprovals(newPending);
                                                // TODO: Update the main product with this alternative
                                                console.log('Selected alternative:', alt);
                                              }}
                                              style={{
                                                padding: '4px 8px',
                                                backgroundColor: '#3B82F6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                              }}
                                            >
                                              Choose This
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Approved indicator */}
                              {needsApproval && isApproved && (
                                <div style={{ 
                                  backgroundColor: '#D1FAE5', 
                                  color: '#059669',
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  marginBottom: '8px'
                                }}>
                                  ✅ Match Approved by User
                                </div>
                              )}

                            </div>
                          );
                        })}
                        
                        {/* Pending approvals summary */}
                        {resolutionResult.resolved.filter(item => item.vendorSpecific?.needsApproval && !itemApprovals[item.instacartProduct.id]).length > 0 && (
                          <div style={{ 
                            backgroundColor: '#FEF3C7', 
                            border: '2px solid #F59E0B',
                            borderRadius: '8px', 
                            padding: '12px', 
                            marginBottom: '12px',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#92400E', marginBottom: '6px' }}>
                              ⏳ {resolutionResult.resolved.filter(item => item.vendorSpecific?.needsApproval && !itemApprovals[item.instacartProduct.id]).length} items need your approval
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                              Please review the highlighted matches above before proceeding to checkout
                            </div>
                          </div>
                        )}
                        
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

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', height: '100%' }}>
                {/* Left Column - Cart Details */}
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FB4F14', marginBottom: '16px' }}>
                    Finalize Your Order
                  </h2>
                  <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                    Your items have been matched with {selectedStore?.name || 'vendor'} products. Review quantities and delivery details before checkout.
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
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FB4F14' }}>
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

                  {/* Cart Items - Vendor Products */}
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
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                            {selectedStore?.name || 'Vendor'} Products ({resolutionResult.resolved.length})
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                            Ready to add to your cart
                          </div>
                        </div>
                        <div style={{ fontSize: '24px' }}>
                          {selectedStore?.logo || '🛒'}
                        </div>
                      </div>
                      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {resolutionResult.resolved.map((item, index) => {
                          const quantity = productQuantities[item.instacartProduct.id] || item.originalItem.quantity || 1;
                          const price = parseFloat(item.instacartProduct.price) || 0;
                          const itemTotal = (price * quantity).toFixed(2);
                          
                          return (
                            <div key={index} style={{
                              padding: '16px',
                              borderBottom: index < resolutionResult.resolved.length - 1 ? '1px solid #F3F4F6' : 'none',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '16px'
                            }}>
                              {/* Product Image */}
                              <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #E5E7EB',
                                flexShrink: 0
                              }}>
                                {item.instacartProduct.image_url && item.instacartProduct.image_url !== '/placeholder-product.jpg' ? (
                                  <img 
                                    src={item.instacartProduct.image_url} 
                                    alt={item.instacartProduct.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  backgroundColor: '#F3F4F6',
                                  display: item.instacartProduct.image_url && item.instacartProduct.image_url !== '/placeholder-product.jpg' ? 'none' : 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '32px'
                                }}>
                                  🛒
                                </div>
                              </div>
                              
                              {/* Vendor Product Info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>
                                  {item.instacartProduct.name}
                                </div>
                                {item.instacartProduct.brand && (
                                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                                    <strong>Brand:</strong> {item.instacartProduct.brand}
                                  </div>
                                )}
                                {item.instacartProduct.size && (
                                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                                    <strong>Size:</strong> {item.instacartProduct.size}
                                  </div>
                                )}
                                <div style={{ fontSize: '12px', color: '#059669', marginBottom: '4px' }}>
                                  <strong>Status:</strong> {item.instacartProduct.availability === 'in_stock' ? '✅ In Stock' : 
                                   item.instacartProduct.availability === 'limited_stock' ? '⚠️ Limited Stock' : 
                                   item.instacartProduct.availability === 'out_of_stock' ? '❌ Out of Stock' : '🔍 Available'}
                                </div>
                                {item.instacartProduct.sku && (
                                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                    SKU: {item.instacartProduct.sku}
                                  </div>
                                )}
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
                              
                              {/* Quantity & Price Section */}
                              <div style={{ textAlign: 'right', minWidth: '140px' }}>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'flex-end', 
                                  gap: '12px',
                                  marginBottom: '4px'
                                }}>
                                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>
                                    Qty: {quantity}
                                    {item.resolvedDetails?.unit && item.resolvedDetails.unit !== 'each' && (
                                      <span style={{ fontSize: '9px', marginLeft: '4px' }}>
                                        ({item.resolvedDetails.measurement && item.resolvedDetails.measurement > 1 
                                          ? `${item.resolvedDetails.measurement} ${item.resolvedDetails.unit}` 
                                          : item.originalItem.unit || 'each'
                                        } ea)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FB4F14' }}>
                                    ${itemTotal}
                                  </div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                  ${price.toFixed(2)} per item
                                </div>
                                {item.instacartProduct.size && (
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                                    Size: {item.instacartProduct.size}
                                  </div>
                                )}
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
          <div style={{ display: 'flex', gap: '12px' }}>
            {(currentStep === 'match' || currentStep === 'complete') && (
              <button
                onClick={handleGoBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: 'white',
                  color: '#FB4F14',
                  border: '2px solid #FF6B35',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FF6B35';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#FF6B35';
                }}
              >
                <span style={{ fontSize: '16px' }}>←</span>
                {currentStep === 'match' ? 'Back to Store Selection' : 'Back to Product Matching'}
              </button>
            )}
            <button 
              onClick={onClose} 
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#FB4F14',
                border: '2px solid #FF6B35',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
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