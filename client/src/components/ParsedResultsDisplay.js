// client/src/components/ParsedResultsDisplay.js
import React, { useState, useEffect } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

function ParsedResultsDisplay({ items, currentUser, onItemsChange, parsingStats }) {
  const [viewMode, setViewMode] = useState('category'); // 'list' or 'category'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showInstacart, setShowInstacart] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Category configuration with better visuals
  const categoryInfo = {
    produce: { icon: '🥬', label: 'Produce', color: '#28a745', bgColor: '#d4edda' },
    dairy: { icon: '🥛', label: 'Dairy', color: '#17a2b8', bgColor: '#d1ecf1' },
    meat: { icon: '🥩', label: 'Meat & Seafood', color: '#dc3545', bgColor: '#f8d7da' },
    bakery: { icon: '🍞', label: 'Bakery', color: '#ffc107', bgColor: '#fff3cd' },
    pantry: { icon: '🥫', label: 'Pantry', color: '#6c757d', bgColor: '#e2e3e5' },
    beverages: { icon: '🥤', label: 'Beverages', color: '#20c997', bgColor: '#c3e6cb' },
    frozen: { icon: '❄️', label: 'Frozen', color: '#007bff', bgColor: '#cce5ff' },
    snacks: { icon: '🍿', label: 'Snacks', color: '#e83e8c', bgColor: '#f5c6cb' },
    other: { icon: '📦', label: 'Other', color: '#6610f2', bgColor: '#e7d6f6' }
  };

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Filter items based on search
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      (item.productName || item.itemName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const stats = {
    total: items.length,
    highConfidence: items.filter(item => (item.confidence || 0) >= 0.8).length,
    needsReview: items.filter(item => (item.confidence || 0) < 0.6).length,
    categories: Object.keys(itemsByCategory).length,
    selected: selectedItems.size
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  const handleQuickEdit = (item, field, value) => {
    const updatedItems = items.map(i => 
      i.id === item.id ? { ...i, [field]: value } : i
    );
    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onItemsChange(updatedItems);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedItems.size} selected items?`)) {
      const updatedItems = items.filter(item => !selectedItems.has(item.id));
      onItemsChange(updatedItems);
      setSelectedItems(new Set());
    }
  };

  const renderCategoryView = () => (
    <div style={styles.categoryContainer}>
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
        const catInfo = categoryInfo[category] || categoryInfo.other;
        const filteredCategoryItems = categoryItems.filter(item => 
          !searchQuery || (item.productName || item.itemName || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterCategory !== 'all' && category !== filterCategory) return null;
        if (filteredCategoryItems.length === 0) return null;

        return (
          <div key={category} style={styles.categorySection}>
            <div style={{
              ...styles.categoryHeader,
              backgroundColor: catInfo.bgColor,
              borderLeft: `4px solid ${catInfo.color}`
            }}>
              <div style={styles.categoryTitle}>
                <span style={styles.categoryIcon}>{catInfo.icon}</span>
                <span style={styles.categoryName}>{catInfo.label}</span>
                <span style={styles.categoryCount}>{filteredCategoryItems.length} items</span>
              </div>
              <button
                onClick={() => {
                  const catItemIds = filteredCategoryItems.map(i => i.id);
                  const newSelected = new Set(selectedItems);
                  
                  if (catItemIds.every(id => selectedItems.has(id))) {
                    catItemIds.forEach(id => newSelected.delete(id));
                  } else {
                    catItemIds.forEach(id => newSelected.add(id));
                  }
                  
                  setSelectedItems(newSelected);
                }}
                style={styles.selectCategoryBtn}
              >
                Select All
              </button>
            </div>

            <div style={styles.categoryItems}>
              {filteredCategoryItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    ...styles.itemCard,
                    ...(selectedItems.has(item.id) ? styles.itemCardSelected : {}),
                    ...(editingItem === item.id ? styles.itemCardEditing : {})
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => {
                      const newSelected = new Set(selectedItems);
                      if (selectedItems.has(item.id)) {
                        newSelected.delete(item.id);
                      } else {
                        newSelected.add(item.id);
                      }
                      setSelectedItems(newSelected);
                    }}
                    style={styles.checkbox}
                  />

                  <div style={styles.itemContent}>
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={item.productName || item.itemName}
                        onChange={(e) => handleQuickEdit(item, 'productName', e.target.value)}
                        onBlur={() => setEditingItem(null)}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingItem(null)}
                        style={styles.editInput}
                        autoFocus
                      />
                    ) : (
                      <div 
                        style={styles.itemName}
                        onClick={() => setEditingItem(item.id)}
                      >
                        {item.productName || item.itemName}
                      </div>
                    )}
                    
                    <div style={styles.itemDetails}>
                      <span style={styles.quantity}>
                        {item.quantity || 1} {item.unit || 'each'}
                      </span>
                      
                      {item.confidence !== undefined && (
                        <span 
                          style={{
                            ...styles.confidence,
                            color: getConfidenceColor(item.confidence)
                          }}
                          title={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                        >
                          {item.confidence >= 0.8 ? '✓' : item.confidence >= 0.6 ? '?' : '!'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    style={styles.removeBtn}
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div style={styles.listContainer}>
      {filteredItems.map((item, index) => {
        const catInfo = categoryInfo[item.category] || categoryInfo.other;
        
        return (
          <div
            key={item.id}
            style={{
              ...styles.listItem,
              ...(selectedItems.has(item.id) ? styles.listItemSelected : {}),
              ...(index % 2 === 0 ? styles.listItemEven : {})
            }}
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => {
                const newSelected = new Set(selectedItems);
                if (selectedItems.has(item.id)) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedItems(newSelected);
              }}
              style={styles.checkbox}
            />

            <div 
              style={{
                ...styles.categoryBadge,
                backgroundColor: catInfo.bgColor,
                color: catInfo.color
              }}
              title={catInfo.label}
            >
              {catInfo.icon}
            </div>

            <div style={styles.itemContent}>
              {editingItem === item.id ? (
                <input
                  type="text"
                  value={item.productName || item.itemName}
                  onChange={(e) => handleQuickEdit(item, 'productName', e.target.value)}
                  onBlur={() => setEditingItem(null)}
                  onKeyPress={(e) => e.key === 'Enter' && setEditingItem(null)}
                  style={styles.editInput}
                  autoFocus
                />
              ) : (
                <div 
                  style={styles.itemName}
                  onClick={() => setEditingItem(item.id)}
                >
                  {item.productName || item.itemName}
                </div>
              )}
            </div>

            <div style={styles.quantityControls}>
              <button
                onClick={() => handleQuickEdit(item, 'quantity', Math.max(1, (item.quantity || 1) - 1))}
                style={styles.quantityBtn}
              >
                -
              </button>
              <span style={styles.quantityValue}>
                {item.quantity || 1} {item.unit || ''}
              </span>
              <button
                onClick={() => handleQuickEdit(item, 'quantity', (item.quantity || 1) + 1)}
                style={styles.quantityBtn}
              >
                +
              </button>
            </div>

            {item.confidence !== undefined && (
              <div 
                style={{
                  ...styles.confidenceBadge,
                  backgroundColor: getConfidenceColor(item.confidence) + '20',
                  color: getConfidenceColor(item.confidence)
                }}
              >
                {(item.confidence * 100).toFixed(0)}%
              </div>
            )}

            <button
              onClick={() => handleRemoveItem(item.id)}
              style={styles.removeBtn}
              title="Remove item"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header with stats */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h2 style={styles.title}>
            🛒 Your Smart Cart ({items.length} items)
          </h2>
          
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewMode('category')}
              style={{
                ...styles.viewBtn,
                ...(viewMode === 'category' ? styles.viewBtnActive : {})
              }}
            >
              <span>📊</span> Category
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.viewBtn,
                ...(viewMode === 'list' ? styles.viewBtnActive : {})
              }}
            >
              <span>📝</span> List
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={styles.statsBar}>
          <span style={styles.stat}>
            <span style={{ color: '#28a745' }}>✓</span> {stats.highConfidence} verified
          </span>
          <span style={styles.stat}>
            <span style={{ color: '#ffc107' }}>?</span> {stats.needsReview} to review
          </span>
          <span style={styles.stat}>
            📁 {stats.categories} categories
          </span>
          {stats.selected > 0 && (
            <span style={styles.stat}>
              ☑️ {stats.selected} selected
            </span>
          )}
        </div>
      </div>

      {/* Search and filter bar */}
      <div style={styles.controlBar}>
        <input
          type="text"
          placeholder="🔍 Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          {Object.entries(categoryInfo).map(([key, info]) => (
            <option key={key} value={key}>
              {info.icon} {info.label}
            </option>
          ))}
        </select>

        {selectedItems.size > 0 && (
          <div style={styles.bulkActions}>
            <button
              onClick={handleBulkDelete}
              style={styles.bulkDeleteBtn}
            >
              🗑️ Delete {selectedItems.size}
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              style={styles.clearSelectionBtn}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={styles.content}>
        {viewMode === 'category' ? renderCategoryView() : renderListView()}
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          onClick={() => setShowInstacart(true)}
          style={styles.primaryBtn}
        >
          🛍️ Continue to Instacart
        </button>
        
        <button
          onClick={() => {
            const listText = items.map(item => 
              `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`
            ).join('\n');
            navigator.clipboard.writeText(listText);
            alert('List copied to clipboard!');
          }}
          style={styles.secondaryBtn}
        >
          📋 Copy List
        </button>
      </div>

      {/* Enhanced Instacart Modal */}
      {showInstacart && (
        <EnhancedInstacartModal
          items={items}
          currentUser={currentUser}
          onClose={() => setShowInstacart(false)}
        />
      )}
    </div>
  );
}

// Enhanced Instacart Modal Component
function EnhancedInstacartModal({ items, currentUser, onClose }) {
  const [selectedStore, setSelectedStore] = useState('kroger');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('delivery');

  const stores = [
    { id: 'kroger', name: 'Kroger', logo: '🛒', fee: '$3.99', minOrder: 35 },
    { id: 'safeway', name: 'Safeway', logo: '🏪', fee: '$4.99', minOrder: 35 },
    { id: 'wholefoods', name: 'Whole Foods', logo: '🌿', fee: '$4.99', minOrder: 35 },
    { id: 'costco', name: 'Costco', logo: '📦', fee: 'Free', minOrder: 0, membership: true },
    { id: 'target', name: 'Target', logo: '🎯', fee: '$5.99', minOrder: 35 },
    { id: 'walmart', name: 'Walmart', logo: '🏬', fee: '$7.95', minOrder: 35 }
  ];

  const selectedStoreInfo = stores.find(s => s.id === selectedStore);

  const handleProceed = () => {
    setIsProcessing(true);
    
    // Format search query
    const searchQuery = items.slice(0, 5)
      .map(i => i.productName || i.itemName)
      .join(' ');
    
    setTimeout(() => {
      // Open Instacart with the selected store
      const url = `https://www.instacart.com/store/${selectedStore}/search?query=${encodeURIComponent(searchQuery)}`;
      window.open(url, '_blank');
      onClose();
    }, 1000);
  };

  const estimatedTotal = items.reduce((sum, item) => {
    // Mock price calculation
    const avgPrice = 3.99;
    return sum + (avgPrice * (item.quantity || 1));
  }, 0);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        
        <h2 style={styles.modalTitle}>
          <span style={{ fontSize: '28px' }}>🛍️</span>
          Continue to Instacart
        </h2>

        {/* Delivery Options */}
        <div style={styles.deliveryOptions}>
          <label style={{
            ...styles.optionCard,
            ...(deliveryOption === 'delivery' ? styles.optionCardActive : {})
          }}>
            <input
              type="radio"
              value="delivery"
              checked={deliveryOption === 'delivery'}
              onChange={(e) => setDeliveryOption(e.target.value)}
              style={{ display: 'none' }}
            />
            <span style={styles.optionIcon}>🚚</span>
            <span>Delivery</span>
          </label>
          
          <label style={{
            ...styles.optionCard,
            ...(deliveryOption === 'pickup' ? styles.optionCardActive : {})
          }}>
            <input
              type="radio"
              value="pickup"
              checked={deliveryOption === 'pickup'}
              onChange={(e) => setDeliveryOption(e.target.value)}
              style={{ display: 'none' }}
            />
            <span style={styles.optionIcon}>🏪</span>
            <span>Pickup</span>
          </label>
        </div>

        {/* Store Selection Grid */}
        <div style={styles.storeGrid}>
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => setSelectedStore(store.id)}
              style={{
                ...styles.storeCard,
                ...(selectedStore === store.id ? styles.storeCardActive : {})
              }}
            >
              <div style={styles.storeLogo}>{store.logo}</div>
              <div style={styles.storeName}>{store.name}</div>
              <div style={styles.storeFee}>{store.fee}</div>
              {store.membership && (
                <div style={styles.membershipBadge}>Membership</div>
              )}
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div style={styles.orderSummary}>
          <h3 style={styles.summaryTitle}>Order Summary</h3>
          <div style={styles.summaryRow}>
            <span>Items ({items.length})</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Delivery Fee</span>
            <span>{selectedStoreInfo?.fee}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Service Fee</span>
            <span>$2.99</span>
          </div>
          <div style={{
            ...styles.summaryRow,
            ...styles.summaryTotal
          }}>
            <span>Estimated Total</span>
            <span>${(estimatedTotal + 2.99 + (parseFloat(selectedStoreInfo?.fee?.replace('$', '') || 0))).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.modalActions}>
          <button
            onClick={handleProceed}
            disabled={isProcessing}
            style={styles.proceedBtn}
          >
            {isProcessing ? (
              <>⏳ Opening Instacart...</>
            ) : (
              <>🚀 Continue to {selectedStoreInfo?.name}</>
            )}
          </button>
        </div>

        <p style={styles.disclaimer}>
          You'll be redirected to Instacart to complete your order
        </p>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: '24px'
  },

  header: {
    padding: '24px',
    borderBottom: '1px solid #e9ecef'
  },

  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },

  viewToggle: {
    display: 'flex',
    gap: '4px',
    background: '#f3f4f6',
    padding: '4px',
    borderRadius: '10px'
  },

  viewBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },

  viewBtnActive: {
    background: 'white',
    color: '#1f2937',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  statsBar: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: '#6b7280'
  },

  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  controlBar: {
    padding: '16px 24px',
    background: '#f9fafb',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },

  searchInput: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },

  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer'
  },

  bulkActions: {
    display: 'flex',
    gap: '8px'
  },

  bulkDeleteBtn: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  clearSelectionBtn: {
    padding: '8px 16px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  content: {
    padding: '24px',
    minHeight: '400px',
    maxHeight: '600px',
    overflowY: 'auto'
  },

  // Category View Styles
  categoryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  categorySection: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e9ecef'
  },

  categoryHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  categoryTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  categoryIcon: {
    fontSize: '20px'
  },

  categoryName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },

  categoryCount: {
    fontSize: '13px',
    padding: '2px 8px',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '12px',
    color: '#4b5563'
  },

  selectCategoryBtn: {
    padding: '6px 12px',
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },

  categoryItems: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: '#fafafa'
  },

  itemCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s'
  },

  itemCardSelected: {
    background: '#fef3c7',
    borderColor: '#fbbf24'
  },

  itemCardEditing: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },

  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  itemName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1f2937',
    cursor: 'pointer'
  },

  itemDetails: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#6b7280'
  },

  quantity: {
    fontWeight: '500'
  },

  confidence: {
    fontWeight: 'bold'
  },

  editInput: {
    width: '100%',
    padding: '4px 8px',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '15px',
    outline: 'none'
  },

  removeBtn: {
    width: '28px',
    height: '28px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // List View Styles
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'white',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },

  listItemEven: {
    background: '#fafafa'
  },

  listItemSelected: {
    background: '#fef3c7',
    borderColor: '#fbbf24'
  },

  categoryBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold'
  },

  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  quantityBtn: {
    width: '24px',
    height: '24px',
    background: '#e5e7eb',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },

  quantityValue: {
    minWidth: '60px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500'
  },

  confidenceBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold'
  },

  // Action buttons
  actions: {
    padding: '24px',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    gap: '12px'
  },

  primaryBtn: {
    flex: 1,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 12px rgba(40,167,69,0.3)'
  },

  secondaryBtn: {
    padding: '14px 24px',
    background: 'white',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },

  modal: {
    background: 'white',
    borderRadius: '20px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },

  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },

  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },

  deliveryOptions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px'
  },

  optionCard: {
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center'
  },

  optionCardActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff'
  },

  optionIcon: {
    fontSize: '20px'
  },

  storeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px'
  },

  storeCard: {
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    position: 'relative'
  },

  storeCardActive: {
    borderColor: '#10b981',
    background: '#d1fae5'
  },

  storeLogo: {
    fontSize: '32px',
    marginBottom: '8px'
  },

  storeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },

  storeFee: {
    fontSize: '12px',
    color: '#6b7280'
  },

  membershipBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#fbbf24',
    color: '#92400e',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },

  orderSummary: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px'
  },

  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#6b7280'
  },

  summaryTotal: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px',
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#1f2937'
  },

  modalActions: {
    display: 'flex',
    gap: '12px'
  },

  proceedBtn: {
    flex: 1,
    padding: '16px',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
  },

  disclaimer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '16px'
  }
};

export default ParsedResultsDisplay;