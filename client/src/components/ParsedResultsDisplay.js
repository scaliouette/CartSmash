import React, { useState, useEffect } from 'react';

function ParsedResultsDisplay({ items, currentUser, onItemsChange, parsingStats }) {
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [showStats, setShowStats] = useState(false); // ✅ FIX: Hidden by default
  const [isMobile, setIsMobile] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ✅ FIX: Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ NEW: Common units for dropdown
  const commonUnits = [
    { value: 'each', label: 'each' },
    { value: 'lbs', label: 'lbs' },
    { value: 'oz', label: 'oz' },
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'cups', label: 'cups' },
    { value: 'tbsp', label: 'tbsp' },
    { value: 'tsp', label: 'tsp' },
    { value: 'l', label: 'liters' },
    { value: 'ml', label: 'ml' },
    { value: 'gal', label: 'gallons' },
    { value: 'qt', label: 'quarts' },
    { value: 'pt', label: 'pints' },
    { value: 'fl oz', label: 'fl oz' },
    { value: 'dozen', label: 'dozen' },
    { value: 'can', label: 'can' },
    { value: 'bottle', label: 'bottle' },
    { value: 'bag', label: 'bag' },
    { value: 'box', label: 'box' },
    { value: 'jar', label: 'jar' },
    { value: 'pack', label: 'pack' },
    { value: 'container', label: 'container' },
    { value: 'bunch', label: 'bunch' },
    { value: 'head', label: 'head' },
    { value: 'loaf', label: 'loaf' },
    { value: 'piece', label: 'piece' },
    { value: 'clove', label: 'clove' }
  ];

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      if (filterBy === 'all') return true;
      if (filterBy === 'high-confidence') return (item.confidence || 0) >= 0.8;
      if (filterBy === 'needs-review') return (item.confidence || 0) < 0.6;
      if (filterBy === item.category) return true;
      return false;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === 'category') {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        // Secondary sort by name within category
        return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      }
      if (sortBy === 'name') return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      return 0;
    });

  // Calculate statistics
  const stats = {
    total: items.length,
    highConfidence: items.filter(item => (item.confidence || 0) >= 0.8).length,
    mediumConfidence: items.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
    lowConfidence: items.filter(item => (item.confidence || 0) < 0.6).length,
    categories: [...new Set(items.map(item => item.category))].length,
    averageConfidence: items.length > 0 ? 
      items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length : 0,
    totalEstimatedPrice: items.reduce((sum, item) => {
      if (item.realPrice) {
        return sum + (item.realPrice * (item.quantity || 1));
      }
      return sum;
    }, 0)
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Med';
    return 'Low';
  };

  // ✅ NEW: Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      'produce': '🥬',
      'dairy': '🥛',
      'meat': '🥩',
      'pantry': '🥫',
      'beverages': '🥤',
      'frozen': '🧊',
      'bakery': '🍞',
      'snacks': '🍿',
      'other': '📦'
    };
    return icons[category] || '📦';
  };

  // ✅ ENHANCED: Item edit with server update
  const handleItemEdit = async (itemId, field, value) => {
    // Update locally first for immediate UI response
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onItemsChange(updatedItems);
    
    // Update on server
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) {
        console.error('Failed to update item on server');
        // Could revert the change here if needed
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleRemoveItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      const updatedItems = items.filter(item => item.id !== itemId);
      onItemsChange(updatedItems);
    }
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'Quantity', 'Unit', 'Category', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        `"${item.productName || item.itemName}"`,
        item.quantity || 1,
        item.unit || 'each',
        item.category || 'other',
        ((item.confidence || 0) * 100).toFixed(0) + '%'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group items by category when sorting by category
  const renderGroupedItems = () => {
    const grouped = {};
    filteredAndSortedItems.forEach(item => {
      const category = item.category || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    return Object.entries(grouped).map(([category, categoryItems]) => (
      <div key={category}>
        <div style={styles.categoryHeader}>
          <span style={styles.categoryIcon}>{getCategoryIcon(category)}</span>
          <span style={styles.categoryName}>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
          <span style={styles.categoryCount}>({categoryItems.length} items)</span>
        </div>
        {categoryItems.map((item, index) => renderItem(item, index))}
      </div>
    ));
  };

  // ✅ NEW: Render individual item as line item
  const renderItem = (item, index) => (
    <div 
      key={item.id || index} 
      style={{
        ...styles.itemRow,
        ...(index % 2 === 0 ? styles.itemRowEven : {}),
        ...(editingItem === item.id ? styles.itemRowEditing : {})
      }}
    >
      {/* Category Icon */}
      <div style={styles.itemCategory}>
        <span title={item.category}>{getCategoryIcon(item.category)}</span>
      </div>

      {/* Product Name */}
      <div style={styles.itemName}>
        {editingItem === item.id ? (
          <input
            type="text"
            value={item.productName || item.itemName || ''}
            onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
            onBlur={() => setEditingItem(null)}
            onKeyPress={(e) => e.key === 'Enter' && setEditingItem(null)}
            style={styles.itemNameInput}
            autoFocus
          />
        ) : (
          <span 
            onClick={() => setEditingItem(item.id)}
            style={styles.itemNameText}
            title="Click to edit"
          >
            {item.productName || item.itemName}
          </span>
        )}
      </div>

      {/* Quantity */}
      <div style={styles.itemQuantity}>
        <input
          type="number"
          value={item.quantity || 1}
          onChange={(e) => handleItemEdit(item.id, 'quantity', parseFloat(e.target.value) || 1)}
          style={styles.quantityInput}
          min="0"
          step="0.25"
        />
      </div>

      {/* Unit */}
      <div style={styles.itemUnit}>
        <select
          value={item.unit || 'each'}
          onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
          style={styles.unitSelect}
        >
          {commonUnits.map(unit => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      </div>

      {/* Confidence */}
      <div style={styles.itemConfidence}>
        <span 
          style={{
            ...styles.confidenceBadge,
            backgroundColor: getConfidenceColor(item.confidence || 0)
          }}
        >
          {getConfidenceLabel(item.confidence || 0)}
        </span>
      </div>

      {/* Price (if available) */}
      {item.realPrice && (
        <div style={styles.itemPrice}>
          ${(item.realPrice * (item.quantity || 1)).toFixed(2)}
        </div>
      )}

      {/* Actions */}
      <div style={styles.itemActions}>
        <button
          onClick={() => handleRemoveItem(item.id)}
          style={styles.removeButton}
          title="Remove item"
        >
          ×
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      ...styles.container,
      ...(isMobile ? styles.containerMobile : {})
    }}>
      {/* Header */}
      <div style={{
        ...styles.header,
        ...(isMobile ? styles.headerMobile : {})
      }}>
        <h3 style={styles.title}>
          ✅ CART SMASH Results ({items.length} items)
        </h3>
        <div style={styles.headerActions}>
          <button 
            onClick={() => setShowStats(!showStats)} 
            style={styles.toggleButton}
          >
            {showStats ? '📊 Hide Stats' : '📊 Show Stats'}
          </button>
          <button 
            onClick={exportToCSV} 
            style={styles.exportButton}
          >
            📄 Export CSV
          </button>
        </div>
      </div>

      {/* Stats Panel (Collapsible) */}
      {showStats && (
        <div style={styles.statsPanel}>
          <h4 style={styles.statsTitle}>📊 Parsing Statistics</h4>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Items</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#10b981'}}>{stats.highConfidence}</div>
              <div style={styles.statLabel}>High Confidence</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#f59e0b'}}>{stats.mediumConfidence}</div>
              <div style={styles.statLabel}>Medium Confidence</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#ef4444'}}>{stats.lowConfidence}</div>
              <div style={styles.statLabel}>Need Review</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.categories}</div>
              <div style={styles.statLabel}>Categories</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{(stats.averageConfidence * 100).toFixed(1)}%</div>
              <div style={styles.statLabel}>Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="confidence">Confidence (High to Low)</option>
            <option value="category">Category (A to Z)</option>
            <option value="name">Name (A to Z)</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Filter:</label>
          <select 
            value={filterBy} 
            onChange={(e) => setFilterBy(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Items</option>
            <option value="high-confidence">High Confidence Only</option>
            <option value="needs-review">Needs Review Only</option>
            <optgroup label="By Category">
              <option value="produce">🥬 Produce</option>
              <option value="dairy">🥛 Dairy</option>
              <option value="meat">🥩 Meat</option>
              <option value="pantry">🥫 Pantry</option>
              <option value="beverages">🥤 Beverages</option>
              <option value="frozen">🧊 Frozen</option>
              <option value="bakery">🍞 Bakery</option>
              <option value="snacks">🍿 Snacks</option>
              <option value="other">📦 Other</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* List Header */}
      <div style={styles.listHeader}>
        <div style={styles.headerCategory}></div>
        <div style={styles.headerName}>Product Name</div>
        <div style={styles.headerQuantity}>Qty</div>
        <div style={styles.headerUnit}>Unit</div>
        <div style={styles.headerConfidence}>Status</div>
        {items.some(item => item.realPrice) && (
          <div style={styles.headerPrice}>Price</div>
        )}
        <div style={styles.headerActions}></div>
      </div>

      {/* Items List */}
      <div style={styles.itemsList}>
        {sortBy === 'category' ? renderGroupedItems() : filteredAndSortedItems.map((item, index) => renderItem(item, index))}
      </div>

      {/* Total Summary */}
      {stats.totalEstimatedPrice > 0 && (
        <div style={styles.totalSummary}>
          <h4 style={styles.totalTitle}>💰 Estimated Total: ${stats.totalEstimatedPrice.toFixed(2)}</h4>
          <p style={styles.totalNote}>
            *Prices are estimates and may vary by location and availability
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },

  containerMobile: {
    margin: '10px 0',
    padding: '15px',
    borderRadius: '8px'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  headerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '15px'
  },

  title: {
    color: '#1f2937',
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },

  headerActions: {
    display: 'flex',
    gap: '10px'
  },

  toggleButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  statsPanel: {
    background: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },

  statsTitle: {
    color: '#374151',
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold'
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px'
  },

  statCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },

  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },

  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  controlLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },

  select: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  // ✅ NEW: List styles
  listHeader: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 80px 120px 70px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px 8px 0 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb'
  },

  headerCategory: { textAlign: 'center' },
  headerName: {},
  headerQuantity: { textAlign: 'center' },
  headerUnit: { textAlign: 'center' },
  headerConfidence: { textAlign: 'center' },
  headerPrice: { textAlign: 'right' },
  headerActions: { textAlign: 'center' },

  itemsList: {
    maxHeight: '600px',
    overflowY: 'auto',
    overflowX: 'hidden',
    borderRadius: '0 0 8px 8px',
    border: '1px solid #e5e7eb',
    borderTop: 'none'
  },

  // ✅ NEW: Category header styles
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 15px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4b5563',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },

  categoryIcon: {
    fontSize: '18px'
  },

  categoryName: {
    textTransform: 'capitalize'
  },

  categoryCount: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 'normal'
  },

  // ✅ NEW: Item row styles
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 80px 120px 70px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    transition: 'background-color 0.2s',
    cursor: 'default'
  },

  itemRowEven: {
    backgroundColor: '#fafafa'
  },

  itemRowEditing: {
    backgroundColor: '#f0f9ff',
    boxShadow: 'inset 0 0 0 2px #3b82f6'
  },

  itemCategory: {
    textAlign: 'center',
    fontSize: '18px'
  },

  itemName: {
    overflow: 'hidden'
  },

  itemNameText: {
    cursor: 'pointer',
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '500',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block'
  },

  itemNameInput: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none'
  },

  itemQuantity: {
    textAlign: 'center'
  },

  quantityInput: {
    width: '60px',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'center'
  },

  itemUnit: {
    textAlign: 'center'
  },

  unitSelect: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  itemConfidence: {
    textAlign: 'center'
  },

  confidenceBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase'
  },

  itemPrice: {
    textAlign: 'right',
    fontWeight: '600',
    color: '#059669',
    fontSize: '14px'
  },

  itemActions: {
    textAlign: 'center'
  },

  removeButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s'
  },

  totalSummary: {
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #93c5fd',
    marginTop: '20px'
  },

  totalTitle: {
    color: '#1e40af',
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 'bold'
  },

  totalNote: {
    color: '#3730a3',
    margin: 0,
    fontSize: '14px',
    fontStyle: 'italic'
  }
};

export default ParsedResultsDisplay;