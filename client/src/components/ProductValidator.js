// client/src/components/ProductValidator.js - ENHANCED with Loading States
import React, { useState, useEffect } from 'react';
import LoadingSpinner, { InlineSpinner, ButtonSpinner } from './LoadingSpinner';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [validatingItems, setValidatingItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(new Set());
  
  // Filter items that need review
  const itemsNeedingReview = items.filter(item => 
    item.needsReview || (item.confidence || 0) < 0.6
  );
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(itemsNeedingReview.length / itemsPerPage);
  const currentItems = itemsNeedingReview.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // 🆕 NEW: Auto-validate on mount
  useEffect(() => {
    if (itemsNeedingReview.length > 0 && validatedCount === 0) {
      validateCurrentPage();
    }
  }, []);

  // Validate a single item
  const validateItem = async (item) => {
    setValidatingItems(prev => new Set([...prev, item.id]));
    
    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.productName || item.itemName,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the item with validation results
        const updatedItems = items.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              ...data.validatedItem,
              needsReview: false,
              confidence: data.confidence || 0.9,
              isValidated: true,
              validatedAt: new Date().toISOString()
            };
          }
          return i;
        });
        
        onItemsUpdated(updatedItems);
        setValidatedCount(prev => prev + 1);
        
        return data;
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Validate all items on current page
  const validateCurrentPage = async () => {
    setIsValidatingAll(true);
    
    try {
      const validationPromises = currentItems.map(item => validateItem(item));
      await Promise.all(validationPromises);
      
      // Auto-advance to next page if available
      if (currentPage < totalPages - 1) {
        setTimeout(() => {
          setCurrentPage(prev => prev + 1);
        }, 500);
      }
    } finally {
      setIsValidatingAll(false);
    }
  };

  // Get suggestions for an item
  const getSuggestions = async (item) => {
    setFetchingSuggestions(prev => new Set([...prev, item.id]));
    
    try {
      const response = await fetch('/api/cart/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.productName || item.itemName,
          category: item.category
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    } finally {
      setFetchingSuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Update item with suggestion
  const applySuggestion = async (item, suggestion) => {
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          productName: suggestion.name,
          brand: suggestion.brand,
          size: suggestion.size,
          realPrice: suggestion.price,
          confidence: 0.95,
          needsReview: false,
          isValidated: true,
          validatedAt: new Date().toISOString()
        };
      }
      return i;
    });
    
    onItemsUpdated(updatedItems);
    setValidatedCount(prev => prev + 1);
  };

  // Skip an item
  const skipItem = (item) => {
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          needsReview: false,
          skipped: true
        };
      }
      return i;
    });
    
    onItemsUpdated(updatedItems);
  };

  // Progress calculation
  const progress = itemsNeedingReview.length > 0 
    ? (validatedCount / itemsNeedingReview.length) * 100 
    : 100;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            🔍 Product Validator
          </h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressInfo}>
            <span>Validated: {validatedCount} / {itemsNeedingReview.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${progress}%`
              }}
            />
          </div>
        </div>

        {/* Current Page Info */}
        <div style={styles.pageInfo}>
          Page {currentPage + 1} of {totalPages || 1}
        </div>

        {/* Items List */}
        <div style={styles.itemsList}>
          {currentItems.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>✅</div>
              <h3 style={styles.emptyTitle}>All items validated!</h3>
              <p style={styles.emptyText}>
                Your cart is looking great. All items have been validated.
              </p>
            </div>
          ) : (
            currentItems.map((item, index) => (
              <ValidatorItem
                key={item.id}
                item={item}
                index={index}
                isValidating={validatingItems.has(item.id)}
                isFetchingSuggestions={fetchingSuggestions.has(item.id)}
                onValidate={() => validateItem(item)}
                onGetSuggestions={() => getSuggestions(item)}
                onApplySuggestion={(suggestion) => applySuggestion(item, suggestion)}
                onSkip={() => skipItem(item)}
              />
            ))
          )}
        </div>

        {/* Actions */}
        {currentItems.length > 0 && (
          <div style={styles.actions}>
            <button
              onClick={validateCurrentPage}
              disabled={isValidatingAll}
              style={{
                ...styles.validateAllButton,
                opacity: isValidatingAll ? 0.7 : 1
              }}
            >
              {isValidatingAll ? (
                <>
                  <ButtonSpinner />
                  <span>Validating Page...</span>
                </>
              ) : (
                <>✅ Validate All on Page</>
              )}
            </button>
            
            <div style={styles.navigationButtons}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                style={styles.navButton}
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                style={styles.navButton}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual item component
function ValidatorItem({ 
  item, 
  index, 
  isValidating, 
  isFetchingSuggestions,
  onValidate, 
  onGetSuggestions, 
  onApplySuggestion, 
  onSkip 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(item.productName || item.itemName);

  const handleGetSuggestions = async () => {
    const fetchedSuggestions = await onGetSuggestions();
    setSuggestions(fetchedSuggestions);
    setShowSuggestions(true);
  };

  const handleSaveEdit = () => {
    // In a real app, this would update the item
    setEditMode(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      ...styles.itemCard,
      opacity: isValidating ? 0.7 : 1
    }}>
      {/* Item Header */}
      <div style={styles.itemHeader}>
        <div style={styles.itemNumber}>#{index + 1}</div>
        <div style={styles.itemInfo}>
          {editMode ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              style={styles.editInput}
              onBlur={handleSaveEdit}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
            />
          ) : (
            <h4 style={styles.itemName} onClick={() => setEditMode(true)}>
              {item.productName || item.itemName}
            </h4>
          )}
          <div style={styles.itemMeta}>
            <span style={styles.metaItem}>
              📦 {item.quantity} {item.unit || 'each'}
            </span>
            <span style={styles.metaItem}>
              🏷️ {item.category || 'other'}
            </span>
            <span style={{
              ...styles.metaItem,
              color: getConfidenceColor(item.confidence || 0)
            }}>
              🎯 {((item.confidence || 0) * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Original Text */}
      {item.original && item.original !== item.productName && (
        <div style={styles.originalText}>
          Original: "{item.original}"
        </div>
      )}

      {/* Actions */}
      <div style={styles.itemActions}>
        <button
          onClick={onValidate}
          disabled={isValidating}
          style={styles.validateButton}
        >
          {isValidating ? <ButtonSpinner /> : '✅'} Validate
        </button>
        
        <button
          onClick={handleGetSuggestions}
          disabled={isFetchingSuggestions}
          style={styles.suggestButton}
        >
          {isFetchingSuggestions ? <ButtonSpinner /> : '💡'} Suggestions
        </button>
        
        <button
          onClick={onSkip}
          style={styles.skipButton}
        >
          ⏭️ Skip
        </button>
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionsPanel}>
          <h5 style={styles.suggestionsTitle}>Suggested Products:</h5>
          <div style={styles.suggestionsList}>
            {suggestions.map((suggestion, idx) => (
              <div key={idx} style={styles.suggestionItem}>
                <div style={styles.suggestionInfo}>
                  <strong>{suggestion.name}</strong>
                  {suggestion.brand && <span> - {suggestion.brand}</span>}
                  {suggestion.size && <span> ({suggestion.size})</span>}
                  {suggestion.price && <span style={styles.price}> ${suggestion.price}</span>}
                </div>
                <button
                  onClick={() => {
                    onApplySuggestion(suggestion);
                    setShowSuggestions(false);
                  }}
                  style={styles.applySuggestionButton}
                >
                  Use This
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 50px rgba(0,0,0,0.3)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)'
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e40af'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  },

  progressSection: {
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },

  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },

  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
    borderRadius: '4px'
  },

  pageInfo: {
    textAlign: 'center',
    padding: '12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f9fafb'
  },

  itemsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },

  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '8px'
  },

  emptyText: {
    fontSize: '16px',
    color: '#6b7280'
  },

  itemCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    transition: 'all 0.2s'
  },

  itemHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px'
  },

  itemNumber: {
    width: '32px',
    height: '32px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0
  },

  itemInfo: {
    flex: 1
  },

  itemName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    cursor: 'pointer'
  },

  editInput: {
    width: '100%',
    padding: '4px 8px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    outline: 'none'
  },

  itemMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },

  metaItem: {
    fontSize: '13px',
    color: '#6b7280'
  },

  originalText: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: '12px',
    paddingLeft: '48px'
  },

  itemActions: {
    display: 'flex',
    gap: '8px',
    paddingLeft: '48px'
  },

  validateButton: {
    padding: '6px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: '100px',
    justifyContent: 'center'
  },

  suggestButton: {
    padding: '6px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: '120px',
    justifyContent: 'center'
  },

  skipButton: {
    padding: '6px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  suggestionsPanel: {
    marginTop: '12px',
    paddingLeft: '48px'
  },

  suggestionsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151'
  },

  suggestionsList: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px'
  },

  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderBottom: '1px solid #f3f4f6'
  },

  suggestionInfo: {
    flex: 1,
    fontSize: '14px'
  },

  price: {
    color: '#10b981',
    fontWeight: 'bold'
  },

  applySuggestionButton: {
    padding: '4px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  actions: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
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
    minWidth: '200px',
    justifyContent: 'center'
  },

  navigationButtons: {
    display: 'flex',
    gap: '8px'
  },

  navButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

export default ProductValidator;