// client/src/components/ParsedResultsDisplay.js - Enhanced with product intelligence
import React, { useState, useEffect } from 'react';

function ParsedResultsDisplay({ items, currentUser, onItemsChange, parsingStats }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sortBy, setSortBy] = useState('confidence'); // confidence, category, alphabetical, price
  const [filterBy, setFilterBy] = useState('all'); // all, high_confidence, medium_confidence, needs_review
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [validatingProducts, setValidatingProducts] = useState(false);
  const [productValidations, setProductValidations] = useState({});
  const [showPricing, setShowPricing] = useState(true);
  const [cartTotal, setCartTotal] = useState(null);

  // Smart product validation on component mount
  useEffect(() => {
    if (items && items.length > 0) {
      validateProducts();
      calculateRealTotal();
    }
  }, [items]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const validateProducts = async () => {
    if (!items || items.length === 0) return;
    
    setValidatingProducts(true);
    console.log('🔍 Starting product validation...');
    
    try {
      const response = await fetch('/api/products/validate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: items.map(item => ({
            productName: item.productName || item.itemName || item.name,
            quantity: item.quantity || 1
          }))
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const validationMap = {};
        
        data.validations.forEach((validation, index) => {
          const itemId = items[index]?.id;
          if (itemId) {
            validationMap[itemId] = validation.validation;
          }
        });
        
        setProductValidations(validationMap);
        console.log(`✅ Product validation complete: ${Object.keys(validationMap).length} products validated`);
      }
    } catch (error) {
      console.error('❌ Product validation failed:', error);
    } finally {
      setValidatingProducts(false);
    }
  };

  const calculateRealTotal = async () => {
    if (!items || items.length === 0) return;
    
    try {
      const response = await fetch('/api/products/calculate-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productName: item.productName || item.itemName || item.name,
            quantity: item.quantity || 1
          })),
          store: 'instacart'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCartTotal(data.calculation);
        console.log('💰 Real cart total calculated:', data.calculation.pricing.total);
      }
    } catch (error) {
      console.error('❌ Cart calculation failed:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    setDeletingItems(prev => new Set([...prev, itemId]));
    
    try {
      const response = await fetch(`/api/cart/item/${itemId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        if (onItemsChange) {
          const updatedItems = items.filter(item => item.id !== itemId);
          onItemsChange(updatedItems);
        }
        console.log(`✅ Item ${itemId} deleted successfully`);
      } else {
        alert('Failed to delete item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleSmartReparse = async () => {
    if (!items || items.length === 0) return;
    
    const originalText = items.map(item => item.original).join('\n');
    
    try {
      const response = await fetch('/api/ai/smart-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          options: { strictMode: true }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (onItemsChange && data.products) {
          onItemsChange(data.products);
        }
        console.log('🎯 Smart reparse completed:', data.parsingStats);
      }
    } catch (error) {
      console.error('❌ Smart reparse failed:', error);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#28a745'; // Green
    if (confidence >= 0.6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getCategoryEmoji = (category) => {
    const categoryEmojis = {
      'produce': '🥬',
      'dairy': '🥛', 
      'meat': '🥩',
      'pantry': '🥫',
      'frozen': '🧊',
      'bakery': '🍞',
      'beverages': '🥤',
      'snacks': '🍿',
      'personal care': '🧴',
      'household': '🏠',
      'other': '📦'
    };
    return categoryEmojis[category?.toLowerCase()] || '📦';
  };

  const filterItems = (items) => {
    let filtered = [...items];
    
    // Apply confidence filter
    switch (filterBy) {
      case 'high_confidence':
        filtered = filtered.filter(item => (item.confidence || 0) >= 0.8);
        break;
      case 'medium_confidence':
        filtered = filtered.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8);
        break;
      case 'needs_review':
        filtered = filtered.filter(item => (item.confidence || 0) < 0.6);
        break;
      default:
        // Show all
        break;
    }
    
    return filtered;
  };

  const sortItems = (items, sortBy) => {
    switch (sortBy) {
      case 'confidence':
        return [...items].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      case 'alphabetical':
        return [...items].sort((a, b) => 
          (a.productName || a.itemName || a.name || '').localeCompare(
            b.productName || b.itemName || b.name || ''
          )
        );
      case 'price':
        return [...items].sort((a, b) => {
          const priceA = productValidations[a.id]?.product?.totalPrice || 0;
          const priceB = productValidations[b.id]?.product?.totalPrice || 0;
          return priceB - priceA;
        });
      case 'category':
      default:
        return items;
    }
  };

  const groupItemsByCategory = (items) => {
    const filtered = filterItems(items);
    return filtered.reduce((groups, item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  };

  if (!items || items.length === 0) {
    return null;
  }

  const groupedItems = groupItemsByCategory(items);
  const totalItems = items.length;
  const highConfidenceItems = items.filter(item => (item.confidence || 0) >= 0.8).length;
  const needsReviewItems = items.filter(item => (item.confidence || 0) < 0.6).length;
  const totalCategories = Object.keys(groupedItems).length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #e8f5e8, #d4edda)',
      padding: '25px',
      borderRadius: '15px',
      border: '2px solid #c3e6cb',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      marginTop: '20px'
    }}>
      {/* Enhanced Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h3 style={{
            color: '#155724',
            margin: 0,
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🎯 Smart Cart Results
            {validatingProducts && (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #155724',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
          </h3>
          <div style={{
            color: '#155724',
            margin: '5px 0',
            opacity: 0.8,
            fontSize: '14px',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span>📦 {totalItems} items</span>
            <span>📊 {totalCategories} categories</span>
            <span style={{ color: '#28a745' }}>✅ {highConfidenceItems} validated</span>
            {needsReviewItems > 0 && (
              <span style={{ color: '#dc3545' }}>⚠️ {needsReviewItems} need review</span>
            )}
          </div>
        </div>

        {/* Smart Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSmartReparse}
            style={{
              padding: '8px 12px',
              background: 'linear-gradient(45deg, #17a2b8, #20c997)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🎯 Smart Parse
          </button>
          
          <button
            onClick={validateProducts}
            disabled={validatingProducts}
            style={{
              padding: '8px 12px',
              background: validatingProducts ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: validatingProducts ? 'not-allowed' : 'pointer'
            }}
          >
            {validatingProducts ? '⏳ Validating...' : '🔍 Validate Products'}
          </button>
        </div>
      </div>

      {/* Intelligence Stats */}
      {parsingStats && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          <h4 style={{ color: '#155724', margin: '0 0 10px 0', fontSize: '16px' }}>
            🧠 Parsing Intelligence Stats
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Filtering Efficiency:</strong><br />
              <span style={{ color: '#28a745', fontSize: '16px' }}>
                {parsingStats.processingMetrics?.filteringEfficiency || 'N/A'}
              </span>
            </div>
            <div>
              <strong>Average Confidence:</strong><br />
              <span style={{ color: '#17a2b8', fontSize: '16px' }}>
                {(parsingStats.averageConfidence * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div>
              <strong>High Confidence:</strong><br />
              <span style={{ color: '#28a745', fontSize: '16px' }}>
                {parsingStats.highConfidence || 0} items
              </span>
            </div>
            <div>
              <strong>Categories Found:</strong><br />
              <span style={{ color: '#6f42c1', fontSize: '16px' }}>
                {parsingStats.categoriesFound?.length || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Real Pricing Display */}
      {cartTotal && showPricing && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '2px solid #ffc107'
        }}>
          <h4 style={{ color: '#856404', margin: '0 0 10px 0', fontSize: '16px' }}>
            💰 Real Cart Pricing (Instacart)
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px',
            fontSize: '14px'
          }}>
            <div><strong>Subtotal:</strong> ${cartTotal.pricing.subtotal}</div>
            <div><strong>Delivery:</strong> ${cartTotal.pricing.deliveryFee}</div>
            <div><strong>Tax:</strong> ${cartTotal.pricing.tax}</div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#155724',
              gridColumn: 'span 2'
            }}>
              <strong>Total: ${cartTotal.pricing.total}</strong>
            </div>
          </div>
          {cartTotal.unavailableCount > 0 && (
            <div style={{ color: '#dc3545', marginTop: '10px', fontSize: '12px' }}>
              ⚠️ {cartTotal.unavailableCount} items unavailable
            </div>
          )}
        </div>
      )}

      {/* User Status */}
      {currentUser && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#155724'
        }}>
          ✅ <strong>Cart saved to {currentUser.email}</strong> • Syncs across all devices
        </div>
      )}

      {/* Filters and Sorting */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#155724' }}>
            Filter:
          </label>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            style={{
              marginLeft: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #c3e6cb',
              background: 'white',
              color: '#155724',
              fontSize: '14px'
            }}
          >
            <option value="all">All Items</option>
            <option value="high_confidence">High Confidence</option>
            <option value="medium_confidence">Medium Confidence</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#155724' }}>
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              marginLeft: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #c3e6cb',
              background: 'white',
              color: '#155724',
              fontSize: '14px'
            }}
          >
            <option value="confidence">Confidence</option>
            <option value="category">Category</option>
            <option value="alphabetical">A-Z</option>
            <option value="price">Price</option>
          </select>
        </div>

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '14px',
          color: '#155724'
        }}>
          <input
            type="checkbox"
            checked={showPricing}
            onChange={(e) => setShowPricing(e.target.checked)}
          />
          Show Pricing
        </label>
      </div>

      {/* Category Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {Object.entries(groupedItems)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryItems]) => {
            const isExpanded = expandedCategories[category] !== false;
            const sortedItems = sortItems(categoryItems, sortBy);
            
            return (
              <div key={category} style={{
                background: 'white',
                borderRadius: '10px',
                border: '1px solid #c3e6cb',
                overflow: 'hidden',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#155724',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <span>
                    {getCategoryEmoji(category)} {category} ({categoryItems.length} items)
                  </span>
                  <span style={{
                    fontSize: '18px',
                    transition: 'transform 0.2s ease',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                  }}>
                    ▶
                  </span>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div style={{ padding: '10px' }}>
                    {sortedItems.map((item, index) => {
                      const validation = productValidations[item.id];
                      const confidence = item.confidence || 0;
                      
                      return (
                        <div
                          key={item.id || index}
                          style={{
                            padding: '12px',
                            margin: '5px 0',
                            background: confidence >= 0.8 ? '#f8fff8' : 
                                       confidence >= 0.6 ? '#fffdf0' : '#fff8f8',
                            borderRadius: '8px',
                            border: `2px solid ${getConfidenceColor(confidence)}30`,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            {/* Product Info */}
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                <strong style={{ fontSize: '15px', color: '#333' }}>
                                  {item.productName || item.itemName || item.name || item.original}
                                </strong>
                                
                                {/* Confidence Badge */}
                                <div style={{
                                  padding: '2px 8px',
                                  background: getConfidenceColor(confidence),
                                  color: 'white',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}>
                                  {getConfidenceLabel(confidence)}
                                </div>
                              </div>
                              
                              {/* Quantity and Unit */}
                              {item.quantity && (
                                <div style={{
                                  color: '#666',
                                  fontSize: '14px',
                                  marginBottom: '5px'
                                }}>
                                  Quantity: {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                                </div>
                              )}
                              
                              {/* Product Validation Info */}
                              {validation && validation.isValid && (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#28a745',
                                  display: 'flex',
                                  gap: '15px',
                                  flexWrap: 'wrap'
                                }}>
                                  {showPricing && validation.product?.totalPrice && (
                                    <span>💰 ${validation.product.totalPrice}</span>
                                  )}
                                  <span>✅ Validated</span>
                                  {validation.availability?.stores && (
                                    <span>🏪 {validation.availability.stores.length} stores</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {/* Confidence Bar */}
                              <div style={{
                                width: '50px',
                                height: '8px',
                                background: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${confidence * 100}%`,
                                  height: '100%',
                                  background: getConfidenceColor(confidence),
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingItems.has(item.id)}
                                style={{
                                  padding: '4px 8px',
                                  background: deletingItems.has(item.id) ? '#ccc' : '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: deletingItems.has(item.id) ? 'not-allowed' : 'pointer',
                                  transition: 'background 0.2s ease'
                                }}
                                title="Remove item"
                              >
                                {deletingItems.has(item.id) ? '...' : '×'}
                              </button>
                            </div>
                          </div>

                          {/* Additional item info */}
                          {item.original && item.original !== (item.productName || item.itemName || item.name) && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginTop: '8px',
                              fontStyle: 'italic',
                              padding: '4px 8px',
                              background: '#f8f9fa',
                              borderRadius: '4px'
                            }}>
                              Original: "{item.original}"
                            </div>
                          )}
                          
                          {/* AI Factors (for debugging) */}
                          {item.factors && item.factors.length > 0 && (
                            <details style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                              <summary style={{ cursor: 'pointer' }}>AI Analysis Factors</summary>
                              <div style={{ marginTop: '4px' }}>
                                {item.factors.map((factor, i) => (
                                  <span key={i} style={{
                                    display: 'inline-block',
                                    background: '#e9ecef',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    margin: '2px',
                                    fontSize: '10px'
                                  }}>
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Enhanced Summary Actions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '10px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button style={{
          padding: '10px 20px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          🛒 Add to Instacart
        </button>
        
        <button 
          onClick={validateProducts}
          style={{
            padding: '10px 20px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔍 Validate All Products
        </button>
        
        <button style={{
          padding: '10px 20px',
          background: '#6f42c1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          💰 Compare Prices
        </button>

        <button style={{
          padding: '10px 20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          📄 Export List
        </button>
      </div>
    </div>
  );
}

// Add spinning animation
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleElement);

export default ParsedResultsDisplay;