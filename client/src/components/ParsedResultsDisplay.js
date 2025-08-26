// client/src/components/ParsedResultsDisplay.js - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import KrogerOrderFlow from './KrogerOrderFlow';




function ParsedResultsDisplay({ items, onItemsChange, currentUser, parsingStats }) {
  // REMOVED unused aliases that were causing warnings
  // const cartItems = items;  // REMOVED - not used
  // const setCartItems = onItemsChange;  // REMOVED - not used
  
  // Debug log to verify currentUser is being received
  useEffect(() => {
    console.log('🔍 ParsedResultsDisplay received currentUser:', currentUser?.email || 'No user');
  }, [currentUser]);
  
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showInstacart, setShowInstacart] = useState(false);
  const [showKroger, setShowKroger] = useState(false);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [fetchingPrices, setFetchingPrices] = useState(new Set());
  const [exportingCSV, setExportingCSV] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [priceHistory, setPriceHistory] = useState({});
  const [showPriceHistory, setShowPriceHistory] = useState(null);
  const [mealGroups, setMealGroups] = useState({});
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [viewMealGroups, setViewMealGroups] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);

  const trackEvent = (action, category, label, value) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch real-time prices for items - Use useCallback to fix dependency warning
  const fetchRealTimePrices = useCallback(async (itemsToFetch) => {
    const itemIds = itemsToFetch.map(item => item.id);
    setFetchingPrices(prev => new Set([...prev, ...itemIds]));

    try {
      const response = await fetch('/api/cart/fetch-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToFetch.map(item => ({
            id: item.id,
            name: item.productName || item.itemName
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Update items with fetched prices and save price history
        const updatedItems = items.map(item => {
          const priceData = data.prices?.[item.id];
          if (priceData) {
            // Save to price history
            setPriceHistory(prev => ({
              ...prev,
              [item.id]: [
                ...(prev[item.id] || []),
                {
                  date: new Date().toISOString(),
                  price: priceData.price,
                  salePrice: priceData.salePrice
                }
              ]
            }));

            return {
              ...item,
              realPrice: priceData.price,
              salePrice: priceData.salePrice,
              availability: priceData.availability
            };
          }
          return item;
        });

        onItemsChange(updatedItems);
        localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setFetchingPrices(prev => {
        const newSet = new Set(prev);
        itemIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [items, onItemsChange]); // Fixed dependencies

  // Fetch real-time prices on mount - Fixed dependencies
  useEffect(() => {
    const itemsNeedingPrices = items.filter(item => !item.realPrice && item.productName);
    if (itemsNeedingPrices.length > 0) {
      fetchRealTimePrices(itemsNeedingPrices);
    }
  }, [items, fetchRealTimePrices]); // Added missing dependencies

  // Load meal groups from localStorage
  useEffect(() => {
    const savedMealGroups = localStorage.getItem('cartsmash-meal-groups');
    if (savedMealGroups) {
      try {
        setMealGroups(JSON.parse(savedMealGroups));
      } catch (e) {
        console.error('Failed to load meal groups:', e);
      }
    }
  }, []);

  // Auto-save to localStorage whenever items change
  useEffect(() => {
    if (items && items.length > 0) {
      try {
        localStorage.setItem('cartsmash-current-cart', JSON.stringify(items));
        console.log('✅ Cart saved locally');
      } catch (e) {
        console.error('Failed to save cart locally:', e);
      }
    }
  }, [items]);

  // Smart unit detection using AI logic
  const smartDetectUnit = (itemText) => {
    const unitPatterns = {
      weight: {
        pattern: /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|oz|ounces?|kg|kilograms?|g|grams?)/i,
        units: ['lb', 'oz', 'kg', 'g']
      },
      volume: {
        pattern: /(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|ml|milliliters?|l|liters?|gal|gallons?|qt|quarts?|pt|pints?|fl\s*oz)/i,
        units: ['cup', 'tbsp', 'tsp', 'ml', 'l', 'gal', 'qt', 'pt', 'fl oz']
      },
      container: {
        pattern: /(cans?|bottles?|jars?|boxes?|bags?|packages?|containers?|cartons?|bunches?|heads?|loaves?)\s+of/i,
        units: ['can', 'bottle', 'jar', 'box', 'bag', 'package', 'container']
      },
      count: {
        pattern: /(\d+)\s*(dozen|pack|piece|clove)/i,
        units: ['dozen', 'pack', 'piece', 'clove']
      }
    };

    for (const [, config] of Object.entries(unitPatterns)) {
      const match = itemText.match(config.pattern);
      if (match) {
        const unit = match[2] || match[1];
        if (unit.toLowerCase().includes('pound')) return 'lb';
        if (unit.toLowerCase().includes('ounce')) return 'oz';
        if (unit.toLowerCase().includes('gram')) return 'g';
        if (unit.toLowerCase().includes('kilogram')) return 'kg';
        if (unit.toLowerCase().includes('tablespoon')) return 'tbsp';
        if (unit.toLowerCase().includes('teaspoon')) return 'tsp';
        return unit.toLowerCase();
      }
    }
    return 'each';
  };

  // Batch operations
  const handleBulkOperation = (operation) => {
    let updatedItems = [...items];
    let message = '';

    switch (operation) {
      case 'delete-low-confidence':
        const lowConfItems = items.filter(item => (item.confidence || 0) < 0.6);
        if (lowConfItems.length > 0 && window.confirm(`Remove ${lowConfItems.length} low confidence items?`)) {
          updatedItems = items.filter(item => (item.confidence || 0) >= 0.6);
          message = `Removed ${lowConfItems.length} items`;
        }
        break;

      case 'delete-selected':
        if (selectedItems.size > 0 && window.confirm(`Remove ${selectedItems.size} selected items?`)) {
          updatedItems = items.filter(item => !selectedItems.has(item.id));
          message = `Removed ${selectedItems.size} items`;
          setSelectedItems(new Set());
        }
        break;

      case 'validate-all':
        setValidatingAll(true);
        updatedItems = items.map(item => {
          const detectedUnit = smartDetectUnit(item.original || item.itemName || item.name);
          return {
            ...item,
            unit: item.unit === 'unit' || !item.unit ? detectedUnit : item.unit,
            confidence: Math.min((item.confidence || 0.7) + 0.2, 1),
            needsReview: false,
            validated: true
          };
        });
        message = 'All items validated and units detected';
        setTimeout(() => setValidatingAll(false), 1000);
        break;

      default:
        break;
    }

    if (message) {
      onItemsChange(updatedItems);
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
    }
  };

  // Add items to meal group
  const addToMealGroup = async (mealName) => {
    if (!mealName || selectedItems.size === 0) return;

    const selectedItemsList = items
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        id: item.id,
        name: item.productName || item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      }));

    const existingMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    
    let mealPlan = existingMealPlans.find(p => p.name === mealName);
    
    if (!mealPlan) {
      mealPlan = {
        id: `mealplan_${Date.now()}`,
        name: mealName,
        items: selectedItemsList,
        itemCount: selectedItemsList.length,
        createdAt: new Date().toISOString(),
        type: 'meal'
      };
      existingMealPlans.push(mealPlan);
    } else {
      mealPlan.items = [...(mealPlan.items || []), ...selectedItemsList];
      mealPlan.itemCount = mealPlan.items.length;
      mealPlan.updatedAt = new Date().toISOString();
    }

    localStorage.setItem('cartsmash-mealplans', JSON.stringify(existingMealPlans));
    
    const updatedMealGroups = {
      ...mealGroups,
      [mealName]: [...(mealGroups[mealName] || []), ...selectedItemsList]
    };
    setMealGroups(updatedMealGroups);
    
    setSelectedItems(new Set());
    setNewMealName('');
    alert(`Added ${selectedItemsList.length} items to "${mealName}" meal plan`);
    
    if (window.refreshAccountData) {
      window.refreshAccountData();
    }
  };

  // Toggle all items selection
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
    }
  };

  // Common units for dropdown
  const commonUnits = [
    { value: 'each', label: 'each' },
    { value: 'lb', label: 'lb' },
    { value: 'oz', label: 'oz' },
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'cup', label: 'cup' },
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
    { value: 'bottle', label: 'bottle' },
    { value: 'bag', label: 'bag' },
    { value: 'box', label: 'box' },
    { value: 'jar', label: 'jar' },
    { value: 'pack', label: 'pack' },
    { value: 'container', label: 'container' },
    { value: 'bunch', label: 'bunch' },
    { value: 'head', label: 'head' },
    { value: 'loaf', label: 'loaf' },
    { value: 'piece', label: 'piece' }
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
        return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      }
      if (sortBy === 'name') return (a.productName || a.itemName || '').localeCompare(b.productName || b.itemName || '');
      if (sortBy === 'price') return (b.realPrice || 0) - (a.realPrice || 0);
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
    }, 0),
    selectedCount: selectedItems.size
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

  const handleItemEdit = async (itemId, field, value) => {
    setUpdatingItems(prev => new Set([...prev, itemId]));

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onItemsChange(updatedItems);

    localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) {
        console.error('Failed to update item on server');
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setUpdatingItems(prev => new Set([...prev, itemId]));
      try {
        const updatedItems = items.filter(item => item.id !== itemId);
        onItemsChange(updatedItems);
        localStorage.setItem('cartsmash-current-cart', JSON.stringify(updatedItems));
      } finally {
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    }
  };

  const exportToCSV = async () => {
    setExportingCSV(true);
    try {
      const headers = ['Product Name', 'Quantity', 'Unit', 'Category', 'Confidence', 'Price', 'Meal Group'];
      const csvContent = [
        headers.join(','),
        ...items.map(item => {
          const mealGroup = Object.entries(mealGroups).find(([meal, mealItems]) =>
            mealItems.some(i => i.id === item.id)
          );

          const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

          return [
            esc(item.productName || item.itemName),
            item.quantity || 1,
            esc(item.unit || 'each'),
            esc(item.category || 'other'),
            esc(((item.confidence || 0) * 100).toFixed(0) + '%'),
            item.realPrice ? esc(`$${item.realPrice.toFixed(2)}`) : 'N/A',
            mealGroup ? esc(mealGroup[0]) : ''
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grocery-list-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCSV(false);
    }
  };

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

  const handleRefreshPrices = async () => {
    const itemsNeedingPrices = filteredAndSortedItems.filter(item => !item.realPrice && item.productName);
    if (itemsNeedingPrices.length > 0) {
      await fetchRealTimePrices(itemsNeedingPrices);
    } else {
      alert('All items already have pricing information!');
    }
  };

  const copyListToClipboard = () => {
    const listText = items.map(item =>
      `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`
    ).join('\n');
    navigator.clipboard.writeText(listText);
    alert('List copied to clipboard!');
  };

  const renderItem = (item, index) => {
    const isUpdating = updatingItems.has(item.id);
    const isFetchingPrice = fetchingPrices.has(item.id);
    const isSelected = selectedItems.has(item.id);
    const itemPriceHistory = priceHistory[item.id] || [];

    return (
      <div key={item.id || index}>
        <div
          style={{
            ...styles.itemRow,
            ...(index % 2 === 0 ? styles.itemRowEven : {}),
            ...(editingItem === item.id ? styles.itemRowEditing : {}),
            ...(isUpdating ? styles.itemRowUpdating : {}),
            ...(isSelected ? styles.itemRowSelected : {})
          }}
        >
          <div
            style={{
              ...styles.itemCheckbox,
              ...(isSelected ? styles.itemCheckboxSelected : {})
            }}
            onClick={() => {
              const newSelected = new Set(selectedItems);
              if (isSelected) {
                newSelected.delete(item.id);
              } else {
                newSelected.add(item.id);
              }
              setSelectedItems(newSelected);
            }}
          >
            <div style={{
              ...styles.checkboxVisual,
              ...(isSelected ? styles.checkboxVisualSelected : {})
            }}>
              {isSelected && '✓'}
            </div>
          </div>

          <div style={styles.itemCategory}>
            <span title={item.category}>{getCategoryIcon(item.category)}</span>
          </div>

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
                {item.productName || item.itemName || item.name || ''}
              </span>
            )}
          </div>

          <div style={styles.itemQuantity}>
            <input
              type="number"
              value={item.quantity || 1}
              onChange={(e) => handleItemEdit(item.id, 'quantity', parseFloat(e.target.value) || 1)}
              style={styles.quantityInput}
              min="0"
              step="0.25"
              disabled={isUpdating}
            />
          </div>

          <div style={styles.itemUnit}>
            <select
              value={item.unit || 'each'}
              onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
              style={styles.unitSelect}
              disabled={isUpdating}
            >
              {commonUnits.map(unit => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>

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

          <div style={styles.itemPrice}>
            {isFetchingPrice ? (
              <InlineSpinner text="" color="#10b981" />
            ) : item.realPrice ? (
              <>
                <span>${(item.realPrice * (item.quantity || 1)).toFixed(2)}</span>
                {itemPriceHistory.length > 0 && (
                  <button
                    onClick={() => setShowPriceHistory(showPriceHistory === item.id ? null : item.id)}
                    style={styles.priceHistoryButton}
                    title="View price history"
                  >
                    📈
                  </button>
                )}
              </>
            ) : (
              <span style={{ color: '#9ca3af' }}>--</span>
            )}
          </div>

          <div style={styles.itemActions}>
            {isUpdating ? (
              <InlineSpinner text="" color="#6b7280" />
            ) : (
              <button
                onClick={() => handleRemoveItem(item.id)}
                style={styles.removeButton}
                title="Remove item"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {showPriceHistory === item.id && itemPriceHistory.length > 0 && (
          <div style={styles.priceHistoryPanel}>
            <div style={styles.priceHistoryHeader}>📈 Price History:</div>
            <div style={styles.priceHistoryList}>
              {itemPriceHistory.slice(-5).reverse().map((history, idx) => (
                <div key={idx} style={styles.priceHistoryItem}>
                  <span>{new Date(history.date).toLocaleDateString()}</span>
                  <span>${history.price.toFixed(2)}</span>
                  {history.salePrice && <span style={styles.salePrice}>Sale: ${history.salePrice.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Rest of component continues with the actual return statement...
  // (continuing with the JSX return and other components)

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
            onClick={handleRefreshPrices}
            style={styles.refreshButton}
            disabled={fetchingPrices.size > 0}
          >
            {fetchingPrices.size > 0 ? <InlineSpinner text="Fetching..." /> : '💰 Get Prices'}
          </button>
          <button
            onClick={exportToCSV}
            style={styles.exportButton}
            disabled={exportingCSV}
          >
            {exportingCSV ? <InlineSpinner text="Exporting..." /> : '📄 Export CSV'}
          </button>
        </div>
      </div>

      {/* Batch Operations Bar */}
      {(selectedItems.size > 0 || items.some(i => (i.confidence || 0) < 0.6)) && (
        <div style={styles.batchOperationsBar}>
          <div style={styles.batchOperationsTitle}>
            {selectedItems.size > 0 ? `${selectedItems.size} items selected` : 'Batch Operations:'}
          </div>
          <div style={styles.batchOperationsButtons}>
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={() => handleBulkOperation('delete-selected')}
                  style={styles.batchButton}
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={() => setShowMealPlanner(true)}
                  style={styles.batchButton}
                >
                  🍽️ Add to Meal
                </button>
                <button
                  onClick={() => setViewMealGroups(!viewMealGroups)}
                  style={styles.batchButton}
                >
                  👁️ View Meals
                </button>
              </>
            )}
            <button
              onClick={() => handleBulkOperation('validate-all')}
              style={styles.batchButtonSuccess}
              disabled={validatingAll}
            >
              {validatingAll ? <InlineSpinner text="Validating..." /> : '✅ Validate All'}
            </button>
            {items.some(i => (i.confidence || 0) < 0.6) && (
              <button
                onClick={() => handleBulkOperation('delete-low-confidence')}
                style={styles.batchButtonDanger}
              >
                ⚠️ Remove Low Confidence
              </button>
            )}
          </div>
        </div>
      )}

      {/* Meal Planner Modal */}
      {showMealPlanner && (
        <div style={styles.mealPlannerModal}>
          <div style={styles.mealPlannerContent}>
            <h4 style={styles.mealPlannerTitle}>🍽️ Add to Meal Plan</h4>
            <p>Adding {selectedItems.size} items to meal:</p>

            <input
              type="text"
              placeholder="Enter meal name (e.g., Monday Dinner)"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              style={styles.mealNameInput}
            />

            {Object.keys(mealGroups).length > 0 && (
              <div style={styles.existingMeals}>
                <p>Or add to existing meal:</p>
                {Object.keys(mealGroups).map(meal => (
                  <button
                    key={meal}
                    onClick={() => {
                      addToMealGroup(meal);
                      setShowMealPlanner(false);
                    }}
                    style={styles.existingMealButton}
                  >
                    {meal} ({mealGroups[meal].length} items)
                  </button>
                ))}
              </div>
            )}

            <div style={styles.mealPlannerActions}>
              <button
                onClick={() => {
                  if (newMealName) {
                    addToMealGroup(newMealName);
                    setShowMealPlanner(false);
                  }
                }}
                style={styles.mealPlannerSave}
                disabled={!newMealName}
              >
                Save to Meal
              </button>
              <button
                onClick={() => setShowMealPlanner(false)}
                style={styles.mealPlannerCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Meal Groups Modal */}
      {viewMealGroups && Object.keys(mealGroups).length > 0 && (
        <div style={styles.mealGroupsModal}>
          <div style={styles.mealGroupsContent}>
            <h4 style={styles.mealGroupsTitle}>🍽️ Meal Groups</h4>
            <button
              onClick={() => setViewMealGroups(false)}
              style={styles.mealGroupsClose}
            >
              ×
            </button>

            {Object.entries(mealGroups).map(([meal, mealItems]) => (
              <div key={meal} style={styles.mealGroupSection}>
                <div style={styles.mealGroupHeader}>
                  <h5 style={styles.mealGroupName}>{meal}</h5>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove meal group "${meal}"?`)) {
                        const updated = { ...mealGroups };
                        delete updated[meal];
                        setMealGroups(updated);
                        localStorage.setItem('cartsmash-meal-groups', JSON.stringify(updated));
                      }
                    }}
                    style={styles.mealGroupDeleteButton}
                  >
                    Delete Meal
                  </button>
                </div>
                <div style={styles.mealItemsList}>
                  {mealItems.map((item, idx) => (
                    <div key={idx} style={styles.mealItem}>
                      <span>{getCategoryIcon(item.category)}</span>
                      <span>{item.quantity} {item.unit}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.highConfidence}</div>
              <div style={styles.statLabel}>High Confidence</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.mediumConfidence}</div>
              <div style={styles.statLabel}>Medium Confidence</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.lowConfidence}</div>
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
            <option value="price">Price (High to Low)</option>
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
        <div
          style={styles.headerCheckbox}
          onClick={toggleSelectAll}
        >
          <div style={{
            ...styles.checkboxVisual,
            ...(selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 ? styles.checkboxVisualSelected : {})
          }}>
            {selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 && '✓'}
          </div>
        </div>
        <div style={styles.headerCategory}></div>
        <div style={styles.headerName}>Product Name</div>
        <div style={styles.headerQuantity}>Qty</div>
        <div style={styles.headerUnit}>Unit</div>
        <div style={styles.headerConfidence}>Status</div>
        <div style={styles.headerPrice}>Price</div>
        <div style={styles.headerActions}></div>
      </div>

      {/* Items List */}
      <div style={styles.itemsList}>
        {sortBy === 'category' ? renderGroupedItems() : filteredAndSortedItems.map((item, index) => renderItem(item, index))}
      </div>

      {/* NEW: Instacart Actions */}
      <div style={styles.actions}>
  <button
    onClick={() => setShowInstacart(true)}
    style={styles.primaryBtn}
  >
    🛍️ Continue to Check Out
  </button>
  
  
  <button
    onClick={copyListToClipboard}
    style={styles.secondaryBtn}
  >
    📋 Copy List
  </button>
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

      {/* NEW: Enhanced Instacart Modal */}
      {showInstacart && (
  <EnhancedInstacartModal
    items={items}
    currentUser={currentUser}  // ← ADD THIS LINE
    onClose={() => setShowInstacart(false)}
    onOpenKroger={() => {
      setShowInstacart(false);
      setShowKroger(true);
    }}
  />
)}

      {/* Kroger Modal - Outside of Instacart modal */}
      {showKroger && (
        <KrogerOrderFlow
          cartItems={items}
          currentUser={currentUser}  // Pass _currentUser here
          onClose={() => setShowKroger(false)}
        />
      )}  
    </div>
  );
}

// In ParsedResultsDisplay.js, replace the entire EnhancedInstacartModal function
function EnhancedInstacartModal({ items, onClose, currentUser }) {
  const [selectedStore, setSelectedStore] = useState('safeway');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('delivery');
  const [showKrogerFlow, setShowKrogerFlow] = useState(false);

  const stores = [
    { 
      id: 'kroger', 
      name: 'Kroger', 
      logo: '🛒', 
      fee: 'Direct', 
      minOrder: 0,
      isNative: true,
      description: 'Send directly to Kroger cart'
    },
    { id: 'safeway', name: 'Safeway', logo: '🏪', fee: '$4.99', minOrder: 35 },
    { id: 'wholefoods', name: 'Whole Foods', logo: '🌿', fee: '$4.99', minOrder: 35 },
    { id: 'costco', name: 'Costco', logo: '📦', fee: 'Free', minOrder: 0, membership: true },
    { id: 'target', name: 'Target', logo: '🎯', fee: '$5.99', minOrder: 35 },
    { id: 'walmart', name: 'Walmart', logo: '🏬', fee: '$7.95', minOrder: 35 }
  ];

  const selectedStoreInfo = stores.find(s => s.id === selectedStore);

  const handleStoreClick = (store) => {
    if (store.id === 'kroger') {
      // Immediately launch Kroger flow when Kroger card is clicked
      setShowKrogerFlow(true);
    } else {
      // For other stores, just select them
      setSelectedStore(store.id);
    }
  };

  // If Kroger flow is active, show KrogerOrderFlow INSTEAD of the modal
  if (showKrogerFlow) {
    return (
      <KrogerOrderFlow
        cartItems={items}
        currentUser={currentUser}
        onClose={onClose}
      />
    );
  }

  const handleProceed = () => {
    setIsProcessing(true);

    // Copy list to clipboard for Instacart stores
    const listText = items.map(item => 
      `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`
    ).join('\n');
    
    setTimeout(() => {
      navigator.clipboard.writeText(listText).then(() => {
        // Open Instacart
        window.open('https://www.instacart.com/', '_blank');
        alert('Your list has been copied! Select your store on Instacart and paste your list.');
        onClose();
      });
    }, 800);
  };

  const estimatedTotal = items.reduce((sum, item) => {
    const avgPrice = 3.99;
    const each = (item.realPrice ?? avgPrice) * (item.quantity || 1);
    return sum + each;
  }, 0);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>

        <h2 style={styles.modalTitle}>
          <span style={{ fontSize: '28px' }}>🛍️</span>
          Choose Your Store
        </h2>

        {/* Store Selection Grid */}
        <div style={styles.storeGrid}>
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => handleStoreClick(store)}
              style={{
                ...styles.storeCard,
                ...(selectedStore === store.id && store.id !== 'kroger' ? styles.storeCardActive : {}),
                ...(store.id === 'kroger' ? {
                  background: 'linear-gradient(135deg, #0066cc, #004999)',
                  color: 'white',
                  cursor: 'pointer',
                  position: 'relative',
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 15px rgba(0,102,204,0.3)'
                } : {})
              }}
            >
              <div style={{
                ...styles.storeLogo,
                ...(store.id === 'kroger' ? { fontSize: '32px' } : {})
              }}>
                {store.logo}
              </div>
              <div style={{
                ...styles.storeName,
                ...(store.id === 'kroger' ? { color: 'white', fontWeight: 'bold' } : {})
              }}>
                {store.name}
              </div>
              <div style={{
                ...styles.storeFee,
                ...(store.id === 'kroger' ? { color: '#90cdf4' } : {})
              }}>
                {store.fee}
              </div>
              {store.membership && (
                <div style={styles.membershipBadge}>Membership</div>
              )}
              {store.isNative && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#0066cc',
                  fontSize: '10px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>
                  API
                </div>
              )}
              {store.id === 'kroger' && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  color: '#90cdf4',
                  whiteSpace: 'nowrap'
                }}>
                  Click to Connect
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Only show summary for non-Kroger stores */}
        <div style={styles.orderSummary}>
          <h3 style={styles.summaryTitle}>Your Cart</h3>
          <div style={styles.summaryRow}>
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Est. Total</span>
            <span>${estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action for Instacart stores only */}
        {selectedStore !== 'kroger' && (
          <>
            <div style={styles.modalActions}>
              <button
                onClick={handleProceed}
                disabled={isProcessing}
                style={styles.proceedBtn}
              >
                {isProcessing ? '⏳ Opening Instacart...' : `📋 Copy List & Open Instacart`}
              </button>
            </div>
            <p style={styles.disclaimer}>
              Select {selectedStoreInfo?.name} on Instacart and paste your list
            </p>
          </>
        )}

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>🛒 Kroger:</strong> Direct API integration - sends items directly to your Kroger cart<br/>
          <strong>🛍️ Other Stores:</strong> Copies your list to clipboard for use with Instacart
        </div>
      </div>
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
    gap: '10px',
    alignItems: 'center',
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

  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Batch operations styles
  batchOperationsBar: {
    background: '#fef3c7',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    border: '1px solid #fbbf24'
  },

  batchOperationsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e'
  },

  batchOperationsButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },

  batchButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },

  batchButtonSuccess: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    minWidth: '110px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  batchButtonDanger: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },

  // Meal planner modal styles
  mealPlannerModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000
  },

  mealPlannerContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },

  mealPlannerTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    color: '#1f2937'
  },

  mealNameInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '8px'
  },

  existingMeals: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },

  existingMealButton: {
    display: 'block',
    width: '100%',
    padding: '8px',
    marginTop: '8px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left'
  },

  mealPlannerActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },

  mealPlannerSave: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },

  mealPlannerCancel: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },

  // Meal groups modal
  mealGroupsModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000
  },

  mealGroupsContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    position: 'relative'
  },

  mealGroupsTitle: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    color: '#1f2937'
  },

  mealGroupsClose: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },

  mealGroupSection: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  mealGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },

  mealGroupName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },

  mealGroupDeleteButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },

  mealItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  mealItem: {
    display: 'flex',
    gap: '12px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    alignItems: 'center'
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

  listHeader: {
    display: 'grid',
    gridTemplateColumns: '40px 40px 1fr 80px 120px 70px 80px 40px',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px 8px 0 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    alignItems: 'center'
  },

  headerCheckbox: {
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center'
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

  itemRow: {
    display: 'grid',
    gridTemplateColumns: '40px 40px 1fr 80px 120px 70px 80px 40px',
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

  itemRowUpdating: {
    opacity: 0.7,
    pointerEvents: 'none'
  },

  itemRowSelected: {
    backgroundColor: '#fef3c7'
  },

  itemCheckbox: {
    textAlign: 'center',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  itemCheckboxSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)'
  },

  checkboxVisual: {
    width: '20px',
    height: '20px',
    border: '2px solid #d1d5db',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white'
  },

  checkboxVisualSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },

  itemCategory: {
    textAlign: 'center',
    fontSize: '18px'
  },

  itemName: {
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
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
    fontSize: '14px',
    minWidth: '80px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px'
  },

  priceHistoryButton: {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  },

  itemActions: {
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
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

  priceHistoryPanel: {
    background: '#ecfdf5',
    padding: '12px',
    marginLeft: '80px',
    marginRight: '15px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: '1px solid #10b981'
  },

  priceHistoryHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '8px'
  },

  priceHistoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px'
  },

  priceHistoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'white',
    borderRadius: '4px'
  },

  salePrice: {
    color: '#ef4444',
    fontWeight: '600'
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
  },

  /* NEW: Instacart action buttons */
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },

  primaryBtn: {
    padding: '12px 18px',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
  },

  secondaryBtn: {
    padding: '12px 18px',
    background: 'white',
    color: '#6b7280',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  /* NEW: Modal styles for Instacart */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4000,
    backdropFilter: 'blur(2px)'
  },

  modal: {
    background: 'white',
    borderRadius: '20px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '28px',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
  },

  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280'
  },

  modalTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },

  deliveryOptions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px'
  },

  optionCard: {
    padding: '14px',
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
    fontSize: '18px'
  },

  storeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px'
  },

  storeCard: {
    padding: '14px',
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
    fontSize: '28px',
    marginBottom: '6px'
  },

  storeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px'
  },

  storeFee: {
    fontSize: '12px',
    color: '#6b7280'
  },

  membershipBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#fbbf24',
    color: '#92400e',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },

  orderSummary: {
    background: '#f9fafb',
    padding: '14px',
    borderRadius: '12px',
    marginBottom: '18px'
  },

  summaryTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '10px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
    color: '#6b7280'
  },

  summaryTotal: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '10px',
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#1f2937'
  },

  modalActions: {
    display: 'flex',
    gap: '10px'
  },

  proceedBtn: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
  },

  disclaimer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '12px'
  }
};

export default ParsedResultsDisplay;