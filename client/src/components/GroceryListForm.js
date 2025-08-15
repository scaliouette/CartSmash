// client/src/GroceryListForm.js
import React, { useState } from 'react';

function GroceryListForm({ onParsedItems }) {
  const [listText, setListText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useAdvanced, setUseAdvanced] = useState(false);

  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
  {Object.entries(quickTemplates).map(([name, items]) => (
    <button
      key={name}
      onClick={() => setInputText(items)}
      style={{ padding: '6px 12px', fontSize: '14px' }}
    >
      📋 {name}
    </button>
  ))}
</div>

  const sampleList = `2 lbs chicken breast
1 dozen eggs
3 bananas
Milk
Bread
1 bag of spinach
4 tomatoes
Pasta sauce
2 boxes of cereal
Greek yogurt`;

  const parseGroceryList = (text) => {
    // Basic parsing logic
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const trimmed = line.trim();
      
      // Parse quantity and unit patterns
      let quantity = 1;
      let unit = '';
      let itemName = trimmed;
      
      // Pattern: "2 lbs chicken"
      const match1 = trimmed.match(/^(\d+(?:\.\d+)?)\s*(lbs?|oz|kg|g|dozen|bag|box|boxes|can|jar|bottle|package|pack)?\s+(.+)/i);
      if (match1) {
        quantity = parseFloat(match1[1]);
        unit = match1[2] || '';
        itemName = match1[3];
      } else {
        // Pattern: "chicken 2 lbs"
        const match2 = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(lbs?|oz|kg|g|dozen|bag|box|boxes|can|jar|bottle|package|pack)?$/i);
        if (match2) {
          itemName = match2[1];
          quantity = parseFloat(match2[2]);
          unit = match2[3] || '';
        }
      }

      const quickTemplates = {
  'Weekly Essentials': 'Milk\n2 Bread\n1 dozen Eggs\nButter\nBananas',
  'Party Supplies': '2 bags Chips\n6-pack Soda\nNapkins\nPaper plates',
  'Breakfast Items': 'Cereal\nYogurt\nOrange juice\nBagels'
};
      
      // Determine category
      let category = 'other';
      const lowerName = itemName.toLowerCase();
      
      if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('pork') || lowerName.includes('fish')) {
        category = 'meat';
      } else if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('yogurt') || lowerName.includes('egg')) {
        category = 'dairy';
      } else if (lowerName.includes('bread') || lowerName.includes('bagel') || lowerName.includes('muffin')) {
        category = 'bakery';
      } else if (lowerName.includes('banana') || lowerName.includes('apple') || lowerName.includes('orange') || 
                 lowerName.includes('tomato') || lowerName.includes('spinach') || lowerName.includes('lettuce')) {
        category = 'produce';
      } else if (lowerName.includes('cereal') || lowerName.includes('pasta') || lowerName.includes('sauce') || 
                 lowerName.includes('rice') || lowerName.includes('beans')) {
        category = 'pantry';
      } else if (lowerName.includes('frozen') || lowerName.includes('ice cream')) {
        category = 'frozen';
      }
      
      return {
        id: `item-${Date.now()}-${index}`,
        original: trimmed,
        name: itemName,
        itemName: itemName, // Some components expect itemName
        quantity: quantity,
        unit: unit,
        category: category,
        checked: false
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!listText.trim()) return;

    setIsLoading(true);

    try {
      // Check if we should use server parsing
      if (useAdvanced) {
        // Try to call server API
        try {
          const response = await fetch('/api/cart/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              listText: listText,
              action: 'replace'
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Server parsing successful:', data);
            onParsedItems(data.cart || data.items || []);
          } else {
            throw new Error('Server parsing failed');
          }
        } catch (serverError) {
          console.warn('Server parsing failed, using client-side parsing:', serverError);
          // Fall back to client-side parsing
          const items = parseGroceryList(listText);
          onParsedItems(items);
        }
      } else {
        // Use client-side parsing
        const items = parseGroceryList(listText);
        console.log('📝 Parsed items:', items);
        onParsedItems(items);
      }
    } catch (error) {
      console.error('Error parsing list:', error);
      alert('Error parsing your list. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setListText('');
    onParsedItems([]);
  };

  const handleUseSample = () => {
    setListText(sampleList);
  };

  return (
    <div style={{
      background: 'white',
      padding: '25px',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h2 style={{ 
        color: '#333', 
        marginTop: 0,
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        🛒 Paste Your Grocery List
        {useAdvanced && (
          <span style={{ 
            fontSize: '14px', 
            background: '#FF6B35', 
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            SMASH Mode
          </span>
        )}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={listText}
          onChange={(e) => setListText(e.target.value)}
          placeholder="Enter items (one per line):&#10;2 lbs chicken&#10;1 dozen eggs&#10;Milk&#10;3 bananas"
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{ 
          marginTop: '15px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={useAdvanced}
              onChange={(e) => setUseAdvanced(e.target.checked)}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>
              🔥 Use advanced SMASH parsing (if server is running)
            </span>
          </label>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button
            type="submit"
            disabled={isLoading || !listText.trim()}
            style={{
              flex: '1',
              minWidth: '150px',
              padding: '12px 24px',
              backgroundColor: isLoading || !listText.trim() ? '#ccc' : '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading || !listText.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {isLoading ? '💥 SMASHING...' : '🛒 SMASH MY LIST'}
          </button>
          
          <button
            type="button"
            onClick={handleClear}
            disabled={!listText}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f8f9fa',
              color: '#333',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: !listText ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            🗑️ Clear
          </button>
          
          <button
            type="button"
            onClick={handleUseSample}
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            📋 Try Sample
          </button>
        </div>
      </form>
      
      {isLoading && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fff3cd',
          border: '1px solid #ffeeba',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#856404'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>💥</div>
          <div>Smashing your grocery list into organized perfection...</div>
        </div>
      )}
    </div>
  );
}



export default GroceryListForm;