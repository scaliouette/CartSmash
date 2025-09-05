// client/src/components/InstacartCheckoutFlow.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, MapPin, Store, AlertCircle, CheckCircle, Loader2, ExternalLink, Search, Package, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const InstacartCheckoutFlow = ({ currentCart, onClose }) => {
  const { currentUser } = useAuth();
  
  // Main state
  const [currentStep, setCurrentStep] = useState('retailer');
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [zipCode, setZipCode] = useState('');
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [lowConfidenceItems, setLowConfidenceItems] = useState([]);
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState(null);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [retailers, setRetailers] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});

  // API URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Load from localStorage first
        const savedPrefs = localStorage.getItem(`cartsmash-instacart-prefs-${currentUser?.uid || 'guest'}`);
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          setUserPreferences(prefs);
          if (prefs.zipCode) setZipCode(prefs.zipCode);
          if (prefs.preferredRetailer) setSelectedRetailer(prefs.preferredRetailer);
        }

        // Load available retailers for the user's location
        if (currentUser) {
          const response = await fetch(`${API_URL}/api/instacart/retailers`, {
            headers: {
              'Authorization': `Bearer ${currentUser.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setRetailers(data.retailers || []);
          }
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
        // Fallback to default retailers
        setRetailers([
          { id: 'safeway', name: 'Safeway', logo: '🏪', estimatedDelivery: '2 hours' },
          { id: 'whole_foods', name: 'Whole Foods', logo: '🥬', estimatedDelivery: '1-2 hours' },
          { id: 'costco', name: 'Costco', logo: '📦', estimatedDelivery: 'Same day' },
          { id: 'kroger', name: 'Kroger', logo: '🛒', estimatedDelivery: '2-3 hours' },
          { id: 'target', name: 'Target', logo: '🎯', estimatedDelivery: '2 hours' }
        ]);
      }
    };

    loadUserPreferences();
  }, [currentUser, API_URL]);

  // Save user preferences
  const saveUserPreferences = useCallback((prefs) => {
    const updatedPrefs = { ...userPreferences, ...prefs };
    setUserPreferences(updatedPrefs);
    localStorage.setItem(
      `cartsmash-instacart-prefs-${currentUser?.uid || 'guest'}`, 
      JSON.stringify(updatedPrefs)
    );
  }, [userPreferences, currentUser]);

  // Search products using real API
  const searchProducts = async (cartItem, retailerId) => {
    try {
      const response = await fetch(`${API_URL}/api/instacart/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser && { 'Authorization': `Bearer ${currentUser.accessToken}` })
        },
        body: JSON.stringify({
          query: `${cartItem.productName} ${cartItem.unit}`,
          retailerId,
          zipCode,
          quantity: cartItem.quantity,
          category: cartItem.category,
          originalItem: cartItem
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  };

  // Process all cart items and match products
  const processItemMatching = async () => {
    setCurrentStep('matching');
    setIsProcessing(true);
    setError(null);
    
    try {
      const matched = [];
      const needsConfirmation = [];
      let runningTotal = 0;
      
      // Process each cart item
      for (const cartItem of currentCart) {
        console.log(`🔍 Searching for: ${cartItem.productName} (${cartItem.quantity} ${cartItem.unit})`);
        
        const matches = await searchProducts(cartItem, selectedRetailer.id);
        
        if (matches.length > 0) {
          const bestMatch = matches[0];
          
          if (bestMatch.confidence >= 0.7) {
            // High confidence - auto-match
            const matchedItem = {
              cartItem,
              product: bestMatch,
              autoMatched: true
            };
            matched.push(matchedItem);
            runningTotal += bestMatch.price * cartItem.quantity;
            
            console.log(`✅ Auto-matched: ${cartItem.productName} → ${bestMatch.name} (${Math.round(bestMatch.confidence * 100)}% confidence)`);
          } else {
            // Low confidence - needs user confirmation
            needsConfirmation.push({
              cartItem,
              candidates: matches.slice(0, 3) // Top 3 matches
            });
            
            console.log(`⚠️ Needs confirmation: ${cartItem.productName} (${Math.round(matches[0].confidence * 100)}% confidence)`);
          }
        } else {
          // No matches found
          needsConfirmation.push({
            cartItem,
            candidates: []
          });
          
          console.log(`❌ No matches found for: ${cartItem.productName}`);
        }
      }
      
      setMatchedProducts(matched);
      setLowConfidenceItems(needsConfirmation);
      setEstimatedTotal(runningTotal);
      
      console.log(`📊 Matching complete: ${matched.length} auto-matched, ${needsConfirmation.length} need confirmation`);
      
      // Move to confirmation step if needed, otherwise create cart
      if (needsConfirmation.length > 0) {
        setCurrentStep('confirming');
        setCurrentConfirmIndex(0);
      } else {
        await createInstacartCart(matched);
      }
    } catch (err) {
      setError('Failed to match products. Please try again.');
      console.error('Product matching error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user confirmation of low-confidence matches
  const confirmProduct = (product) => {
    const currentItem = lowConfidenceItems[currentConfirmIndex];
    const newMatch = {
      cartItem: currentItem.cartItem,
      product: product,
      userConfirmed: true
    };
    
    const updatedMatched = [...matchedProducts, newMatch];
    setMatchedProducts(updatedMatched);
    setEstimatedTotal(prev => prev + (product.price * currentItem.cartItem.quantity));
    
    console.log(`✅ User confirmed: ${currentItem.cartItem.productName} → ${product.name}`);
    
    // Move to next item or complete
    if (currentConfirmIndex < lowConfidenceItems.length - 1) {
      setCurrentConfirmIndex(currentConfirmIndex + 1);
    } else {
      // All items confirmed, create cart
      createInstacartCart(updatedMatched);
    }
  };

  // Skip item (remove from cart)
  const skipItem = () => {
    const currentItem = lowConfidenceItems[currentConfirmIndex];
    console.log(`⏭️ User skipped: ${currentItem.cartItem.productName}`);
    
    if (currentConfirmIndex < lowConfidenceItems.length - 1) {
      setCurrentConfirmIndex(currentConfirmIndex + 1);
    } else {
      // All items processed, create cart
      createInstacartCart(matchedProducts);
    }
  };

  // Create Instacart cart via real API
  const createInstacartCart = async (finalMatches) => {
    setCurrentStep('creating');
    setIsProcessing(true);
    
    try {
      console.log(`🛒 Creating Instacart cart with ${finalMatches.length} items`);
      
      // Prepare cart items for API
      const cartItemsForAPI = finalMatches.map(match => ({
        retailer_sku: match.product.sku || match.product.id,
        quantity: match.cartItem.quantity,
        price: match.product.price,
        product_name: match.product.name,
        original_item: {
          name: match.cartItem.productName,
          category: match.cartItem.category,
          confidence: match.product.confidence
        }
      }));
      
      const response = await fetch(`${API_URL}/api/instacart/cart/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser && { 'Authorization': `Bearer ${currentUser.accessToken}` })
        },
        body: JSON.stringify({
          retailerId: selectedRetailer.id,
          zipCode,
          items: cartItemsForAPI,
          userId: currentUser?.uid,
          metadata: {
            source: 'CartSmash',
            totalItems: finalMatches.length,
            estimatedTotal: estimatedTotal
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Cart creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setCurrentStep('complete');
        
        console.log(`✅ Cart created successfully: ${data.cartId}`);
        
        // Save successful integration for future use
        saveUserPreferences({
          lastSuccessfulRetailer: selectedRetailer,
          lastOrderDate: new Date().toISOString()
        });
      } else {
        throw new Error(data.error || 'Failed to create cart');
      }
    } catch (err) {
      setError('Failed to create Instacart cart. Please try again.');
      console.error('Cart creation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle retailer selection and continue
  const handleRetailerContinue = () => {
    if (!selectedRetailer || !zipCode || zipCode.length !== 5) {
      setError('Please select a retailer and enter a valid ZIP code');
      return;
    }

    if (!currentCart || currentCart.length === 0) {
      setError('Your cart is empty. Please add items before continuing.');
      return;
    }

    setError(null);
    
    // Save preferences
    saveUserPreferences({
      zipCode,
      preferredRetailer: selectedRetailer
    });
    
    processItemMatching();
  };

  // Close modal
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Render different steps
  const renderRetailerSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Store</h2>
        <p className="text-gray-600">Select where you'd like to shop and have your groceries delivered from</p>
      </div>

      {/* ZIP Code Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery ZIP Code
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            maxLength="5"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter ZIP code"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Retailer Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Available Stores
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {retailers.map(retailer => (
            <button
              key={retailer.id}
              onClick={() => setSelectedRetailer(retailer)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedRetailer?.id === retailer.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{retailer.logo}</div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">{retailer.name}</div>
                  <div className="text-sm text-gray-500">{retailer.estimatedDelivery}</div>
                </div>
                {selectedRetailer?.id === retailer.id && (
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-900">Your Cart Items</span>
          <span className="text-sm text-gray-500">{currentCart?.length || 0} items</span>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {(currentCart || []).slice(0, 5).map(item => (
            <div key={item.id} className="text-sm text-gray-600 flex justify-between">
              <span>• {item.productName}</span>
              <span className="text-gray-400">{item.quantity} {item.unit}</span>
            </div>
          ))}
          {currentCart && currentCart.length > 5 && (
            <div className="text-sm text-gray-400">
              and {currentCart.length - 5} more items...
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <button
        onClick={handleRetailerContinue}
        disabled={!currentCart || currentCart.length === 0}
        className="w-full py-3 px-6 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Continue to Match Products
      </button>
    </div>
  );

  const renderMatching = () => (
    <div className="text-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Matching Your Items</h2>
        <p className="text-gray-600">
          Finding the best products at {selectedRetailer?.name}...
        </p>
      </div>
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-200 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => {
    const currentItem = lowConfidenceItems[currentConfirmIndex];
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Product Match</h2>
          <p className="text-gray-600">
            Help us find the right product for "{currentItem.cartItem.productName}"
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <span className="text-sm text-gray-600">
            Item {currentConfirmIndex + 1} of {lowConfidenceItems.length}
          </span>
          <div className="flex space-x-1">
            {lowConfidenceItems.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx <= currentConfirmIndex ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Product options */}
        {currentItem.candidates.length > 0 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select the correct product:
            </label>
            {currentItem.candidates.map(product => (
              <button
                key={product.id}
                onClick={() => confirmProduct(product)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-lg font-semibold text-orange-600">
                      ${product.price?.toFixed(2) || 'N/A'}
                    </div>
                    {product.size && (
                      <div className="text-sm text-gray-500">{product.size}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {Math.round((product.confidence || 0) * 100)}% match
                  </div>
                </div>
              </button>
            ))}
            
            <button
              onClick={skipItem}
              className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip this item
            </button>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  No matches found for this item at {selectedRetailer?.name}.
                </p>
                <button
                  onClick={skipItem}
                  className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-900"
                >
                  Skip and continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCreating = () => (
    <div className="text-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating Your Instacart Cart</h2>
        <p className="text-gray-600">
          Adding {matchedProducts.length} items to your cart at {selectedRetailer?.name}...
        </p>
      </div>
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-200 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: '90%' }} />
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cart Ready!</h2>
        <p className="text-gray-600">
          Your cart has been created with {matchedProducts.length} items
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-900">Order Summary</span>
          <span className="text-sm text-gray-500">{selectedRetailer?.name}</span>
        </div>
        
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {matchedProducts.map((match, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div className="flex items-start space-x-2 flex-1">
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  {match.product.image ? (
                    <img src={match.product.image} alt={match.product.name} className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-gray-900">{match.product.name}</div>
                  <div className="text-gray-500">Qty: {match.cartItem.quantity}</div>
                </div>
              </div>
              <div className="text-gray-900 font-medium">
                ${((match.product.price || 0) * match.cartItem.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-3">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Estimated Total</span>
            <span className="text-xl font-bold text-gray-900">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            *Final price will be calculated at checkout with taxes and fees
          </p>
        </div>
      </div>

      {/* Matched items breakdown */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Package className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">Matching Summary</p>
            <p className="text-blue-700">
              ✓ {matchedProducts.filter(m => m.autoMatched).length} items auto-matched
              {matchedProducts.filter(m => m.userConfirmed).length > 0 && (
                <><br />✓ {matchedProducts.filter(m => m.userConfirmed).length} items confirmed by you</>
              )}
              {(currentCart?.length || 0) - matchedProducts.length > 0 && (
                <><br />✗ {(currentCart?.length || 0) - matchedProducts.length} items skipped</>
              )}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.open(checkoutUrl, '_blank')}
        className="w-full py-4 px-6 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
      >
        <span>Continue to Instacart Checkout</span>
        <ExternalLink className="w-5 h-5" />
      </button>
      
      <p className="text-center text-sm text-gray-500">
        You'll be redirected to Instacart to complete your purchase
      </p>
    </div>
  );

  // Main render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="text-white p-6 relative" style={{background: 'linear-gradient(135deg, #002244, #FB4F14)'}}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <ShoppingCart className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">CartSmash Checkout</h1>
              <p className="text-orange-100">Powered by CartSmash + Instacart</p>
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
          <div className={`flex items-center space-x-2 ${currentStep === 'retailer' ? 'text-orange-600' : 'text-gray-400'}`}>
            <Store className="w-5 h-5" />
            <span className="text-sm font-medium">Select Store</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-1 transition-all duration-500 ${
              currentStep !== 'retailer' ? 'bg-orange-500' : 'bg-gray-200'
            }`} style={{ width: currentStep !== 'retailer' ? '100%' : '0%' }} />
          </div>
          <div className={`flex items-center space-x-2 ${
            ['matching', 'confirming'].includes(currentStep) ? 'text-orange-600' : 'text-gray-400'
          }`}>
            <Search className="w-5 h-5" />
            <span className="text-sm font-medium">Match Items</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-1 transition-all duration-500 ${
              ['creating', 'complete'].includes(currentStep) ? 'bg-orange-500' : 'bg-gray-200'
            }`} style={{ width: ['creating', 'complete'].includes(currentStep) ? '100%' : '0%' }} />
          </div>
          <div className={`flex items-center space-x-2 ${
            currentStep === 'complete' ? 'text-orange-600' : 'text-gray-400'
          }`}>
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Complete</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 'retailer' && renderRetailerSelection()}
          {currentStep === 'matching' && renderMatching()}
          {currentStep === 'confirming' && renderConfirmation()}
          {currentStep === 'creating' && renderCreating()}
          {currentStep === 'complete' && renderComplete()}
        </div>
      </div>
    </div>
  );
};

export default InstacartCheckoutFlow;