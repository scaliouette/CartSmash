// client/src/components/InstacartIntegration.js
import React, { useState, useEffect, useCallback } from 'react';

function InstacartIntegration({ items, currentUser }) {
  const [searchResults, setSearchResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState('kroger');
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [availabilityStats, setAvailabilityStats] = useState({ found: 0, total: 0 });

  // Mock store data - in production, this would come from Instacart API
  const stores = [
    { id: 'kroger', name: 'Kroger', logo: '🏪', deliveryFee: 3.99, minOrder: 35 },
    { id: 'safeway', name: 'Safeway', logo: '🛒', deliveryFee: 4.99, minOrder: 35 },
    { id: 'costco', name: 'Costco', logo: '📦', deliveryFee: 0, minOrder: 0 },
    { id: 'wholefoods', name: 'Whole Foods', logo: '🥬', deliveryFee: 4.99, minOrder: 35 }
  ];

  const searchAllItems = useCallback(async () => {
    if (!items || items.length === 0) return;
    
    setIsLoading(true);
    const results = {};
    let totalEstimate = 0;
    let foundCount = 0;
    
    // Simulate API calls to Instacart for each item
    for (const item of items) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
      
      // Mock search results with realistic data
      const mockPrice = generateMockPrice(item);
      const mockAvailability = Math.random() > 0.15; // 85% availability rate
      
      results[item.id || `item_${Date.now()}_${Math.random()}`] = {
        found: mockAvailability,
        item: item,
        price: mockPrice,
        originalPrice: mockPrice * 1.2, // Show savings
        store: selectedStore,
        inStock: mockAvailability,
        alternativeItems: mockAvailability ? generateAlternatives(item) : [],
        instacartUrl: `https://www.instacart.com/store/${selectedStore}/search?query=${encodeURIComponent(item.itemName || item.name || item.original)}`
      };
      
      if (mockAvailability) {
        foundCount++;
        totalEstimate += mockPrice * (parseFloat(item.quantity) || 1);
      }
    }
    
    setSearchResults(results);
    setEstimatedTotal(totalEstimate);
    setAvailabilityStats({ found: foundCount, total: items.length });
    setIsLoading(false);
  }, [items, selectedStore]);

  const generateMockPrice = (item) => {
    const basePrices = {
      'produce': [1.99, 3.49, 2.99, 4.99],
      'dairy': [2.99, 4.49, 3.99, 5.99],
      'meat': [6.99, 12.99, 8.99, 15.99],
      'pantry': [1.49, 3.99, 2.49, 6.99],
      'bakery': [2.99, 4.99, 3.49, 7.99],
      'frozen': [3.99, 6.99, 4.99, 8.99],
      'other': [2.99, 5.99, 3.99, 7.99]
    };
    
    const categoryPrices = basePrices[item.category?.toLowerCase()] || basePrices.other;
    return categoryPrices[Math.floor(Math.random() * categoryPrices.length)];
  };

  const generateAlternatives = (item) => {
    const alternatives = [
      `${item.itemName || item.name} (Store Brand)`,
      `${item.itemName || item.name} (Organic)`,
      `${item.itemName || item.name} (Premium)`
    ];
    return alternatives.slice(0, Math.floor(Math.random() * 3) + 1);
  };

  useEffect(() => {
    searchAllItems();
  }, [searchAllItems]);

  const handleAddToInstacart = () => {
    const availableItems = Object.values(searchResults)
      .filter(result => result.found)
      .map(result => result.item);
    
    const searchTerms = availableItems
      .map(item => encodeURIComponent(item.itemName || item.name || item.original))
      .join(',');
    
    const instacartUrl = `https://www.instacart.com/store/${selectedStore}/search?query=${searchTerms}`;
    
    // Track the event if user is logged in
    if (currentUser) {
      console.log(`🛒 User ${currentUser.email} opened Instacart with ${availableItems.length} items`);
    }
    
    window.open(instacartUrl, '_blank');
  };

  const selectedStoreData = stores.find(store => store.id === selectedStore);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)',
      padding: '25px',
      borderRadius: '15px',
      border: '2px solid #28a745',
      marginTop: '20px',
      boxShadow: '0 4px 15px rgba(40, 167, 69, 0.2)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
            🛒 Instacart Integration
          </h3>
          <p style={{
            color: '#155724',
            margin: '5px 0 0 0',
            opacity: 0.8,
            fontSize: '14px'
          }}>
            Add your cart to Instacart for delivery
          </p>
        </div>

        {/* Store Selector */}
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: '2px solid #28a745',
            background: 'white',
            color: '#155724',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.logo} {store.name}
            </option>
          ))}
        </select>
      </div>

      {/* Store Info */}
      {selectedStoreData && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '1px solid #28a745'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div>
              <h4 style={{ margin: 0, color: '#155724' }}>
                {selectedStoreData.logo} {selectedStoreData.name}
              </h4>
              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                Delivery fee: ${selectedStoreData.deliveryFee} • Min order: ${selectedStoreData.minOrder}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                Est. Total: ${estimatedTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                + ${selectedStoreData.deliveryFee} delivery
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          border: '1px solid #28a745'
        }}>
          <div style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid #28a745',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          <p style={{ margin: '10px 0 0 0', color: '#155724' }}>
            Searching Instacart for your items...
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && Object.keys(searchResults).length > 0 && (
        <>
          {/* Availability Summary */}
          <div style={{
            background: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid #28a745'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{ fontWeight: 'bold', color: '#155724' }}>
                Availability Status
              </span>
              <span style={{
                background: availabilityStats.found === availabilityStats.total ? '#28a745' : '#ffc107',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {availabilityStats.found}/{availabilityStats.total} items found
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(availabilityStats.found / availabilityStats.total) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #28a745, #20c997)',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Items List */}
          <div style={{
            background: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid #28a745',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h4 style={{ marginTop: 0, color: '#155724' }}>Item Details</h4>
            {Object.values(searchResults).map((result, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: index < Object.values(searchResults).length - 1 ? '1px solid #e9ecef' : 'none'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {result.found ? '✅' : '❌'} {result.item.itemName || result.item.name || result.item.original}
                  </div>
                  {result.found && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {result.alternativeItems.length > 0 && 
                        `+${result.alternativeItems.length} alternatives available`
                      }
                    </div>
                  )}
                </div>
                
                {result.found && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                      ${result.price}
                    </div>
                    {result.originalPrice > result.price && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#dc3545',
                        textDecoration: 'line-through'
                      }}>
                        ${result.originalPrice}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleAddToInstacart}
              disabled={availabilityStats.found === 0}
              style={{
                padding: '15px 30px',
                background: availabilityStats.found > 0 
                  ? 'linear-gradient(45deg, #28a745, #20c997)'
                  : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: availabilityStats.found > 0 ? 'pointer' : 'not-allowed',
                boxShadow: availabilityStats.found > 0 
                  ? '0 4px 15px rgba(40, 167, 69, 0.3)'
                  : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              🛒 Open in Instacart ({availabilityStats.found} items)
            </button>

            <button style={{
              padding: '15px 30px',
              background: 'white',
              color: '#28a745',
              border: '2px solid #28a745',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              📄 Export Shopping List
            </button>
          </div>

          {/* Additional Info */}
          <div style={{
            marginTop: '15px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666',
            textAlign: 'center'
          }}>
            💡 Prices are estimates and may vary. Actual prices will be shown in Instacart.
          </div>
        </>
      )}
    </div>
  );
}

export default InstacartIntegration;