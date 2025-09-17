import React, { useState, useEffect, useCallback, useRef } from 'react';
import imageService, { formatProductName } from '../utils/imageService';
import instacartService from '../services/instacartService';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// 🔍 DEBUG FUNCTIONS FOR TRACING FALLBACK ISSUES
const debugItemData = (item, context = '') => {
  console.log(`🔍 [${context}] DEBUGGING ITEM:`, {
    id: item.id,
    productName: item.productName || item.name,
    price: item.price,
    priceType: typeof item.price,
    hasPrice: !!item.price && item.price !== 0 && item.price !== '0.00',
    image: item.image,
    imageUrl: item.imageUrl,
    hasRealImage: !!item.image && !item.image.includes('data:image/svg'),
    brand: item.brand,
    sku: item.sku,
    productId: item.productId,
    instacartData: !!item.instacartData,
    enriched: !!item.enriched,
    allFields: Object.keys(item)
  });
};

const debugShoppingListState = (items, context = '') => {
  console.log(`🛒 [${context}] SHOPPING LIST STATE:`, {
    totalItems: items.length,
    itemsWithPrices: items.filter(item => item.price && item.price !== 0 && item.price !== '0.00').length,
    itemsWithRealImages: items.filter(item => item.image && !item.image.includes('data:image/svg')).length,
    itemsEnriched: items.filter(item => item.enriched || item.instacartData).length,
    priceRange: {
      min: Math.min(...items.map(item => parseFloat(item.price) || 0)),
      max: Math.max(...items.map(item => parseFloat(item.price) || 0))
    }
  });

  // Log first few items for detail
  items.slice(0, 3).forEach((item, index) => {
    debugItemData(item, `Item ${index + 1}`);
  });
};

const InstacartShoppingList = ({
  items = [],
  onItemsChange,
  onDeleteItem,
  onCheckout,
  onSaveList,
  onValidateItems,
  onShowPriceHistory,
  onChooseStore,
  userZipCode = '95670',
  selectedRetailer = 'kroger'
}) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [localItems, setLocalItems] = useState(items);
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState(selectedRetailer);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Store selector dropdown state
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isEditingZip, setIsEditingZip] = useState(false);
  const [currentZipCode, setCurrentZipCode] = useState(userZipCode);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Mobile device detection
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || window.innerWidth <= 768;


  // Sync local items with parent
  useEffect(() => {
    console.log('🔄 InstacartShoppingList received new items:', items.length);
    debugShoppingListState(items, 'Items Received from Parent');
    setLocalItems(items);
  }, [items]);

  // Load retailers based on user zip code
  const loadRetailers = useCallback(async () => {
    if (!userZipCode) return;

    setLoadingRetailers(true);
    try {
      console.log('🏪 Loading retailers for zip code:', userZipCode);
      const result = await instacartService.getNearbyRetailers(userZipCode);

      if (result.success && result.retailers) {
        // Sort retailers by estimated pricing (lowest prices first)
        const sortedRetailers = [...result.retailers].sort((a, b) => {
          // If retailers have pricing data, use it
          if (a.estimated_total && b.estimated_total) {
            return parseFloat(a.estimated_total) - parseFloat(b.estimated_total);
          }

          // If they have delivery fees, prioritize lower fees
          if (a.delivery_fee && b.delivery_fee) {
            return parseFloat(a.delivery_fee) - parseFloat(b.delivery_fee);
          }

          // Default order: prefer well-known low-cost retailers
          const lowCostRetailers = ['grocery-outlet', 'walmart', 'aldi', 'costco', 'sams-club'];
          const aRank = lowCostRetailers.findIndex(store =>
            (a.name || '').toLowerCase().includes(store.replace('-', ' ')) ||
            (a.retailer_key || '').includes(store)
          );
          const bRank = lowCostRetailers.findIndex(store =>
            (b.name || '').toLowerCase().includes(store.replace('-', ' ')) ||
            (b.retailer_key || '').includes(store)
          );

          // If both found in ranking, lower index = higher priority
          if (aRank !== -1 && bRank !== -1) {
            return aRank - bRank;
          }

          // If only one found in ranking, prioritize it
          if (aRank !== -1) return -1;
          if (bRank !== -1) return 1;

          // Fallback to alphabetical
          return (a.name || '').localeCompare(b.name || '');
        });

        setRetailers(sortedRetailers);
        console.log(`✅ Loaded ${sortedRetailers.length} retailers, sorted by lowest prices`);

        // Auto-select the first retailer (lowest-priced) if none is selected
        if (!selectedRetailerId && sortedRetailers.length > 0) {
          const defaultRetailer = sortedRetailers[0];
          const defaultRetailerId = defaultRetailer.id || defaultRetailer.retailer_key;
          setSelectedRetailerId(defaultRetailerId);
          console.log(`🎯 Auto-selected retailer: ${defaultRetailer.name} (${defaultRetailerId})`);
        }
      } else {
        console.warn('⚠️ No retailers found, using default');
        setRetailers([]);
      }
    } catch (error) {
      console.error('❌ Error loading retailers:', error);
      setRetailers([]);
    } finally {
      setLoadingRetailers(false);
    }
  }, [userZipCode, selectedRetailerId]);

  // Load retailers when component mounts or zip code changes
  useEffect(() => {
    loadRetailers();
  }, [loadRetailers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStoreDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle store selection
  const handleStoreSelect = (store) => {
    const storeId = store.retailer_key || store.id;
    setSelectedRetailerId(storeId);
    setIsStoreDropdownOpen(false);

    // Notify parent component of store selection
    if (onChooseStore) {
      onChooseStore(store);
    }

    console.log(`🏪 Store selected: ${store.name} (${storeId})`);
  };

  // Handle zip code update
  const handleZipSubmit = (e) => {
    e.preventDefault();
    setIsEditingZip(false);
    // Reload retailers for new zip code
    loadRetailers();
  };

  // Sync internal selectedRetailerId with selectedRetailer prop
  useEffect(() => {
    if (selectedRetailer && selectedRetailer !== selectedRetailerId) {
      setSelectedRetailerId(selectedRetailer);
      console.log(`🏪 Store selection synced: ${selectedRetailer}`);
    }
  }, [selectedRetailer, selectedRetailerId]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const total = localItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);

    const totalQuantity = localItems.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 1);
    }, 0);

    return { total, totalQuantity, itemCount: localItems.length };
  }, [localItems]);

  const { total, totalQuantity, itemCount } = calculateTotals();

  // Handle checkbox toggle
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    if (selectedItems.size === localItems.length) {
      // If all items are selected, deselect all
      setSelectedItems(new Set());
    } else {
      // Select all items
      setSelectedItems(new Set(localItems.map(item => item.id)));
    }
  };

  // Handle delete selected items
  const deleteSelectedItems = () => {
    console.log(`🗑️ Bulk deleting ${selectedItems.size} selected items`);

    const updatedItems = localItems.filter(item => !selectedItems.has(item.id));
    setLocalItems(updatedItems);
    setSelectedItems(new Set());

    // Always notify parent component of the change
    if (onItemsChange) {
      onItemsChange(updatedItems);
      console.log(`📤 Notified parent: ${updatedItems.length} items remaining after bulk delete`);
    }
  };

  // Handle delete single item
  const deleteSingleItem = (itemId) => {
    console.log(`🗑️ Deleting item: ${itemId}`);

    const updatedItems = localItems.filter(item => item.id !== itemId);
    setLocalItems(updatedItems);

    // Remove from selected items if it was selected
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });

    // Always notify parent component of the change
    if (onItemsChange) {
      onItemsChange(updatedItems);
      console.log(`📤 Notified parent: ${updatedItems.length} items remaining`);
    }

    // Also try parent-specific delete callback
    if (onDeleteItem) {
      onDeleteItem(itemId);
    }
  };

  // Calculate if all items are selected
  const allItemsSelected = localItems.length > 0 && selectedItems.size === localItems.length;
  const someItemsSelected = selectedItems.size > 0;

  // Handle quantity change
  const updateQuantity = (itemId, delta) => {
    const updatedItems = localItems.map(item => {
      if (item.id === itemId) {
        const currentQty = parseInt(item.quantity) || 1;
        const newQty = Math.max(1, currentQty + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });

    setLocalItems(updatedItems);
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Handle retailer selection
  const handleRetailerChange = (retailerId) => {
    console.log('🏪 Retailer changed to:', retailerId);
    setSelectedRetailerId(retailerId);
    // You can add a callback to notify parent component
    // if (onRetailerChange) onRetailerChange(retailerId);
  };

  // Calculate detailed pricing breakdown when store is selected
  const calculateDetailedPricing = useCallback(() => {
    const subtotal = total;
    const serviceFee = 3.99;
    const delivery = 5.99;
    const finalTotal = subtotal + serviceFee + delivery;

    return {
      subtotal,
      serviceFee,
      delivery,
      finalTotal,
      hasStoreSelected: retailers.length > 0 && selectedRetailerId
    };
  }, [total, retailers.length, selectedRetailerId]);

  const pricing = calculateDetailedPricing();

  // Handle direct quantity input
  const setQuantity = (itemId, value) => {
    const qty = parseInt(value) || 1;
    const updatedItems = localItems.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, qty) };
      }
      return item;
    });

    setLocalItems(updatedItems);
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Get category from item
  const getCategory = (item) => {
    return item.category || 'Other';
  };

  // Get product image using the centralized image service
  const getProductImage = (item) => {
    return imageService.getProductImage(item, { width: 64, height: 64 });
  };

  // Get confidence value and level for display
  const getConfidenceDisplay = (item) => {
    if (typeof item.confidence === 'number') {
      return {
        value: Math.round(item.confidence * 100),
        level: item.confidence > 0.8 ? 'high' : item.confidence > 0.5 ? 'medium' : 'low'
      };
    }

    const confidenceMap = {
      'high': { value: 95, level: 'high' },
      'medium': { value: 70, level: 'medium' },
      'low': { value: 45, level: 'low' }
    };

    return confidenceMap[item.confidence] || { value: 70, level: 'medium' };
  };

  // Format the unit display for the orange badge
  const formatUnitDisplay = (item) => {
    const quantity = item.unitCount || item.quantity || 1;
    const unit = item.unit || item.size || item.package_size || 'each';

    // If unit is "each", don't display it
    if (unit === 'each') {
      return `${quantity} item${quantity > 1 ? 's' : ''}`;
    }

    // Format as "quantity-unit" (e.g., "1-16 oz bag", "3-cups")
    return `${quantity}-${unit}`;
  };

  // Get current retailer info and logo
  const getCurrentRetailer = () => {
    if (retailers.length > 0 && selectedRetailerId) {
      return retailers.find(r => (r.retailer_key || r.id) === selectedRetailerId);
    }
    return null;
  };

  const currentRetailer = getCurrentRetailer();
  const retailerLogo = currentRetailer?.retailer_logo_url || currentRetailer?.logo_url;
  const retailerName = currentRetailer?.name;

  // Sort items
  const sortedItems = [...localItems].sort((a, b) => {
    switch(sortBy) {
      case 'confidence':
        return (b.confidence || 0) - (a.confidence || 0);
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'alphabetical':
        return formatProductName(a.productName || '').localeCompare(formatProductName(b.productName || ''));
      case 'category':
        return getCategory(a).localeCompare(getCategory(b));
      default:
        return 0;
    }
  });

  // Filter items
  const filteredItems = sortedItems.filter(item => {
    if (filterBy === 'all') return true;
    if (filterBy === 'ingredients') {
      // Show items that are typically cooking ingredients
      const category = getCategory(item).toLowerCase();
      const ingredientCategories = ['pantry', 'spices', 'oils', 'seasonings', 'baking', 'condiments'];
      return ingredientCategories.some(cat => category.includes(cat));
    }
    return getCategory(item).toLowerCase() === filterBy.toLowerCase();
  });

  return (
    <div style={{
      padding: isMobile ? '12px 8px' : '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Modern Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '24px'
      }}>
        {/* Top Navy Header Bar */}
        <div style={{
          backgroundColor: '#002244',
          padding: isMobile ? '16px 12px' : '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Left: Title and Store Selector */}
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '24px',
            flex: '1 1 auto',
            width: isMobile ? '100%' : 'auto'
          }}>
            {/* Title with Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 18C5.9 18 5.01 18.9 5.01 20S5.9 22 7 22 9 21.1 9 20 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5H18.31L15.55 11H8.53L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20S15.9 22 17 22 19 21.1 19 20 18.1 18 17 18Z"
                    fill="white"
                  />
                </svg>
              </div>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '600',
                color: 'white'
              }}>
                Shopping List
              </h1>
            </div>

            {/* Store Selector with Dropdown */}
            <div style={{
              position: 'relative',
              minWidth: isMobile ? '100%' : '250px',
              width: isMobile ? '100%' : 'auto',
              zIndex: 99999,
              overflow: 'visible'
            }} ref={dropdownRef}>
              <button
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 16px',
                  backgroundColor: 'white',
                  border: '2px solid transparent',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#002244',
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {retailerLogo ? (
                  <img
                    src={retailerLogo}
                    alt={retailerName || "Store"}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '16px' }}>🏬</span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600' }}>
                    {retailerName || 'Choose Your Store'}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#666',
                    lineHeight: '1.2'
                  }}>
                    Service: ${currentRetailer?.service_fee?.toFixed(2) || '3.99'} •
                    Delivery: ${currentRetailer?.delivery_fee?.toFixed(2) || '5.99'}
                  </span>
                </div>
              </button>

              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: `translateY(-50%) ${isStoreDropdownOpen ? 'rotate(180deg)' : ''}`,
                transition: 'transform 0.2s',
                pointerEvents: 'none',
                color: '#002244'
              }}>
                ▼
              </div>

              {/* Dropdown Menu */}
              {isStoreDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'white',
                  border: '2px solid #002244',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 999999,
                  minWidth: '380px',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#002244'
                    }}>
                      Choose Your Store
                    </h3>

                    {/* ZIP Code Input */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>📍</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>Delivery Location (ZIP Code):</span>
                      {isEditingZip ? (
                        <form onSubmit={handleZipSubmit} style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            value={currentZipCode}
                            onChange={(e) => setCurrentZipCode(e.target.value)}
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              border: '1px solid #FB4F14',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                            autoFocus
                            maxLength="5"
                          />
                          <button
                            type="submit"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#FB4F14',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Go
                          </button>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#002244' }}>
                            {currentZipCode}
                          </span>
                          <button
                            onClick={() => setIsEditingZip(true)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#FB4F14',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Store List */}
                  <div style={{ padding: '8px' }}>
                    {retailers.length > 0 ? retailers.map(store => (
                      <div
                        key={store.retailer_key || store.id}
                        onClick={() => handleStoreSelect(store)}
                        style={{
                          padding: '12px',
                          marginBottom: '8px',
                          border: selectedRetailerId === (store.retailer_key || store.id) ? '2px solid #FB4F14' : '1px solid #e0e0e0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: selectedRetailerId === (store.retailer_key || store.id) ? '#FFF5F2' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          {/* Radio Button */}
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `2px solid ${selectedRetailerId === (store.retailer_key || store.id) ? '#FB4F14' : '#d0d0d0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            flexShrink: 0
                          }}>
                            {selectedRetailerId === (store.retailer_key || store.id) && (
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: '#FB4F14'
                              }} />
                            )}
                          </div>

                          {/* Store Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <img
                                src={store.retailer_logo_url || store.logo_url}
                                alt={store.name}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'inline';
                                }}
                              />
                              <span style={{ fontSize: '16px', display: 'none' }}>🏪</span>
                              <span style={{ fontSize: '16px', fontWeight: '600', color: '#002244' }}>
                                {store.name}
                              </span>
                            </div>

                            {/* Distance and Time */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginBottom: '4px'
                            }}>
                              <span style={{ fontSize: '13px', color: '#FB4F14' }}>
                                📍 {store.distance || 'N/A'}
                              </span>
                              <span style={{ fontSize: '13px', color: '#666' }}>
                                🚚 {store.delivery_time || 'Same day'}
                              </span>
                            </div>

                            {/* Address */}
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                              {store.address || 'Address not available'}
                            </div>
                          </div>

                          {/* Pricing Box */}
                          <div style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            padding: '8px',
                            minWidth: '120px',
                            border: '1px solid #e0e0e0'
                          }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>Subtotal:</span>
                                <span>${total.toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>Service:</span>
                                <span>$3.99</span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingBottom: '4px',
                                borderBottom: '1px solid #d0d0d0'
                              }}>
                                <span>Delivery:</span>
                                <span>${store.delivery_fee || '5.99'}</span>
                              </div>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '14px',
                              fontWeight: '700',
                              color: '#002244',
                              marginTop: '4px'
                            }}>
                              <span>Total:</span>
                              <span style={{ color: '#FB4F14' }}>${(total + 3.99 + parseFloat(store.delivery_fee || 5.99)).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        {loadingRetailers ? 'Loading stores...' : 'No stores found for this location'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Total */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '12px 20px',
            minWidth: '200px',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#666',
              fontWeight: '600',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              ORDER TOTAL
            </div>

            {/* Subtotal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '4px',
              color: '#002244'
            }}>
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Service Fee */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '4px',
              color: '#002244'
            }}>
              <span>Service Fee:</span>
              <span>${currentRetailer?.service_fee?.toFixed(2) || '3.99'}</span>
            </div>

            {/* Delivery Fee */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '8px',
              color: '#002244'
            }}>
              <span>Delivery:</span>
              <span>${currentRetailer?.delivery_fee?.toFixed(2) || '5.99'}</span>
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: '700',
              color: '#FB4F14',
              paddingTop: '8px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <span>Total:</span>
              <span>${(total + parseFloat(currentRetailer?.service_fee || 3.99) + parseFloat(currentRetailer?.delivery_fee || 5.99)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Streamlined Filter Bar */}
        <div style={filterBarStyles.container}>
          {/* Main controls in one line */}
          <div style={filterBarStyles.mainControls}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={filterBarStyles.filterToggle}
            >
              <span style={filterBarStyles.filterText}>
                {filterBy === 'all' ? 'All Items' :
                 filterBy === 'ingredients' ? 'Ingredients' :
                 filterBy === 'pantry' ? 'Pantry' :
                 filterBy === 'produce' ? 'Produce' : 'Dairy'}
              </span>
              <span style={filterBarStyles.badge}>{filteredItems.length}</span>
              <span style={{
                ...filterBarStyles.dropdownArrow,
                transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>▼</span>
            </button>

            <div style={filterBarStyles.rightControls}>
              <button
                onClick={() => {
                  if (allItemsSelected) {
                    setSelectedItems(new Set());
                  } else {
                    setSelectedItems(new Set(filteredItems.map(item => item.id)));
                  }
                }}
                style={{
                  ...filterBarStyles.iconBtn,
                  backgroundColor: allItemsSelected ? '#FB4F14' : 'white',
                  color: allItemsSelected ? 'white' : '#002244'
                }}
                title={allItemsSelected ? "Deselect All" : "Select All"}
              >
                ✓
              </button>

              {someItemsSelected && (
                <button
                  onClick={deleteSelectedItems}
                  style={{
                    ...filterBarStyles.iconBtn,
                    backgroundColor: '#F44336',
                    color: 'white'
                  }}
                  title={`Delete ${selectedItems.size} selected items`}
                >
                  🗑️
                </button>
              )}

              <button
                onClick={() => onValidateItems && onValidateItems(filteredItems)}
                style={filterBarStyles.iconBtn}
                title="Validate Items"
              >
                ↗
              </button>
            </div>
          </div>

          {/* Advanced filters dropdown */}
          {showAdvancedFilters && (
            <div style={filterBarStyles.filterDropdown}>
              <div style={filterBarStyles.dropdownSection}>
                <label style={filterBarStyles.dropdownLabel}>Category:</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  style={filterBarStyles.sortSelect}
                >
                  <option value="all">All Items</option>
                  <option value="ingredients">Ingredients</option>
                  <option value="pantry">Pantry</option>
                  <option value="produce">Produce</option>
                  <option value="dairy">Dairy</option>
                </select>
              </div>

              <div style={filterBarStyles.dropdownSection}>
                <label style={filterBarStyles.dropdownLabel}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={filterBarStyles.sortSelect}
                >
                  <option value="confidence">High to Low Confidence</option>
                  <option value="price">Price (Low to High)</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
          )}

          {/* Selected items banner */}
          {someItemsSelected && (
            <div style={filterBarStyles.selectedBanner}>
              <span style={filterBarStyles.selectedText}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => onSaveList && onSaveList()}
                style={filterBarStyles.saveBtn}
                title="Save selected items to grocery list"
              >
                💾 Save Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shopping List Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,2,68,0.12)',
        border: '2px solid #002244'
      }}>
        {/* Table Header */}
        <div style={{
          background: '#002244',
          color: 'white',
          display: isMobile ? 'none' : 'grid',
          gridTemplateColumns: '60px 1fr 120px 120px 50px',
          padding: '16px 20px',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                border: allItemsSelected ? 'none' : '2px solid white',
                borderRadius: '4px',
                cursor: 'pointer',
                background: allItemsSelected ? '#FB4F14' : (someItemsSelected ? '#FB4F14' : 'transparent'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px'
              }}
              onClick={toggleSelectAll}
            >
              {allItemsSelected ? '✓' : (someItemsSelected ? '−' : '')}
            </div>
          </div>
          <div>PRODUCT NAME</div>
          <div style={{ textAlign: 'center' }}>QTY</div>
          <div style={{ textAlign: 'right' }}>PRICE</div>
          <div></div>
        </div>

        {/* List Items */}
        {filteredItems.map((item) => {
          const confidence = getConfidenceDisplay(item);
          const isChecked = selectedItems.has(item.id);

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                backgroundColor: isChecked ? '#FFF5F2' : 'white',
                borderBottom: '1px solid #E5E5E5',
                borderLeft: isChecked ? '3px solid #FB4F14' : 'none',
                alignItems: 'flex-start'
              }}
            >
              {/* Left: Checkbox */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItemSelection(item.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '20px', // Align with product image center
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
              />

              {/* Center: Product Info */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Top Row: Image and Details */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <img
                    src={getProductImage(item)}
                    alt={item.productName || item.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      backgroundColor: '#F5F5F5',
                      flexShrink: 0
                    }}
                  />
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#002244',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {formatProductName(item.productName || item.name || 'Unknown Item')}
                      <span style={{
                        fontSize: '12px',
                        color: '#FB4F14',
                        fontWeight: '500',
                        backgroundColor: '#FFF5F2',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {confidence.value}% match
                      </span>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      {getCategory(item)} • {item.brand ? formatProductName(item.brand) : 'Generic'}
                    </div>
                    {formatUnitDisplay(item) && (
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#FB4F14',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginTop: '4px',
                        width: 'fit-content'
                      }}>
                        {formatUnitDisplay(item)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Quantity and Price */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8px',
                    padding: '2px'
                  }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#002244',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      value={item.quantity || 1}
                      onChange={(e) => setQuantity(item.id, e.target.value)}
                      style={{
                        minWidth: '40px',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#002244',
                        border: 'none',
                        backgroundColor: 'transparent',
                        padding: '4px'
                      }}
                    />
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#002244',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onShowPriceHistory && onShowPriceHistory(item);
                      }}
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#002244',
                        cursor: 'pointer'
                      }}
                      title="Click to see price comparison from all vendors"
                    >
                      ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} 📊
                    </div>
                    <button
                      onClick={() => deleteSingleItem(item.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '2px solid #E0E0E0',
                        background: 'white',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FFF0F0';
                        e.currentTarget.style.borderColor = '#D32F2F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#E0E0E0';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '12px 8px',
        backgroundColor: 'white',
        border: '2px solid #002244',
        borderRadius: '12px',
        margin: '12px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,2,68,0.12)'
      }}>
        <div style={{
          flex: '1',
          textAlign: 'center',
          minWidth: 0,
          padding: '0 4px'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FB4F14',
            marginBottom: '2px'
          }}>
            {itemCount}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Items
          </div>
        </div>

        <div style={{
          width: '1px',
          height: '30px',
          backgroundColor: '#E0E0E0',
          flexShrink: 0
        }} />

        <div style={{
          flex: '1',
          textAlign: 'center',
          minWidth: 0,
          padding: '0 4px'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FB4F14',
            marginBottom: '2px'
          }}>
            {selectedItems.size}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Selected
          </div>
        </div>

        <div style={{
          width: '1px',
          height: '30px',
          backgroundColor: '#E0E0E0',
          flexShrink: 0
        }} />

        <div style={{
          flex: '1',
          textAlign: 'center',
          minWidth: 0,
          padding: '0 4px'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FB4F14',
            marginBottom: '2px'
          }}>
            {totalQuantity}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Quantity
          </div>
        </div>

        <div style={{
          width: '1px',
          height: '30px',
          backgroundColor: '#E0E0E0',
          flexShrink: 0
        }} />

        <div style={{
          flex: '1',
          textAlign: 'center',
          minWidth: 0,
          padding: '0 4px'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#FB4F14',
            marginBottom: '2px'
          }}>
            {Math.round((itemCount > 0 ? (selectedItems.size / itemCount) * 100 : 0))}%
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Selected
          </div>
        </div>
      </div>
    </div>
  );
};

const filterBarStyles = {
  container: {
    backgroundColor: 'white',
    border: '2px solid #002244',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,2,68,0.08)'
  },
  mainControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '40px'
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#F0F4F8',
    border: '1px solid #E0E7FF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#002244',
    transition: 'all 0.2s',
    minHeight: '40px'
  },
  filterText: {
    fontWeight: '600'
  },
  badge: {
    backgroundColor: '#FB4F14',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    minWidth: '20px',
    textAlign: 'center'
  },
  dropdownArrow: {
    fontSize: '10px',
    transition: 'transform 0.2s',
    color: '#6B7280'
  },
  rightControls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    border: '2px solid #E0E7FF',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#002244',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  filterDropdown: {
    backgroundColor: '#F8F9FA',
    border: '1px solid #E0E7FF',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  dropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '140px'
  },
  dropdownLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#002244',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sortSelect: {
    padding: '6px 8px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#002244'
  },
  selectedBanner: {
    backgroundColor: '#FFF3E0',
    border: '1px solid #FFB74D',
    borderRadius: '8px',
    padding: '8px 12px',
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectedText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#E65100'
  },
  saveBtn: {
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

export default InstacartShoppingList;