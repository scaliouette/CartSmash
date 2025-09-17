import React, { useState, useEffect, useCallback } from 'react';
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
        setRetailers(result.retailers);
        console.log(`✅ Loaded ${result.retailers.length} retailers`);

        // If no retailer is selected and we have retailers, select the first one
        if (!selectedRetailerId && result.retailers.length > 0) {
          setSelectedRetailerId(result.retailers[0].id || result.retailers[0].retailer_key);
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
    return getCategory(item).toLowerCase() === filterBy.toLowerCase();
  });

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #0AAD0A, #078F07)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              🛒
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#343538', margin: 0 }}>Shopping List</h1>
          </div>

          {/* Store Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="https://www.groceryoutlet.com/favicon.ico"
              alt="Store"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                objectFit: 'contain',
                background: 'white',
                padding: '4px',
                border: '2px solid #002244'
              }}
            />
            {loadingRetailers ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#72767E' }}>Loading stores...</span>
              </div>
            ) : retailers.length > 0 ? (
              <select
                value={selectedRetailerId}
                onChange={(e) => handleRetailerChange(e.target.value)}
                style={{
                  padding: '8px 36px 8px 12px',
                  border: '2px solid #002244',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#002244',
                  cursor: 'pointer',
                  minWidth: '180px'
                }}
              >
                {retailers.map(retailer => (
                  <option key={retailer.retailer_key} value={retailer.retailer_key}>
                    {retailer.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                style={{
                  padding: '8px 36px 8px 12px',
                  border: '2px solid #002244',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#002244',
                  cursor: 'pointer',
                  minWidth: '180px'
                }}
                disabled
              >
                {stores.map(store => (
                  <option key={store.value} value={store.value}>{store.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Estimated Total */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF4E6, #FFEDD4)',
            border: '2px solid #FF8800',
            borderRadius: '12px',
            padding: '12px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <span style={{ fontSize: '12px', color: '#72767E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estimated Total
            </span>
            <span style={{ fontSize: '32px', fontWeight: '700', color: '#FF8800' }}>
              ${total.toFixed(2)}
            </span>
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
                🗑️ Delete Selected
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
            <span style={{ fontSize: '14px', color: '#002244', fontWeight: '600' }}>Filter:</span>
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
              <option value="all">All Items</option>
              <option value="pantry">Pantry</option>
              <option value="produce">Produce</option>
              <option value="dairy">Dairy</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
            <button style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
              color: 'white'
            }}>
              <span>🔗</span>
              <span>Share List</span>
              <span style={{
                background: 'white',
                color: '#FB4F14',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>NEW</span>
            </button>

            <button
              onClick={() => onValidateItems && onValidateItems(filteredItems)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FB4F14',
                color: 'white'
              }}
            >
              <span>✓</span>
              <span>Validate Items</span>
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
                onClick={() => onShowPriceHistory && onShowPriceHistory(item)}
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#002244',
                  textAlign: 'right',
                  cursor: 'pointer'
                }}
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
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#72767E',
                    fontSize: '18px'
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
        justifyContent: 'space-between',
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

        <button
          onClick={() => onCheckout && onCheckout(filteredItems)}
          style={{
            background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
            color: 'white',
            border: 'none',
            padding: '16px 48px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(251,79,20,0.3)'
          }}
        >
          Checkout with Instacart →
        </button>
      </div>
    </div>
  );
};

export default InstacartShoppingList;