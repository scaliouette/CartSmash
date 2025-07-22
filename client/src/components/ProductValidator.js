// client/src/components/ProductValidator.js
import React, { useState, useEffect } from 'react';
import { ButtonSpinner, InlineSpinner } from './LoadingSpinner';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [validatingItems, setValidatingItems] = useState(new Set());
  const [localItems, setLocalItems] = useState([]);
  const [filter, setFilter] = useState('needs-review'); // 'all', 'needs-review', 'validated'
  const [validatingAll, setValidatingAll] = useState(false);

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

  // Handle field update
  const handleFieldUpdate = (itemId, field, value) => {
    setLocalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            [field]: value
          } 
        : item
    ));
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setLocalItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Validate single item
  const handleValidateItem = async (itemId) => {
    setValidatingItems(prev => new Set([...prev, itemId]));
    
    try {
      // Mark as validated with high confidence
      setLocalItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              needsReview: false,
              confidence: 0.95,
              validatedAt: new Date().toISOString()
            } 
          : item
      ));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      
      // Validate each item
      for (const item of itemsToValidate) {
        await handleValidateItem(item.id);
      }
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

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🔍 Product Validator</h2>
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
                <InlineSpinner color="white" /> Validating...
              </>
            ) : (
              <>🚀 Validate All Remaining ({itemsNeedingReview.length})</>
            )}
          </button>
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
              
              return (
                <div 
                  key={item.id} 
                  style={{
                    ...styles.itemCard,
                    ...(isValidated ? styles.itemCardValidated : {})
                  }}
                >
                  {/* Status Badge */}
                  <div 
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getConfidenceColor(item.confidence || 0)
                    }}
                  >
                    {isValidated ? '✅ Validated' : '⚠️ Needs Review'}
                  </div>

                  {/* Item Content - Always Editable */}
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
                      Original: "{item.original}"
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
                      <button
                        onClick={() => handleValidateItem(item.id)}
                        disabled={isValidating}
                        style={styles.validateButton}
                      >
                        {isValidating ? <InlineSpinner /> : '✅'} Validate
                      </button>
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

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1000px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },

  header: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '40px',
    height: '40px',
  },

  statsBar: {
    display: 'flex',
    gap: '32px',
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },

  stat: {
    textAlign: 'center',
  },

  statNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },

  filterTabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  filterTab: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s',
  },

  filterTabActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },

  actionBar: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  validateAllButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  itemsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#9ca3af',
    fontSize: '18px',
  },

  itemCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '2px solid #e5e7eb',
    position: 'relative',
    transition: 'all 0.2s',
  },

  itemCardValidated: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },

  statusBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },

  itemContent: {
    marginRight: '140px',
  },

  itemRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },

  itemField: {
    flex: 1,
  },

  itemFieldSmall: {
    width: '120px',
  },

  fieldLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    display: 'block',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'border-color 0.2s',
    backgroundColor: 'white',
  },

  select: {
    width: '100%',
    padding: '8px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
    fontWeight: '500',
    cursor: 'pointer',
  },

  originalText: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
  },

  confidenceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  confidenceLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },

  confidenceTrack: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },

  confidenceValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    minWidth: '40px',
  },

  itemActions: {
    position: 'absolute',
    top: '60px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  validateButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  removeButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },

  footer: {
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },

  cancelButtonLarge: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  saveAllButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

// Add focus styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .product-validator-input:focus {
    outline: none;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;
document.head.appendChild(styleSheet);

// Add the focus class to inputs
if (typeof document !== 'undefined') {
  setTimeout(() => {
    document.querySelectorAll('input, select').forEach(el => {
      if (el.closest('[style*="Product Validator"]')) {
        el.classList.add('product-validator-input');
      }
    });
  }, 100);
}

export default ProductValidator;