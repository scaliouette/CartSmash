// client/src/App.js - Updated with integrated AI
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ParsedResultsDisplay from './components/ParsedResultsDisplay';
import InstacartIntegration from './components/InstacartIntegration';
import SmartAIAssistant from './components/SmartAIAssistant'; // New integrated AI
import confetti from 'canvas-confetti';

// Enhanced SMASH Button with viral effects
function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('🛒 SMASH 🛒');

  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

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
  };

  const handleSmash = async (e) => {
    e.preventDefault();
    setIsSmashing(true);
    triggerConfetti();
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
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
        ...styles.smashButton,
        background: isDisabled ? '#ccc' : 'linear-gradient(45deg, #FF6B35, #F7931E, #FFD23F)',
        transform: isSmashing ? 'scale(0.98)' : 'scale(1)',
        boxShadow: isSmashing 
          ? '0 0 20px rgba(255, 107, 53, 0.8), inset 0 0 20px rgba(255, 107, 53, 0.3)'
          : '0 4px 15px rgba(255, 107, 53, 0.4)',
        animation: isSmashing ? 'shake 0.5s ease-in-out infinite' : 'none',
      }}
    >
      {buttonText}
      {itemCount > 0 && !isSmashing && (
        <div style={{ 
          fontSize: '14px', 
          marginTop: '4px',
          opacity: 0.9,
          fontWeight: '600',
          letterSpacing: '1px',
        }}>
          {itemCount} ITEMS READY
        </div>
      )}
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
        headers: { 'Content-Type': 'application/json' },
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
      let items = data.cart || data.items || [];
      
      if (items && items.length > 0) {
        setParsedItems(items);
        setShowResults(true);
        
        if (currentUser) {
          try {
            await saveCartToFirebase(items);
          } catch (firebaseError) {
            console.warn('Failed to save cart to Firebase:', firebaseError);
          }
        }
      } else {
        setError('No items were parsed from your list');
      }
      
    } catch (err) {
      console.error('Parse error:', err);
      setError(`Failed to parse grocery list: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AI-generated grocery list
  const handleAIGroceryList = (aiGeneratedList) => {
    setInputText(aiGeneratedList);
    // Optionally auto-submit
    setTimeout(() => {
      if (aiGeneratedList.trim()) {
        setIsLoading(true);
        handleSubmit({ preventDefault: () => {} });
      }
    }, 500);
  };

  const handleItemsChange = (updatedItems) => {
    setParsedItems(updatedItems);
    
    if (currentUser) {
      try {
        saveCartToFirebase(updatedItems);
      } catch (firebaseError) {
        console.warn('Failed to save updated cart to Firebase:', firebaseError);
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
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.heroSection}>
        <h1 style={styles.heroTitle}>
          Smash That List.
          <br />
          <span style={styles.heroAccent}>Instantly.</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Create grocery lists with AI or paste existing ones. Turn any list into a ready-to-order Instacart cart in seconds.
        </p>
      </div>

      {/* AI Helper Banner */}
      <div style={styles.aiHelperBanner}>
        <div style={styles.bannerContent}>
          <div style={styles.bannerText}>
            <h3 style={styles.bannerTitle}>🤖 Need help creating a grocery list?</h3>
            <p style={styles.bannerSubtitle}>
              Use our AI assistant to generate meal plans, budget lists, or recipe ingredients
            </p>
          </div>
          <div style={styles.bannerIndicator}>
            <span style={styles.indicatorText}>Click the AI button</span>
            <span style={styles.indicatorArrow}>↘️</span>
          </div>
        </div>
      </div>

      {/* Main Input Section */}
      <form onSubmit={handleSubmit} style={styles.mainForm}>
        <div style={styles.inputSection}>
          <label style={styles.inputLabel}>
            Paste or Create Grocery List
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={styles.textarea}
            placeholder="Paste your grocery list here or use the AI assistant to generate one...

Example:
2 lbs chicken breast
1 cup quinoa
2 bell peppers
1 onion
2 tbsp olive oil
1 dozen eggs
1 bag spinach"
            rows="8"
          />
        </div>
        
        <div style={styles.actionSelector}>
          <label style={styles.actionLabel}>Cart Action:</label>
          <div style={styles.actionOptions}>
            <label style={styles.actionOption}>
              <input
                type="radio"
                value="merge"
                checked={cartAction === 'merge'}
                onChange={(e) => setCartAction(e.target.value)}
              />
              <span>🔀 Merge with existing cart</span>
            </label>
            <label style={styles.actionOption}>
              <input
                type="radio"
                value="replace"
                checked={cartAction === 'replace'}
                onChange={(e) => setCartAction(e.target.value)}
              />
              <span>🔥 Replace entire cart</span>
            </label>
          </div>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            ❌ {error}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <SmashButton
            onSubmit={handleSubmit}
            isDisabled={!inputText.trim()}
            isLoading={isLoading}
            itemCount={inputText.split('\n').filter(line => line.trim()).length}
          />
          
          {showResults && (
            <button
              type="button"
              onClick={handleNewList}
              style={styles.newListButton}
            >
              📝 New List
            </button>
          )}
        </div>
      </form>

      {/* Results Display */}
      {showResults && parsedItems.length > 0 && (
        <ParsedResultsDisplay 
          items={parsedItems} 
          currentUser={currentUser}
          onItemsChange={handleItemsChange}
        />
      )}

      {/* Instacart Integration */}
      {showResults && parsedItems.length > 0 && (
        <InstacartIntegration 
          items={parsedItems}
          currentUser={currentUser}
        />
      )}

      {/* Smart AI Assistant - Floating Button */}
      <SmartAIAssistant onGroceryListGenerated={handleAIGroceryList} />
    </div>
  );
}

// Auth Status Component
function AuthStatus() {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (isLoading) return (
    <div style={styles.authStatus}>
      Loading...
    </div>
  );

  if (currentUser) {
    return (
      <div style={styles.authStatusLoggedIn}>
        <span style={styles.userGreeting}>
          👋 {currentUser.displayName || currentUser.email.split('@')[0]}
        </span>
        <button 
          onClick={signOut}
          style={styles.signOutButton}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={styles.authStatus}>
        <button
          onClick={() => setShowAuthModal(true)}
          style={styles.signInButton}
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

// Main App Component
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
      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>🛒</div>
              <span style={styles.logoText}>CART SMASH</span>
            </div>
            
            <div style={styles.headerActions}>
              <button style={styles.loginButton}>Log In</button>
              <button style={styles.ctaButton}>Start Converting Your List</button>
            </div>
          </div>
        </header>

        <AuthStatus />
        
        <main style={styles.main}>
          <GroceryListForm />
        </main>
        
        {/* Features Section */}
        <section style={styles.featuresSection}>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🤖</div>
              <h3 style={styles.featureTitle}>AI-Powered</h3>
              <p style={styles.featureDescription}>Built-in AI creates personalized grocery lists and meal plans</p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>Lightning Fast</h3>
              <p style={styles.featureDescription}>Convert lists to carts in under 5 seconds</p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🛒</div>
              <h3 style={styles.featureTitle}>Instant Cart</h3>
              <p style={styles.featureDescription}>Direct integration with Instacart for immediate delivery</p>
            </div>
          </div>
        </section>
      </div>
    </AuthProvider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  header: {
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '16px 24px',
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  logoIcon: {
    padding: '8px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    borderRadius: '8px',
    fontSize: '20px',
  },
  
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  
  loginButton: {
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  
  ctaButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  
  container: {
    width: '100%',
  },
  
  heroSection: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  
  heroTitle: {
    fontSize: 'clamp(36px, 8vw, 64px)',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    lineHeight: '1.1',
  },
  
  heroAccent: {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  heroSubtitle: {
    fontSize: '20px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  
  aiHelperBanner: {
    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '32px',
    border: '2px solid #2196f3',
    boxShadow: '0 4px 15px rgba(33, 150, 243, 0.2)',
    position: 'relative',
  },
  
  bannerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  
  bannerText: {
    flex: 1,
  },
  
  bannerTitle: {
    color: '#0d47a1',
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  
  bannerSubtitle: {
    color: '#1565c0',
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.4',
  },
  
  bannerIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  
  indicatorText: {
    fontSize: '12px',
    color: '#1565c0',
    fontWeight: 'bold',
  },
  
  indicatorArrow: {
    fontSize: '20px',
    animation: 'bounce 2s infinite',
  },
  
  mainForm: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    marginBottom: '48px',
  },
  
  inputSection: {
    marginBottom: '24px',
  },
  
  inputLabel: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    minHeight: '160px',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box',
  },
  
  actionSelector: {
    marginBottom: '24px',
  },
  
  actionLabel: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  actionOptions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  
  actionOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  
  errorMessage: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '24px',
    fontSize: '16px',
  },
  
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  
  smashButton: {
    flex: 1,
    border: 'none',
    padding: '16px 32px',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  
  newListButton: {
    padding: '16px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  
  featuresSection: {
    padding: '48px 24px',
    backgroundColor: '#f9fafb',
  },
  
  featuresGrid: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '32px',
  },
  
  featureCard: {
    textAlign: 'center',
    padding: '24px',
  },
  
  featureIcon: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '24px',
  },
  
  featureTitle: {
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#1f2937',
    marginBottom: '8px',
  },
  
  featureDescription: {
    color: '#6b7280',
  },
  
  authStatus: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
  },
  
  authStatusLoggedIn: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #c3e6cb',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  userGreeting: {
    color: '#155724',
    fontWeight: 'bold',
  },
  
  signOutButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  signInButton: {
    padding: '12px 20px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(255, 107, 53, 0.3)',
    transition: 'transform 0.2s ease',
  },
};

// Add bounce animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-4px) translateY(-2px); }
    20% { transform: translateX(4px) translateY(2px); }
    30% { transform: translateX(-3px) translateY(-1px); }
    40% { transform: translateX(3px) translateY(1px); }
    50% { transform: translateX(-2px) translateY(-1px); }
    60% { transform: translateX(2px) translateY(1px); }
    70% { transform: translateX(-1px) translateY(0px); }
    80% { transform: translateX(1px) translateY(0px); }
    90% { transform: translateX(0px) translateY(0px); }
  }
`;
document.head.appendChild(styleSheet);

export default App;