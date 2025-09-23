// complete-fix-with-components.js - Creates all missing files
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Complete HulkCart Fix with All Components...\n');

// Ensure directories exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
};

// 1. Create client directories
console.log('📁 Creating client directories...');
ensureDir(path.join(__dirname, 'client', 'src'));
ensureDir(path.join(__dirname, 'client', 'src', 'api'));
ensureDir(path.join(__dirname, 'client', 'public'));
ensureDir(path.join(__dirname, 'server'));

// 2. Create client package.json
console.log('📦 Creating client package.json...');
const clientPackageJson = {
  "name": "hulkcart-client",
  "version": "1.0.0",
  "private": true,
  "description": "HulkCart frontend - AI-powered grocery list converter",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:3001"
};

fs.writeFileSync(
  path.join(__dirname, 'client', 'package.json'),
  JSON.stringify(clientPackageJson, null, 2)
);

// 3. Create GroceryListForm.js
console.log('📝 Creating GroceryListForm.js...');
const groceryListFormContent = `import React, { useState, useEffect } from 'react';
import groceryService from './api/groceryService';
import ParsedResultsDisplay from './ParsedResultsDisplay';

function GroceryListForm() {
  const [listText, setListText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [useAdvancedParsing, setUseAdvancedParsing] = useState(true);

  // Check API health on component mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      await groceryService.checkHealth();
      setApiStatus('connected');
    } catch (err) {
      setApiStatus('disconnected');
      setError('Cannot connect to server. Please ensure the backend is running on port 3001.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate input
    const validation = groceryService.validateGroceryList(listText);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsProcessing(true);

    try {
      let data;
      if (useAdvancedParsing) {
        data = await groceryService.parseGroceryListAdvanced(listText, {
          groupByCategory: true
        });
      } else {
        data = await groceryService.parseGroceryList(listText);
      }
      
      setParsedItems(data.items);
      
      // Log categories if using advanced parsing
      if (data.categories) {
        console.log('Found categories:', data.categories);
      }
    } catch (err) {
      setError(err.message || 'Error parsing your list. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setListText('');
    setParsedItems([]);
    setError('');
  };

  const handleItemEdit = (itemId, newName) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, itemName: newName } : item
      )
    );
  };

  const handleItemRemove = (itemId) => {
    setParsedItems(items => items.filter(item => item.id !== itemId));
  };

  const handleAddToCart = (selectedItems) => {
    console.log('Adding to Instacart:', selectedItems);
    // TODO: Implement Instacart integration
    alert(\`Ready to add \${selectedItems.length} items to Instacart!\`);
  };

  const sampleList = \`Milk
Eggs
Bread
2 pounds ground beef
Bananas
Greek yogurt
Cheddar cheese
Tomatoes
1 dozen apples
3 cans black beans
Frozen pizza
Olive oil
Pasta sauce\`;

  // Show API status indicator
  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return '#00D084';
      case 'disconnected': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.apiStatus}>
        <span style={{...styles.statusDot, backgroundColor: getStatusColor()}}></span>
        API Status: {apiStatus}
      </div>
      
      <div style={styles.formSection}>
        <h2 style={styles.title}>📝 Paste Your Grocery List</h2>
        
        <form onSubmit={handleSubmit}>
          <textarea
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder="Paste your grocery list here... (one item per line)"
            style={styles.textarea}
            rows={10}
            disabled={isProcessing || apiStatus === 'disconnected'}
          />
          
          <div style={styles.options}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={useAdvancedParsing}
                onChange={(e) => setUseAdvancedParsing(e.target.checked)}
                disabled={isProcessing}
              />
              Use advanced parsing (extracts quantities & categories)
            </label>
          </div>
          
          <div style={styles.buttonGroup}>
            <button 
              type="submit" 
              style={{...styles.button, ...styles.submitButton}}
              disabled={!listText.trim() || isProcessing || apiStatus === 'disconnected'}
            >
              {isProcessing ? '🔄 Processing...' : '🚀 Parse List'}
            </button>
            
            <button 
              type="button" 
              onClick={handleClear}
              style={{...styles.button, ...styles.clearButton}}
              disabled={isProcessing}
            >
              🗑️ Clear
            </button>
            
            <button 
              type="button" 
              onClick={() => setListText(sampleList)}
              style={{...styles.button, ...styles.sampleButton}}
              disabled={isProcessing}
            >
              📋 Try Sample
            </button>
          </div>
        </form>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}
      </div>

      {parsedItems.length > 0 && (
        <ParsedResultsDisplay
          items={parsedItems}
          onItemEdit={handleItemEdit}
          onItemRemove={handleItemRemove}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  formSection: {
    backgroundColor: '#f8f9fa',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#2c3e50',
    marginBottom: '20px',
    fontSize: '24px',
  },
  textarea: {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '200px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  submitButton: {
    backgroundColor: '#00D084',
    color: 'white',
    flex: '1',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  sampleButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  error: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '6px',
    border: '1px solid #fcc',
  },
  apiStatus: {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '8px 16px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    zIndex: 1000,
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  options: {
    marginTop: '10px',
    marginBottom: '10px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

export default GroceryListForm;`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'GroceryListForm.js'),
  groceryListFormContent
);

// 4. Create ParsedResultsDisplay.js
console.log('📝 Creating ParsedResultsDisplay.js...');
const parsedResultsDisplayContent = `import React, { useState } from 'react';
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

export default ParsedResultsDisplay;`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'ParsedResultsDisplay.js'),
  parsedResultsDisplayContent
);

// 5. Create InstacartIntegration.js
console.log('📝 Creating InstacartIntegration.js...');
const instacartIntegrationContent = `import React, { useState, useEffect } from 'react';
import groceryService from './api/groceryService';

function InstacartIntegration({ items, onClose }) {
  const [processingItems, setProcessingItems] = useState(new Set());
  const [completedItems, setCompletedItems] = useState(new Set());
  const [failedItems, setFailedItems] = useState(new Set());
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState('search');

  useEffect(() => {
    if (items.length > 0 && currentStep === 'search') {
      searchAllItems();
    }
  }, [items]);

  const searchAllItems = async () => {
    setIsSearching(true);
    const results = {};

    for (const item of items) {
      try {
        const searchData = await groceryService.searchInstacart(item.itemName);
        results[item.id] = {
          item: item,
          matches: searchData.results || [],
          selectedMatch: searchData.results?.[0] || null
        };
      } catch (error) {
        results[item.id] = {
          item: item,
          matches: [],
          error: 'Search failed'
        };
      }
    }

    setSearchResults(results);
    setIsSearching(false);
    setCurrentStep('review');
  };

  const handleAddToCart = async (itemId) => {
    setProcessingItems(prev => new Set([...prev, itemId]));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Randomly succeed or fail for demo
    const success = Math.random() > 0.1;
    
    setProcessingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });

    if (success) {
      setCompletedItems(prev => new Set([...prev, itemId]));
    } else {
      setFailedItems(prev => new Set([...prev, itemId]));
    }
  };

  const getItemStatus = (itemId) => {
    if (processingItems.has(itemId)) return 'processing';
    if (completedItems.has(itemId)) return 'completed';
    if (failedItems.has(itemId)) return 'failed';
    return 'pending';
  };

  const completedCount = completedItems.size;
  const totalCount = items.length;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🛒 Add to Instacart</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {currentStep === 'search' && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Searching Instacart for {items.length} items...</p>
          </div>
        )}

        {currentStep === 'review' && (
          <>
            <div style={styles.progress}>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: \`\${(completedCount / totalCount) * 100}%\`
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {completedCount} of {totalCount} items processed
              </span>
            </div>

            <div style={styles.itemsList}>
              {Object.values(searchResults).map(({ item, matches, selectedMatch, error }) => {
                const status = getItemStatus(item.id);
                
                return (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemHeader}>
                      <div style={styles.itemTitle}>
                        <span style={styles.itemName}>{item.itemName}</span>
                        {item.quantity && (
                          <span style={styles.itemQuantity}>
                            {item.quantity} {item.unit || ''}
                          </span>
                        )}
                      </div>
                      <div style={styles.itemStatus}>
                        {status === 'processing' && '⏳'}
                        {status === 'completed' && '✅'}
                        {status === 'failed' && '❌'}
                      </div>
                    </div>

                    {error ? (
                      <div style={styles.errorMessage}>{error}</div>
                    ) : matches.length === 0 ? (
                      <div style={styles.noResults}>No matches found</div>
                    ) : (
                      <div style={styles.matches}>
                        {matches.slice(0, 2).map((match, index) => (
                          <div key={match.id} style={styles.matchOption}>
                            <span style={styles.matchName}>{match.name}</span>
                            <span style={styles.matchPrice}>$\{match.price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedMatch && status === 'pending' && (
                      <button
                        onClick={() => handleAddToCart(item.id)}
                        style={styles.addButton}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.footer}>
              <button
                onClick={() => window.open('https://www.instacart.com', '_blank')}
                style={styles.instacartButton}
              >
                🛒 Go to Instacart
              </button>
            </div>
          </>
        )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#2c3e50',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '4px',
  },
  loadingContainer: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 20px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #00D084',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  progress: {
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D084',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#6c757d',
  },
  itemsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e0e0e0',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  itemTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  itemName: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '16px',
  },
  itemQuantity: {
    color: '#6c757d',
    fontSize: '14px',
  },
  itemStatus: {
    fontSize: '20px',
  },
  matches: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  matchOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
  matchName: {
    flex: 1,
    fontSize: '14px',
  },
  matchPrice: {
    fontWeight: '600',
    color: '#00D084',
  },
  addButton: {
    backgroundColor: '#00D084',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
  },
  noResults: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: '14px',
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center',
  },
  instacartButton: {
    backgroundColor: '#00D084',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default InstacartIntegration;`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'InstacartIntegration.js'),
  instacartIntegrationContent
);

// 6. Create client App.js
console.log('📝 Creating client App.js...');
const clientAppContent = `import React from 'react';
import GroceryListForm from './GroceryListForm';

function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          💪 HulkCart
        </h1>
        <p style={styles.subtitle}>
          Smash through your grocery list! Powered by AI 🤖
        </p>
      </header>
      
      <main style={styles.main}>
        <GroceryListForm />
      </main>
      
      <footer style={styles.footer}>
        <p>Made with 💚 by HulkCart</p>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#00D084',
    color: 'white',
    padding: '30px 20px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0',
    fontSize: '48px',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    margin: '10px 0 0 0',
    fontSize: '20px',
    opacity: '0.9',
  },
  main: {
    flex: '1',
    padding: '40px 20px',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: 'white',
    textAlign: 'center',
    padding: '20px',
    marginTop: 'auto',
  },
};

export default App;`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'App.js'),
  clientAppContent
);

// 7. Create API service
console.log('📝 Creating API service...');
const apiServiceContent = `// api/groceryService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class GroceryService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'HTTP error! status: ' + response.status);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 3001.');
      }
      throw error;
    }
  }

  async checkHealth() {
    return this.request('/health');
  }

  async parseGroceryList(listText) {
    return this.request('/api/grocery-list/parse', {
      method: 'POST',
      body: JSON.stringify({ listText }),
    });
  }

  async parseGroceryListAdvanced(listText, options = {}) {
    return this.request('/api/grocery-list/parse-advanced', {
      method: 'POST',
      body: JSON.stringify({ listText, options }),
    });
  }

  async searchInstacart(query, limit = 5) {
    return this.request('/api/instacart/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  validateGroceryList(listText) {
    if (!listText || typeof listText !== 'string') {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const trimmed = listText.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const lines = trimmed.split('\\n').filter(line => line.trim());
    if (lines.length === 0) {
      return {
        valid: false,
        error: 'No valid items found in the list'
      };
    }

    if (lines.length > 100) {
      return {
        valid: false,
        error: 'List is too long (maximum 100 items)'
      };
    }

    return {
      valid: true,
      lineCount: lines.length
    };
  }
}

const groceryService = new GroceryService();
export { GroceryService, groceryService as default };`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'api', 'groceryService.js'),
  apiServiceContent
);

// 8. Create remaining files (index.js, index.css, etc.)
console.log('📝 Creating remaining client files...');

// client/src/index.js
fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'index.js'),
  `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
);

// client/src/index.css
fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'index.css'),
  `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

* {
  box-sizing: border-box;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`
);

// client/public/index.html
fs.writeFileSync(
  path.join(__dirname, 'client', 'public', 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HulkCart - Smash Through Grocery Lists</title>
    <meta name="description" content="AI-powered grocery list converter for Instacart">
    <meta name="theme-color" content="#00D084">
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>`
);

// 9. Create/update server files
console.log('🚀 Creating server files...');

// server/package.json
const serverPackageJson = {
  "name": "hulkcart-server",
  "version": "1.0.0",
  "description": "HulkCart backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "pg": "^8.11.0",
    "redis": "^4.6.7"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  }
};

fs.writeFileSync(
  path.join(__dirname, 'server', 'package.json'),
  JSON.stringify(serverPackageJson, null, 2)
);

// Update server/server.js
const serverPath = path.join(__dirname, 'server', 'server.js');
if (fs.existsSync(serverPath)) {
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  serverContent = serverContent.replace(
    'const PORT = process.env.PORT || 3000;',
    'const PORT = process.env.PORT || 3001;'
  );
  fs.writeFileSync(serverPath, serverContent);
  console.log('✅ Updated server port to 3001');
}

// 10. Create .env file
console.log('🔧 Creating .env file...');
const envContent = `NODE_ENV=development
PORT=3001
REACT_APP_API_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/hulkcart
REDIS_URL=redis://localhost:6379
INSTACART_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);

// 11. Update root package.json
console.log('📋 Updating root package.json...');
const rootPackageJson = {
  "name": "hulkcart",
  "version": "1.0.0",
  "description": "AI-powered grocery list converter for Instacart",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "install:all": "npm install && cd server && npm install && cd client && npm install",
    "build": "cd client && npm run build",
    "start": "cd server && npm start",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "cd client && npm test",
    "clean": "rm -rf node_modules server/node_modules client/node_modules",
    "fresh-install": "npm run clean && npm run install:all"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/hulkcart.git"
  },
  "author": "Your Name",
  "license": "MIT"
};

fs.writeFileSync(
  path.join(__dirname, 'package.json'),
  JSON.stringify(rootPackageJson, null, 2)
);

console.log('\n✨ Complete HulkCart Fix with All Components Applied!');
console.log('');
console.log('✅ Created Files:');
console.log('   • client/src/GroceryListForm.js');
console.log('   • client/src/ParsedResultsDisplay.js');
console.log('   • client/src/InstacartIntegration.js');
console.log('   • client/src/App.js');
console.log('   • client/src/api/groceryService.js');
console.log('   • client/src/index.js');
console.log('   • client/src/index.css');
console.log('   • client/public/index.html');
console.log('   • client/package.json');
console.log('   • server/package.json');
console.log('   • .env');
console.log('');
console.log('🎯 Next Steps:');
console.log('1. Run: npm run install:all');
console.log('2. Run: npm run dev');
console.log('3. Open http://localhost:3000 for the client');
console.log('4. Server API available at http://localhost:3001');
console.log('');
console.log('💚 HulkCart is now ready to SMASH through grocery lists!');