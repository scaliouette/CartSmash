import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Chip, Button, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import imageService from '../utils/imageService';

// Stub functions to prevent build errors
const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, trace: () => {} };
const createTimer = () => ({ start: () => {}, mark: () => {}, end: () => {} });
const conditionalLog = {
  apiCall: () => {},
  componentLifecycle: () => {},
  stateChange: () => {},
  performance: () => {},
  apiSuccess: () => {}
};

function InstacartShoppingList({ items = [], sortBy, filterBy, onItemsChange, onDeleteItem, onSelectProduct, retailers = [], selectedRetailerId }) {
  // Generate a unique component ID for debugging
  const componentId = useMemo(() => `InstacartShoppingList_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`, []);

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

  // Calculate if all items are selected
  const allItemsSelected = items.length > 0 && selectedItems.size === items.length;
  const someItemsSelected = selectedItems.size > 0;

  // Handle quantity change (shopping multiplier, not recipe amount)
  const updateQuantity = (itemId, delta) => {
    const targetItem = items.find(item => item.id === itemId);
    // This is the SHOPPING MULTIPLIER - how many "units" of the recipe requirement to buy
    const currentMultiplier = parseInt(targetItem?.shoppingMultiplier || targetItem?.quantity) || 1;
    const newMultiplier = Math.max(1, currentMultiplier + delta);

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        // Preserve original recipe quantity while updating shopping multiplier
        return {
          ...item,
          shoppingMultiplier: newMultiplier,
          quantity: newMultiplier,
          // Preserve original recipe requirements
          recipeQuantity: item.recipeQuantity || item.originalQuantity || item.unitCount,
          originalQuantity: item.originalQuantity || item.unitCount || item.recipeQuantity
        };
      }
      return item;
    });

    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Calculate detailed pricing breakdown when store is selected
  const calculateDetailedPricing = useCallback(() => {
    const subtotal = total;
    const serviceFee = 4.99;
    const delivery = 3.99;
    const finalTotal = subtotal + serviceFee + delivery;
    const hasStoreSelected = retailers.length > 0 && selectedRetailerId;

    return {
      subtotal,
      serviceFee,
      delivery,
      finalTotal,
      hasStoreSelected
    };
  }, [total, retailers.length, selectedRetailerId]);

  // Handle direct quantity input (shopping multiplier)
  const setQuantity = (itemId, value) => {
    const multiplier = parseInt(value) || 1;
    const finalMultiplier = Math.max(1, multiplier);

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        // Preserve original recipe quantity while updating shopping multiplier
        return {
          ...item,
          shoppingMultiplier: finalMultiplier,
          quantity: finalMultiplier,
          // Preserve original recipe requirements
          recipeQuantity: item.recipeQuantity || item.originalQuantity || item.unitCount,
          originalQuantity: item.originalQuantity || item.unitCount || item.recipeQuantity
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
      <style>{`
        /* Hide number input spinners across all browsers */
        .quantity-input::-webkit-inner-spin-button,
        .quantity-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .quantity-input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      {/* Modern Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '24px'
      }}>
        {/* Top Navy Header Bar */}
        <div style={{
          backgroundColor: '#002244',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Left: Title and Store Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flex: '1 1 auto'
          }}>
            {/* Title with Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingCartIcon style={{ color: 'white', fontSize: '20px' }} />
              </div>
              <div>
                <h2 style={{
                  color: 'white',
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '600',
                  letterSpacing: '-0.5px'
                }}>
                  Shopping List
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '400'
                }}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            {/* Store Display */}
            {currentRetailer && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                {retailerLogo && (
                  <img
                    src={retailerLogo}
                    alt={retailerName}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px'
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
                {allItemsSelected ? 'Deselect All' : 'Select All'}
              </Button>

              {someItemsSelected && (
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredItems.map((item) => {
          const isSelected = selectedItems.has(item.id);
          const confidence = getConfidenceDisplay(item);
          const productImage = getProductImage(item);
          const unitDisplay = formatUnitDisplay(item);

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: isSelected ? '2px solid #007bff' : '1px solid #e9ecef',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Selection Checkbox */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: isSelected ? 'none' : '2px solid #dee2e6',
                  backgroundColor: isSelected ? '#007bff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected && <CheckIcon style={{ color: 'white', fontSize: '16px' }} />}
                </div>

                {/* Product Image */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f8f9fa',
                  flexShrink: 0
                }}>
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={item.productName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6c757d'
                    }}>
                      📦
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{
                      margin: '0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#212529',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {formatProductName(item.productName)}
                    </h3>

                    {/* Unit Badge */}
                    <Chip
                      label={unitDisplay}
                      size="small"
                      style={{
                        backgroundColor: '#ff8c00',
                        color: 'white',
                        fontSize: '11px',
                        height: '22px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Category */}
                    <span style={{
                      color: '#6c757d',
                      fontSize: '12px',
                      textTransform: 'capitalize'
                    }}>
                      {getCategory(item)}
                    </span>

                    {/* Brand */}
                    {item.brand && (
                      <span style={{
                        color: '#6c757d',
                        fontSize: '12px',
                        fontStyle: 'italic'
                      }}>
                        {item.brand}
                      </span>
                    )}

                    {/* Aisle */}
                    {item.aisle && (
                      <span style={{
                        color: '#17a2b8',
                        fontSize: '11px',
                        backgroundColor: '#e7f3f5',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Aisle {item.aisle}
                      </span>
                    )}

                    {/* Confidence */}
                    <Chip
                      label={`${confidence.value}%`}
                      size="small"
                      style={{
                        backgroundColor: confidence.level === 'high' ? '#28a745' :
                                        confidence.level === 'medium' ? '#ffc107' : '#dc3545',
                        color: confidence.level === 'medium' ? '#000' : '#fff',
                        fontSize: '10px',
                        height: '20px'
                      }}
                    />

                    {/* Price */}
                    {(item.price !== null && item.price !== undefined) ? (
                      <span style={{
                        color: '#28a745',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{
                        color: '#999',
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        Price N/A
                      </span>
                    )}
                  </div>

                  {/* Badges Row */}
                  {item.badges && item.badges.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      marginTop: '6px',
                      flexWrap: 'wrap'
                    }}>
                      {item.badges.slice(0, 4).map((badge, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '10px',
                            backgroundColor: badge.includes('organic') ? '#4caf50' :
                                          badge.includes('gluten') ? '#ff9800' :
                                          badge.includes('vegan') ? '#8bc34a' : '#9e9e9e',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {badge.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Nutrition Info */}
                  {item.nutrition && item.nutrition.nutrients && item.nutrition.nutrients.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '4px',
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      {item.nutrition.nutrients.slice(0, 3).map((nutrient, idx) => (
                        <span key={idx}>
                          {nutrient.name}: <strong>{nutrient.amount}{nutrient.unit}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Product Size/Unit Info */}
                  {(item.size || item.unit || item.packageSize || item.containerType) && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '11px',
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      {[
                        item.size,
                        item.packageSize,
                        item.containerType,
                        item.unit && `per ${item.unit}`
                      ].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, -1);
                    }}
                    style={{
                      backgroundColor: '#f8f9fa',
                      width: '32px',
                      height: '32px'
                    }}
                  >
                    <RemoveIcon style={{ fontSize: '16px' }} />
                  </IconButton>

                  <input
                    type="number"
                    value={item.shoppingMultiplier || item.quantity || 1}
                    onChange={(e) => {
                      e.stopPropagation();
                      setQuantity(item.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    min="1"
                    style={{
                      width: '50px',
                      height: '32px',
                      textAlign: 'center',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none',
                      appearance: 'textfield'
                    }}
                    className="quantity-input"
                  />

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, 1);
                    }}
                    style={{
                      backgroundColor: '#f8f9fa',
                      width: '32px',
                      height: '32px'
                    }}
                  >
                    <AddIcon style={{ fontSize: '16px' }} />
                  </IconButton>

                  {/* Select Product Button - Show when no price or low confidence */}
                  {(item.price === null || item.price === undefined || confidence.level === 'low') && onSelectProduct && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(item);
                      }}
                      style={{
                        marginLeft: '8px',
                        borderColor: '#007bff',
                        color: '#007bff',
                        fontSize: '12px',
                        padding: '4px 8px',
                        minWidth: 'auto'
                      }}
                    >
                      Select
                    </Button>
                  )}

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSingleItem(item.id);
                    }}
                    style={{
                      color: '#dc3545',
                      marginLeft: '8px'
                    }}
                  >
                    <DeleteIcon style={{ fontSize: '18px' }} />
                  </IconButton>
                </div>
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