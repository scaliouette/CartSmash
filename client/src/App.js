import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ParsedResultsDisplay from './components/ParsedResultsDisplay';
import InstacartIntegration from './components/InstacartIntegration';
import EnhancedAIHelper from './components/EnhancedAIHelper';
import confetti from 'canvas-confetti';
import AiAssistantBox from './components/AiAssistantBox'; // ✅ Correct path


// 🎆 Enhanced SMASH Button with viral effects
function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('🛒 SMASH 🛒');

  const triggerConfetti = () => {
    // Multiple confetti bursts for viral effect
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // Orange-themed confetti matching Cart Smash colors
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#FF6B35', '#F7931E', '#FFD23F']
    });

    fire(0.2, {
      spread: 60,
      colors: ['#FF6B35', '#F7931E', '#FFD23F', '#FFFFFF']
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#FF6B35', '#F7931E', '#FFD23F']
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#FF6B35', '#F7931E']
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#FFD23F', '#FFFFFF']
    });
  };

  const handleSmash = async (e) => {
    e.preventDefault();
    
    setIsSmashing(true);
    
    // Trigger confetti immediately for instant gratification
    triggerConfetti();
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Dynamic button text during smashing
    const smashTexts = [
      '💥 SMASHING! 💥',
      '🔥 DESTROYING! 🔥', 
      '⚡ PROCESSING! ⚡',
      '🚀 LAUNCHING! 🚀'
    ];
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
      setButtonText(smashTexts[textIndex % smashTexts.length]);
      textIndex++;
    }, 300);

    try {
      await onSubmit(e);
      
      // Success confetti
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#28a745', '#20c997', '#17a2b8']
        });
      }, 500);
      
    } finally {
      clearInterval(textInterval);
      setButtonText('🛒 SMASH 🛒');
      setIsSmashing(false);
    }
  };

  return (
    <button 
      onClick={handleSmash}
      disabled={isDisabled || isLoading}
      style={{
        background: isDisabled ? '#ccc' : 'linear-gradient(45deg, #FF6B35, #F7931E, #FFD23F)',
        border: 'none',
        padding: '15px 30px',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '12px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        width: '100%',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: isSmashing 
          ? '0 0 20px rgba(255, 107, 53, 0.8), inset 0 0 20px rgba(255, 107, 53, 0.3)'
          : '0 4px 15px rgba(255, 107, 53, 0.4)',
        transition: 'all 0.3s ease',
        transform: isSmashing ? 'scale(0.98)' : 'scale(1)',
        animation: isSmashing ? 'shake 0.5s ease-in-out infinite' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: scale(0.98) translateX(0); }
            25% { transform: scale(0.98) translateX(-2px); }
            75% { transform: scale(0.98) translateX(2px); }
          }
          
          @keyframes ripple {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(4); opacity: 0; }
          }
        `}
      </style>
      {isSmashing && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.7)',
          transform: 'translate(-50%, -50%)',
          animation: 'ripple 0.6s linear infinite'
        }} />
      )}
      {buttonText}
    </button>
  );
}

// Enhanced Grocery List Form
function GroceryListForm() {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartAction, setCartAction] = useState('merge');
  const [showResults, setShowResults] = useState(false);
  
  const { currentUser, saveCartToFirebase } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔥 SMASH button clicked!');
    console.log('👤 Current user:', currentUser?.email || 'Not signed in');
    
    if (!inputText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setParsedItems([]);
    setShowResults(false);

    try {
      const response = await fetch('/api/cart/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listText: inputText,
          action: cartAction,
          userId: currentUser?.uid || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      let items = null;
      
      if (data.cart && Array.isArray(data.cart)) {
        items = data.cart;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      }
      
      if (items && items.length > 0) {
        setParsedItems(items);
        setShowResults(true);
        
        // Save to Firebase if user is signed in
        if (currentUser) {
          try {
            await saveCartToFirebase(items);
            console.log('💾 Cart saved to Firebase');
          } catch (firebaseError) {
            console.warn('⚠️ Failed to save cart to Firebase:', firebaseError);
          }
        }
      } else {
        setError('No items were parsed from your list');
      }
      
    } catch (err) {
      console.error('❌ Parse error:', err);
      setError(`Failed to parse grocery list: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsChange = (updatedItems) => {
    setParsedItems(updatedItems);
    
    // Also save to Firebase if user is signed in
    if (currentUser) {
      try {
        saveCartToFirebase(updatedItems);
        console.log('💾 Updated cart saved to Firebase');
      } catch (firebaseError) {
        console.warn('⚠️ Failed to save updated cart to Firebase:', firebaseError);
      }
    }
  };

  const handleNewList = () => {
    setInputText('');
    setParsedItems([]);
    setShowResults(false);
    setError('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>      
      {/* 🔥 ENHANCED: AI Assistant Integration */}
      <EnhancedAIHelper />
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="groceryList" style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#333'
          }}>
            🤖 Paste Your AI-Generated Grocery List (Any Format!)
          </label>
          <textarea
            id="groceryList"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="🤖 PERFECT FOR AI-GENERATED LISTS! 🤖

Paste ANY grocery list from ChatGPT, Claude, or any AI assistant:

✅ CHATGPT/CLAUDE STYLE:
Here's your grocery list:
- 2 lbs boneless chicken breast  
- 1 lb fresh broccoli
- 2 cups jasmine rice
- 6 large eggs
- 1 gallon 2% milk

✅ MEAL PLANNING STYLE:
Monday: Chicken stir-fry
- chicken breast (1 lb)
- bell peppers (3)
- soy sauce
Tuesday: Pasta night  
- spaghetti (1 box)
- marinara sauce

✅ RECIPE INGREDIENTS:
Ingredients for Chicken Alfredo (serves 4):
• 1 pound fettuccine pasta
• 2 cups heavy cream  
• 1 cup parmesan cheese
• 3 chicken breasts

Just paste ANY AI output and hit SMASH! 🚀"
            rows="10"
            style={{
              width: '100%',
              padding: '15px',
              border: '2px solid #ddd',
              borderRadius: '12px',
              fontSize: '16px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              resize: 'vertical',
              transition: 'border-color 0.3s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#FF6B35'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#333'
          }}>
            🎯 Cart Action:
          </label>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '10px 15px',
              border: `2px solid ${cartAction === 'merge' ? '#FF6B35' : '#ddd'}`,
              borderRadius: '8px',
              background: cartAction === 'merge' ? '#fff5f0' : 'white',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                value="merge"
                checked={cartAction === 'merge'}
                onChange={(e) => setCartAction(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              🔄 Merge with existing cart
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '10px 15px',
              border: `2px solid ${cartAction === 'replace' ? '#FF6B35' : '#ddd'}`,
              borderRadius: '8px',
              background: cartAction === 'replace' ? '#fff5f0' : 'white',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                value="replace"
                checked={cartAction === 'replace'}
                onChange={(e) => setCartAction(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              🔥 Replace entire cart
            </label>
          </div>
        </div>

        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb',
            fontSize: '16px'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <SmashButton
              onSubmit={handleSubmit}
              isDisabled={!inputText.trim()}
              isLoading={isLoading}
              itemCount={parsedItems.length}
            />
          </div>
          
          {showResults && (
            <button
              type="button"
              onClick={handleNewList}
              style={{
                padding: '15px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              📝 New List
            </button>
          )}
        </div>
      </form>

      {/* 🔥 ADVANCED: ParsedResultsDisplay Component */}
      {showResults && parsedItems.length > 0 && (
        <ParsedResultsDisplay 
          items={parsedItems} 
          currentUser={currentUser}
          onItemsChange={handleItemsChange}
        />
      )}

      {/* 🔥 ADVANCED: InstacartIntegration Component */}
      {showResults && parsedItems.length > 0 && (
        <InstacartIntegration 
          items={parsedItems}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// Auth status component with enhanced styling
function AuthStatus() {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (isLoading) return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px',
      padding: '10px',
      color: '#666',
      zIndex: 1000
    }}>
      Loading...
    </div>
  );

  if (currentUser) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px',
        background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
        padding: '12px 15px',
        borderRadius: '10px',
        border: '2px solid #c3e6cb',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <span style={{ color: '#155724', fontWeight: 'bold' }}>
          👋 {currentUser.displayName || currentUser.email.split('@')[0]}
        </span>
        <button 
          onClick={signOut}
          style={{
            marginLeft: '12px',
            padding: '6px 12px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
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
        position: 'fixed', 
        top: '20px', 
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowAuthModal(true)}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 10px rgba(255, 107, 53, 0.3)',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0px)'}
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

// Main App with enhanced styling and mobile responsiveness
function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AuthProvider>
      <div style={{ 
        position: 'relative', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)',
        paddingBottom: '40px'
      }}>
        <AuthStatus />
        
        <div style={{ 
          paddingTop: isMobile ? '100px' : '80px',
          paddingLeft: isMobile ? '10px' : '20px',
          paddingRight: isMobile ? '10px' : '20px'
        }}>
          <h1 style={{ 
            color: '#FF6B35', 
            textAlign: 'center', 
            fontSize: isMobile ? '2.5em' : '3.5em',
            marginBottom: '10px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            background: 'linear-gradient(45deg, #FF6B35, #F7931E, #FFD23F)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🛒💥 Cart Smash 💥🛒
          </h1>
          <p style={{ 
            textAlign: 'center', 
            marginBottom: '40px', 
            fontSize: isMobile ? '16px' : '20px', 
            color: '#666',
            fontWeight: '500'
          }}>
            The Missing Link Between AI and Your Groceries
          </p>
          
          <GroceryListForm />
          <AiAssistantBox /> {/* 💡 Add this below the form */}
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;