import React, { useState, useEffect } from 'react';

function ProductValidator({ items = [], onItemsUpdated = () => {}, onClose = () => {} }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ FIX: Ensure items is always an array and handle edge cases
  const safeItems = Array.isArray(items) ? items.filter(item => item && item.id) : [];

  // Filter items that need review
  const needsReview = safeItems.filter(item => 
    item.needsReview || (item.confidence || 0) < 0.6
  );

  // Filter items based on search term
  const filteredItems = needsReview.filter(item => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.productName || item.itemName || '').toLowerCase();
    const originalText = (item.original || '').toLowerCase();
    
    return itemName.includes(searchLower) || originalText.includes(searchLower);
  });

  // ✅ FIX: Common measurement units dropdown
  const commonUnits = [
    { value: '', label: 'Select unit...' },
    { value: 'lbs', label: 'lbs (pounds)' },
    { value: 'oz', label: 'oz (ounces)' },
    { value: 'kg', label: 'kg (kilograms)' },
    { value: 'g', label: 'g (grams)' },
    { value: 'cups', label: 'cups' },
    { value: 'tbsp', label: 'tbsp (tablespoons)' },
    { value: 'tsp', label: 'tsp (teaspoons)' },
    { value: 'ml', label: 'ml (milliliters)' },
    { value: 'l', label: 'l (liters)' },
    { value: 'fl oz', label: 'fl oz (fluid ounces)' },
    { value: 'qt', label: 'qt (quarts)' },
    { value: 'pt', label: 'pt (pints)' },
    { value: 'gal', label: 'gal (gallons)' },
    { value: 'dozen', label: 'dozen' },
    { value: 'pack', label: 'pack' },
    { value: 'bag', label: 'bag' },
    { value: 'box', label: 'box' },
    { value: 'can', label: 'can' },
    { value: 'jar', label: 'jar' },
    { value: 'bottle', label: 'bottle' },
    { value: 'loaf', label: 'loaf' },
    { value: 'bunch', label: 'bunch' },
    { value: 'head', label: 'head' },
    { value: 'clove', label: 'clove' },
    { value: 'slice', label: 'slice' },
    { value: 'piece', label: 'piece' },
    { value: 'each', label: 'each' }
  ];

  // ✅ FIX: Smart unit defaults based on product type
  const getSmartDefaultUnit = (item) => {
    const itemName = (item.productName || item.itemName || '').toLowerCase();
    const category = item.category;
    
    // Smart defaults based on product name patterns
    if (itemName.includes('milk') || itemName.includes('juice') || itemName.includes('water')) return 'gal';
    if (itemName.includes('chicken') || itemName.includes('beef') || itemName.includes('pork') || itemName.includes('turkey')) return 'lbs';
    if (itemName.includes('cheese') && !itemName.includes('cream cheese')) return 'lbs';
    if (itemName.includes('butter') || itemName.includes('cream cheese')) return 'oz';
    if (itemName.includes('bread') || itemName.includes('loaf')) return 'loaf';
    if (itemName.includes('eggs')) return 'dozen';
    if (itemName.includes('banana') || itemName.includes('apple') || itemName.includes('orange')) return 'lbs';
    if (itemName.includes('onion') && itemName.includes('bag')) return 'bag';
    if (itemName.includes('potato') && itemName.includes('bag')) return 'bag';
    if (itemName.includes('rice') || itemName.includes('flour') || itemName.includes('sugar')) return 'lbs';
    if (itemName.includes('cereal') || itemName.includes('crackers') || itemName.includes('chips')) return 'box';
    if (itemName.includes('soup') || itemName.includes('beans') || itemName.includes('tomatoes') && itemName.includes('can')) return 'can';
    if (itemName.includes('yogurt') && itemName.includes('cup')) return 'cup';
    if (itemName.includes('lettuce') || itemName.includes('cabbage') || itemName.includes('cauliflower')) return 'head';
    if (itemName.includes('spinach') || itemName.includes('greens') || itemName.includes('salad')) return 'bag';
    if (itemName.includes('garlic')) return 'clove';
    if (itemName.includes('lemon') || itemName.includes('lime')) return 'each';
    
    // Smart defaults based on category
    let defaultUnit = 'each'; // fallback
    
    switch (category) {
      case 'produce':
        if (itemName.includes('bag') || itemName.includes('package')) defaultUnit = 'bag';
        else if (itemName.includes('bunch')) defaultUnit = 'bunch';
        else defaultUnit = 'lbs';
        break;
      case 'dairy':
        if (itemName.includes('milk') || itemName.includes('cream')) defaultUnit = 'gal';
        else if (itemName.includes('yogurt')) defaultUnit = 'cup';
        else defaultUnit = 'oz';
        break;
      case 'meat':
        defaultUnit = 'lbs';
        break;
      case 'pantry':
        if (itemName.includes('can') || itemName.includes('canned')) defaultUnit = 'can';
        else if (itemName.includes('box') || itemName.includes('cereal')) defaultUnit = 'box';
        else if (itemName.includes('jar')) defaultUnit = 'jar';
        else if (itemName.includes('bottle')) defaultUnit = 'bottle';
        else defaultUnit = 'lbs';
        break;
      case 'beverages':
        if (itemName.includes('bottle')) defaultUnit = 'bottle';
        else if (itemName.includes('can')) defaultUnit = 'can';
        else defaultUnit = 'gal';
        break;
      case 'frozen':
        if (itemName.includes('bag')) defaultUnit = 'bag';
        else if (itemName.includes('box')) defaultUnit = 'box';
        else defaultUnit = 'lbs';
        break;
      case 'bakery':
        if (itemName.includes('bread') || itemName.includes('loaf')) defaultUnit = 'loaf';
        else if (itemName.includes('dozen')) defaultUnit = 'dozen';
        else defaultUnit = 'each';
        break;
      case 'snacks':
        if (itemName.includes('bag')) defaultUnit = 'bag';
        else if (itemName.includes('box')) defaultUnit = 'box';
        else defaultUnit = 'oz';
        break;
      default:
        defaultUnit = 'each';
    }
    
    // Debug logging
    if (itemName && defaultUnit !== 'each') {
      console.log(`🎯 Smart default unit for "${itemName}" (${category}): ${defaultUnit}`);
    }
    
    return defaultUnit;
  };

  // ✅ DEBUG: Log component state changes
  useEffect(() => {
    console.log('🔍 ProductValidator component state:');
    console.log('- Total items:', items.length);
    console.log('- Safe items:', safeItems.length);
    console.log('- Items needing review:', needsReview.length);
    console.log('- Filtered items:', filteredItems.length);
    console.log('- Selected items:', selectedItems.length);
    console.log('- Items needing review:', needsReview.map(item => ({ 
      id: item.id, 
      name: item.productName || item.itemName,
      confidence: item.confidence 
    })));
  }, [items.length, selectedItems.length, searchTerm]);

  // ✅ FIX: Auto-populate units when items load or change + on component mount
  useEffect(() => {
    if (safeItems.length > 0) {
      console.log('🔍 Checking for items needing smart unit defaults...');
      
      // Auto-populate smart default units for items that don't have units
      const itemsNeedingUnits = safeItems.filter(item => !item.unit || item.unit === '');
      
      if (itemsNeedingUnits.length > 0) {
        console.log(`🎯 Auto-populating units for ${itemsNeedingUnits.length} items...`);
        
        const updatedItems = items.map(item => {
          if (itemsNeedingUnits.find(needsUnit => needsUnit.id === item.id)) {
            const smartUnit = getSmartDefaultUnit(item);
            console.log(`📝 Setting unit for "${item.productName || item.itemName}": ${smartUnit}`);
            return { ...item, unit: smartUnit };
          }
          return item;
        });
        
        // Only update if we actually changed something
        const hasChanges = updatedItems.some((item, index) => item.unit !== items[index]?.unit);
        if (hasChanges) {
          console.log('✅ Applying smart unit defaults to items');
          onItemsUpdated(updatedItems);
        } else {
          console.log('ℹ️ No unit changes needed');
        }
      } else {
        console.log('✅ All items already have units assigned');
      }
    }
  }, [items.length, safeItems.length]); // Trigger when items change

  useEffect(() => {
    // Auto-select items with very low confidence (but don't override user selection)
    if (selectedItems.length === 0) { // Only auto-select if nothing is selected
      const autoSelect = needsReview
        .filter(item => item && (item.confidence || 0) < 0.3)
        .map(item => item.id)
        .filter(id => id); // Remove any undefined IDs
      
      if (autoSelect.length > 0) {
        console.log(`🎯 Auto-selecting ${autoSelect.length} items with very low confidence`);
        setSelectedItems(autoSelect);
      }
    }
  }, [needsReview.length, items.length]); // Only run when items change

  // ✅ FIXED: Better item toggle with debugging
  const handleItemToggle = (itemId) => {
    console.log(`🔄 Toggling selection for item: ${itemId}`);
    console.log('Current selected items:', selectedItems);
    
    setSelectedItems(prev => {
      const isCurrentlySelected = prev.includes(itemId);
      let newSelection;
      
      if (isCurrentlySelected) {
        newSelection = prev.filter(id => id !== itemId);
        console.log(`➖ Deselecting item ${itemId}`);
      } else {
        newSelection = [...prev, itemId];
        console.log(`➕ Selecting item ${itemId}`);
      }
      
      console.log('New selected items:', newSelection);
      return newSelection;
    });
  };

  // ✅ FIXED: Better select all with debugging
  const handleSelectAll = () => {
    console.log('🔄 Select All clicked');
    console.log('Filtered items count:', filteredItems.length);
    console.log('Currently selected count:', selectedItems.length);
    
    if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
      console.log('🔄 Deselecting all items');
      setSelectedItems([]);
    } else {
      const allItemIds = filteredItems.map(item => item.id);
      console.log('🔄 Selecting all items:', allItemIds);
      setSelectedItems(allItemIds);
    }
  };

  // ✅ FIX: Working approve selected function - FIXED VERSION
  const handleApproveSelected = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to approve');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log(`✅ Approving ${selectedItems.length} selected items...`);
      console.log('Selected item IDs:', selectedItems);
      
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // ✅ FIX: Update the complete items array (not just safeItems)
      const updatedItems = items.map(item => {
        if (selectedItems.includes(item.id)) {
          return { 
            ...item, 
            needsReview: false, 
            confidence: Math.max(item.confidence || 0, 0.85),
            approvedBy: 'user',
            approvedAt: new Date().toISOString(),
            validationSources: [...(item.validationSources || []), 'user_approved'].filter((v, i, a) => a.indexOf(v) === i)
          };
        }
        return item;
      });
      
      console.log(`✅ Successfully approved ${selectedItems.length} items`);
      console.log('Updated items count:', updatedItems.length);
      
      // ✅ FIX: Call onItemsUpdated with complete updated array
      onItemsUpdated(updatedItems);
      
      // Show success message
      alert(`✅ Successfully approved ${selectedItems.length} items!`);
      
      // Clear selection and check if we should close
      setSelectedItems([]);
      
      const remainingReviewItems = updatedItems.filter(item => 
        item && (item.needsReview || (item.confidence || 0) < 0.6)
      );
      
      console.log('Remaining items needing review:', remainingReviewItems.length);
      
      if (remainingReviewItems.length === 0) {
        setTimeout(() => {
          alert('🎉 All items have been reviewed! Your cart is ready.');
          onClose();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Failed to approve items:', error);
      alert('❌ Failed to approve items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FIX: Working remove selected function - FIXED VERSION
  const handleRemoveSelected = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to remove');
      return;
    }

    const confirmMessage = `Are you sure you want to remove ${selectedItems.length} selected item(s) from your cart?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log(`🗑️ Removing ${selectedItems.length} selected items...`);
      console.log('Selected item IDs:', selectedItems);
      console.log('Current items:', safeItems.map(item => ({ id: item.id, name: item.productName || item.itemName })));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ FIX: Remove selected items from ALL items (not just safeItems)
      const allUpdatedItems = items.filter(item => !selectedItems.includes(item.id));
      
      console.log(`✅ Successfully removed ${selectedItems.length} items`);
      console.log('Remaining items:', allUpdatedItems.length);
      
      // ✅ FIX: Call onItemsUpdated with the complete updated items array
      onItemsUpdated(allUpdatedItems);
      
      // Show success message
      alert(`🗑️ Successfully removed ${selectedItems.length} items from your cart.`);
      
      // Clear selection
      setSelectedItems([]);
      
      // Check if we need to close the modal
      const remainingNeedsReview = allUpdatedItems.filter(item => 
        item && (item.needsReview || (item.confidence || 0) < 0.6)
      );
      
      if (remainingNeedsReview.length === 0) {
        setTimeout(() => {
          alert('🎉 All problematic items have been removed! Your cart is cleaned up.');
          onClose();
        }, 1000);
      } else if (allUpdatedItems.length === 0) {
        setTimeout(() => {
          alert('Your cart is now empty.');
          onClose();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Failed to remove items:', error);
      alert('❌ Failed to remove items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemEdit = (itemId, field, value) => {
    const updatedItems = safeItems.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            [field]: value, 
            needsReview: field === 'productName' ? true : item.needsReview, // Re-review if name changed
            confidence: field === 'productName' ? 0.7 : item.confidence, // Adjust confidence if name changed
            lastModified: new Date().toISOString(),
            modifiedBy: 'user'
          }
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
      
      console.log(`🤖 Getting smart suggestion for: ${item.productName || item.itemName}`);
      
      // Simulate AI suggestion API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Generate smart suggestions based on original text
      const suggestions = generateSmartSuggestions(item.original || item.productName || '');
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        const updatedItems = safeItems.map(i => 
          i.id === itemId 
            ? { 
                ...i, 
                productName: suggestion, 
                needsReview: false, 
                confidence: 0.85,
                aiSuggested: true,
                aiSuggestionAt: new Date().toISOString(),
                validationSources: [...(i.validationSources || []), 'ai_suggestion'].filter((v, idx, arr) => arr.indexOf(v) === idx)
              }
            : i
        );
        onItemsUpdated(updatedItems);
        
        alert(`🤖 AI suggested: "${suggestion}"`);
      } else {
        alert('🤖 No smart suggestions available for this item.');
      }
    } catch (error) {
      console.error('❌ Smart suggestion failed:', error);
      alert('❌ Smart suggestion failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FIX: Enhanced smart suggestion generation
  const generateSmartSuggestions = (text) => {
    const suggestions = [];
    const lowerText = text.toLowerCase();
    
    // Smart replacements based on common patterns
    if (lowerText.includes('chicken')) {
      suggestions.push('chicken breast', 'chicken thighs', 'whole chicken');
    } else if (lowerText.includes('milk')) {
      suggestions.push('whole milk', '2% milk', 'skim milk', 'almond milk');
    } else if (lowerText.includes('bread')) {
      suggestions.push('whole wheat bread', 'white bread', 'sourdough bread');
    } else if (lowerText.includes('cheese')) {
      suggestions.push('cheddar cheese', 'mozzarella cheese', 'swiss cheese');
    } else if (lowerText.includes('apple')) {
      suggestions.push('red apples', 'green apples', 'gala apples', 'honey crisp apples');
    } else if (lowerText.includes('tomato')) {
      suggestions.push('roma tomatoes', 'cherry tomatoes', 'beefsteak tomatoes');
    } else if (lowerText.includes('potato')) {
      suggestions.push('russet potatoes', 'red potatoes', 'sweet potatoes');
    } else if (lowerText.includes('onion')) {
      suggestions.push('yellow onions', 'red onions', 'sweet onions');
    } else {
      // Generic cleanup
      const cleaned = text
        .replace(/\b(cook|bake|prepare|add|use|make|for dinner|tonight)\b/gi, '')
        .replace(/\b(until|for|at|in|with)\b.*/gi, '')
        .replace(/[()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned && cleaned !== text && cleaned.length > 2) {
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

        {/* ✅ REMOVED: Mode selector - only edit mode now */}

        {/* ✅ IMPROVED: Better selection instructions */}
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
            <div style={styles.instructionText}>
              👆 Click items to select them
            </div>
            <button onClick={handleSelectAll} style={styles.selectAllButton}>
              {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <span style={styles.selectedCount}>
              <strong>{selectedItems.length}</strong> of <strong>{filteredItems.length}</strong> selected
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
                  className="product-validator-item"
                  style={{
                    ...styles.itemCard,
                    ...(selectedItems.includes(item.id) ? styles.itemCardSelected : {})
                  }}
                  onClick={() => handleItemToggle(item.id)}
                >
                  <div style={styles.itemHeader}>
                    {/* ✅ FIXED: Better selection checkbox */}
                    <div 
                      className="product-validator-checkbox"
                      style={{
                        ...styles.checkboxContainer,
                        ...(selectedItems.includes(item.id) ? styles.checkboxContainerSelected : {})
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemToggle(item.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        style={styles.hiddenCheckbox}
                      />
                      <div style={{
                        ...styles.customCheckbox,
                        ...(selectedItems.includes(item.id) ? styles.customCheckboxChecked : {})
                      }}>
                        {selectedItems.includes(item.id) && (
                          <span style={styles.checkmark}>✓</span>
                        )}
                      </div>
                      <span style={styles.selectLabel}>
                        {selectedItems.includes(item.id) ? 'Selected' : 'Select'}
                      </span>
                    </div>
                    
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>
                        {/* ✅ FIXED: Always show editable input (no more review vs edit mode) */}
                        <input
                          type="text"
                          value={item.productName || item.itemName || ''}
                          onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
                          style={styles.itemNameInput}
                          placeholder="Enter product name..."
                          onClick={(e) => e.stopPropagation()}
                        />
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
                        style={{
                          ...styles.suggestButton,
                          opacity: isProcessing ? 0.6 : 1
                        }}
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

                    {/* ✅ FIXED: Always show edit controls (removed mode condition) */}
                    <div style={styles.editControls}>
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>Quantity:</label>
                        <input
                          type="text"
                          value={item.quantity || '1'}
                          onChange={(e) => handleItemEdit(item.id, 'quantity', e.target.value)}
                          style={styles.quantityInput}
                          placeholder="1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* ✅ FIXED: Unit dropdown with smart defaults auto-populated */}
                        <div style={styles.unitContainer}>
                          <select
                            value={item.unit || getSmartDefaultUnit(item)}
                            onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
                            style={styles.unitSelect}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {commonUnits.map(unit => (
                              <option key={unit.value} value={unit.value}>
                                {unit.label}
                              </option>
                            ))}
                          </select>
                          {!item.unit && (
                            <span style={styles.smartDefaultIndicator} title="Smart default applied">
                              🎯
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={styles.editRow}>
                        <label style={styles.editLabel}>Category:</label>
                        <select
                          value={item.category || 'other'}
                          onChange={(e) => handleItemEdit(item.id, 'category', e.target.value)}
                          style={styles.categorySelect}
                          onClick={(e) => e.stopPropagation()}
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
            
            {/* ✅ FIXED: Debug the button state */}
            <button 
              className="product-validator-button"
              onClick={() => {
                console.log('🔘 Remove Selected button clicked');
                console.log('Selected items length:', selectedItems.length);
                console.log('Selected items:', selectedItems);
                console.log('Is processing:', isProcessing);
                console.log('Button should be enabled:', selectedItems.length > 0 && !isProcessing);
                if (selectedItems.length === 0) {
                  alert('⚠️ Please select items to remove by clicking on them');
                  return;
                }
                handleRemoveSelected();
              }}
              disabled={isProcessing} // ✅ FIXED: Only disable when processing
              style={{
                ...styles.rejectButton,
                ...(selectedItems.length === 0 ? styles.buttonDisabled : styles.buttonEnabled)
              }}
            >
              {isProcessing ? '⏳ Removing...' : `🗑️ Remove Selected (${selectedItems.length})`}
            </button>
            
            {/* ✅ FIXED: Debug the approve button state */}
            <button 
              className="product-validator-button"
              onClick={() => {
                console.log('✅ Approve Selected button clicked');
                console.log('Selected items length:', selectedItems.length);
                console.log('Selected items:', selectedItems);
                console.log('Items to approve:', selectedItems.map(id => safeItems.find(item => item.id === id)?.productName));
                if (selectedItems.length === 0) {
                  alert('⚠️ Please select items to approve by clicking on them');
                  return;
                }
                handleApproveSelected();
              }}
              disabled={isProcessing} // ✅ FIXED: Only disable when processing
              style={{
                ...styles.approveButton,
                ...(selectedItems.length === 0 ? styles.buttonDisabled : styles.buttonEnabled)
              }}
            >
              {isProcessing ? '⏳ Approving...' : `✅ Approve Selected (${selectedItems.length})`}
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
    gap: '15px',
    flexWrap: 'wrap'
  },

  // ✅ NEW: Instruction text
  instructionText: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500',
    backgroundColor: '#eff6ff',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #bfdbfe'
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
    color: '#1f2937',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    padding: '6px 12px',
    borderRadius: '6px'
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
    cursor: 'pointer',
    position: 'relative'
  },

  itemCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
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

  // ✅ NEW: Better selection system
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid #e5e7eb',
    transition: 'all 0.2s ease',
    backgroundColor: '#f9fafb',
    minWidth: '100px',
    justifyContent: 'center'
  },

  checkboxContainerSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },

  hiddenCheckbox: {
    display: 'none'
  },

  customCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '2px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    transition: 'all 0.2s ease'
  },

  customCheckboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },

  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px'
  },

  selectLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },

  // ✅ NEW: Button state styles
  buttonEnabled: {
    opacity: 1,
    cursor: 'pointer',
    transform: 'scale(1)'
  },

  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'scale(0.98)'
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
    gap: '8px',
    flexWrap: 'wrap'
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

  // ✅ NEW: Enhanced unit select dropdown
  unitSelect: {
    minWidth: '140px',
    padding: '4px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },

  // ✅ NEW: Unit container for smart default indicator
  unitContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  // ✅ NEW: Smart default indicator
  smartDefaultIndicator: {
    fontSize: '12px',
    opacity: 0.7,
    cursor: 'help'
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
    gap: '10px',
    flexWrap: 'wrap'
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
    fontWeight: '500',
    transition: 'opacity 0.2s'
  },

  approveButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'opacity 0.2s'
  }
};

// ✅ Add CSS hover effects
const hoverStyles = `
  .product-validator-item:hover {
    border-color: #3b82f6 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }
  
  .product-validator-checkbox:hover {
    border-color: #3b82f6 !important;
    background-color: #eff6ff !important;
  }
  
  .product-validator-button:hover {
    transform: scale(1.02);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = hoverStyles;
  if (!document.head.querySelector('style[data-product-validator]')) {
    styleSheet.setAttribute('data-product-validator', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default ProductValidator;