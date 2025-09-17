import React, { useState, useEffect, useCallback, useRef } from 'react';
import imageService, { formatProductName } from '../utils/imageService';
import instacartService from '../services/instacartService';

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

  // Store selector dropdown state
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isEditingZip, setIsEditingZip] = useState(false);
  const [currentZipCode, setCurrentZipCode] = useState(userZipCode);
  const dropdownRef = useRef(null);

  const stores = [
    { value: 'grocery-outlet', label: 'Grocery Outlet' },
    { value: 'kroger', label: 'Kroger' },
    { value: 'safeway', label: 'Safeway' },
    { value: 'whole-foods', label: 'Whole Foods' },
    { value: 'trader-joes', label: "Trader Joe's" },
    { value: 'target', label: 'Target' },
    { value: 'walmart', label: 'Walmart' },
    { value: 'costco', label: 'Costco' }
  ];

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

        // Auto-select the lowest-priced retailer (first in sorted list)
        if (!selectedRetailerId && sortedRetailers.length > 0) {
          const defaultRetailer = sortedRetailers[0];
          const defaultRetailerId = defaultRetailer.id || defaultRetailer.retailer_key;
          setSelectedRetailerId(defaultRetailerId);
          console.log(`🎯 Auto-selected lowest-price retailer: ${defaultRetailer.name} (${defaultRetailerId})`);
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
    setSelectedRetailerId(store.retailer_key || store.id);
    setIsStoreDropdownOpen(false);
    if (onChooseStore) {
      onChooseStore();
    }
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
    const updatedItems = localItems.filter(item => !selectedItems.has(item.id));
    setLocalItems(updatedItems);
    setSelectedItems(new Set());
    if (onItemsChange) {
      onItemsChange(updatedItems);
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
      return retailers.find(r => r.retailer_key === selectedRetailerId);
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
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Modern Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '24px'
      }}>
        {/* Top Navy Header Bar */}
        <div style={{
          backgroundColor: '#002244',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Left: Title and Store Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flex: '1 1 auto'
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
              minWidth: '250px'
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
                <span>{retailerName || 'Choose Your Store'}</span>
                <span style={{
                  marginLeft: 'auto',
                  marginRight: '20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#FB4F14'
                }}>
                  ${total.toFixed(2)}
                </span>
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
                  zIndex: 1000,
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '20px',
              fontWeight: '700',
              color: '#FB4F14'
            }}>
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {someItemsSelected && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#FFF3E0',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #FFB74D'
            }}>
              <span style={{ fontSize: '14px', color: '#E65100', fontWeight: '600' }}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <button
                style={{
                  background: '#F44336',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={deleteSelectedItems}
              >
                🗑️ 
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#002244', fontWeight: '600' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 36px 8px 12px',
                border: '2px solid #002244',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                fontWeight: '500',
                color: '#002244'
              }}
            >
              <option value="confidence">Confidence (High to Low)</option>
              <option value="price">Price (Low to High)</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#002244', fontWeight: '600' }}>List Option:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              style={{
                padding: '8px 36px 8px 12px',
                border: '2px solid #002244',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                fontWeight: '500',
                color: '#002244'
              }}
            >
              <option value="all" style={{ color: '#002244' }}>All Items</option>
              <option value="ingredients" style={{ color: '#002244' }}>Ingredients</option>
              <option value="pantry" style={{ color: '#002244' }}>Pantry</option>
              <option value="produce" style={{ color: '#002244' }}>Produce</option>
              <option value="dairy" style={{ color: '#002244' }}>Dairy</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
            <button
              style={{
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                border: '2px solid #002244',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                color: '#002244',
                width: '40px',
                height: '40px'
              }}
              title="Share shopping list"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <button
              onClick={() => onValidateItems && onValidateItems(filteredItems)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                border: '2px solid #002244',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                color: '#002244',
                width: '40px',
                height: '40px'
              }}
              title="Validate Items"
            >
              <span>✓</span>
            </button>
          </div>
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
          display: 'grid',
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
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 120px 50px',
                padding: '20px',
                alignItems: 'center',
                borderBottom: '1px solid #F6F7F8',
                minHeight: '84px',
                background: isChecked ? '#FFF5F2' : 'white',
                borderLeft: isChecked ? '3px solid #FB4F14' : 'none'
              }}
            >
              {/* Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  onClick={() => toggleItemSelection(item.id)}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: isChecked ? 'none' : '2px solid #002244',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: isChecked ? '#FB4F14' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {isChecked && '✓'}
                </div>
              </div>

              {/* Product Info with orange badge as 3rd line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={getProductImage(item)}
                  alt={item.productName || item.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid #002244'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#002244' }}>
                    {formatProductName(item.productName || item.name || 'Unknown Item')}
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      marginLeft: '8px',
                      background: confidence.level === 'high' ? '#E8F5E9' :
                                 confidence.level === 'medium' ? '#FFF5F2' : '#F0F4F8',
                      color: confidence.level === 'high' ? '#0AAD0A' :
                             confidence.level === 'medium' ? '#FB4F14' : '#002244'
                    }}>
                      {confidence.value}% match
                    </span>
                  </span>
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {getCategory(item)} • {item.brand ? formatProductName(item.brand) : 'Generic'}
                  </span>
                  <div style={{ marginTop: '2px' }}>
                    <span style={{
                      background: '#FB4F14',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {formatUnitDisplay(item)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#F0F4F8',
                  borderRadius: '8px',
                  padding: '4px',
                  border: '1px solid #002244'
                }}>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid #002244',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#002244',
                      fontWeight: '600'
                    }}
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={item.quantity || 1}
                    onChange={(e) => setQuantity(item.id, e.target.value)}
                    style={{
                      width: '40px',
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#002244'
                    }}
                  />
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid #002244',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#002244',
                      fontWeight: '600'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
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
                  textAlign: 'right',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#E8F5E9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
                title="Click to see price comparison from all vendors"
              >
                ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                <span style={{ fontSize: '10px', verticalAlign: 'super', marginLeft: '4px' }}>📊</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => onDeleteItem && onDeleteItem(item.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '2px solid #002244',
                    background: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#72767E',
                    fontSize: '18px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFF0F0';
                    e.currentTarget.style.borderColor = '#D32F2F';
                    e.currentTarget.style.color = '#D32F2F';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#002244';
                    e.currentTarget.style.color = '#72767E';
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,2,68,0.12)',
        border: '2px solid #002244'
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#FB4F14' }}>{itemCount}</span>
            <span style={{ fontSize: '12px', color: '#002244', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Total Items
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#FB4F14' }}>{selectedItems.size}</span>
            <span style={{ fontSize: '12px', color: '#002244', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Selected
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#FB4F14' }}>{totalQuantity}</span>
            <span style={{ fontSize: '12px', color: '#002244', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Total Quantity
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#FB4F14' }}>{Math.round((itemCount > 0 ? (selectedItems.size / itemCount) * 100 : 0))}%</span>
            <span style={{ fontSize: '12px', color: '#002244', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Selection Rate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstacartShoppingList;