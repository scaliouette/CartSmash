import React, { useState, useEffect, useCallback } from 'react';

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

  // Sync local items with parent
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

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

  // Get product image placeholder based on category
  const getProductImage = (item) => {
    // Use data URLs for reliable placeholders
    const categoryImages = {
      'Pantry': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#4CAF50"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">P</text></svg>`),
      'Produce': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#8BC34A"/><text x="24" y="30" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="white">PR</text></svg>`),
      'Dairy': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#03A9F4"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">D</text></svg>`),
      'Meat': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#F44336"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">M</text></svg>`),
      'Bakery': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#FF9800"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">B</text></svg>`),
      'Other': 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#9E9E9E"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">?</text></svg>`)
    };

    return item.imageUrl || categoryImages[getCategory(item)] || categoryImages.Other;
  };

  // Sort items
  const sortedItems = [...localItems].sort((a, b) => {
    switch(sortBy) {
      case 'confidence':
        return (b.confidence || 0) - (a.confidence || 0);
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'alphabetical':
        return (a.productName || '').localeCompare(b.productName || '');
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
          <div></div>
          <div>Product Name</div>
          <div>Qty</div>
          <div>Items Needed</div>
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
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,' + btoa(`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#9E9E9E"/><text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">?</text></svg>`);
                }}
              />
              <div style={styles.productDetails}>
                <span style={styles.productName}>{item.productName}</span>
                <span style={styles.productCategory}>
                  {getCategory(item)}
                  {item.brand && ` • ${item.brand}`}
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
              {item.quantity || 1}
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
    gridTemplateColumns: '60px 1fr 120px 180px 100px 50px',
    padding: '16px 20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    alignItems: 'center'
  },

  listItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 120px 180px 100px 50px',
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
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #E8E9EB'
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

  unitBadge: {
    background: '#E8F5E9',
    color: '#0AAD0A',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
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