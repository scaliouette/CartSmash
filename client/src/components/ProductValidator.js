// client/src/components/ProductValidator.js - FIXED VERSION
import React, { useState, useEffect } from 'react';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [localItems, setLocalItems] = useState([]);
  const [filter, setFilter] = useState('needs-review'); // Default to needs review
  const [editedItems, setEditedItems] = useState(new Map());

  // Initialize local items with proper structure
  useEffect(() => {
    console.log(`🔍 ProductValidator received ${items.length} items:`, items);
    
    // Ensure all items have required fields
    const normalizedItems = items.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productName: item.productName || item.itemName || item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'each',
      category: item.category || 'other',
      confidence: item.confidence !== undefined ? item.confidence : 0.5,
      needsReview: item.needsReview !== undefined ? item.needsReview : (item.confidence || 0) < 0.8,
      original: item.original || ''
    }));
    
    console.log(`📝 ProductValidator normalized ${normalizedItems.length} items:`, normalizedItems);
    setLocalItems(normalizedItems);
  }, [items]);

  // Get items that need review (only high confidence 0.8+ is considered validated)
  const itemsNeedingReview = localItems.filter(item => 
    item.needsReview || (item.confidence || 0) < 0.8
  );

  // Filter items based on selected filter and sort by lowest confidence first
  const filteredItems = localItems
    .filter(item => {
      if (filter === 'all') return true;
      if (filter === 'needs-review') return item.needsReview || (item.confidence || 0) < 0.8;
      if (filter === 'validated') return !item.needsReview && (item.confidence || 0) >= 0.8;
      return true;
    })
    .sort((a, b) => (a.confidence || 0) - (b.confidence || 0)); // Sort by lowest confidence first

  console.log(`🔽 Filtering with '${filter}': ${localItems.length} -> ${filteredItems.length} items`);

  // Common units for dropdown
      const commonUnits = [
      { value: 'each', label: 'each' },
      { value: 'lb', label: 'lb' },
      { value: 'lbs', label: 'lbs' },
      { value: 'oz', label: 'oz' },
      { value: 'kg', label: 'kg' },
      { value: 'g', label: 'g' },
      { value: 'cup', label: 'cup' },
      { value: 'cups', label: 'cups' },
      { value: 'tbsp', label: 'tbsp' },
      { value: 'tsp', label: 'tsp' },
      { value: 'l', label: 'liter' },
      { value: 'ml', label: 'ml' },
      { value: 'gal', label: 'gallon' },
      { value: 'qt', label: 'quart' },
      { value: 'pt', label: 'pint' },
      { value: 'fl oz', label: 'fl oz' },
      { value: 'dozen', label: 'dozen' },
      { value: 'can', label: 'can' },
      { value: 'cans', label: 'cans' },
      { value: 'bottle', label: 'bottle' },
      { value: 'bottles', label: 'bottles' },
      { value: 'bag', label: 'bag' },
      { value: 'bags', label: 'bags' },
      { value: 'box', label: 'box' },
      { value: 'boxes', label: 'boxes' },
      { value: 'jar', label: 'jar' },
      { value: 'jars', label: 'jars' },
      { value: 'pack', label: 'pack' },
      { value: 'package', label: 'package' },
      { value: 'container', label: 'container' },
      { value: 'containers', label: 'containers' },
      { value: 'bunch', label: 'bunch' },
      { value: 'head', label: 'head' },
      { value: 'loaf', label: 'loaf' },
      { value: 'piece', label: 'piece' },
      { value: 'clove', label: 'clove' }
    ];

  // Categories for dropdown
  const categories = [
    { value: 'produce', label: '🥬 Produce' },
    { value: 'dairy', label: '🥛 Dairy' },
    { value: 'meat', label: '🥩 Meat' },
    { value: 'pantry', label: '🥫 Pantry' },
    { value: 'beverages', label: '🥤 Beverages' },
    { value: 'frozen', label: '🧊 Frozen' },
    { value: 'bakery', label: '🍞 Bakery' },
    { value: 'snacks', label: '🍿 Snacks' },
    { value: 'other', label: '📦 Other' }
  ];

  // Handle field update
  const handleFieldUpdate = (itemId, field, value) => {
    setLocalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, [field]: value }
        : item
    ));
    
    setEditedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId) || {};
      newMap.set(itemId, { ...existing, [field]: value });
      return newMap;
    });
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    setLocalItems(prev => prev.filter(item => item.id !== itemId));
    setEditedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  // Accept item as-is
  const handleAcceptItem = (itemId) => {
    setLocalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            needsReview: false,
            confidence: Math.max(item.confidence || 0, 0.95),
            validatedAt: new Date().toISOString(),
            userApproved: true
          } 
        : item
    ));
    
    console.log(`✅ Item ${itemId} accepted`);
  };

  // Accept all items that need review
  const handleAcceptAll = () => {
    const itemsToAccept = localItems.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.8
    );
    
    if (itemsToAccept.length === 0) {
      alert('No items need to be accepted!');
      return;
    }

    setLocalItems(prev => prev.map(item => 
      (item.needsReview || (item.confidence || 0) < 0.8)
        ? { 
            ...item, 
            needsReview: false,
            confidence: Math.max(item.confidence || 0, 0.95),
            validatedAt: new Date().toISOString(),
            userApproved: true
          } 
        : item
    ));
    
    console.log(`✅ Accepted ${itemsToAccept.length} items`);
  };


  // Save all changes and close
  const handleSaveAll = () => {
    // Pass back the updated items
    onItemsUpdated(localItems);
    onClose();
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#FB4F14'; // CartSmash orange for high confidence
    if (confidence >= 0.6) return '#002244'; // CartSmash navy for medium confidence  
    return '#ef4444'; // Keep red for low confidence
  };

  // Check if item has been edited
  const isItemEdited = (itemId) => {
    return editedItems.has(itemId);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🔍 Review & Accept Items</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Stats Bar with Filter Tabs */}
        <div style={styles.statsBarWithTabs}>
          <div style={styles.statsSection}>
            <div style={styles.stat}>
              <span style={styles.statNumber}>{localItems.length}</span>
              <span style={styles.statLabel}>Total Items</span>
            </div>
            <div style={styles.stat}>
              <span style={{ ...styles.statNumber, color: '#ef4444' }}>
                {itemsNeedingReview.length}
              </span>
              <span style={styles.statLabel}>Need Review</span>
            </div>
            <div style={styles.stat}>
              <span style={{ ...styles.statNumber, color: '#f59e0b' }}>
                {editedItems.size}
              </span>
              <span style={styles.statLabel}>Edited</span>
            </div>
            <div style={styles.stat}>
              <span style={{ ...styles.statNumber, color: '#10b981' }}>
                {localItems.filter(item => !item.needsReview && item.confidence >= 0.8).length}
              </span>
              <span style={styles.statLabel}>Accepted</span>
            </div>
          </div>

          <div style={styles.filterTabsInline}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterTabInline,
                ...(filter === 'all' ? styles.filterTabInlineActive : {})
              }}
            >
              📦 All Items
            </button>
            <button
              onClick={() => setFilter('needs-review')}
              style={{
                ...styles.filterTabInline,
                ...(filter === 'needs-review' ? styles.filterTabInlineActive : {})
              }}
            >
              ⚠️ Needs Review ({itemsNeedingReview.length})
            </button>
            <button
              onClick={() => setFilter('validated')}
              style={{
                ...styles.filterTabInline,
                ...(filter === 'validated' ? styles.filterTabInlineActive : {})
              }}
            >
              ✅ Accepted
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionBar}>
          {itemsNeedingReview.length > 0 && (
            <button
              onClick={handleAcceptAll}
              style={styles.acceptAllButton}
            >
              ✅ Accept All ({itemsNeedingReview.length} items)
            </button>
          )}
          
          {editedItems.size > 0 && (
            <span style={styles.editIndicator}>
              ⚠️ {editedItems.size} items have unsaved edits
            </span>
          )}
        </div>

        {/* Items List */}
        <div style={styles.itemsList}>
          {filteredItems.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No items to display</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isValidated = !item.needsReview && (item.confidence || 0) >= 0.8;
              const isEdited = isItemEdited(item.id);
              
              return (
                <div 
                  key={item.id} 
                  style={{
                    ...styles.itemCard,
                    ...(isValidated ? styles.itemCardValidated : {}),
                    ...(isEdited ? styles.itemCardEdited : {})
                  }}
                >
                  {/* Status Badge Row with Confidence and Actions */}
                  <div style={styles.statusRow}>
                    <div 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getConfidenceColor(item.confidence || 0)
                      }}
                    >
                      {isValidated ? '✅ Accepted' : isEdited ? '✏️ Edited' : '⚠️'}
                    </div>
                    
                    <div style={styles.topRowActions}>
                      <div style={styles.confidenceBarTop}>
                        <span style={styles.confidenceValueTop}>
                          {((item.confidence || 0) * 100).toFixed(0)}%
                        </span>
                        <div style={styles.confidenceTrackTop}>
                          <div 
                            style={{
                              ...styles.confidenceFill,
                              width: `${(item.confidence || 0) * 100}%`,
                              backgroundColor: getConfidenceColor(item.confidence || 0)
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={styles.topActions}>
                        {!isValidated && (
                          <button
                            onClick={() => handleAcceptItem(item.id)}
                            style={styles.acceptButtonTop}
                            title="Accept as-is"
                          >
                            ✅ Accept
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          style={styles.removeButtonTop}
                          title="Remove item"
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Item Content */}
                  <div style={styles.itemContent}>
                    <div style={styles.itemRow}>
                      <div style={styles.itemField}>
                        <label style={styles.fieldLabel}>Product Name</label>
                        <input
                          type="text"
                          value={item.productName || ''}
                          onChange={(e) => handleFieldUpdate(item.id, 'productName', e.target.value)}
                          style={styles.input}
                          placeholder="Enter product name"
                        />
                      </div>

                      <div style={styles.itemFieldSmall}>
                        <label style={styles.fieldLabel}>Quantity</label>
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => handleFieldUpdate(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                          style={{ ...styles.input, width: '80px' }}
                          step="0.25"
                          min="0"
                        />
                      </div>

                      <div style={styles.itemFieldSmall}>
                        <label style={styles.fieldLabel}>Unit</label>
                        <select
                          value={item.unit || 'each'}
                          onChange={(e) => handleFieldUpdate(item.id, 'unit', e.target.value)}
                          style={styles.select}
                        >
                          {commonUnits.map(unit => (
                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.itemFieldSmall}>
                        <label style={styles.fieldLabel}>Category</label>
                        <select
                          value={item.category || 'other'}
                          onChange={(e) => handleFieldUpdate(item.id, 'category', e.target.value)}
                          style={styles.select}
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>


                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleSaveAll} style={styles.saveAllButton}>
            💾 Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '1200px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '2px solid #e5e7eb'
  },

  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 8px'
  },

  statsBarWithTabs: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },

  statsSection: {
    display: 'flex',
    gap: '24px'
  },

  filterTabsInline: {
    display: 'flex',
    gap: '8px'
  },

  filterTabInline: {
    padding: '6px 12px',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },

  filterTabInlineActive: {
    backgroundColor: '#002244',
    borderColor: '#002244',
    color: 'white'
  },

  // Legacy style kept for compatibility
  statsBar: {
    display: 'flex',
    gap: '24px',
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  statNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },

  filterTabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px',
    borderBottom: '2px solid #e5e7eb'
  },

  filterTab: {
    padding: '10px 18px',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },

  filterTabActive: {
    backgroundColor: '#002244',
    borderColor: '#002244',
    color: 'white'
  },

  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#f9fafb'
  },

  acceptAllButton: {
    padding: '12px 24px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },

  validateAllButton: {
    padding: '12px 24px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  editIndicator: {
    fontSize: '16px',
    color: '#f59e0b',
    fontWeight: '500'
  },

  itemsList: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px'
  },

  itemCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: 'white'
  },

  itemCardValidated: {
    borderColor: '#FB4F14',
    backgroundColor: '#fff7f0'
  },

  itemCardEdited: {
    borderColor: '#002244',
    backgroundColor: '#f0f4ff'
  },

  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },

  statusBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white'
  },

  topRowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  confidenceBarTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  confidenceValueTop: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: '35px'
  },

  confidenceTrackTop: {
    width: '60px',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden'
  },

  topActions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },

  acceptButtonTop: {
    padding: '6px 12px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '80px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s'
  },

  validateButtonTop: {
    padding: '6px 12px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '90px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s'
  },

  removeButtonTop: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '80px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s'
  },

  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  itemRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end'
  },

  itemField: {
    flex: 1
  },

  itemFieldSmall: {
    width: '150px'
  },

  fieldLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px'
  },

  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },

  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white'
  },

  originalText: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },

  confidenceAndActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },

  confidenceBarCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1
  },

  confidenceLabelCompact: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    minWidth: '70px'
  },

  confidenceTrackCompact: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  },

  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s'
  },

  confidenceValueCompact: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: '35px'
  },

  itemActionsCompact: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  },

  acceptButtonCompact: {
    padding: '4px 6px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    minWidth: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  validateButtonCompact: {
    padding: '4px 6px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    minWidth: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  removeButtonCompact: {
    padding: '4px 6px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    minWidth: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Legacy styles kept for backward compatibility
  confidenceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  confidenceLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280'
  },

  confidenceTrack: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },

  confidenceValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  itemActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  },

  acceptButton: {
    padding: '6px 12px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  validateButton: {
    padding: '6px 12px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  removeButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '2px solid #e5e7eb'
  },

  cancelButton: {
    padding: '12px 28px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  saveAllButton: {
    padding: '12px 28px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#6b7280'
  }
};

export default ProductValidator;