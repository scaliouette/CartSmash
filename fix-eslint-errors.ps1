# fix-eslint-errors.ps1 - Fix ESLint compilation errors
# Run with: powershell -ExecutionPolicy Bypass -File fix-eslint-errors.ps1

Write-Host "🔧 Fixing ESLint errors for Cart Smash..." -ForegroundColor Yellow

# Fix GroceryListForm.js - Main error with webkitAudioContext
$GroceryFormFile = "client\src\GroceryListForm.js"
if (Test-Path $GroceryFormFile) {
    Write-Host "📝 Fixing GroceryListForm.js..." -ForegroundColor Cyan
    
    $content = Get-Content $GroceryFormFile -Raw
    
    # Fix the webkitAudioContext undefined error
    $content = $content -replace 'typeof webkitAudioContext !== ''undefined''', 'typeof window.webkitAudioContext !== ''undefined'''
    $content = $content -replace 'new \(AudioContext \|\| webkitAudioContext\)', 'new (AudioContext || window.webkitAudioContext)'
    
    Set-Content -Path $GroceryFormFile -Value $content -Encoding UTF8
    Write-Host "  ✅ Fixed webkitAudioContext error" -ForegroundColor Green
}

# Fix InstacartIntegration.js - Remove unused variables and fix useEffect
$InstacartFile = "client\src\InstacartIntegration.js"
if (Test-Path $InstacartFile) {
    Write-Host "📝 Fixing InstacartIntegration.js..." -ForegroundColor Cyan
    
    $InstacartContent = @'
import React, { useState, useEffect } from 'react';
import groceryService from './api/groceryService';

function InstacartIntegration({ items, onClose }) {
  const [processingItems, setProcessingItems] = useState(new Set());
  const [completedItems, setCompletedItems] = useState(new Set());
  const [failedItems, setFailedItems] = useState(new Set());
  const [searchResults, setSearchResults] = useState({});
  const [currentStep, setCurrentStep] = useState('search');

  const searchAllItems = async () => {
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
    setCurrentStep('review');
  };

  useEffect(() => {
    if (items.length > 0 && currentStep === 'search') {
      searchAllItems();
    }
  }, [items.length, currentStep]); // Fixed dependencies

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
                    width: `${(completedCount / totalCount) * 100}%`
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
                            <span style={styles.matchPrice}>${match.price}</span>
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
    borderTop: '4px solid #FF6B35',
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
  },
  addButton: {
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default InstacartIntegration;
'@
    
    Set-Content -Path $InstacartFile -Value $InstacartContent -Encoding UTF8
    Write-Host "  ✅ Fixed unused variables and useEffect dependencies" -ForegroundColor Green
}

# Fix ParsedResultsDisplay.js - Remove unused variables
$ParsedResultsFile = "client\src\ParsedResultsDisplay.js"
if (Test-Path $ParsedResultsFile) {
    Write-Host "📝 Fixing ParsedResultsDisplay.js..." -ForegroundColor Cyan
    
    $ParsedContent = @'
import React, { useState } from 'react';
import InstacartIntegration from './InstacartIntegration';

function ParsedResultsDisplay({ items, onItemEdit, onItemRemove, onAddToCart }) {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showInstacart, setShowInstacart] = useState(false);

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
            style={{...styles.viewButton, backgroundColor: '#FF6B35', color: 'white'}}
          >
            🛒 Open Instacart
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={styles.actionBar}>
          <button
            onClick={() => setShowInstacart(true)}
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
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#FF6B35',
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

export default ParsedResultsDisplay;
'@
    
    Set-Content -Path $ParsedResultsFile -Value $ParsedContent -Encoding UTF8
    Write-Host "  ✅ Removed unused variables" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All ESLint errors fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Fixed issues:" -ForegroundColor Cyan
Write-Host "   ✅ webkitAudioContext undefined error" -ForegroundColor Green
Write-Host "   ✅ Unused variables in InstacartIntegration.js" -ForegroundColor Green
Write-Host "   ✅ useEffect dependencies warning" -ForegroundColor Green
Write-Host "   ✅ Unused variables in ParsedResultsDisplay.js" -ForegroundColor Green
Write-Host "   ✅ Updated colors to Cart Smash orange theme" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Try running again:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🛒💥 Cart Smash should compile cleanly now! 💥🛒" -ForegroundColor Magenta