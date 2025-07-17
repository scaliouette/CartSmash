import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';

// Your existing working grocery form (with Firebase integration)
function GroceryListForm() {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { currentUser, saveCartToFirebase } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔥 SMASH button clicked!');
    console.log('📝 Input text:', inputText);
    console.log('👤 Current user:', currentUser?.email || 'Not signed in');
    
    if (!inputText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setParsedItems([]); // Clear previous results

    try {
      console.log('🚀 Sending request to backend...');
      
      const response = await fetch('/api/cart/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listText: inputText,
          action: 'merge',
          userId: currentUser?.uid || null // Include user ID if signed in
        }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      // Your working cart parsing logic
      let items = null;
      
      if (data.cart && Array.isArray(data.cart)) {
        items = data.cart;
        console.log('📦 Found items in data.cart:', items);
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
        console.log('📦 Found items in data.items:', items);
      } else {
        console.log('❓ Could not find items array in response');
      }
      
      if (items && items.length > 0) {
        setParsedItems(items);
        console.log('🎯 Set parsed items:', items);
        
        // 🔥 NEW: Save cart to Firebase if user is signed in
        if (currentUser) {
          try {
            await saveCartToFirebase(items);
            console.log('💾 Cart saved to Firebase for user:', currentUser.email);
          } catch (firebaseError) {
            console.warn('⚠️ Failed to save cart to Firebase:', firebaseError);
          }
        }
        
      } else {
        setError(`No items found in response. Backend processed items but frontend couldn't parse the response format.`);
        console.log('❌ No items found. Response was:', data);
      }
      
    } catch (err) {
      console.error('❌ Parse error:', err);
      setError(`Failed to parse grocery list: ${err.message}`);
    } finally {
      setIsLoading(false);
      console.log('🏁 Request completed');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>      
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="groceryList" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            🛒 Paste Your Grocery List:
          </label>
          <textarea
            id="groceryList"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your grocery list here...
• 2 lbs chicken breast
• 1 dozen eggs  
• 3 bananas
• bread
• milk"
            rows="8"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'monospace',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            ❌ {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isLoading || !inputText.trim()}
          style={{
            background: isLoading ? '#ccc' : 'linear-gradient(45deg, #FF6B35, #F7931E)',
            border: 'none',
            padding: '15px 30px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '100%',
            textTransform: 'uppercase'
          }}
        >
          {isLoading ? '💥 SMASHING... 💥' : '🛒 SMASH 🛒'}
        </button>
      </form>

      {/* 🔥 NEW: User status display */}
      {currentUser && parsedItems.length > 0 && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          ✅ Cart saved to your account: <strong>{currentUser.email}</strong>
        </div>
      )}

      {/* Your existing results display (working perfectly) */}
      {parsedItems.length > 0 && (
        <div style={{ 
          background: '#d4edda', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          <h3 style={{ color: '#155724', marginTop: 0 }}>🎯 Parsed Results ({parsedItems.length} items):</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {parsedItems.map((item, index) => (
              <li key={index} style={{
                background: 'white',
                padding: '10px',
                marginBottom: '8px',
                borderRadius: '6px',
                border: '1px solid #c3e6cb'
              }}>
                <strong>{item.itemName || item.name || item.original}</strong>
                {item.quantity && <span style={{ color: '#666' }}> ({item.quantity}{item.unit ? ` ${item.unit}` : ''})</span>}
                {item.category && <span style={{ color: '#007bff' }}> - {item.category}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 🔥 NEW: Auth status component 
function AuthStatus() {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (isLoading) return (
    <div style={{ 
      position: 'absolute', 
      top: '20px', 
      right: '20px',
      padding: '10px',
      color: '#666'
    }}>
      Loading...
    </div>
  );

  if (currentUser) {
    return (
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px',
        background: '#d4edda',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #c3e6cb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <span style={{ color: '#155724' }}>👋 {currentUser.displayName || currentUser.email}</span>
        <button 
          onClick={signOut}
          style={{
            marginLeft: '12px',
            padding: '6px 12px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px' 
      }}>
        <button
          onClick={() => setShowAuthModal(true)}
          style={{
            padding: '10px 20px',
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          🔐 Sign In to Save Carts
        </button>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}

// Main App (with Firebase provider wrapping your existing app)
function App() {
  return (
    <AuthProvider>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* 🔥 NEW: Auth status in top-right */}
        <AuthStatus />
        
        {/* Your existing working app */}
        <div style={{ paddingTop: '60px' }}>
          <h1 style={{ color: '#FF6B35', textAlign: 'center', fontSize: '2.5em' }}>🛒💥 Cart Smash 💥🛒</h1>
          <p style={{ textAlign: 'center', marginBottom: '30px', fontSize: '18px', color: '#666' }}>
            AI-Powered Grocery List Destroyer
          </p>
          
          <GroceryListForm />
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;