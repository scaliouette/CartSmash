// client/src/components/ParsedResultsDisplay.js
import React, { useState } from 'react';

function ParsedResultsDisplay({ items, currentUser }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sortBy, setSortBy] = useState('category'); // category, alphabetical, quantity

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  const groupItemsByCategory = (items) => {
    return items.reduce((groups, item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  };

  const sortItems = (items, sortBy) => {
    switch (sortBy) {
      case 'alphabetical':
        return [...items].sort((a, b) => 
          (a.itemName || a.name || '').localeCompare(b.itemName || b.name || '')
        );
      case 'quantity':
        return [...items].sort((a, b) => {
          const qtyA = parseFloat(a.quantity) || 0;
          const qtyB = parseFloat(b.quantity) || 0;
          return qtyB - qtyA;
        });
      default:
        return items;
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  const groupedItems = groupItemsByCategory(items);
  const totalItems = items.length;
  const totalCategories = Object.keys(groupedItems).length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #d4edda, #c8e6c9)',
      padding: '25px',
      borderRadius: '15px',
      border: '2px solid #c3e6cb',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      marginTop: '20px'
    }}>
      {/* Header */}
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
            fontSize: '24px'
          }}>
            🎯 Smart Cart Results
          </h3>
          <p style={{
            color: '#155724',
            margin: '5px 0 0 0',
            opacity: 0.8,
            fontSize: '14px'
          }}>
            {totalItems} items • {totalCategories} categories
          </p>
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #c3e6cb',
              background: 'white',
              color: '#155724',
              fontSize: '14px'
            }}
          >
            <option value="category">Sort by Category</option>
            <option value="alphabetical">Sort A-Z</option>
            <option value="quantity">Sort by Quantity</option>
          </select>
        </div>
      </div>

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

      {/* Category Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {Object.entries(groupedItems)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryItems]) => {
            const isExpanded = expandedCategories[category] !== false; // Default expanded
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
                  onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #e9ecef, #dee2e6)'}
                  onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #f8f9fa, #e9ecef)'}
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
                    {sortedItems.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          margin: '5px 0',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#e9ecef';
                          e.target.style.transform = 'translateX(5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.transform = 'translateX(0px)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#333' }}>
                              {item.itemName || item.name || item.original}
                            </strong>
                            {item.quantity && (
                              <span style={{
                                color: '#666',
                                marginLeft: '8px',
                                fontSize: '14px'
                              }}>
                                ({item.quantity}{item.unit ? ` ${item.unit}` : ''})
                              </span>
                            )}
                          </div>

                          {/* Item Actions */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {item.confidence && (
                              <div style={{
                                width: '40px',
                                height: '6px',
                                background: '#e9ecef',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${item.confidence * 100}%`,
                                  height: '100%',
                                  background: item.confidence > 0.8 ? '#28a745' :
                                           item.confidence > 0.6 ? '#ffc107' : '#dc3545',
                                  borderRadius: '3px'
                                }} />
                              </div>
                            )}
                            
                            <button style={{
                              padding: '4px 8px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}>
                              ×
                            </button>
                          </div>
                        </div>

                        {/* Additional item info */}
                        {item.original && item.original !== (item.itemName || item.name) && (
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '5px',
                            fontStyle: 'italic'
                          }}>
                            Original: "{item.original}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Summary Actions */}
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
        
        <button style={{
          padding: '10px 20px',
          background: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          📤 Share Cart
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

export default ParsedResultsDisplay;