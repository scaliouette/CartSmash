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
  const [expandedItems, setExpandedItems] = useState(new Set());

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
    // Priority: Check for Spoonacular data first, then fall back to other sources
    const imageUrl = item.spoonacularData?.image_url ||
                     item.spoonacularData?.image ||
                     item.image_url ||
                     item.image ||
                     item.imageUrl;

    if (imageUrl) {
      // Return the URL directly - imageService will handle proxy if needed
      return imageUrl;
    }

    // Fall back to imageService for category-based fallback
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
                  color: 'white',
                  margin: '2px 0 0 0',
                  fontSize: '16px',
                  fontWeight: '500',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
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

          return (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 60px 1fr 80px',
                gap: '12px',
                alignItems: 'center',
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
              }}
            >
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
                    position: 'relative'
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

                {/* Product Image - Smaller for mobile */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {productImage ? (
                      <img
                        src={imageService.useProxyIfNeeded(productImage)}
                        alt={item.productName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          // Hide the failed image
                          e.target.style.display = 'none';
                          // Show the fallback emoji
                          const fallback = e.target.nextElementSibling;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: productImage ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8f9fa',
                      color: '#6c757d'
                    }}>
                      <span style={{ fontSize: '28px' }}>🛒</span>
                    </div>
                  </div>
                </div>

                {/* Product Details Section */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: 0, /* Prevent text overflow */
                  flex: 1
                }}>
                  {/* Product Name */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    marginBottom: '2px'
                  }}>
                    {formatProductName(item.productName)}
                  </div>

                  {/* Size/Brand as subtle text */}
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    {[
                      item.brand || item.spoonacularData?.brand,
                      item.size || item.packageSize || item.spoonacularData?.servingSize
                    ].filter(Boolean).join(' • ')}
                  </div>


                  {/* Expandable Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newExpanded = new Set(expandedItems);
                      if (newExpanded.has(item.id)) {
                        newExpanded.delete(item.id);
                      } else {
                        newExpanded.add(item.id);
                      }
                      setExpandedItems(newExpanded);
                    }}
                    style={{
                      fontSize: '11px',
                      color: '#002244',
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>
                      {expandedItems.has(item.id) ? '▼' : '▶'}
                    </span>
                    {expandedItems.has(item.id) ? 'Hide Details' : 'Show Details'}
                  </button>

                  {/* Expanded Details Section */}
                  {expandedItems.has(item.id) && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '12px',
                      lineHeight: '1.5'
                    }}>
                      {/* Description */}
                      {(item.description || item.spoonacularData?.description || item.spoonacularData?.generatedText) && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Description:</strong><br />
                          {item.description || item.spoonacularData?.description || item.spoonacularData?.generatedText}
                        </div>
                      )}

                      {/* Nutrition Facts */}
                      {(item.nutrition?.nutrients || item.spoonacularData?.nutrition?.nutrients) && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Nutrition Facts:</strong><br />
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '4px',
                            marginTop: '4px'
                          }}>
                            {(item.nutrition?.nutrients || item.spoonacularData?.nutrition?.nutrients || [])
                              .filter(n => ['Calories', 'Protein', 'Carbohydrates', 'Fat', 'Sugar', 'Sodium'].includes(n.name))
                              .map((nutrient, idx) => (
                                <div key={idx} style={{ fontSize: '11px' }}>
                                  {nutrient.name}: {nutrient.amount}{nutrient.unit}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      {(item.spoonacularData?.servings || item.spoonacularData?.creditsText) && (
                        <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '4px' }}>
                          {item.spoonacularData?.servings && (
                            <span>Servings: {item.spoonacularData.servings} • </span>
                          )}
                          {item.spoonacularData?.creditsText && (
                            <span>{item.spoonacularData.creditsText}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Price and Quantity Section */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px'
                }}>
                  {/* Price */}
                  {(item.price !== null && item.price !== undefined) && (
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#212529'
                    }}>
                      ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price ? parseFloat(item.price).toFixed(2) : ''}
                    </div>
                  )}

                  {/* Quantity Input */}
                  <input
                    type="number"
                    value={item.shoppingMultiplier || item.quantity || 1}
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
                      width: '50px',
                      height: '32px',
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