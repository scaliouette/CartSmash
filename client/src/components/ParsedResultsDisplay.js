import React, { useState, useEffect } from 'react';

function ParsedResultsDisplay({ items, currentUser, onItemsChange, parsingStats }) {
  const [sortBy, setSortBy] = useState('confidence');
  const [filterBy, setFilterBy] = useState('all');
  const [showStats, setShowStats] = useState(false); // ✅ FIX: Hidden by default
  const [realPrices, setRealPrices] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // ✅ FIX: Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate real total price
  const calculateRealTotal = async () => {
    const prices = {};
    for (const item of items) {
      try {
        const response = await fetch(`/api/products/pricing?productName=${encodeURIComponent(item.productName || item.itemName)}`);
        if (response.ok) {
          const data = await response.json();
          prices[item.id] = data.pricing?.price || 0;
        }
      } catch (error) {
        console.warn('Failed to fetch price for:', item.productName);
        prices[item.id] = 0;
      }
    }
    setRealPrices(prices);
  };

  // Validate products against real database
  const validateProducts = async () => {
    try {
      const response = await fetch('/api/kroger/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: items })
      });
      
      if (response.ok) {
        const data = await response.json();
        const validationMap = {};
        data.validatedProducts.forEach(product => {
          validationMap[product.id] = {
            isValid: product.isValid,
            confidence: product.confidence
          };
        });
        setValidationResults(validationMap);
      }
    } catch (error) {
      console.warn('Product validation failed:', error);
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      calculateRealTotal();
      validateProducts();
    }
  }, [items]);

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      if (filterBy === 'all') return true;
      if (filterBy === 'high-confidence') return (item.confidence || 0) >= 0.8;
      if (filterBy === 'needs-review') return (item.confidence || 0) < 0.6;
      if (filterBy === 'category') return item.category === filterBy;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
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
    totalEstimatedPrice: Object.values(realPrices).reduce((sum, price) => sum + price, 0)
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // ✅ FIX: Mobile-friendly category icons
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

  const handleItemEdit = (itemId, field, value) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      const updatedItems = items.filter(item => item.id !== itemId);
      onItemsChange(updatedItems);
    }
  };

  const exportToPDF = () => {
    const content = `
Cart Smash - Grocery List
Generated: ${new Date().toLocaleDateString()}

ITEMS (${items.length}):
${items.map(item => `• ${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName}`).join('\n')}

STATISTICS:
• Total Items: ${stats.total}
• High Confidence: ${stats.highConfidence}
• Categories: ${stats.categories}
• Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%
• Estimated Total: $${stats.totalEstimatedPrice.toFixed(2)}

Generated by Cart Smash AI
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-cart-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      ...styles.container,
      ...(isMobile ? styles.containerMobile : {})
    }}>
      {/* ✅ FIX: Mobile-optimized header */}
      <div style={{
        ...styles.header,
        ...(isMobile ? styles.headerMobile : {})
      }}>
        <h3 style={{
          ...styles.title,
          ...(isMobile ? styles.titleMobile : {})
        }}>
          ✅ Cart Smash Results ({items.length} items)
        </h3>
        <div style={{
          ...styles.headerActions,
          ...(isMobile ? styles.headerActionsMobile : {})
        }}>
          <button 
            onClick={() => setShowStats(!showStats)} 
            style={{
              ...styles.toggleButton,
              ...(isMobile ? styles.toggleButtonMobile : {})
            }}
          >
            {showStats ? '📊 Hide Stats' : '📊 Show Stats'}
          </button>
          <button 
            onClick={exportToPDF} 
            style={{
              ...styles.exportButton,
              ...(isMobile ? styles.exportButtonMobile : {})
            }}
          >
            📄 Export
          </button>
        </div>
      </div>

      {/* ✅ FIX: Collapsible Statistics Panel - Hidden by default */}
      {showStats && (
        <div style={{
          ...styles.statsPanel,
          ...(isMobile ? styles.statsPanelMobile : {})
        }}>
          <h4 style={styles.statsTitle}>📊 Parsing Statistics</h4>
          
          <div style={{
            ...styles.statsGrid,
            ...(isMobile ? styles.statsGridMobile : {})
          }}>
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

          {parsingStats && (
            <div style={{
              ...styles.parsingMetrics,
              ...(isMobile ? styles.parsingMetricsMobile : {})
            }}>
              <h5 style={styles.metricsTitle}>🎯 AI Processing Metrics</h5>
              <div style={{
                ...styles.metricsRow,
                ...(isMobile ? styles.metricsRowMobile : {})
              }}>
                <span>Filtering Efficiency: <strong>{parsingStats.processingMetrics?.filteringEfficiency || 'N/A'}</strong></span>
                <span>High Confidence Products: <strong>{parsingStats.highConfidence || 0}</strong></span>
                <span>Categories Detected: <strong>{parsingStats.categoriesFound?.length || 0}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ FIX: Mobile-optimized controls */}
      <div style={{
        ...styles.controls,
        ...(isMobile ? styles.controlsMobile : {})
      }}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              ...styles.select,
              ...(isMobile ? styles.selectMobile : {})
            }}
          >
            <option value="confidence">Confidence</option>
            <option value="category">Category</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Filter:</label>
          <select 
            value={filterBy} 
            onChange={(e) => setFilterBy(e.target.value)}
            style={{
              ...styles.select,
              ...(isMobile ? styles.selectMobile : {})
            }}
          >
            <option value="all">All Items</option>
            <option value="high-confidence">High Confidence</option>
            <option value="needs-review">Needs Review</option>
          </select>
        </div>
      </div>

      {/* ✅ FIX: Mobile-optimized clean result cards */}
      <div style={{
        ...styles.itemsGrid,
        ...(isMobile ? styles.itemsGridMobile : {})
      }}>
        {filteredAndSortedItems.map((item, index) => (
          <div key={item.id || index} style={{
            ...styles.itemCard,
            ...(isMobile ? styles.itemCardMobile : {}),
            borderColor: getConfidenceColor(item.confidence || 0)
          }}>
            {/* ✅ FIX: Clean card header without images */}
            <div style={styles.itemCardHeader}>
              <div style={styles.itemCardTitle}>
                <span style={styles.categoryIcon}>
                  {getCategoryIcon(item.category)}
                </span>
                <input
                  type="text"
                  value={item.productName || item.itemName || ''}
                  onChange={(e) => handleItemEdit(item.id, 'productName', e.target.value)}
                  style={{
                    ...styles.itemNameInput,
                    ...(isMobile ? styles.itemNameInputMobile : {})
                  }}
                />
              </div>
              
              {/* ✅ FIX: Mobile-friendly confidence badge */}
              <div style={{
                ...styles.confidenceBadge,
                backgroundColor: getConfidenceColor(item.confidence || 0)
              }}>
                {getConfidenceLabel(item.confidence || 0)}
                <span style={styles.confidencePercentage}>
                  {((item.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* ✅ FIX: Clean item details */}
            <div style={{
              ...styles.itemContent,
              ...(isMobile ? styles.itemContentMobile : {})
            }}>
              <div style={{
                ...styles.itemDetails,
                ...(isMobile ? styles.itemDetailsMobile : {})
              }}>
                <div style={styles.itemDetail}>
                  <span style={styles.detailLabel}>Quantity:</span>
                  <input
                    type="text"
                    value={item.quantity || '1'}
                    onChange={(e) => handleItemEdit(item.id, 'quantity', e.target.value)}
                    style={{
                      ...styles.quantityInput,
                      ...(isMobile ? styles.quantityInputMobile : {})
                    }}
                  />
                  <input
                    type="text"
                    value={item.unit || ''}
                    onChange={(e) => handleItemEdit(item.id, 'unit', e.target.value)}
                    placeholder="unit"
                    style={{
                      ...styles.unitInput,
                      ...(isMobile ? styles.unitInputMobile : {})
                    }}
                  />
                </div>

                <div style={styles.itemDetail}>
                  <span style={styles.detailLabel}>Category:</span>
                  <select
                    value={item.category || 'other'}
                    onChange={(e) => handleItemEdit(item.id, 'category', e.target.value)}
                    style={{
                      ...styles.categorySelect,
                      ...(isMobile ? styles.categorySelectMobile : {})
                    }}
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

                {realPrices[item.id] && (
                  <div style={styles.itemDetail}>
                    <span style={styles.detailLabel}>Price:</span>
                    <span style={styles.priceDisplay}>${realPrices[item.id].toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* ✅ FIX: Clean original text display */}
              {item.original && (
                <div style={{
                  ...styles.originalText,
                  ...(isMobile ? styles.originalTextMobile : {})
                }}>
                  <span style={styles.originalLabel}>Original:</span>
                  <span style={styles.originalValue}>{item.original}</span>
                </div>
              )}
            </div>

            {/* ✅ FIX: Mobile-friendly item actions */}
            <div style={{
              ...styles.itemActions,
              ...(isMobile ? styles.itemActionsMobile : {})
            }}>
              <button
                onClick={() => handleRemoveItem(item.id)}
                style={{
                  ...styles.removeButton,
                  ...(isMobile ? styles.removeButtonMobile : {})
                }}
                title="Remove item"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ FIX: Mobile-optimized total summary */}
      {stats.totalEstimatedPrice > 0 && (
        <div style={{
          ...styles.totalSummary,
          ...(isMobile ? styles.totalSummaryMobile : {})
        }}>
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

  // ✅ MOBILE: Container optimizations
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

  // ✅ MOBILE: Header optimizations
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '15px',
    marginBottom: '15px'
  },

  title: {
    color: '#1f2937',
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },

  // ✅ MOBILE: Title optimizations
  titleMobile: {
    fontSize: '20px',
    textAlign: 'center'
  },

  headerActions: {
    display: 'flex',
    gap: '10px'
  },

  // ✅ MOBILE: Header actions optimizations
  headerActionsMobile: {
    justifyContent: 'center',
    flexWrap: 'wrap'
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

  // ✅ MOBILE: Button optimizations
  toggleButtonMobile: {
    padding: '12px 16px',
    fontSize: '16px',
    minWidth: '130px'
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

  // ✅ MOBILE: Export button optimizations
  exportButtonMobile: {
    padding: '12px 16px',
    fontSize: '16px',
    minWidth: '100px'
  },

  statsPanel: {
    background: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb'
  },

  // ✅ MOBILE: Stats panel optimizations
  statsPanelMobile: {
    padding: '15px',
    marginBottom: '15px'
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
    gap: '15px',
    marginBottom: '20px'
  },

  // ✅ MOBILE: Stats grid optimizations
  statsGridMobile: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
    marginBottom: '15px'
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

  parsingMetrics: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #d1d5db'
  },

  // ✅ MOBILE: Parsing metrics optimizations
  parsingMetricsMobile: {
    padding: '12px'
  },

  metricsTitle: {
    color: '#374151',
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: 'bold'
  },

  metricsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '14px',
    color: '#6b7280'
  },

  // ✅ MOBILE: Metrics row optimizations
  metricsRowMobile: {
    flexDirection: 'column',
    gap: '5px',
    fontSize: '13px'
  },

  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },

  // ✅ MOBILE: Controls optimizations
  controlsMobile: {
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  controlLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    minWidth: '60px'
  },

  select: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  // ✅ MOBILE: Select optimizations
  selectMobile: {
    padding: '10px 12px',
    fontSize: '16px',
    flex: 1
  },

  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },

  // ✅ MOBILE: Items grid optimizations
  itemsGridMobile: {
    gridTemplateColumns: '1fr',
    gap: '15px',
    marginBottom: '15px'
  },

  itemCard: {
    position: 'relative',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },

  // ✅ MOBILE: Item card optimizations
  itemCardMobile: {
    padding: '12px',
    borderRadius: '6px'
  },

  // ✅ NEW: Clean card header
  itemCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '10px'
  },

  itemCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1
  },

  categoryIcon: {
    fontSize: '20px',
    flexShrink: 0
  },

  // ✅ FIX: Clean confidence badge
  confidenceBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    minWidth: '50px'
  },

  confidencePercentage: {
    fontSize: '12px',
    marginTop: '2px'
  },

  itemContent: {
    marginTop: '8px'
  },

  // ✅ MOBILE: Item content optimizations
  itemContentMobile: {
    marginTop: '12px'
  },

  itemNameInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937'
  },

  // ✅ MOBILE: Item name input optimizations
  itemNameInputMobile: {
    padding: '10px 12px',
    fontSize: '16px'
  },

  itemDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  // ✅ MOBILE: Item details optimizations
  itemDetailsMobile: {
    gap: '12px'
  },

  itemDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },

  detailLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    minWidth: '70px'
  },

  quantityInput: {
    width: '60px',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'center'
  },

  // ✅ MOBILE: Quantity input optimizations
  quantityInputMobile: {
    width: '50px',
    padding: '8px',
    fontSize: '16px'
  },

  unitInput: {
    width: '80px',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },

  // ✅ MOBILE: Unit input optimizations
  unitInputMobile: {
    width: '70px',
    padding: '8px',
    fontSize: '16px'
  },

  categorySelect: {
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  // ✅ MOBILE: Category select optimizations
  categorySelectMobile: {
    padding: '8px',
    fontSize: '16px',
    flex: 1
  },

  priceDisplay: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#10b981'
  },

  originalText: {
    marginTop: '12px',
    padding: '8px',
    background: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },

  // ✅ MOBILE: Original text optimizations
  originalTextMobile: {
    marginTop: '10px',
    padding: '6px'
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

  itemActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px'
  },

  // ✅ MOBILE: Item actions optimizations
  itemActionsMobile: {
    justifyContent: 'center',
    marginTop: '15px'
  },

  removeButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    opacity: 0.8,
    transition: 'opacity 0.2s'
  },

  // ✅ MOBILE: Remove button optimizations
  removeButtonMobile: {
    padding: '10px 16px',
    fontSize: '14px',
    borderRadius: '6px'
  },

  totalSummary: {
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #93c5fd'
  },

  // ✅ MOBILE: Total summary optimizations
  totalSummaryMobile: {
    padding: '15px',
    borderRadius: '6px'
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