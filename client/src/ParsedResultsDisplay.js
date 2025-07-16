import React, { useState } from 'react';
import InstacartIntegration from './InstacartIntegration';

function ParsedResultsDisplay({ items, onItemEdit, onItemRemove, onAddToCart }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'category'
  const [editingItem, setEditingItem] = useState(null);
  const [showInstacart, setShowInstacart] = useState(false);

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Category metadata
  const categoryInfo = {
    produce: { icon: '🥬', label: 'Produce', order: 1 },
    dairy: { icon: '🥛', label: 'Dairy', order: 2 },
    meat: { icon: '🥩', label: 'Meat & Seafood', order: 3 },
    bakery: { icon: '🍞', label: 'Bakery', order: 4 },
    pantry: { icon: '🥫', label: 'Pantry', order: 5 },
    frozen: { icon: '❄️', label: 'Frozen', order: 6 },
    other: { icon: '📦', label: 'Other', order: 7 }
  };

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectedCount = selectedItems.size;
  const totalCount = items.length;

  const renderItem = (item) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <div 
        key={item.id} 
        style={{
          ...styles.itemRow,
          backgroundColor: isSelected ? '#e8f5e9' : 'white'
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(item.id)}
          style={styles.checkbox}
        />
        
        <div style={styles.itemInfo}>
          <span style={styles.itemName}>
            {item.itemName}
          </span>
          
          {item.quantity && (
            <span style={styles.quantity}>
              {item.quantity} {item.unit || ''}
            </span>
          )}
          
          {item.original !== item.itemName && (
            <span style={styles.originalText}>
              "{item.original}"
            </span>
          )}
        </div>
        
        <div style={styles.itemActions}>
          <button
            onClick={() => onItemRemove && onItemRemove(item.id)}
            style={styles.removeButton}
            title="Remove item"
          >
            ❌
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.stats}>
          <h3 style={styles.title}>
            📋 Parsed Results ({totalCount} items)
          </h3>
          {selectedCount > 0 && (
            <span style={styles.selectedCount}>
              {selectedCount} selected
            </span>
          )}
        </div>
        
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <button
            onClick={() => setShowInstacart(true)}
            style={{...styles.viewButton, backgroundColor: '#00D084', color: 'white'}}
          >
            🛒 Open Instacart
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={styles.actionBar}>
          <button
            onClick={() => {
              const selected = items.filter(item => selectedItems.has(item.id));
              setShowInstacart(true);
            }}
            style={styles.addToCartButton}
          >
            🛒 Add {selectedCount} to Instacart
          </button>
          
          <button
            onClick={() => setSelectedItems(new Set())}
            style={styles.clearButton}
          >
            ✖️ Clear Selection
          </button>
        </div>
      )}

      <div style={styles.itemsContainer}>
        <div style={styles.listView}>
          {items.map(renderItem)}
        </div>
      </div>
      
      {showInstacart && (
        <InstacartIntegration
          items={selectedCount > 0 
            ? items.filter(item => selectedItems.has(item.id))
            : items
          }
          onClose={() => setShowInstacart(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  title: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '20px',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  selectedCount: {
    backgroundColor: '#00D084',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '14px',
    fontWeight: '600',
  },
  viewButton: {
    padding: '6px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  actionBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  addToCartButton: {
    backgroundColor: '#00D084',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  itemsContainer: {
    marginBottom: '20px',
  },
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s',
  },
  checkbox: {
    marginRight: '12px',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  itemName: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  quantity: {
    color: '#666',
    fontSize: '14px',
    backgroundColor: '#e9ecef',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  originalText: {
    color: '#6c757d',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  itemActions: {
    display: 'flex',
    gap: '5px',
  },
  removeButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
};

export default ParsedResultsDisplay;