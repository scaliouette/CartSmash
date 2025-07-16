import React, { useState, useEffect } from 'react';
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

export default InstacartIntegration;