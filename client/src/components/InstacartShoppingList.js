import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import imageService from '../utils/imageService';

function InstacartShoppingList({ items = [], sortBy, filterBy, onItemsChange, onDeleteItem, onSelectProduct, retailers = [], selectedRetailerId }) {
  // Only manage selection state locally - let parent manage items
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Use items directly from props instead of local state

  // Calculate totals
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      // Handle different price formats
      let itemPrice = 0;
      if (typeof item.price === 'number') {
        itemPrice = item.price;
      } else if (typeof item.price === 'string') {
        itemPrice = parseFloat(item.price) || 0;
      }
      const itemQuantity = parseInt(item.quantity) || 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);
  }, [items]);

  // Format product names consistently
  const formatProductName = useCallback((name) => {
    if (!name) return 'Unknown Product';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  // Handle selection toggle
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    const allItemsSelected = items.length > 0 && selectedItems.size === items.length;

    if (allItemsSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  // Handle delete selected items
  const deleteSelectedItems = () => {
    const updatedItems = items.filter(item => !selectedItems.has(item.id));
    setSelectedItems(new Set());

    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Handle delete single item - ONLY call the parent's delete handler, no dual state updates
  const deleteSingleItem = (itemId) => {
    // Remove from selected items if it was selected
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });

    // Only call the delete handler - parent will manage the state
    if (onDeleteItem) {
      onDeleteItem(itemId);
    }
  };

  // Calculate detailed pricing breakdown for current retailer
  const calculateDetailedPricing = useCallback(() => {
    const subtotal = total;
    const serviceFee = subtotal * 0.10; // 10% service fee estimate
    const delivery = 3.99; // Standard delivery
    const finalTotal = subtotal + serviceFee + delivery;

    return {
      subtotal,
      serviceFee,
      delivery,
      finalTotal
    };
  }, [total, retailers.length, selectedRetailerId]);

  // Handle direct quantity input
  const setQuantity = (itemId, value) => {
    const newQuantity = Math.max(1, parseInt(value) || 1);

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity
        };
      }
      return item;
    });

    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Get category from item
  const getCategory = (item) => {
    return item.category || 'Other';
  };

  // Get product image using the centralized image service
  const getProductImage = (item) => {
    // Use imageService which handles proxy and fallbacks
    return imageService.getProductImage(item, { width: 64, height: 64 });
  };

  // Get confidence value and level for display
  const getConfidenceDisplay = (item) => {
    if (typeof item.confidence === 'number') {
      const value = Math.round(item.confidence * 100);
      const level = item.confidence > 0.8 ? 'high' : item.confidence > 0.5 ? 'medium' : 'low';
      return { value, level };
    }

    const confidenceMap = {
      'high': { value: 95, level: 'high' },
      'medium': { value: 70, level: 'medium' },
      'low': { value: 45, level: 'low' }
    };

    return confidenceMap[item.confidence] || { value: 70, level: 'medium' };
  };

  // Format the unit display for the orange badge (recipe requirement, not shopping quantity)
  const formatUnitDisplay = (item) => {
    // Safely extract primitive values (avoid objects that cause React Error #31)
    const extractPrimitive = (value, fallback = '') => {
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (typeof value === 'object' && value?.name) return value.name;
      if (typeof value === 'object' && value?.value) return value.value;
      return fallback;
    };

    // This shows the RECIPE REQUIREMENT (e.g., "2 cups flour" needed for recipe)
    // This should NOT change when user adjusts shopping quantity
    const recipeAmount = extractPrimitive(item.recipeQuantity) || extractPrimitive(item.unitCount) || extractPrimitive(item.originalQuantity) || 1;
    const unit = extractPrimitive(item.unit) || 'each';

    // If unit is "each", show as items
    if (String(unit) === 'each') {
      return `${recipeAmount} ${Number(recipeAmount) === 1 ? 'item' : 'items'}`;
    }

    // Format as "amount unit" (e.g., "2 cups", "1 lb")
    return `${recipeAmount} ${unit}`;
  };

  // Get current retailer info and logo
  const getCurrentRetailer = () => {
    if (retailers.length > 0 && selectedRetailerId) {
      const result = retailers.find(r => (r.retailer_key || r.id) === selectedRetailerId);
      return result;
    }
    return null;
  };

  const currentRetailer = getCurrentRetailer();
  const retailerLogo = currentRetailer?.retailer_logo_url || currentRetailer?.logo_url;
  const retailerName = currentRetailer?.name;

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    let result = 0;

    switch (sortBy) {
      case 'confidence':
        const aConf = a.confidence || 0;
        const bConf = b.confidence || 0;
        result = bConf - aConf;
        break;
      case 'price':
        const aPrice = a.price || 0;
        const bPrice = b.price || 0;
        result = aPrice - bPrice;
        break;
      case 'alphabetical':
        const aName = formatProductName(a.productName || '');
        const bName = formatProductName(b.productName || '');
        result = aName.localeCompare(bName);
        break;
      case 'category':
        const aCat = getCategory(a);
        const bCat = getCategory(b);
        result = aCat.localeCompare(bCat);
        break;
      default:
        result = 0;
        break;
    }

    return result;
  });

  // Filter items
  const filteredItems = sortedItems.filter(item => {
    if (filterBy === 'all') {
      return true;
    }

    if (filterBy === 'ingredients') {
      // Show items that are typically cooking ingredients
      const category = (getCategory(item) || 'Other').toLowerCase();
      const ingredientCategories = ['pantry', 'spices', 'oils', 'seasonings', 'baking', 'condiments'];
      const isIngredient = ingredientCategories.some(cat => category.includes(cat));
      return isIngredient;
    }

    const itemCategory = (getCategory(item) || 'Other').toLowerCase();
    const targetCategory = (filterBy || '').toLowerCase();
    const matches = itemCategory === targetCategory;
    return matches;
  });

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: '#002244',
        borderRadius: '8px 8px 0 0',
        color: 'white',
        marginBottom: '0'
      }}>
        {/* Top Controls */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Left: Item count and retailer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Shopping List ({filteredItems.length} items)
            </span>

            {/* Retailer Badge */}
            {currentRetailer && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '16px'
              }}>
                {retailerLogo && (
                  <img
                    src={retailerLogo}
                    alt={retailerName}
                    style={{
                      height: '16px',
                      width: 'auto'
                    }}
                  />
                )}
                <span style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {retailerName}
                </span>
              </div>
            )}
          </div>

          {/* Right: Bulk Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Selection Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={toggleSelectAll}
                style={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  fontSize: '12px',
                  textTransform: 'none',
                  minWidth: 'auto',
                  padding: '6px 12px'
                }}
              >
                {items.length > 0 && selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedItems.size > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={deleteSelectedItems}
                  startIcon={<DeleteIcon />}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    fontSize: '12px',
                    textTransform: 'none',
                    minWidth: 'auto',
                    padding: '6px 12px'
                  }}
                >
                  Delete ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Price Summary Bar */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px 24px',
          borderTop: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#6c757d', fontSize: '14px' }}>
                Estimated Total:
              </span>
              <span style={{
                color: '#28a745',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                ${total.toFixed(2)}
              </span>
            </div>

            {currentRetailer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {(() => {
                  const pricing = calculateDetailedPricing();
                  return (
                    <>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#6c757d' }}>
                        <div>Subtotal: ${pricing.subtotal.toFixed(2)}</div>
                        <div>Fees: ${(pricing.serviceFee + pricing.delivery).toFixed(2)}</div>
                      </div>
                      <div style={{
                        color: '#002244',
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        ${pricing.finalTotal.toFixed(2)}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {filteredItems.map((item) => {
          const isSelected = selectedItems.has(item.id);
          const confidence = getConfidenceDisplay(item);
          const productImage = getProductImage(item);

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                backgroundColor: isSelected ? '#f0f7ff' : 'white',
                padding: '12px',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer'
              }}
              onClick={() => toggleItemSelection(item.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#fafafa';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}>
                {/* Left side: Checkbox and Image */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Custom Checkbox with CartSmash Branding */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(item.id);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      border: `2px solid ${isSelected ? '#FB4F14' : '#dee2e6'}`,
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#FB4F14' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {isSelected && (
                      <CheckIcon
                        style={{
                          fontSize: '16px',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </div>

                  {/* Product Image */}
                  <img
                    src={productImage}
                    alt={formatProductName(item.productName)}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}
                    onError={(e) => {
                      // Fallback to category-based SVG if image fails
                      e.target.src = imageService.getImageUrl(
                        imageService.getCategoryFromItem(item)
                      );
                    }}
                  />
                </div>

                {/* Product Info Container */}
                <div style={{
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {/* First Row: Product Name and Quantity Controls */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      flex: 1
                    }}>
                      {formatProductName(item.productName)}
                    </div>

                    {/* Quantity Controls: - [number] + */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentQty = item.quantity || 1;
                          setQuantity(item.id, Math.max(1, currentQty - 1));
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#6c757d',
                          padding: 0
                        }}
                      >
                        −
                      </button>

                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => {
                          e.stopPropagation();
                          const value = parseInt(e.target.value) || 1;
                          setQuantity(item.id, value);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.target.select();
                        }}
                        min="1"
                        max="99"
                        style={{
                          width: '40px',
                          height: '24px',
                          textAlign: 'center',
                          fontSize: '14px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#FB4F14';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#dee2e6';
                        }}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentQty = item.quantity || 1;
                          setQuantity(item.id, Math.min(99, currentQty + 1));
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#6c757d',
                          padding: 0
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Second Row: Brand */}
                  {(item.brand || item.spoonacularData?.brand) && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d'
                    }}>
                      {item.brand || item.spoonacularData?.brand}
                    </div>
                  )}

                  {/* Third Row: Size - Check all possible fields for product specifications */}
                  {(item.size || item.packageSize || item.servingSize || item.spoonacularData?.servingSize || item.spoonacular?.servingSize) && (
                    <div style={{
                      fontSize: '12px',
                      color: '#495057',
                      fontWeight: '500'
                    }}>
                      {item.size || item.packageSize || item.servingSize || item.spoonacularData?.servingSize || item.spoonacular?.servingSize}
                    </div>
                  )}
                </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6c757d'
          }}>
            <ShoppingCartIcon style={{ fontSize: '48px', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              No items found
            </h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              {filterBy === 'all' ? 'Your shopping list is empty.' : `No items match the "${filterBy}" filter.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstacartShoppingList;