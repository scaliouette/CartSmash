import React, { useState } from 'react';

function App() {
  const [groceryList, setGroceryList] = useState('');
  const [parsedItems, setParsedItems] = useState([]);

  const handleParse = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/grocery-list/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listText: groceryList })
      });
      const data = await response.json();
      setParsedItems(data.items);
    } catch (error) {
      console.error('Error parsing list:', error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#00D084', fontSize: '48px' }}>🛒 HulkCart 💚</h1>
        <p style={{ fontSize: '20px', color: '#666' }}>
          Smash through grocery lists with AI power!
        </p>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <h2>Paste Your AI-Generated Grocery List:</h2>
        <textarea
          value={groceryList}
          onChange={(e) => setGroceryList(e.target.value)}
          placeholder="- 2 pounds chicken breast\n- 1 dozen eggs\n- Fresh spinach\n- 3 avocados"
          style={{
            width: '100%',
            height: '200px',
            padding: '10px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
        <button
          onClick={handleParse}
          style={{
            marginTop: '10px',
            padding: '12px 24px',
            backgroundColor: '#00D084',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Parse List
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div>
          <h3>Parsed Items ({parsedItems.length}):</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {parsedItems.map(item => (
              <li key={item.id} style={{
                padding: '10px',
                margin: '5px 0',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                ✅ {item.itemName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
