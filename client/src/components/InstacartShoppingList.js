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

  // Get selected retailer details
  // eslint-disable-next-line no-unused-vars
  const getSelectedRetailer = () => {
    return retailers.find(r => (r.id || r.retailer_key) === selectedRetailerId) || null;
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
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.titleSection}>
            <div style={styles.cartIcon}>🛒</div>
            <h1 style={styles.title}>Shopping List</h1>
          </div>
          <div style={styles.estimatedTotal}>
            <span style={styles.totalLabel}>Estimated Total</span>
            <span style={styles.totalAmount}>${total.toFixed(2)}</span>
          </div>
        </div>

        <div style={styles.controls}>
          {someItemsSelected && (
            <div style={styles.deleteControls}>
              <span style={styles.selectedCount}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <button
                style={styles.deleteButton}
                onClick={deleteSelectedItems}
              >
                🗑️ Delete Selected
              </button>
            </div>
          )}
          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="confidence">Confidence (High to Low)</option>
              <option value="price">Price (Low to High)</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>Filter:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Items</option>
              <option value="pantry">Pantry</option>
              <option value="produce">Produce</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat</option>
              <option value="bakery">Bakery</option>
            </select>
          </div>

          {/* Store Selection Control */}
          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>Store:</span>
            {loadingRetailers ? (
              <div style={styles.inlineLoadingSpinner}>
                <div style={styles.miniSpinner}></div>
                <span style={styles.loadingText}>Loading...</span>
              </div>
            ) : retailers.length > 0 ? (
              <select
                value={selectedRetailerId}
                onChange={(e) => handleRetailerChange(e.target.value)}
                style={styles.select}
              >
                {retailers.map(retailer => (
                  <option key={retailer.retailer_key} value={retailer.retailer_key}>
                    {retailer.name}
                  </option>
                ))}
              </select>
            ) : (
              <select style={styles.select} disabled>
                <option>🏬 Kroger (Default)</option>
              </select>
            )}
          </div>

          <div style={styles.actionButtons}>
            <button style={styles.btnStats}>
              <span>📊</span>
              <span>Show Stats</span>
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => onSaveList && onSaveList(localItems)}
            >
              <span>💾</span>
              <span></span>
            </button>
            <button
              style={styles.btnPrimary}
              onClick={() => onValidateItems && onValidateItems(localItems)}
            >
              <span>✓</span>
              <span>Validate Items</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shopping List */}
      <div style={styles.shoppingList}>
        <div style={styles.listHeader}>
          <div style={styles.selectAllWrapper}>
            <div
              style={{
                ...styles.checkbox,
                ...(allItemsSelected ? styles.checkboxChecked : {}),
                ...(someItemsSelected && !allItemsSelected ? styles.checkboxIndeterminate : {})
              }}
              onClick={toggleSelectAll}
            >
              {allItemsSelected ? '✓' : (someItemsSelected ? '−' : '')}
            </div>
          </div>
          <div>Product Name</div>
          <div>Qty</div>
          <div>Amount</div>
          <div style={{ textAlign: 'right' }}>Price</div>
          <div></div>
        </div>

        {filteredItems.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.listItem,
              ...(selectedItems.has(item.id) ? styles.listItemSelected : {})
            }}
          >
            <div style={styles.checkboxWrapper}>
              <div
                style={{
                  ...styles.checkbox,
                  ...(selectedItems.has(item.id) ? styles.checkboxChecked : {})
                }}
                onClick={() => toggleItemSelection(item.id)}
              >
                {selectedItems.has(item.id) && '✓'}
              </div>
            </div>

            <div style={styles.productInfo}>
              <img
                src={getProductImage(item)}
                alt={item.productName}
                style={styles.productImage}
              />
              <div style={styles.productDetails}>
                <span style={styles.productName}>{formatProductName(item.productName)}</span>
                <span style={styles.productCategory}>
                  {getCategory(item)}
                  {item.brand && ` • ${formatProductName(item.brand)}`}
                </span>
              </div>
            </div>

            <div style={styles.quantityControl}>
              <button
                style={styles.qtyBtn}
                onClick={() => updateQuantity(item.id, -1)}
              >
                -
              </button>
              <input
                type="text"
                value={item.quantity || 1}
                onChange={(e) => setQuantity(item.id, e.target.value)}
                style={styles.qtyInput}
              />
              <button
                style={styles.qtyBtn}
                onClick={() => updateQuantity(item.id, 1)}
              >
                +
              </button>
            </div>

            <div style={styles.itemsNeeded}>
              <span style={styles.amountText}>{item.quantity || 1}</span>
              {item.unit && item.unit !== 'each' && (
                <span style={styles.unitBadge}>{item.unit}</span>
              )}
              {item.size && (
                <span style={styles.unitBadge}>{item.size}</span>
              )}
            </div>

            <div
              style={{
                ...styles.price,
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderRadius: '4px',
                padding: '4px 8px'
              }}
              onClick={() => onShowPriceHistory && onShowPriceHistory(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E8F5E9';
                e.currentTarget.style.color = '#0AAD0A';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#343538';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Click to see prices from all vendors"
            >
              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              <span style={{ fontSize: '10px', marginLeft: '4px', verticalAlign: 'super' }}>📊</span>
            </div>

            <div style={styles.actions}>
              <button
                style={styles.iconBtn}
                onClick={() => onDeleteItem && onDeleteItem(item.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FFEBEE';
                  e.currentTarget.style.color = '#D32F2F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#72767E';
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Footer Stats */}
      <div style={styles.footerStats}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{itemCount}</span>
          <span style={styles.statLabel}>Total Items</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{selectedItems.size}</span>
          <span style={styles.statLabel}>Selected</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{totalQuantity}</span>
          <span style={styles.statLabel}>Total Quantity</span>
        </div>
        <button
          style={styles.checkoutBtn}
          onClick={() => onCheckout && onCheckout(localItems)}
        >
          Checkout with Instacart →
        </button>
      </div>
    </div>
    </>
  );
};

// Styles object matching Instacart design system
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '"Eina", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#F6F7F8',
    minHeight: '100vh'
  },

  header: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
  },

  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  },

  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  cartIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #0AAD0A, #078F07)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px'
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#343538',
    margin: 0
  },

  estimatedTotal: {
    background: 'linear-gradient(135deg, #FFF4E6, #FFEDD4)',
    border: '2px solid #FF8800',
    borderRadius: '12px',
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },

  totalLabel: {
    fontSize: '12px',
    color: '#72767E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  totalAmount: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FF8800'
  },

  controls: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  controlLabel: {
    fontSize: '14px',
    color: '#72767E',
    fontWeight: '600'
  },

  select: {
    padding: '8px 36px 8px 12px',
    border: '2px solid #E8E9EB',
    borderRadius: '8px',
    background: 'white',
    fontSize: '14px',
    fontWeight: '500',
    color: '#343538',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23343538' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    transition: 'border-color 0.2s'
  },

  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginLeft: 'auto'
  },

  btnPrimary: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#0AAD0A',
    color: 'white'
  },

  btnSecondary: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    color: '#343538',
    border: '2px solid #E8E9EB'
  },

  btnStats: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #FF8800, #FF6B00)',
    color: 'white'
  },

  shoppingList: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
  },

  listHeader: {
    background: '#343538',
    color: 'white',
    display: 'grid',
    gridTemplateColumns: '60px 1fr 120px 200px 100px 50px',
    padding: '16px 20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    alignItems: 'center'
  },

  listItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 120px 200px 100px 50px',
    padding: '16px 20px',
    alignItems: 'center',
    borderBottom: '1px solid #F6F7F8',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },

  listItemSelected: {
    background: '#F0FFF4',
    borderLeft: '3px solid #0AAD0A'
  },

  checkboxWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #C7C8CD',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: 'white'
  },

  checkboxChecked: {
    background: '#0AAD0A',
    borderColor: '#0AAD0A'
  },

  productInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  productImage: {
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '2px solid #E8E9EB',
    backgroundColor: '#f9fafb',
    flexShrink: 0
  },

  productDetails: {
    display: 'flex',
    flexDirection: 'column'
  },

  productName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#343538'
  },

  productCategory: {
    fontSize: '12px',
    color: '#72767E'
  },

  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#F6F7F8',
    borderRadius: '8px',
    padding: '4px'
  },

  qtyBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    background: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    color: '#343538',
    fontWeight: '600'
  },

  qtyInput: {
    width: '40px',
    textAlign: 'center',
    border: 'none',
    background: 'transparent',
    fontWeight: '600',
    fontSize: '14px'
  },

  itemsNeeded: {
    fontSize: '14px',
    color: '#343538',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  amountText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#343538'
  },

  unitBadge: {
    background: '#E8F5E9',
    color: '#0AAD0A',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '4px'
  },

  selectAllWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkboxIndeterminate: {
    background: '#0AAD0A',
    borderColor: '#0AAD0A'
  },

  deleteControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#FFF3E0',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #FFB74D'
  },

  selectedCount: {
    fontSize: '14px',
    color: '#E65100',
    fontWeight: '600'
  },

  deleteButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  price: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#343538',
    textAlign: 'right'
  },

  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  },

  iconBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    color: '#72767E'
  },

  footerStats: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    flexWrap: 'wrap',
    gap: '20px'
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0AAD0A'
  },

  statLabel: {
    fontSize: '12px',
    color: '#72767E',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  // Retailer Selection Styles
  retailerSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    margin: '20px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #E8EAED'
  },

  retailerHeader: {
    marginBottom: '16px'
  },

  retailerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#343538',
    margin: '0 0 4px 0'
  },

  retailerSubtitle: {
    fontSize: '14px',
    color: '#72767E',
    margin: 0
  },

  retailerLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    color: '#72767E',
    fontSize: '14px'
  },

  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #E8EAED',
    borderTop: '2px solid #0AAD0A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  // Inline loading spinner for controls
  inlineLoadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
    border: '1px solid #E8E9EB'
  },

  miniSpinner: {
    width: '12px',
    height: '12px',
    border: '1.5px solid #E8E9EB',
    borderTop: '1.5px solid #0AAD0A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  loadingText: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500'
  },

  retailerDropdownContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  retailerDropdown: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#343538',
    background: 'white',
    border: '2px solid #E8EAED',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },

  selectedRetailerInfo: {
    background: '#F8F9FA',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #E8EAED'
  },

  retailerInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  retailerLogo: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#F8F9FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #E8EAED'
  },

  retailerLogoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },

  retailerLogoFallback: {
    fontSize: '24px'
  },

  retailerDetails: {
    flex: 1
  },

  retailerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#343538',
    marginBottom: '4px'
  },

  retailerMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },

  retailerMetaItem: {
    fontSize: '13px',
    color: '#72767E',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  noRetailers: {
    textAlign: 'center',
    padding: '24px',
    color: '#72767E',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },

  retryButton: {
    background: '#0AAD0A',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  checkoutBtn: {
    background: '#0AAD0A',
    color: 'white',
    border: 'none',
    padding: '16px 48px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(10,173,10,0.3)'
  }
};

export default InstacartShoppingList;