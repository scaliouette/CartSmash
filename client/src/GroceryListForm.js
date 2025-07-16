import React, { useState, useEffect } from 'react';
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
    alert(`Ready to add ${selectedItems.length} items to Instacart!`);
  };

  const sampleList = `Milk
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
Pasta sauce`;

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

export default GroceryListForm;