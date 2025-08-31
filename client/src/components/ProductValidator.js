// client/src/components/ProductValidator.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { ButtonSpinner, InlineSpinner } from './LoadingSpinner';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [validatingItems, setValidatingItems] = useState(new Set());
  const [localItems, setLocalItems] = useState([]);
  const [filter, setFilter] = useState('needs-review');
  const [validatingAll, setValidatingAll] = useState(false);
  const [editedItems, setEditedItems] = useState(new Map());

  // Initialize local items with proper structure
  useEffect(() => {
    // Ensure all items have required fields
    const normalizedItems = items.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productName: item.productName || item.itemName || item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'each',
      category: item.category || 'other',
      confidence: item.confidence !== undefined ? item.confidence : 0.5,
      needsReview: item.needsReview !== undefined ? item.needsReview : (item.confidence || 0) < 0.6,
      original: item.original || ''
    }));
    
    setLocalItems(normalizedItems);
    console.log(`📝 ProductValidator loaded with ${normalizedItems.length} items`);
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
    if (window.confirm('Remove this item from your cart?')) {
      setLocalItems(prev => prev.filter(item => item.id !== itemId));
      setEditedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    }
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

  // Validate single item with AI
  const handleValidateItem = async (itemId) => {
    setValidatingItems(prev => new Set([...prev, itemId]));
    
    try {
      const item = localItems.find(i => i.id === itemId);
      const editedFields = editedItems.get(itemId) || {};
      
      // Call backend to re-validate with AI
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/ai/validate-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            ...item,
            ...editedFields
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const validatedProduct = data.validatedProducts[0];
        
        setLocalItems(prev => prev.map(i => 
          i.id === itemId 
            ? { 
                ...i,
                ...editedFields,
                confidence: validatedProduct.confidence || 0.95,
                needsReview: false,
                validatedAt: new Date().toISOString(),
                userValidated: true
              }
            : i
        ));
        
        console.log(`✅ Item ${itemId} validated with AI`);
      }
      
      setEditedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
      
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Validation failed. Please try again.');
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
    const itemsToValidate = localItems.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.6
    );
    
    if (itemsToValidate.length === 0) {
      alert('No items need validation!');
      return;
    }
    
    setValidatingAll(true);
    
    try {
      // Apply edits and prepare for validation
      const productsToValidate = itemsToValidate.map(item => {
        const editedFields = editedItems.get(item.id) || {};
        return {
          ...item,
          ...editedFields
        };
      });
      
      // Call backend to validate all with AI
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/ai/validate-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: productsToValidate
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update items with validation results
        const updatedItems = localItems.map(item => {
          const validated = data.validatedProducts.find(v => v.id === item.id);
          if (validated) {
            const editedFields = editedItems.get(item.id) || {};
            return {
              ...item,
              ...editedFields,
              confidence: validated.confidence || 0.95,
              needsReview: false,
              validatedAt: new Date().toISOString(),
              userValidated: true
            };
          }
          return item;
        });
        
        setLocalItems(updatedItems);
        setEditedItems(new Map());
        
        alert(`✅ Validated ${itemsToValidate.length} items successfully!`);
      }
      
    } catch (error) {
      console.error('Bulk validation failed:', error);
      alert('Failed to validate items. Please try again.');
    } finally {
      setValidatingAll(false);
    }
  };

  // Save all changes and close
  const handleSaveAll = () => {
    // Pass back the updated items
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
            ⚠️ Needs Review ({itemsNeedingReview.length})
          </button>
          <button
            onClick={() => setFilter('validated')}
            style={{
              ...styles.filterTab,
              ...(filter === 'validated' ? styles.filterTabActive : {})
            }}
          >
            ✅ Validated
          </button>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...styles.filterTab,
              ...(filter === 'all' ? styles.filterTabActive : {})
            }}
          >
            📦 All Items
          </button>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionBar}>
          <button
            onClick={handleValidateAll}
            disabled={itemsNeedingReview.length === 0 || validatingAll}
            style={styles.validateAllButton}
          >
            {validatingAll ? (
              <>
                <InlineSpinner color="white" /> Validating All...
              </>
            ) : (
              <>🚀 Validate All ({itemsNeedingReview.length})</>
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
                    {isValidated ? '✅ Validated' : isEdited ? '✏️ Edited' : '⚠️ Review'}
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
                            <option key={unit} value={unit}>{unit}</option>
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

                    {/* Original Text */}
                    {item.original && (
                      <div style={styles.originalText}>
                        Original: "{item.original}"
                      </div>
                    )}

                    {/* Confidence Bar */}
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
                          title="Validate with AI"
                        >
                          {isValidating ? <InlineSpinner /> : '🤖'} Validate
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
    fontSize: '24px',
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
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  statLabel: {
    fontSize: '12px',
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
    padding: '8px 16px',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },

  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: 'white'
  },

  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#f9fafb'
  },

  validateAllButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  editIndicator: {
    fontSize: '14px',
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
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },

  itemCardEdited: {
    borderColor: '#fbbf24',
    backgroundColor: '#fef3c7'
  },

  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '12px'
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
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px'
  },

  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },

  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
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

  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s'
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
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  validateButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
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
    padding: '10px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  saveAllButton: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
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