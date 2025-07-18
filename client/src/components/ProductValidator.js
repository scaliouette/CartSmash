import React, { useState, useEffect } from 'react';

function ProductValidator({ items = [], onItemsUpdated = () => {}, onClose = () => {} }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [validationMode, setValidationMode] = useState('review'); // 'review' or 'edit'
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];

  // Filter items that need review
  const needsReview = safeItems.filter(item => 
    item && (item.needsReview || (item.confidence || 0) < 0.6)
  );

  // Filter items based on search term
  const filteredItems = needsReview.filter(item => {
    if (!item) return false;
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.productName || item.itemName || '').toLowerCase();
    const originalText = (item.original || '').toLowerCase();
    
    return itemName.includes(searchLower) || originalText.includes(searchLower);
  });

  useEffect(() => {
    // Auto-select items with very low confidence
    const autoSelect = needsReview
      .filter(item => item && (item.confidence || 0) < 0.3)
      .map(item => item.id)
      .filter(id => id); // Remove any undefined IDs
    setSelectedItems(autoSelect);
  }, [needsReview]);

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleApproveSelected = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate API call to approve items
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedItems = safeItems.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, needsReview: false, confidence: Math.max(item.confidence || 0, 0.8) }
          : item
      );
      
      onItemsUpdated(updatedItems);
      onClose();
    } catch (error) {
      console.error('Failed to approve items:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSelected = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate API call to reject items
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedItems = safeItems.filter(item => !selectedItems.includes(item.id));
      onItemsUpdated(updatedItems);
      onClose();
    } catch (error) {
      console.error('Failed to reject items:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemEdit = (itemId, field, value) => {
    const updatedItems = safeItems.map(item => 
      item.id === itemId 
        ? { ...item, [field]: value, needsReview: false, confidence: 0.9 }
        : item
    );
    onItemsUpdated(updatedItems);
  };

  const handleSmartSuggestion = async (itemId) => {
    setIsProcessing(true);
    
    try {
      const item = safeItems.find(i => i.id === itemId);
      
      if (!item) {
        console.error('Item not found:', itemId);
        return;
      }
      
      // Simulate AI suggestion API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock smart suggestions based on original text
      const suggestions = generateSmartSuggestions(item.original || item.productName || '');
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        const updatedItems = safeItems.map(i => 
          i.id === itemId 
            ? { ...i, productName: suggestion, needsReview: false, confidence: 0.85 }
            : i
        );
        onItemsUpdated(updatedItems);
      }
    } catch (error) {
      console.error('Smart suggestion failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSmartSuggestions = (text) => {
    const suggestions = [];
    const lowerText = text.toLowerCase();
    
    // Smart replacements based on common patterns
    if (lowerText.includes('chicken')) {
      suggestions.push('chicken breast', 'chicken thighs', 'whole chicken');
    } else if (lowerText.includes('milk')) {
      suggestions.push('whole milk', '2% milk', 'skim milk');
    } else if (lowerText.includes('bread')) {
      suggestions.push('whole wheat bread', 'white bread', 'sourdough bread');
    } else if (lowerText.includes('cheese')) {
      suggestions.push('cheddar cheese', 'mozzarella cheese', 'swiss cheese');
    } else if (lowerText.includes('apple')) {
      suggestions.push('red apples', 'green apples', 'gala apples');
    } else {
      // Generic cleanup
      const cleaned = text
        .replace(/\b(cook|bake|prepare|add|use)\b/gi, '')
        .replace(/\b(until|for|at|in|with)\b.*/gi, '')
        .replace(/[()]/g, '')
        .trim();
      if (cleaned && cleaned !== text) {
        suggestions.push(cleaned);
      }
    }
    
    return suggestions.filter(s => s.trim().length > 0);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getIssueType = (item) => {
    if (!item) return 'Invalid Item';
    if ((item.confidence || 0) < 0.3) return 'Very Low Confidence';
    if ((item.confidence || 0) < 0.6) return 'Low Confidence';
    if (!item.productName || item.productName.length < 3) return 'Invalid Name';
    if (item.factors && item.factors.includes('too_generic')) return 'Too Generic';
    return 'Needs Review';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            🔍 Product Validator ({needsReview.length} items need attention)
          </h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.modeSelector}>
          <button 
            onClick={() => setValidationMode('review')}
            style={{
              ...styles.modeButton,
              ...(validationMode === 'review' ? styles.modeButtonActive : {})
            }}
          >
            📋 Review Mode
          </button>
          <button 
            onClick={() => setValidationMode('edit')}
            style={{
              ...styles.modeButton,
              ...(validationMode === 'edit' ? styles.modeButtonActive : {})
            }}
          >
            ✏️ Edit Mode
          </button>
        </div>

        <div style={styles.controls}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <div style={styles.selectionControls}>
            <button onClick={handleSelectAll} style={styles.selectAllButton}>
              {selectedItems.length === filteredItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span style={styles.selectedCount}>
              {selectedItems.length} of {filteredItems.length} selected
            </span>
          </div>
        </div>

        <div style={styles.itemsList}>
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              // Skip rendering if item is null/undefined or missing required properties
              if (!item || !item.id) return null;
              
              return (
                <div 
                  key={item.id} 
                  style={{
                    ...styles.itemCard,
                    ...(selectedItems.includes(item.id) ? styles.itemCardSelected : {})
                  }}
                >
                  <div style={styles.itemHeader}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleItemToggle(item.id)}
                      style={styles.checkbox}
                    />
                    
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>
                        {validationMode === 'edit' ? (
                          <input
                            type="text"
                            value={item.productName || item.itemName || ''}
                            onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
                            style={styles.itemNameInput}
                          />
                        ) : (
                          <span>{item.productName || item.itemName || 'Unnamed item'}</span>
                        )}
                      </div>
                      
                      <div style={styles.itemMetadata}>
                        <span style={{
                          ...styles.confidenceBadge,
                          backgroundColor: getConfidenceColor(item.confidence || 0)
                        }}>
                          {((item.confidence || 0) * 100).toFixed(0)}%
                        </span>
                        
                        <span style={styles.issueType}>
                          {getIssueType(item)}
                        </span>
                        
                        {item.category && (
                          <span style={styles.categoryBadge}>
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={styles.itemActions}>
                      <button
                        onClick={() => handleSmartSuggestion(item.id)}
                        disabled={isProcessing}
                        style={styles.suggestButton}
                        title="Get AI suggestion"
                      >
                        🤖
                      </button>
                    </div>
                  </div>

                  <div style={styles.itemDetails}>
                    {item.original && (
                      <div style={styles.originalText}>
                        <span style={styles.originalLabel}>Original:</span>
                        <span style={styles.originalValue}>{item.original}</span>
                      </div>
                    )}

                    {validationMode === 'edit' && (
                      <div style={styles.editControls}>
                        <div style={styles.editRow}>
                          <label style={styles.editLabel}>Quantity:</label>
                          <input
                            type="text"
                            value={item.quantity || '1'}
                            onChange={(e) => handleItemEdit(item.id, 'quantity', e.target.value)}
                            style={styles.quantityInput}
                          />
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
                            placeholder="unit"
                            style={styles.unitInput}
                          />
                        </div>
                        
                        <div style={styles.editRow}>
                          <label style={styles.editLabel}>Category:</label>
                          <select
                            value={item.category || 'other'}
                            onChange={(e) => handleItemEdit(item.id, 'category', e.target.value)}
                            style={styles.categorySelect}
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
                    )}

                    {item.factors && item.factors.length > 0 && (
                      <div style={styles.factors}>
                        <span style={styles.factorsLabel}>Issues:</span>
                        {item.factors.map((factor, index) => (
                          <span key={index} style={styles.factorTag}>
                            {factor.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }).filter(Boolean) // Remove any null items
          ) : null}
        </div>

        {filteredItems.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>✨</div>
            <h4 style={styles.emptyTitle}>All items look good!</h4>
            <p style={styles.emptyDescription}>
              {searchTerm ? 'No items match your search.' : 'No items need validation.'}
            </p>
          </div>
        )}

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <div style={styles.summary}>
              <strong>{needsReview.length}</strong> items need attention
              {selectedItems.length > 0 && (
                <span> • <strong>{selectedItems.length}</strong> selected</span>
              )}
            </div>
          </div>
          
          <div style={styles.footerRight}>
            <button 
              onClick={onClose} 
              style={styles.cancelButton}
              disabled={isProcessing}
            >
              Cancel
            </button>
            
            <button 
              onClick={handleRejectSelected} 
              disabled={selectedItems.length === 0 || isProcessing}
              style={styles.rejectButton}
            >
              {isProcessing ? '⏳ Processing...' : '🗑️ Remove Selected'}
            </button>
            
            <button 
              onClick={handleApproveSelected} 
              disabled={selectedItems.length === 0 || isProcessing}
              style={styles.approveButton}
            >
              {isProcessing ? '⏳ Processing...' : '✅ Approve Selected'}
            </button>
          </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '20px'
  },

  modal: {
    background: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white'
  },

  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold'
  },

  closeButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  modeSelector: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },

  modeButton: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },

  modeButtonActive: {
    backgroundColor: 'white',
    color: '#1f2937',
    borderBottom: '2px solid #f59e0b'
  },

  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    borderBottom: '1px solid #e5e7eb',
    gap: '20px',
    flexWrap: 'wrap'
  },

  searchContainer: {
    flex: 1,
    minWidth: '200px'
  },

  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },

  selectionControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },

  selectAllButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  selectedCount: {
    fontSize: '14px',
    color: '#6b7280'
  },

  itemsList: {
    flex: 1,
    overflow: 'auto',
    padding: '0 30px'
  },

  itemCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    margin: '15px 0',
    padding: '15px',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },

  itemCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff'
  },

  itemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '10px'
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px'
  },

  itemInfo: {
    flex: 1
  },

  itemName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: '8px'
  },

  itemNameInput: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500'
  },

  itemMetadata: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },

  confidenceBadge: {
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white'
  },

  issueType: {
    fontSize: '12px',
    color: '#ef4444',
    fontWeight: '500'
  },

  categoryBadge: {
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
  },

  itemActions: {
    display: 'flex',
    gap: '5px'
  },

  suggestButton: {
    padding: '4px 8px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'opacity 0.2s'
  },

  itemDetails: {
    marginTop: '10px',
    paddingLeft: '30px'
  },

  originalText: {
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    marginBottom: '10px'
  },

  originalLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    marginRight: '8px'
  },

  originalValue: {
    fontSize: '12px',
    color: '#374151',
    fontStyle: 'italic'
  },

  editControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px'
  },

  editRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  editLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    minWidth: '60px'
  },

  quantityInput: {
    width: '60px',
    padding: '4px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'center'
  },

  unitInput: {
    width: '80px',
    padding: '4px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px'
  },

  categorySelect: {
    padding: '4px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: 'white'
  },

  factors: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '8px'
  },

  factorsLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280'
  },

  factorTag: {
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '500'
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  emptyTitle: {
    color: '#1f2937',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },

  emptyDescription: {
    color: '#6b7280',
    fontSize: '16px',
    lineHeight: '1.5'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },

  footerLeft: {},

  summary: {
    fontSize: '14px',
    color: '#374151'
  },

  footerRight: {
    display: 'flex',
    gap: '10px'
  },

  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  rejectButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  approveButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
};

export default ProductValidator;