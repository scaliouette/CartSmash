import React, { useState, useEffect, useCallback, useRef } from 'react';
import imageService, { formatProductName } from '../utils/imageService';
import instacartService from '../services/instacartService';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import ShoppingListItem from './ShoppingListItem';

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
  userZipCode = '95670',
  selectedRetailer = 'kroger'
}) => {
  // 🚀 COMPONENT INITIALIZATION DEBUG
  const componentId = `InstacartShoppingList_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🎯 [${componentId}] COMPONENT MOUNTED:`, {
    timestamp: new Date().toISOString(),
    propsReceived: {
      itemsCount: items?.length || 0,
      hasOnItemsChange: !!onItemsChange,
      hasOnDeleteItem: !!onDeleteItem,
      hasOnCheckout: !!onCheckout,
      hasOnSaveList: !!onSaveList,
      hasOnValidateItems: !!onValidateItems,
      hasOnShowPriceHistory: !!onShowPriceHistory,
      userZipCode,
      selectedRetailer
    },
    itemsSample: items?.slice(0, 2)?.map(item => ({
      id: item.id,
      name: item.productName || item.name,
      price: item.price,
      hasImage: !!item.image || !!item.imageUrl
    }))
  });

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [localItems, setLocalItems] = useState(items);
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState(selectedRetailer);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // 🔧 STATE INITIALIZATION DEBUG
  console.log(`📊 [${componentId}] INITIAL STATE SET:`, {
    selectedItems: selectedItems.size,
    sortBy,
    filterBy,
    localItemsCount: localItems?.length || 0,
    retailersCount: retailers?.length || 0,
    selectedRetailerId,
    loadingRetailers,
    showAdvancedFilters
  });


  // Mobile device detection
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || window.innerWidth <= 768;

  // 📱 DEVICE DETECTION DEBUG
  console.log(`📱 [${componentId}] DEVICE DETECTION:`, {
    deviceInfo,
    isMobile,
    windowWidth: window.innerWidth,
    userAgent: navigator.userAgent.substring(0, 100)
  });

  // Sync local items with parent
  useEffect(() => {
    const effectId = `useEffect_items_${Date.now()}`;
    console.log(`🔄 [${componentId}] [${effectId}] ITEMS SYNC TRIGGERED:`, {
      newItemsCount: items?.length || 0,
      previousLocalItemsCount: localItems?.length || 0,
      itemsChanged: items !== localItems,
      timestamp: new Date().toISOString()
    });

    debugShoppingListState(items, `Items Received from Parent [${effectId}]`);

    // Deep comparison debug
    if (items && localItems) {
      const itemChanges = {
        added: items.filter(item => !localItems.find(local => local.id === item.id)),
        removed: localItems.filter(local => !items.find(item => item.id === local.id)),
        modified: items.filter(item => {
          const local = localItems.find(local => local.id === item.id);
          return local && JSON.stringify(item) !== JSON.stringify(local);
        })
      };
      console.log(`🔍 [${componentId}] [${effectId}] ITEM CHANGES ANALYSIS:`, itemChanges);
    }

    setLocalItems(items);
    console.log(`✅ [${componentId}] [${effectId}] Local items state updated`);
  }, [items, componentId, localItems]);

  // Load retailers based on user zip code
  const loadRetailers = useCallback(async () => {
    const functionId = `loadRetailers_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🏪 [${componentId}] [${functionId}] LOAD RETAILERS STARTED:`, {
      userZipCode,
      hasZipCode: !!userZipCode,
      timestamp: new Date().toISOString(),
      currentRetailersCount: retailers?.length || 0,
      selectedRetailerId
    });

    if (!userZipCode) {
      console.log(`⚠️ [${componentId}] [${functionId}] No zip code provided, skipping retailer load`);
      return;
    }

    setLoadingRetailers(true);
    console.log(`⏳ [${componentId}] [${functionId}] Loading state set to true`);

    try {
      console.log(`📡 [${componentId}] [${functionId}] Making API call to instacartService.getNearbyRetailers`);
      const apiCallStart = performance.now();
      const result = await instacartService.getNearbyRetailers(userZipCode);
      const apiCallDuration = Math.round(performance.now() - apiCallStart);

      console.log(`📥 [${componentId}] [${functionId}] API Response received:`, {
        success: result?.success,
        retailersCount: result?.retailers?.length || 0,
        apiCallDuration,
        resultKeys: result ? Object.keys(result) : [],
        firstRetailer: result?.retailers?.[0] ? {
          id: result.retailers[0].id,
          name: result.retailers[0].name,
          hasLogo: !!result.retailers[0].logo_url
        } : null
      });

      if (result.success && result.retailers) {
        console.log(`🔄 [${componentId}] [${functionId}] Starting retailer sorting logic`);

        // Sort retailers by estimated pricing (lowest prices first)
        const sortStartTime = performance.now();
        const sortedRetailers = [...result.retailers].sort((a, b) => {
          // Detailed debug for each comparison
          console.log(`🔍 [${componentId}] [${functionId}] Comparing retailers:`, {
            a: { name: a.name, estimated_total: a.estimated_total, delivery_fee: a.delivery_fee },
            b: { name: b.name, estimated_total: b.estimated_total, delivery_fee: b.delivery_fee }
          });

          // If retailers have pricing data, use it
          if (a.estimated_total && b.estimated_total) {
            const priceDiff = parseFloat(a.estimated_total) - parseFloat(b.estimated_total);
            console.log(`💰 [${componentId}] [${functionId}] Sorting by price: ${a.name} (${a.estimated_total}) vs ${b.name} (${b.estimated_total}) = ${priceDiff}`);
            return priceDiff;
          }

          // If they have delivery fees, prioritize lower fees
          if (a.delivery_fee && b.delivery_fee) {
            const feeDiff = parseFloat(a.delivery_fee) - parseFloat(b.delivery_fee);
            console.log(`🚚 [${componentId}] [${functionId}] Sorting by delivery fee: ${a.name} (${a.delivery_fee}) vs ${b.name} (${b.delivery_fee}) = ${feeDiff}`);
            return feeDiff;
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

          console.log(`🏷️ [${componentId}] [${functionId}] Low-cost ranking: ${a.name} (rank: ${aRank}) vs ${b.name} (rank: ${bRank})`);

          // If both found in ranking, lower index = higher priority
          if (aRank !== -1 && bRank !== -1) {
            return aRank - bRank;
          }

          // If only one found in ranking, prioritize it
          if (aRank !== -1) return -1;
          if (bRank !== -1) return 1;

          // Fallback to alphabetical
          const alphabeticalResult = (a.name || '').localeCompare(b.name || '');
          console.log(`🔤 [${componentId}] [${functionId}] Alphabetical sort: ${a.name} vs ${b.name} = ${alphabeticalResult}`);
          return alphabeticalResult;
        });

        const sortDuration = Math.round(performance.now() - sortStartTime);
        console.log(`⚡ [${componentId}] [${functionId}] Retailer sorting completed:`, {
          originalCount: result.retailers.length,
          sortedCount: sortedRetailers.length,
          sortDuration,
          topRetailers: sortedRetailers.slice(0, 3).map(r => ({ name: r.name, id: r.id || r.retailer_key }))
        });

        setRetailers(sortedRetailers);
        console.log(`✅ [${componentId}] [${functionId}] Retailers state updated with ${sortedRetailers.length} retailers`);

        // Auto-select the first retailer (lowest-priced) if none is selected
        if (!selectedRetailerId && sortedRetailers.length > 0) {
          const defaultRetailer = sortedRetailers[0];
          const defaultRetailerId = defaultRetailer.id || defaultRetailer.retailer_key;
          console.log(`🎯 [${componentId}] [${functionId}] Auto-selecting default retailer:`, {
            name: defaultRetailer.name,
            id: defaultRetailerId,
            hasEstimatedTotal: !!defaultRetailer.estimated_total,
            hasDeliveryFee: !!defaultRetailer.delivery_fee
          });
          setSelectedRetailerId(defaultRetailerId);
          console.log(`✅ [${componentId}] [${functionId}] Default retailer selected: ${defaultRetailer.name} (${defaultRetailerId})`);
        } else {
          console.log(`ℹ️ [${componentId}] [${functionId}] Keeping current retailer selection: ${selectedRetailerId}`);
        }
      } else {
        console.warn(`⚠️ [${componentId}] [${functionId}] No retailers found or request failed:`, {
          success: result?.success,
          hasRetailers: !!result?.retailers,
          retailersLength: result?.retailers?.length,
          resultStructure: result ? Object.keys(result) : 'null'
        });
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




  // Sync internal selectedRetailerId with selectedRetailer prop
  useEffect(() => {
    if (selectedRetailer && selectedRetailer !== selectedRetailerId) {
      setSelectedRetailerId(selectedRetailer);
      console.log(`🏪 Store selection synced: ${selectedRetailer}`);
    }
  }, [selectedRetailer, selectedRetailerId]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const functionId = `calculateTotals_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();
    console.log(`🧮 [${componentId}] [${functionId}] Starting total calculation:`, {
      itemCount: localItems.length,
      timestamp: new Date().toISOString()
    });

    let itemsProcessed = 0;
    let totalCalculations = 0;
    const total = localItems.reduce((sum, item, index) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const itemTotal = price * quantity;

      console.log(`🧮 [${componentId}] [${functionId}] Processing item ${index + 1}/${localItems.length}:`, {
        productName: item.productName,
        price: price,
        quantity: quantity,
        itemTotal: itemTotal,
        runningSum: sum + itemTotal
      });

      itemsProcessed++;
      totalCalculations++;
      return sum + itemTotal;
    }, 0);

    const calculationDuration = Math.round(performance.now() - startTime);
    console.log(`✅ [${componentId}] [${functionId}] Total calculation completed:`, {
      itemsProcessed,
      totalCalculations,
      finalTotal: total,
      calculationDuration,
      averageTimePerItem: itemsProcessed > 0 ? Math.round(calculationDuration / itemsProcessed * 100) / 100 : 0
    });

    const quantityStartTime = performance.now();
    console.log(`🔢 [${componentId}] [${functionId}] Starting quantity calculation...`);

    let quantityCalculations = 0;
    const totalQuantity = localItems.reduce((sum, item, index) => {
      const quantity = parseInt(item.quantity) || 1;
      console.log(`🔢 [${componentId}] [${functionId}] Quantity for item ${index + 1}: ${item.productName} = ${quantity} (running sum: ${sum + quantity})`);
      quantityCalculations++;
      return sum + (quantity);
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
            {/* Select All Button - Mobile */}
            <button
              onClick={toggleSelectAll}
              style={{
                background: 'white',
                color: selectedItems.size > 0 ? '#dc3545' : '#0066cc',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginRight: '8px',
                flexShrink: 0
              }}
              title={allItemsSelected ? "Deselect all items" : "Select all items"}
            >
              {allItemsSelected ? '✓' : (someItemsSelected ? '−' : '□')}
            </button>

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

            {/* Selected items count and Save Selected button */}
            {someItemsSelected && (
              <>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginLeft: '16px'
                }}>
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => onSaveList && onSaveList()}
                  style={{
                    backgroundColor: '#FFF5F0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Save selected items to grocery list"
                >
                  💾
                </button>
              </>
            )}

            <div style={filterBarStyles.rightControls}>

              {someItemsSelected && (
                <button
                  onClick={deleteSelectedItems}
                  style={{
                    ...filterBarStyles.iconBtn,
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db'
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
                ✓
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
          <div style={{ textAlign: 'right' }}>PRICE</div>
          <div></div>
        </div>

        {/* List Items */}
        {filteredItems.map((item) => (
          <ShoppingListItem
            key={item.id}
            item={item}
            isSelected={selectedItems.has(item.id)}
            getProductImage={getProductImage}
            getConfidenceDisplay={getConfidenceDisplay}
            getCategory={getCategory}
            formatUnitDisplay={formatUnitDisplay}
            updateQuantity={updateQuantity}
            setQuantity={setQuantity}
            deleteSingleItem={deleteSingleItem}
            toggleItemSelection={toggleItemSelection}
            onShowPriceHistory={onShowPriceHistory}
          />
        ))}
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