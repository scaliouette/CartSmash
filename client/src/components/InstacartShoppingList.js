import React, { useState, useEffect, useCallback, useRef } from 'react';
import imageService, { formatProductName } from '../utils/imageService';
import instacartService from '../services/instacartService';
import instacartShoppingListService from '../services/instacartShoppingListService';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import ShoppingListItem from './ShoppingListItem';
import { logger, conditionalLog, createTimer } from '../utils/debugLogger';

// Optimized debug functions using configurable logging
const debugItemData = (componentId, item, context = '') => {
  logger.debug(componentId, 'debugItemData', `Item analysis: ${context}`, {
    id: item.id,
    productName: item.productName || item.name,
    hasPrice: !!item.price && item.price !== 0,
    hasRealImage: !!item.image && !item.image.includes('data:image/svg'),
    enriched: !!item.enriched
  });
};

const debugShoppingListState = (componentId, items, context = '') => {
  logger.debug(componentId, 'debugShoppingListState', `Shopping list state: ${context}`, {
    totalItems: items.length,
    itemsWithPrices: items.filter(item => item.price && item.price !== 0).length,
    itemsEnriched: items.filter(item => item.enriched || item.instacartData).length
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
  // Component initialization with optimized logging
  const componentId = `InstacartShoppingList_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  conditionalLog.componentLifecycle(componentId, 'mounted', {
    itemsCount: items?.length || 0,
    userZipCode,
    selectedRetailer
  });

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [localItems, setLocalItems] = useState(items);
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState(selectedRetailer);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [creatingShoppingList, setCreatingShoppingList] = useState(false);

  // State initialization (debug logging only when needed)
  logger.trace(componentId, 'stateInit', 'Initial state set', {
    localItemsCount: localItems?.length || 0,
    selectedRetailerId
  });


  // Mobile device detection
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || window.innerWidth <= 768;

  // Device detection logging
  logger.debug(componentId, 'deviceDetection', 'Device detected', { isMobile });

  // Sync local items with parent
  useEffect(() => {
    const timer = createTimer(componentId, 'itemsSync');
    timer.start();

    conditionalLog.stateChange(componentId, 'items', localItems?.length, items?.length);
    debugShoppingListState(componentId, items, 'Items sync');

    setLocalItems(items);
    timer.end('Items synchronized');
  }, [items, componentId]);

  // Load retailers based on user zip code
  const loadRetailers = useCallback(async () => {
    const timer = createTimer(componentId, 'loadRetailers');
    timer.start();

    logger.info(componentId, 'loadRetailers', 'Loading retailers', { userZipCode });

    if (!userZipCode) {
      logger.warn(componentId, 'loadRetailers', 'No zip code provided');
      return;
    }

    setLoadingRetailers(true);

    try {
      conditionalLog.apiCall(componentId, 'getNearbyRetailers', 'GET', { userZipCode });
      timer.mark('API call started');

      const result = await instacartService.getNearbyRetailers(userZipCode);
      timer.mark('API call completed');

      logger.debug(componentId, 'loadRetailers', 'API response received', {
        success: result?.success,
        retailersCount: result?.retailers?.length || 0
      });

      if (result.success && result.retailers) {
        timer.mark('Sorting retailers');

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

        timer.mark('Sorting completed');

        setRetailers(sortedRetailers);
        logger.debug(componentId, 'loadRetailers', 'Retailers updated', {
          count: sortedRetailers.length
        });

        // Auto-select the first retailer (lowest-priced) if none is selected
        if (!selectedRetailerId && sortedRetailers.length > 0) {
          const defaultRetailer = sortedRetailers[0];
          const defaultRetailerId = defaultRetailer.id || defaultRetailer.retailer_key;
          setSelectedRetailerId(defaultRetailerId);
          logger.info(componentId, 'loadRetailers', 'Default retailer selected', {
            name: defaultRetailer.name,
            id: defaultRetailerId
          });
        }
      } else {
        logger.warn(componentId, 'loadRetailers', 'No retailers found', {
          success: result?.success
        });
        setRetailers([]);
      }
    } catch (error) {
      logger.error(componentId, 'loadRetailers', 'Error loading retailers', { error: error.message });
      setRetailers([]);
    } finally {
      setLoadingRetailers(false);
      timer.end('Load retailers completed');
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
      logger.debug(componentId, 'retailerSync', 'Store selection synced', { selectedRetailer });
    }
  }, [selectedRetailer, selectedRetailerId, componentId]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const timer = createTimer(componentId, 'calculateTotals');
    timer.start();

    const total = localItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);

    const totalQuantity = localItems.reduce((sum, item) => {
      const quantity = parseInt(item.quantity) || 1;
      return sum + quantity;
    }, 0);

    const duration = timer.end('Totals calculated');
    conditionalLog.performance(componentId, 'calculateTotals', duration, 50); // Warn if > 50ms

    const result = { total, totalQuantity, itemCount: localItems.length };
    logger.trace(componentId, 'calculateTotals', 'Calculation result', result);

    return result;
  }, [localItems, componentId]);

  const { total, totalQuantity, itemCount } = calculateTotals();

  // Handle checkbox toggle
  const toggleItemSelection = (itemId) => {
    const timer = createTimer(componentId, 'toggleItemSelection');
    timer.start();

    logger.debug(componentId, 'toggleItemSelection', 'Item selection toggled', { itemId });

    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }

      const duration = timer.end('Selection toggle completed');
      conditionalLog.performance(componentId, 'toggleItemSelection', duration, 10);

      return newSet;
    });
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    const timer = createTimer(componentId, 'toggleSelectAll');
    timer.start();

    const allSelected = selectedItems.size === localItems.length;
    logger.debug(componentId, 'toggleSelectAll', 'Select all toggled', {
      action: allSelected ? 'DESELECT_ALL' : 'SELECT_ALL',
      currentCount: selectedItems.size,
      totalItems: localItems.length
    });

    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      const allItemIds = localItems.map(item => item.id);
      setSelectedItems(new Set(allItemIds));
    }

    const duration = timer.end('Select all completed');
    conditionalLog.performance(componentId, 'toggleSelectAll', duration, 20);
  };

  // Handle delete selected items
  const deleteSelectedItems = () => {
    const functionId = `deleteSelectedItems_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🗑️ [${componentId}] [${functionId}] Bulk delete initiated:`, {
      selectedCount: selectedItems.size,
      totalItems: localItems.length,
      selectedItemIds: Array.from(selectedItems),
      timestamp: new Date().toISOString()
    });

    const itemsToDelete = localItems.filter(item => selectedItems.has(item.id));
    console.log(`📋 [${componentId}] [${functionId}] Items to be deleted:`,
      itemsToDelete.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      }))
    );

    const filterStartTime = performance.now();
    const updatedItems = localItems.filter(item => !selectedItems.has(item.id));
    const filterDuration = Math.round(performance.now() - filterStartTime);

    console.log(`🔍 [${componentId}] [${functionId}] Filter operation completed:`, {
      originalCount: localItems.length,
      deletedCount: itemsToDelete.length,
      remainingCount: updatedItems.length,
      filterDuration
    });

    setLocalItems(updatedItems);
    console.log(`📝 [${componentId}] [${functionId}] Local items state updated`);

    setSelectedItems(new Set());
    console.log(`🔄 [${componentId}] [${functionId}] Selection cleared`);

    // Always notify parent component of the change
    if (onItemsChange) {
      const notifyStartTime = performance.now();
      onItemsChange(updatedItems);
      const notifyDuration = Math.round(performance.now() - notifyStartTime);

      console.log(`📤 [${componentId}] [${functionId}] Parent notified:`, {
        remainingItems: updatedItems.length,
        notifyDuration,
        hasOnItemsChange: true
      });
    } else {
      console.log(`⚠️ [${componentId}] [${functionId}] No onItemsChange callback provided`);
    }

    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`✅ [${componentId}] [${functionId}] Bulk delete completed:`, {
      deletedItems: itemsToDelete.length,
      remainingItems: updatedItems.length,
      totalDuration,
      averageTimePerItem: itemsToDelete.length > 0 ? Math.round(totalDuration / itemsToDelete.length * 100) / 100 : 0
    });
  };

  // Handle delete single item
  const deleteSingleItem = (itemId) => {
    const functionId = `deleteSingleItem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🗑️ [${componentId}] [${functionId}] Single item delete initiated:`, {
      itemId,
      totalItems: localItems.length,
      selectedItemsCount: selectedItems.size,
      isItemSelected: selectedItems.has(itemId),
      timestamp: new Date().toISOString()
    });

    const itemToDelete = localItems.find(item => item.id === itemId);
    console.log(`🔍 [${componentId}] [${functionId}] Item to delete details:`, {
      found: !!itemToDelete,
      productName: itemToDelete?.productName || 'Unknown',
      quantity: itemToDelete?.quantity || 'Unknown',
      price: itemToDelete?.price || 'Unknown',
      category: itemToDelete?.category || 'Unknown'
    });

    const filterStartTime = performance.now();
    const updatedItems = localItems.filter(item => item.id !== itemId);
    const filterDuration = Math.round(performance.now() - filterStartTime);

    console.log(`🔍 [${componentId}] [${functionId}] Filter operation completed:`, {
      originalCount: localItems.length,
      remainingCount: updatedItems.length,
      deleted: localItems.length - updatedItems.length,
      filterDuration
    });

    setLocalItems(updatedItems);
    console.log(`📝 [${componentId}] [${functionId}] Local items state updated`);

    // Remove from selected items if it was selected
    const wasSelected = selectedItems.has(itemId);
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      const hadItem = newSet.has(itemId);
      newSet.delete(itemId);

      console.log(`🔄 [${componentId}] [${functionId}] Selection update:`, {
        wasSelected: hadItem,
        previousSelectionSize: prev.size,
        newSelectionSize: newSet.size,
        removedFromSelection: hadItem
      });

      return newSet;
    });

    // Always notify parent component of the change
    if (onItemsChange) {
      const notifyStartTime = performance.now();
      onItemsChange(updatedItems);
      const notifyDuration = Math.round(performance.now() - notifyStartTime);

      console.log(`📤 [${componentId}] [${functionId}] Parent notified via onItemsChange:`, {
        remainingItems: updatedItems.length,
        notifyDuration,
        hasCallback: true
      });
    } else {
      console.log(`⚠️ [${componentId}] [${functionId}] No onItemsChange callback provided`);
    }

    // Also try parent-specific delete callback
    if (onDeleteItem) {
      const deleteCallbackStartTime = performance.now();
      onDeleteItem(itemId);
      const deleteCallbackDuration = Math.round(performance.now() - deleteCallbackStartTime);

      console.log(`🗑️ [${componentId}] [${functionId}] Parent notified via onDeleteItem:`, {
        itemId,
        deleteCallbackDuration,
        hasCallback: true
      });
    } else {
      console.log(`ℹ️ [${componentId}] [${functionId}] No onDeleteItem callback provided`);
    }

    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`✅ [${componentId}] [${functionId}] Single item delete completed:`, {
      deletedItemId: itemId,
      remainingItems: updatedItems.length,
      wasSelected,
      totalDuration
    });
  };

  // Calculate if all items are selected
  console.log(`📊 [${componentId}] Selection state calculation:`, {
    totalItems: localItems.length,
    selectedCount: selectedItems.size,
    calculatedAt: new Date().toISOString()
  });

  const allItemsSelected = localItems.length > 0 && selectedItems.size === localItems.length;
  const someItemsSelected = selectedItems.size > 0;

  console.log(`📊 [${componentId}] Selection state result:`, {
    allItemsSelected,
    someItemsSelected,
    selectionPercentage: localItems.length > 0 ? Math.round((selectedItems.size / localItems.length) * 100) : 0
  });

  // Handle quantity change
  const updateQuantity = (itemId, delta) => {
    const functionId = `updateQuantity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🔢 [${componentId}] [${functionId}] Quantity update initiated:`, {
      itemId,
      delta,
      timestamp: new Date().toISOString()
    });

    const targetItem = localItems.find(item => item.id === itemId);
    const currentQty = parseInt(targetItem?.quantity) || 1;
    const newQty = Math.max(1, currentQty + delta);

    console.log(`🔢 [${componentId}] [${functionId}] Quantity calculation:`, {
      productName: targetItem?.productName || 'Unknown',
      currentQty,
      delta,
      newQty,
      isIncrease: delta > 0,
      hitMinimum: newQty === 1 && currentQty + delta < 1
    });

    const mapStartTime = performance.now();
    let itemsProcessed = 0;
    const updatedItems = localItems.map(item => {
      itemsProcessed++;
      if (item.id === itemId) {
        console.log(`✏️ [${componentId}] [${functionId}] Updating target item:`, {
          id: item.id,
          productName: item.productName,
          oldQuantity: item.quantity,
          newQuantity: newQty
        });
        return { ...item, quantity: newQty };
      }
      return item;
    });
    const mapDuration = Math.round(performance.now() - mapStartTime);

    console.log(`🔄 [${componentId}] [${functionId}] Map operation completed:`, {
      itemsProcessed,
      mapDuration,
      totalItems: localItems.length
    });

    setLocalItems(updatedItems);
    console.log(`📝 [${componentId}] [${functionId}] Local items state updated`);

    if (onItemsChange) {
      const notifyStartTime = performance.now();
      onItemsChange(updatedItems);
      const notifyDuration = Math.round(performance.now() - notifyStartTime);

      console.log(`📤 [${componentId}] [${functionId}] Parent notified of quantity change:`, {
        notifyDuration,
        updatedItemsCount: updatedItems.length
      });
    } else {
      console.log(`⚠️ [${componentId}] [${functionId}] No onItemsChange callback provided`);
    }

    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`✅ [${componentId}] [${functionId}] Quantity update completed:`, {
      itemId,
      oldQuantity: currentQty,
      newQuantity: newQty,
      delta,
      totalDuration
    });
  };


  // Calculate detailed pricing breakdown when store is selected
  const calculateDetailedPricing = useCallback(() => {
    const functionId = `calculateDetailedPricing_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`💰 [${componentId}] [${functionId}] Detailed pricing calculation initiated:`, {
      subtotalInput: total,
      retailersCount: retailers.length,
      selectedRetailerId,
      hasStoreSelected: retailers.length > 0 && selectedRetailerId,
      timestamp: new Date().toISOString()
    });

    const subtotal = total;
    const serviceFee = 3.99;
    const delivery = 5.99;
    const finalTotal = subtotal + serviceFee + delivery;
    const hasStoreSelected = retailers.length > 0 && selectedRetailerId;

    const duration = Math.round(performance.now() - startTime);
    const result = {
      subtotal,
      serviceFee,
      delivery,
      finalTotal,
      hasStoreSelected
    };

    console.log(`✅ [${componentId}] [${functionId}] Detailed pricing calculation completed:`, {
      ...result,
      duration,
      markup: finalTotal - subtotal,
      markupPercentage: subtotal > 0 ? Math.round(((finalTotal - subtotal) / subtotal) * 100) : 0
    });

    return result;
  }, [total, retailers.length, selectedRetailerId]);

  // Handle shopping list creation
  const handleCreateShoppingList = useCallback(async () => {
    if (localItems.length === 0) {
      alert('Please add items to your cart before creating a shopping list.');
      return;
    }

    setCreatingShoppingList(true);

    try {
      console.log('🛒 Creating enhanced shopping list with items:', localItems.length);

      const listData = {
        title: 'My CartSmash Shopping List',
        items: localItems.map(item => ({
          name: item.productName || item.name,
          productName: item.productName || item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          category: item.category || 'General',
          brand: item.brand || null,
          upc: item.upc || null,
          healthFilters: item.healthFilters || [],
          brandFilters: item.brandFilters || []
        })),
        instructions: ['Shopping list created with CartSmash'],
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop',
        preferences: {
          preferredBrands: [],
          dietaryRestrictions: [],
          measurementPreferences: 'imperial'
        }
      };

      const result = await instacartShoppingListService.createEnhancedShoppingList(listData, {
        partnerUrl: 'https://cartsmash.com',
        expiresIn: 365
      });

      if (result.success && result.instacartUrl) {
        console.log('✅ Shopping list created successfully:', result.instacartUrl);
        alert(`✅ Shopping list created! Opening Instacart...`);
        window.open(result.instacartUrl, '_blank');
      } else {
        throw new Error(result.error || 'Failed to create shopping list');
      }
    } catch (error) {
      console.error('❌ Error creating shopping list:', error);
      alert(`❌ Failed to create shopping list: ${error.message}`);
    } finally {
      setCreatingShoppingList(false);
    }
  }, [localItems]);

  // Handle direct quantity input
  const setQuantity = (itemId, value) => {
    const functionId = `setQuantity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🔢 [${componentId}] [${functionId}] Direct quantity set initiated:`, {
      itemId,
      inputValue: value,
      inputType: typeof value,
      timestamp: new Date().toISOString()
    });

    const qty = parseInt(value) || 1;
    const finalQty = Math.max(1, qty);

    console.log(`🔢 [${componentId}] [${functionId}] Quantity processing:`, {
      rawInput: value,
      parsedInt: qty,
      finalQuantity: finalQty,
      wasAdjustedToMinimum: finalQty === 1 && qty < 1
    });

    const targetItem = localItems.find(item => item.id === itemId);
    console.log(`🔍 [${componentId}] [${functionId}] Target item details:`, {
      found: !!targetItem,
      productName: targetItem?.productName || 'Unknown',
      currentQuantity: targetItem?.quantity || 'Unknown'
    });

    const mapStartTime = performance.now();
    let itemsProcessed = 0;
    const updatedItems = localItems.map(item => {
      itemsProcessed++;
      if (item.id === itemId) {
        console.log(`✏️ [${componentId}] [${functionId}] Setting quantity for target item:`, {
          id: item.id,
          productName: item.productName,
          oldQuantity: item.quantity,
          newQuantity: finalQty
        });
        return { ...item, quantity: finalQty };
      }
      return item;
    });
    const mapDuration = Math.round(performance.now() - mapStartTime);

    console.log(`🔄 [${componentId}] [${functionId}] Map operation completed:`, {
      itemsProcessed,
      mapDuration,
      totalItems: localItems.length
    });

    setLocalItems(updatedItems);
    console.log(`📝 [${componentId}] [${functionId}] Local items state updated`);

    if (onItemsChange) {
      const notifyStartTime = performance.now();
      onItemsChange(updatedItems);
      const notifyDuration = Math.round(performance.now() - notifyStartTime);

      console.log(`📤 [${componentId}] [${functionId}] Parent notified of direct quantity set:`, {
        notifyDuration,
        updatedItemsCount: updatedItems.length
      });
    } else {
      console.log(`⚠️ [${componentId}] [${functionId}] No onItemsChange callback provided`);
    }

    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`✅ [${componentId}] [${functionId}] Direct quantity set completed:`, {
      itemId,
      inputValue: value,
      finalQuantity: finalQty,
      totalDuration
    });
  };

  // Get category from item
  const getCategory = (item) => {
    const functionId = `getCategory_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`🏷️ [${componentId}] [${functionId}] Category lookup:`, {
      itemId: item?.id || 'Unknown',
      productName: item?.productName || 'Unknown',
      hasCategory: !!item?.category,
      rawCategory: item?.category
    });

    const result = item.category || 'Other';
    console.log(`✅ [${componentId}] [${functionId}] Category result: "${result}"`);

    return result;
  };

  // Get product image using the centralized image service
  const getProductImage = (item) => {
    const functionId = `getProductImage_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    console.log(`🖼️ [${componentId}] [${functionId}] Image lookup initiated:`, {
      itemId: item?.id || 'Unknown',
      productName: item?.productName || 'Unknown',
      hasImageUrl: !!item?.imageUrl,
      hasImage: !!item?.image,
      hasInstacartData: !!item?.instacartData,
      timestamp: new Date().toISOString()
    });

    const result = imageService.getProductImage(item, { width: 64, height: 64 });
    const duration = Math.round(performance.now() - startTime);

    console.log(`✅ [${componentId}] [${functionId}] Image lookup completed:`, {
      resultType: result ? (result.startsWith('data:') ? 'DATA_URL' : 'EXTERNAL_URL') : 'NULL',
      resultLength: result ? result.length : 0,
      duration,
      hasResult: !!result
    });

    return result;
  };

  // Get confidence value and level for display
  const getConfidenceDisplay = (item) => {
    const functionId = `getConfidenceDisplay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`🎯 [${componentId}] [${functionId}] Confidence calculation:`, {
      itemId: item?.id || 'Unknown',
      productName: item?.productName || 'Unknown',
      rawConfidence: item?.confidence,
      confidenceType: typeof item?.confidence
    });

    if (typeof item.confidence === 'number') {
      const value = Math.round(item.confidence * 100);
      const level = item.confidence > 0.8 ? 'high' : item.confidence > 0.5 ? 'medium' : 'low';
      const result = { value, level };

      console.log(`🔢 [${componentId}] [${functionId}] Numeric confidence processed:`, {
        original: item.confidence,
        percentage: value,
        level,
        thresholds: { high: '>80%', medium: '50-80%', low: '<50%' }
      });

      return result;
    }

    const confidenceMap = {
      'high': { value: 95, level: 'high' },
      'medium': { value: 70, level: 'medium' },
      'low': { value: 45, level: 'low' }
    };

    const result = confidenceMap[item.confidence] || { value: 70, level: 'medium' };
    console.log(`📋 [${componentId}] [${functionId}] String confidence mapped:`, {
      input: item.confidence,
      mapped: result,
      usedDefault: !confidenceMap[item.confidence]
    });

    return result;
  };

  // Format the unit display for the orange badge
  const formatUnitDisplay = (item) => {
    const functionId = `formatUnitDisplay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`📦 [${componentId}] [${functionId}] Unit formatting:`, {
      itemId: item?.id || 'Unknown',
      productName: item?.productName || 'Unknown',
      unitCount: item.unitCount,
      quantity: item.quantity,
      unit: item.unit,
      size: item.size,
      package_size: item.package_size
    });

    // Safely extract primitive values (avoid objects that cause React Error #31)
    const extractPrimitive = (value, fallback = '') => {
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (typeof value === 'object' && value?.name) return value.name;
      if (typeof value === 'object' && value?.value) return value.value;
      return fallback;
    };

    const quantity = extractPrimitive(item.unitCount) || extractPrimitive(item.quantity) || 1;
    // PRESERVE ORIGINAL RECIPE UNITS - prioritize item.unit over Instacart product size data
    const unit = extractPrimitive(item.unit) || 'each';

    console.log(`📊 [${componentId}] [${functionId}] Resolved values:`, {
      finalQuantity: quantity,
      finalUnit: unit,
      quantitySource: item.unitCount ? 'unitCount' : (item.quantity ? 'quantity' : 'default'),
      unitSource: item.unit ? 'unit' : 'default (each)',
      preservedOriginalUnit: !!item.unit
    });

    // If unit is "each", don't display it
    if (String(unit) === 'each') {
      const safeQuantity = String(quantity);
      const result = `${safeQuantity} item${Number(safeQuantity) > 1 ? 's' : ''}`;
      console.log(`✅ [${componentId}] [${functionId}] Each unit formatting: "${result}"`);
      return result;
    }

    // Format as "quantity-unit" (e.g., "1-16 oz bag", "3-cups")
    const result = `${String(quantity)}-${String(unit)}`;
    console.log(`✅ [${componentId}] [${functionId}] Standard unit formatting: "${result}"`);
    return result;
  };

  // Get current retailer info and logo
  const getCurrentRetailer = () => {
    const functionId = `getCurrentRetailer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log(`🏪 [${componentId}] [${functionId}] Current retailer lookup:`, {
      retailersCount: retailers.length,
      selectedRetailerId,
      hasSelection: retailers.length > 0 && selectedRetailerId,
      availableRetailerIds: retailers.map(r => r.retailer_key || r.id)
    });

    if (retailers.length > 0 && selectedRetailerId) {
      const result = retailers.find(r => (r.retailer_key || r.id) === selectedRetailerId);
      console.log(`✅ [${componentId}] [${functionId}] Retailer lookup result:`, {
        found: !!result,
        retailerName: result?.name || 'Unknown',
        retailerId: result?.retailer_key || result?.id || 'Unknown',
        hasLogo: !!(result?.retailer_logo_url || result?.logo_url)
      });
      return result;
    }

    console.log(`⚠️ [${componentId}] [${functionId}] No retailer selected or available`);
    return null;
  };

  const currentRetailer = getCurrentRetailer();
  const retailerLogo = currentRetailer?.retailer_logo_url || currentRetailer?.logo_url;
  const retailerName = currentRetailer?.name;

  console.log(`🏪 [${componentId}] Current retailer setup:`, {
    currentRetailer: currentRetailer?.name || 'None',
    hasLogo: !!retailerLogo,
    logoUrl: retailerLogo
  });

  // Sort items
  console.log(`🔄 [${componentId}] Sorting items:`, {
    itemCount: localItems.length,
    sortBy,
    sortingMethod: sortBy || 'default'
  });

  const sortStartTime = performance.now();
  let comparisons = 0;
  const sortedItems = [...localItems].sort((a, b) => {
    comparisons++;

    let result = 0;
    switch(sortBy) {
      case 'confidence':
        const aConf = a.confidence || 0;
        const bConf = b.confidence || 0;
        result = bConf - aConf;
        console.log(`🎯 [${componentId}] Confidence comparison #${comparisons}: ${a.productName} (${aConf}) vs ${b.productName} (${bConf}) = ${result}`);
        break;
      case 'price':
        const aPrice = a.price || 0;
        const bPrice = b.price || 0;
        result = aPrice - bPrice;
        console.log(`💰 [${componentId}] Price comparison #${comparisons}: ${a.productName} ($${aPrice}) vs ${b.productName} ($${bPrice}) = ${result}`);
        break;
      case 'alphabetical':
        const aName = formatProductName(a.productName || '');
        const bName = formatProductName(b.productName || '');
        result = aName.localeCompare(bName);
        console.log(`🔤 [${componentId}] Alphabetical comparison #${comparisons}: "${aName}" vs "${bName}" = ${result}`);
        break;
      case 'category':
        const aCat = getCategory(a);
        const bCat = getCategory(b);
        result = aCat.localeCompare(bCat);
        console.log(`🏷️ [${componentId}] Category comparison #${comparisons}: "${aCat}" vs "${bCat}" = ${result}`);
        break;
      default:
        result = 0;
        console.log(`➡️ [${componentId}] Default comparison #${comparisons}: no sorting applied`);
        break;
    }

    return result;
  });

  const sortDuration = Math.round(performance.now() - sortStartTime);
  console.log(`✅ [${componentId}] Sorting completed:`, {
    originalCount: localItems.length,
    sortedCount: sortedItems.length,
    totalComparisons: comparisons,
    sortDuration,
    averageComparisonTime: comparisons > 0 ? Math.round((sortDuration / comparisons) * 1000) / 1000 : 0
  });

  // Filter items
  console.log(`🔍 [${componentId}] Filtering items:`, {
    itemCount: sortedItems.length,
    filterBy,
    filterCriteria: filterBy || 'all'
  });

  const filterStartTime = performance.now();
  let itemsEvaluated = 0;
  let itemsFiltered = 0;

  const filteredItems = sortedItems.filter(item => {
    itemsEvaluated++;

    if (filterBy === 'all') {
      console.log(`✅ [${componentId}] Filter evaluation #${itemsEvaluated}: ${item.productName} - PASSED (show all)`);
      return true;
    }

    if (filterBy === 'ingredients') {
      // Show items that are typically cooking ingredients
      const category = getCategory(item).toLowerCase();
      const ingredientCategories = ['pantry', 'spices', 'oils', 'seasonings', 'baking', 'condiments'];
      const isIngredient = ingredientCategories.some(cat => category.includes(cat));

      console.log(`🧄 [${componentId}] Filter evaluation #${itemsEvaluated}: ${item.productName} - ${isIngredient ? 'PASSED' : 'FILTERED'} (ingredient check: category="${category}", matches=${ingredientCategories.filter(cat => category.includes(cat))})`);

      if (!isIngredient) itemsFiltered++;
      return isIngredient;
    }

    const itemCategory = getCategory(item).toLowerCase();
    const targetCategory = filterBy.toLowerCase();
    const matches = itemCategory === targetCategory;

    console.log(`🏷️ [${componentId}] Filter evaluation #${itemsEvaluated}: ${item.productName} - ${matches ? 'PASSED' : 'FILTERED'} (category check: "${itemCategory}" vs "${targetCategory}")`);

    if (!matches) itemsFiltered++;
    return matches;
  });

  const filterDuration = Math.round(performance.now() - filterStartTime);
  console.log(`✅ [${componentId}] Filtering completed:`, {
    originalCount: sortedItems.length,
    filteredCount: filteredItems.length,
    itemsEvaluated,
    itemsFiltered,
    filterDuration,
    filterEfficiency: itemsEvaluated > 0 ? Math.round((filteredItems.length / itemsEvaluated) * 100) : 0
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
                onClick={handleCreateShoppingList}
                disabled={creatingShoppingList || localItems.length === 0}
                style={{
                  ...filterBarStyles.iconBtn,
                  backgroundColor: creatingShoppingList ? '#d1d5db' : '#00B894',
                  color: 'white',
                  border: 'none',
                  opacity: localItems.length === 0 ? 0.5 : 1,
                  cursor: localItems.length === 0 ? 'not-allowed' : 'pointer'
                }}
                title={creatingShoppingList ? "Creating shopping list..." : "Create Shopping List on Instacart"}
              >
                {creatingShoppingList ? '⏳' : '🛒'}
              </button>

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