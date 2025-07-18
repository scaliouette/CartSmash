// client/src/components/ProductValidator.js - Review and correct flagged items
import React, { useState, useEffect } from 'react';

function ProductValidator({ items, onItemsUpdated, onClose }) {
  const [reviewItems, setReviewItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    // Filter items that need review (low confidence)
    const needsReview = items.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.6
    );
    setReviewItems(needsReview);
    setCurrentIndex(0);
    
    // Load suggestions for each item
    loadSuggestions(needsReview);
  }, [items]);

  const loadSuggestions = async (itemsToReview) => {
    const suggestionMap = {};
    
    for (const item of itemsToReview) {
      try {
        const response = await fetch(`/api/products/alternatives/${encodeURIComponent(item.productName || item.itemName)}`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          suggestionMap[item.id] = data.alternatives || [];
        }
      } catch (error) {
        console.warn(`Failed to load suggestions for ${item.productName}:`, error);
        suggestionMap[item.id] = [];
      }
    }
    
    setSuggestions(suggestionMap);
  };

  const handleAcceptItem = async (item) => {
    setIsProcessing(true);
    
    try {
      // Mark item as accepted with higher confidence
      const updatedItem = {
        ...item,
        confidence: Math.max(item.confidence || 0, 0.8),
        needsReview: false,
        reviewedBy: 'user',
        reviewedAt: new Date().toISOString(),
        status: 'accepted'
      };
      
      // Update item in backend
      const response = await fetch(`/api/cart/item/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      if (response.ok) {
        // Remove from review list
        setReviewItems(prev => prev.filter(reviewItem => reviewItem.id !== item.id));
        
        // Update parent component
        if (onItemsUpdated) {
          const allItemsUpdated = items.map(i => 
            i.id === item.id ? updatedItem : i
          );
          onItemsUpdated(allItemsUpdated);
        }
        
        console.log(`✅ Item accepted: ${item.productName}`);
        
        // Move to next item
        if (currentIndex < reviewItems.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (reviewItems.length <= 1) {
          // No more items to review
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Failed to accept item:', error);
      alert('Failed to accept item. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectItem = async (item) => {
    setIsProcessing(true);
    
    try {
      // Remove item from cart
      const response = await fetch(`/api/cart/item/${item.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from review list and all items
        setReviewItems(prev => prev.filter(reviewItem => reviewItem.id !== item.id));
        
        if (onItemsUpdated) {
          const allItemsUpdated = items.filter(i => i.id !== item.id);
          onItemsUpdated(allItemsUpdated);
        }
        
        console.log(`❌ Item rejected and removed: ${item.productName}`);
        
        // Move to next item or close if done
        if (currentIndex < reviewItems.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (reviewItems.length <= 1) {
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Failed to reject item:', error);
      alert('Failed to reject item. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem({
      ...item,
      newProductName: item.productName || item.itemName,
      newQuantity: item.quantity || 1,
      newUnit: item.unit || '',
      newCategory: item.category || 'other'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    setIsProcessing(true);
    
    try {
      const updatedItem = {
        ...editingItem,
        productName: editingItem.newProductName,
        itemName: editingItem.newProductName,
        quantity: editingItem.newQuantity,
        unit: editingItem.newUnit,
        category: editingItem.newCategory,
        confidence: 0.9, // High confidence for manually edited items
        needsReview: false,
        reviewedBy: 'user_edit',
        reviewedAt: new Date().toISOString(),
        status: 'edited'
      };
      
      const response = await fetch(`/api/cart/item/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      if (response.ok) {
        // Update review list
        setReviewItems(prev => prev.filter(reviewItem => reviewItem.id !== editingItem.id));
        
        if (onItemsUpdated) {
          const allItemsUpdated = items.map(i => 
            i.id === editingItem.id ? updatedItem : i
          );
          onItemsUpdated(allItemsUpdated);
        }
        
        setEditingItem(null);
        console.log(`✏️ Item edited: ${updatedItem.productName}`);
        
        // Move to next item
        if (currentIndex < reviewItems.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (reviewItems.length <= 1) {
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplaceWithSuggestion = async (item, suggestion) => {
    setIsProcessing(true);
    
    try {
      const updatedItem = {
        ...item,
        productName: suggestion.name,
        itemName: suggestion.name,
        category: suggestion.category,
        confidence: 0.85, // High confidence for suggested replacements
        needsReview: false,
        reviewedBy: 'user_suggestion',
        reviewedAt: new Date().toISOString(),
        status: 'replaced',
        originalProduct: item.productName || item.itemName,
        replacementReason: suggestion.reason
      };
      
      const response = await fetch(`/api/cart/item/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      
      if (response.ok) {
        setReviewItems(prev => prev.filter(reviewItem => reviewItem.id !== item.id));
        
        if (onItemsUpdated) {
          const allItemsUpdated = items.map(i => 
            i.id === item.id ? updatedItem : i
          );
          onItemsUpdated(allItemsUpdated);
        }
        
        console.log(`🔄 Item replaced: ${item.productName} → ${suggestion.name}`);
        
        // Move to next item
        if (currentIndex < reviewItems.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (reviewItems.length <= 1) {
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Failed to replace item:', error);
      alert('Failed to replace item. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < reviewItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back to first item
    }
  };

  if (!reviewItems || reviewItems.length === 0) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.successMessage}>
            <h3 style={styles.successTitle}>🎉 All Items Validated!</h3>
            <p style={styles.successText}>
              Your cart looks great! All items have been validated and are ready for ordering.
            </p>
            <button onClick={onClose} style={styles.doneButton}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];
  const itemSuggestions = suggestions[currentItem?.id] || [];

  if (editingItem) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>✏️ Edit Product</h3>
            <button onClick={() => setEditingItem(null)} style={styles.closeButton}>×</button>
          </div>
          
          <div style={styles.editForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Product Name:</label>
              <input
                type="text"
                value={editingItem.newProductName}
                onChange={(e) => setEditingItem(prev => ({
                  ...prev,
                  newProductName: e.target.value
                }))}
                style={styles.input}
                placeholder="Enter product name"
              />
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Quantity:</label>
                <input
                  type="number"
                  value={editingItem.newQuantity}
                  onChange={(e) => setEditingItem(prev => ({
                    ...prev,
                    newQuantity: parseFloat(e.target.value) || 1
                  }))}
                  style={styles.smallInput}
                  min="0.1"
                  step="0.1"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Unit:</label>
                <select
                  value={editingItem.newUnit}
                  onChange={(e) => setEditingItem(prev => ({
                    ...prev,
                    newUnit: e.target.value
                  }))}
                  style={styles.select}
                >
                  <option value="">No unit</option>
                  <option value="lbs">lbs</option>
                  <option value="oz">oz</option>
                  <option value="cups">cups</option>
                  <option value="gallon">gallon</option>
                  <option value="dozen">dozen</option>
                  <option value="bag">bag</option>
                  <option value="box">box</option>
                  <option value="bottle">bottle</option>
                  <option value="can">can</option>
                  <option value="jar">jar</option>
                </select>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Category:</label>
              <select
                value={editingItem.newCategory}
                onChange={(e) => setEditingItem(prev => ({
                  ...prev,
                  newCategory: e.target.value
                }))}
                style={styles.select}
              >
                <option value="produce">🥬 Produce</option>
                <option value="dairy">🥛 Dairy</option>
                <option value="meat">🥩 Meat</option>
                <option value="pantry">🥫 Pantry</option>
                <option value="frozen">🧊 Frozen</option>
                <option value="bakery">🍞 Bakery</option>
                <option value="beverages">🥤 Beverages</option>
                <option value="snacks">🍿 Snacks</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            
            <div style={styles.editActions}>
              <button 
                onClick={handleSaveEdit}
                disabled={isProcessing}
                style={styles.saveButton}
              >
                {isProcessing ? '💾 Saving...' : '💾 Save Changes'}
              </button>
              <button 
                onClick={() => setEditingItem(null)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>🔍 Review Flagged Items</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        
        <div style={styles.progress}>
          <div style={styles.progressText}>
            Item {currentIndex + 1} of {reviewItems.length}
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${((currentIndex + 1) / reviewItems.length) * 100}%`
              }} 
            />
          </div>
        </div>
        
        <div style={styles.itemCard}>
          <div style={styles.itemHeader}>
            <h4 style={styles.itemName}>
              {currentItem?.productName || currentItem?.itemName}
            </h4>
            <div style={styles.confidenceBadge}>
              Confidence: {((currentItem?.confidence || 0) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div style={styles.itemDetails}>
            <div style={styles.detail}>
              <strong>Original:</strong> "{currentItem?.original}"
            </div>
            <div style={styles.detail}>
              <strong>Quantity:</strong> {currentItem?.quantity || 1} {currentItem?.unit || ''}
            </div>
            <div style={styles.detail}>
              <strong>Category:</strong> {currentItem?.category || 'Unknown'}
            </div>
            {currentItem?.factors && (
              <div style={styles.detail}>
                <strong>AI Analysis:</strong>
                <div style={styles.factors}>
                  {currentItem.factors.map((factor, i) => (
                    <span key={i} style={styles.factor}>{factor}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Suggestions */}
          {itemSuggestions.length > 0 && (
            <div style={styles.suggestions}>
              <h5 style={styles.suggestionsTitle}>💡 Suggested Alternatives:</h5>
              <div style={styles.suggestionsList}>
                {itemSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleReplaceWithSuggestion(currentItem, suggestion)}
                    disabled={isProcessing}
                    style={styles.suggestionButton}
                  >
                    <div style={styles.suggestionName}>{suggestion.name}</div>
                    <div style={styles.suggestionPrice}>${suggestion.price}</div>
                    <div style={styles.suggestionReason}>{suggestion.reason}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div style={styles.actions}>
          <button
            onClick={() => handleAcceptItem(currentItem)}
            disabled={isProcessing}
            style={styles.acceptButton}
          >
            {isProcessing ? '⏳' : '✅'} Accept As-Is
          </button>
          
          <button
            onClick={() => handleEditItem(currentItem)}
            disabled={isProcessing}
            style={styles.editButton}
          >
            ✏️ Edit Product
          </button>
          
          <button
            onClick={() => handleRejectItem(currentItem)}
            disabled={isProcessing}
            style={styles.rejectButton}
          >
            {isProcessing ? '⏳' : '❌'} Remove Item
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isProcessing}
            style={styles.skipButton}
          >
            ⏭️ Skip for Now
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  
  modal: {
    backgroundColor: 'white',
    borderRadius: '15px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '2px solid #f0f0f0',
    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)'
  },
  
  title: {
    margin: 0,
    color: '#1565c0',
    fontSize: '22px',
    fontWeight: 'bold'
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  progress: {
    padding: '15px 25px',
    backgroundColor: '#f8f9fa'
  },
  
  progressText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
    textAlign: 'center'
  },
  
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  
  itemCard: {
    padding: '25px',
    backgroundColor: 'white'
  },
  
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  
  itemName: {
    margin: 0,
    color: '#333',
    fontSize: '20px',
    fontWeight: 'bold',
    flex: 1
  },
  
  confidenceBadge: {
    padding: '4px 12px',
    backgroundColor: '#ffc107',
    color: '#212529',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  
  itemDetails: {
    marginBottom: '20px'
  },
  
  detail: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#555'
  },
  
  factors: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '6px'
  },
  
  factor: {
    display: 'inline-block',
    background: '#e9ecef',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#495057'
  },
  
  suggestions: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },
  
  suggestionsTitle: {
    margin: '0 0 12px 0',
    color: '#495057',
    fontSize: '16px'
  },
  
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  suggestionButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  },
  
  suggestionName: {
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  
  suggestionPrice: {
    color: '#28a745',
    fontWeight: 'bold',
    marginLeft: '10px'
  },
  
  suggestionReason: {
    fontSize: '12px',
    color: '#666',
    marginLeft: '10px'
  },
  
  actions: {
    display: 'flex',
    gap: '10px',
    padding: '20px 25px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #dee2e6',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  
  acceptButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  
  editButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  
  rejectButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  
  skipButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  
  // Edit form styles
  editForm: {
    padding: '25px'
  },
  
  formGroup: {
    marginBottom: '15px'
  },
  
  formRow: {
    display: 'flex',
    gap: '15px'
  },
  
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333',
    fontSize: '14px'
  },
  
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  
  smallInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  
  editActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'flex-end'
  },
  
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  
  // Success message styles
  successMessage: {
    padding: '40px',
    textAlign: 'center'
  },
  
  successTitle: {
    margin: '0 0 15px 0',
    color: '#28a745',
    fontSize: '24px'
  },
  
  successText: {
    margin: '0 0 25px 0',
    color: '#666',
    fontSize: '16px',
    lineHeight: '1.5'
  },
  
  doneButton: {
    padding: '12px 30px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'background-color 0.2s ease'
  }
};

export default ProductValidator;