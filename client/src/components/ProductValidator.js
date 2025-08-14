// CRITICAL FIX 1: ProductValidator.js - Fix Review Items Functionality
// Replace the existing ProductValidator component with this fixed version

import React, { useState, useEffect } from 'react';
import { ButtonSpinner, InlineSpinner } from './LoadingSpinner';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [validatingItems, setValidatingItems] = useState(new Set());
  const [localItems, setLocalItems] = useState([]);
  const [filter, setFilter] = useState('needs-review');
  const [validatingAll, setValidatingAll] = useState(false);
  const [editedItems, setEditedItems] = useState(new Map()); // Track edited items

  // Initialize local items
  useEffect(() => {
    setLocalItems(items.map(item => ({ ...item })));
  }, [items]);

  // Get items that need review
  const itemsNeedingReview = localItems.filter(item => 
    item.needsReview || (item.confidence || 0) < 0.6
  );

  // Filter items based on selected filter
  const filteredItems = localItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'needs-review') return item.needsReview || (item.confidence || 0) < 0.6;
    if (filter === 'validated') return !item.needsReview && (item.confidence || 0) >= 0.6;
    return true;
  });

  // Common units for dropdown
  const commonUnits = [
    'each', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp',
    'l', 'ml', 'gal', 'qt', 'pt', 'fl oz', 'dozen',
    'can', 'bottle', 'bag', 'box', 'jar', 'pack', 'container',
    'bunch', 'head', 'loaf', 'piece', 'clove'
  ];

  // Handle field update - Store in editedItems map
  const handleFieldUpdate = (itemId, field, value) => {
    // Update local state
    setLocalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, [field]: value }
        : item
    ));
    
    // Track that this item was edited
    setEditedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId) || {};
      newMap.set(itemId, { ...existing, [field]: value });
      return newMap;
    });
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setLocalItems(prev => prev.filter(item => item.id !== itemId));
      setEditedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    }
  };

  // Accept item (mark as validated without changing)
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
  };

  // Validate single item with changes
  const handleValidateItem = async (itemId) => {
    setValidatingItems(prev => new Set([...prev, itemId]));
    
    try {
      // Apply any edits and mark as validated
      const editedFields = editedItems.get(itemId) || {};
      
      setLocalItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item,
              ...editedFields, // Apply any edits
              needsReview: false,
              confidence: 0.95,
              validatedAt: new Date().toISOString(),
              userValidated: true
            } 
          : item
      ));
      
      // Clear from edited items
      setEditedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Validate all items needing review
  const handleValidateAll = async () => {
    setValidatingAll(true);
    
    try {
      // Get all items that need validation
      const itemsToValidate = localItems.filter(item => 
        item.needsReview || (item.confidence || 0) < 0.6
      );
      
      // Apply edits and validate each item
      const updatedItems = localItems.map(item => {
        if (itemsToValidate.find(i => i.id === item.id)) {
          const editedFields = editedItems.get(item.id) || {};
          return {
            ...item,
            ...editedFields,
            needsReview: false,
            confidence: 0.95,
            validatedAt: new Date().toISOString(),
            userValidated: true
          };
        }
        return item;
      });
      
      setLocalItems(updatedItems);
      setEditedItems(new Map()); // Clear all edits
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } finally {
      setValidatingAll(false);
    }
  };

  // Save all changes
  const handleSaveAll = () => {
    onItemsUpdated(localItems);
    onClose();
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
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
          <h2 style={styles.title}>🔍 Review & Validate Items</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
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
              {localItems.filter(item => !item.needsReview && item.confidence >= 0.6).length}
            </span>
            <span style={styles.statLabel}>Validated</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={styles.filterTabs}>
          <button
            onClick={() => setFilter('needs-review')}
            style={{
              ...styles.filterTab,
              ...(filter === 'needs-review' ? styles.filterTabActive : {})
            }}
          >
            Needs Review ({itemsNeedingReview.length})
          </button>
          <button
            onClick={() => setFilter('validated')}
            style={{
              ...styles.filterTab,
              ...(filter === 'validated' ? styles.filterTabActive : {})
            }}
          >
            Validated
          </button>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...styles.filterTab,
              ...(filter === 'all' ? styles.filterTabActive : {})
            }}
          >
            All Items
          </button>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionBar}>
          <button
            onClick={handleValidateAll}
            disabled={itemsNeedingReview.length === 0 || validatingAll}
            style={{
              ...styles.validateAllButton,
              opacity: (itemsNeedingReview.length === 0 || validatingAll) ? 0.5 : 1,
              cursor: (itemsNeedingReview.length === 0 || validatingAll) ? 'not-allowed' : 'pointer'
            }}
          >
            {validatingAll ? (
              <>
                <InlineSpinner color="white" /> Validating All...
              </>
            ) : (
              <>🚀 Validate All Items ({itemsNeedingReview.length})</>
            )}
          </button>
          
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
              const isValidating = validatingItems.has(item.id);
              const isValidated = !item.needsReview && (item.confidence || 0) >= 0.6;
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
                  {/* Status Badge */}
                  <div 
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getConfidenceColor(item.confidence || 0)
                    }}
                  >
                    {isValidated ? '✅ Validated' : isEdited ? '✏️ Edited' : '⚠️ Needs Review'}
                  </div>

                  {/* Item Content */}
                  <div style={styles.itemContent}>
                    <div style={styles.itemRow}>
                      <div style={styles.itemField}>
                        <label style={styles.fieldLabel}>Product Name</label>
                        <input
                          type="text"
                          value={item.productName || item.itemName || ''}
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
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Category Selection */}
                    <div style={styles.itemRow}>
                      <div style={styles.itemFieldSmall}>
                        <label style={styles.fieldLabel}>Category</label>
                        <select
                          value={item.category || 'other'}
                          onChange={(e) => handleFieldUpdate(item.id, 'category', e.target.value)}
                          style={styles.select}
                        >
                          <option value="produce">🥬 Produce</option>
                          <option value="dairy">🥛 Dairy</option>
                          <option value="meat">🥩 Meat</option>
                          <option value="pantry">🥫 Pantry</option>
                          <option value="beverages">🥤 Beverages</option>
                          <option value="frozen">🧊 Frozen</option>
                          <option value="bakery">🍞 Bakery</option>
                          <option value="snacks">🍿 Snacks</option>
                          <option value="other">📦 Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Original Text */}
                    <div style={styles.originalText}>
                      Original: "{item.original || item.rawText || 'N/A'}"
                    </div>

                    {/* Confidence Score */}
                    <div style={styles.confidenceBar}>
                      <span style={styles.confidenceLabel}>Confidence:</span>
                      <div style={styles.confidenceTrack}>
                        <div 
                          style={{
                            ...styles.confidenceFill,
                            width: `${(item.confidence || 0) * 100}%`,
                            backgroundColor: getConfidenceColor(item.confidence || 0)
                          }}
                        />
                      </div>
                      <span style={styles.confidenceValue}>
                        {((item.confidence || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={styles.itemActions}>
                    {!isValidated && (
                      <>
                        <button
                          onClick={() => handleAcceptItem(item.id)}
                          style={styles.acceptButton}
                          title="Accept as-is"
                        >
                          ✅ Accept
                        </button>
                        <button
                          onClick={() => handleValidateItem(item.id)}
                          disabled={isValidating}
                          style={styles.validateButton}
                          title="Validate with changes"
                        >
                          {isValidating ? <InlineSpinner /> : '💾'} Save & Validate
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={styles.removeButton}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButtonLarge}>
            Cancel
          </button>
          <button onClick={handleSaveAll} style={styles.saveAllButton}>
            💾 Save All Changes & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced styles with new states
const styles = {
  // ... existing styles plus:
  
  itemCardEdited: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  
  acceptButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  
  editIndicator: {
    marginLeft: '20px',
    fontSize: '14px',
    color: '#f59e0b',
    fontWeight: '500',
  },
  
  // ... rest of existing styles
};

export default ProductValidator;