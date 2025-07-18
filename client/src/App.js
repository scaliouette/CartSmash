import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ParsedResultsDisplay from './components/ParsedResultsDisplay';
import InstacartIntegration from './components/InstacartIntegration';
import SmartAIAssistant from './components/SmartAIAssistant';
import ProductValidator from './components/ProductValidator';

// Import the enhanced components
import ParsingAnalyticsDashboard from './components/ParsingAnalyticsDashboard';
import SmartParsingDemo from './components/SmartParsingDemo';
import AIParsingSettings from './components/AIParsingSettings';
import AdminDashboard from './components/AdminDashboard';

import confetti from 'canvas-confetti';

// Enhanced SMASH Button with viral effects
function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('🎯 SMART SMASH 🎯');

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
      '🎯 SMART ANALYZING! 🎯',
      '🧠 AI PROCESSING! 🧠', 
      '⚡ INTELLIGENCE ACTIVE! ⚡',
      '🚀 VALIDATING PRODUCTS! 🚀'
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
      setButtonText('🎯 SMART SMASH 🎯');
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
          {itemCount} ITEMS • AI READY
        </div>
      )}
    </button>
  );
}

// Admin Menu Component
function AdminMenu({ currentUser, onShowAnalytics, onShowDemo, onShowSettings, onShowAdmin }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin (modify this logic as needed)
    const adminEmails = ['admin@example.com', 'developer@example.com'];
    setIsAdmin(currentUser && adminEmails.includes(currentUser.email));
  }, [currentUser]);

  // Always show in development, or if user is admin
  if (!isAdmin && process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={styles.adminMenuContainer}>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        style={styles.adminMenuToggle}
        title="Admin Menu"
      >
        🛠️ Admin
      </button>
      
      {isVisible && (
        <div style={styles.adminMenu}>
          <div style={styles.adminMenuHeader}>
            <h4 style={styles.adminMenuTitle}>Admin Tools</h4>
            <button 
              onClick={() => setIsVisible(false)}
              style={styles.adminMenuClose}
            >
              ×
            </button>
          </div>
          
          <div style={styles.adminMenuButtons}>
            <button 
              onClick={() => {
                onShowAnalytics(true);
                setIsVisible(false);
              }}
              style={styles.adminMenuButton}
            >
              📊 Analytics Dashboard
            </button>
            
            <button 
              onClick={() => {
                onShowDemo(true);
                setIsVisible(false);
              }}
              style={styles.adminMenuButton}
            >
              🎯 Parsing Demo
            </button>
            
            <button 
              onClick={() => {
                onShowSettings(true);
                setIsVisible(false);
              }}
              style={styles.adminMenuButton}
            >
              ⚙️ AI Settings
            </button>
            
            <button 
              onClick={() => {
                onShowAdmin(true);
                setIsVisible(false);
              }}
              style={styles.adminMenuButton}
            >
              🖥️ Full Dashboard
            </button>
            
            <div style={styles.adminMenuDivider} />
            
            <div style={styles.adminMenuInfo}>
              <small>Admin: {currentUser?.email || 'Dev Mode'}</small>
              <small>Environment: {process.env.NODE_ENV || 'development'}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Grocery List Form with Intelligence
function GroceryListForm() {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartAction, setCartAction] = useState('merge');
  const [showResults, setShowResults] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);

  // Admin component states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const { currentUser, saveCartToFirebase } = useAuth();

  // Enhanced submission logic with intelligence
  const submitGroceryList = async (listText) => {
    if (!listText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setParsedItems([]);
    setShowResults(false);
    setParsingStats(null);

    try {
      console.log('🎯 Starting intelligent grocery list processing...');
      
      const response = await fetch('/api/cart/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: listText,
          action: cartAction,
          userId: currentUser?.uid || null,
          options: {
            strictMode: intelligenceEnabled,
            enableValidation: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.cart && data.cart.length > 0) {
        setParsedItems(data.cart);
        setParsingStats(data.parsing?.stats || null);
        setShowResults(true);
        
        console.log(`✅ Intelligent parsing complete:`);
        console.log(`   - Products extracted: ${data.cart.length}`);
        console.log(`   - Filtering efficiency: ${data.parsing?.filteringEfficiency || 'N/A'}`);
        console.log(`   - Average confidence: ${(data.parsing?.averageConfidence * 100 || 0).toFixed(1)}%`);
        
        // Show intelligence summary
        if (data.parsing) {
          const needsReview = data.quality?.needsReviewItems || 0;
          if (needsReview > 0) {
            setTimeout(() => {
              if (window.confirm(`🎯 Smart parsing complete! ${needsReview} items need review. Would you like to review them now for better accuracy?`)) {
                setShowValidator(true);
              }
            }, 1000);
          }
        }
        
        // Save to Firebase
        if (currentUser && saveCartToFirebase) {
          try {
            await saveCartToFirebase(data.cart);
          } catch (firebaseError) {
            console.warn('Failed to save cart to Firebase:', firebaseError);
          }
        }
      } else {
        setError('No valid grocery items were found in your list. Try using specific product names with quantities.');
      }
      
    } catch (err) {
      console.error('❌ Enhanced parsing failed:', err);
      setError(`Failed to process grocery list: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitGroceryList(inputText);
  };

  // AI-generated grocery list handler
  const handleAIGroceryList = async (aiGeneratedList) => {
    setInputText(aiGeneratedList);
    
    if (aiGeneratedList.trim()) {
      setTimeout(async () => {
        await submitGroceryList(aiGeneratedList);
      }, 500);
    }
  };

  // Handle items change from components
  const handleItemsChange = (updatedItems) => {
    setParsedItems(updatedItems);
    
    if (currentUser && saveCartToFirebase) {
      try {
        saveCartToFirebase(updatedItems);
      } catch (firebaseError) {
        console.warn('Failed to save updated cart to Firebase:', firebaseError);
      }
    }
  };

  // Smart reparse function
  const handleSmartReparse = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/cart/smart-reparse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setParsedItems(data.cart);
        setParsingStats(data.reparse?.stats || null);
        
        console.log(`🎯 Smart reparse complete: ${data.reparse?.originalItemCount} → ${data.reparse?.newItemCount} items`);
        
        if (data.reparse?.improvement > 0) {
          alert(`🎉 Smart reparse improved your list! Found ${data.reparse.improvement} additional valid products.`);
        }
      }
    } catch (error) {
      console.error('❌ Smart reparse failed:', error);
      setError('Smart reparse failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate all products
  const handleValidateAll = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/cart/validate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setParsedItems(data.cart);
        
        const summary = data.validation?.summary;
        if (summary) {
          alert(`🔍 Validation complete!\n✅ ${summary.highConfidence} high confidence\n⚠️ ${summary.needsReview} need review`);
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
      setError('Product validation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewList = () => {
    setInputText('');
    setParsedItems([]);
    setShowResults(false);
    setError('');
    setParsingStats(null);
    setShowValidator(false);
  };

  const handleShowValidator = () => {
    const needsReview = parsedItems.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.6
    );
    
    if (needsReview.length > 0) {
      setShowValidator(true);
    } else {
      alert('🎉 All items are already validated! Your cart looks great.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Admin Menu */}
      <AdminMenu
        currentUser={currentUser}
        onShowAnalytics={setShowAnalytics}
        onShowDemo={setShowDemo}
        onShowSettings={setShowSettings}
        onShowAdmin={setShowAdmin}
      />

      {/* Hero Section */}
      <div style={styles.heroSection}>
        <h1 style={styles.heroTitle}>
          Smart Cart.
          <br />
          <span style={styles.heroAccent}>Instantly.</span>
        </h1>
        <p style={styles.heroSubtitle}>
          AI-powered grocery parsing that understands what you actually want to buy. 
          Turn any list into validated, ready-to-order products in seconds.
        </p>
      </div>

      {/* Intelligence Features Banner */}
      <div style={styles.intelligenceBanner}>
        <div style={styles.bannerContent}>
          <div style={styles.bannerText}>
            <h3 style={styles.bannerTitle}>🧠 Powered by AI Intelligence</h3>
            <p style={styles.bannerSubtitle}>
              • Filters out meal descriptions and cooking instructions<br />
              • Validates products against real grocery databases<br />
              • Confidence scoring for every item<br />
              • Smart duplicate detection and merging
            </p>
          </div>
          <div style={styles.bannerIndicator}>
            <span style={styles.indicatorText}>Smart parsing enabled</span>
            <span style={styles.indicatorIcon}>🎯</span>
          </div>
        </div>
      </div>

      {/* Main Input Section */}
      <div style={styles.mainForm}>
        <div style={styles.inputSection}>
          <label style={styles.inputLabel}>
            Paste or Create Grocery List
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={styles.textarea}
            placeholder="Paste any grocery list here - our AI will intelligently extract only the products you can actually buy:

Example:
Monday: Chicken dinner with vegetables
- 2 lbs chicken breast
- 3 bell peppers  
- 1 onion
Tuesday: Pasta night
- 1 lb pasta
- pasta sauce
- parmesan cheese

The AI will ignore 'Monday: Chicken dinner' and extract: '2 lbs chicken breast', '3 bell peppers', etc."
            rows="10"
          />
        </div>
        
        {/* Enhanced Controls */}
        <div style={styles.controlsSection}>
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
                <span>🔀 Smart merge with existing cart</span>
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

          <div style={styles.intelligenceToggle}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={intelligenceEnabled}
                onChange={(e) => setIntelligenceEnabled(e.target.checked)}
              />
              <span>🎯 Enhanced AI parsing (recommended)</span>
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
            <div style={styles.actionButtons}>
              <button
                type="button"
                onClick={handleNewList}
                style={styles.newListButton}
              >
                📝 New List
              </button>
              
              <button
                type="button"
                onClick={handleSmartReparse}
                disabled={isLoading}
                style={styles.smartButton}
              >
                🎯 Smart Reparse
              </button>
              
              <button
                type="button"
                onClick={handleValidateAll}
                disabled={isLoading}
                style={styles.validateButton}
              >
                🔍 Validate All
              </button>
              
              <button
                type="button"
                onClick={handleShowValidator}
                style={styles.reviewButton}
              >
                ⚠️ Review Items
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Results Display */}
      {showResults && parsedItems.length > 0 && (
        <ParsedResultsDisplay 
          items={parsedItems} 
          currentUser={currentUser}
          onItemsChange={handleItemsChange}
          parsingStats={parsingStats}
        />
      )}

      {/* Product Validator Modal */}
      {showValidator && (
        <ProductValidator
          items={parsedItems}
          onItemsUpdated={handleItemsChange}
          onClose={() => setShowValidator(false)}
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

      {/* Admin Dashboard Modals */}
      {showAnalytics && (
        <ParsingAnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showDemo && (
        <SmartParsingDemo onClose={() => setShowDemo(false)} />
      )}

      {showSettings && (
        <AIParsingSettings 
          onClose={() => setShowSettings(false)}
          onSettingsChange={(settings) => {
            console.log('Settings updated:', settings);
          }}
        />
      )}

      {showAdmin && (
        <AdminDashboard 
          onClose={() => setShowAdmin(false)}
          currentUser={currentUser}
        />
      )}
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
  return (
    <AuthProvider>
      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>🎯</div>
              <span style={styles.logoText}>SMART CART</span>
            </div>
            
            <div style={styles.headerActions}>
              <button style={styles.loginButton}>Log In</button>
              <button style={styles.ctaButton}>Start Smart Parsing</button>
            </div>
          </div>
        </header>

        <AuthStatus />
        
        <main style={styles.main}>
          <GroceryListForm />
        </main>
        
        {/* Enhanced Features Section */}
        <section style={styles.featuresSection}>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🧠</div>
              <h3 style={styles.featureTitle}>AI-Powered Intelligence</h3>
              <p style={styles.featureDescription}>
                Advanced parsing that distinguishes between actual products and meal descriptions
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🎯</div>
              <h3 style={styles.featureTitle}>Confidence Scoring</h3>
              <p style={styles.featureDescription}>
                Every item gets a confidence score so you know which products need review
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>✅</div>
              <h3 style={styles.featureTitle}>Product Validation</h3>
              <p style={styles.featureDescription}>
                Real-time validation against grocery databases with pricing and availability
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔄</div>
              <h3 style={styles.featureTitle}>Smart Duplicate Detection</h3>
              <p style={styles.featureDescription}>
                Automatically merges similar items and suggests alternatives
              </p>
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
    position: 'relative',
  },

  // Admin Menu Styles
  adminMenuContainer: {
    position: 'absolute',
    top: '-10px',
    right: '20px',
    zIndex: 2000,
  },

  adminMenuToggle: {
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 4px 10px rgba(102, 126, 234, 0.3)',
    transition: 'all 0.2s ease',
  },

  adminMenu: {
    position: 'absolute',
    top: '45px',
    right: '0',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid #e5e7eb',
    minWidth: '250px',
    zIndex: 3000,
  },

  adminMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    borderRadius: '12px 12px 0 0',
  },

  adminMenuTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },

  adminMenuClose: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
  },

  adminMenuButtons: {
    padding: '10px 0',
  },

  adminMenuButton: {
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    transition: 'background-color 0.2s',
  },

  adminMenuDivider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '8px 0',
  },

  adminMenuInfo: {
    padding: '10px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '11px',
    color: '#6b7280',
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
    maxWidth: '700px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  
  intelligenceBanner: {
    background: 'linear-gradient(135deg, #e8f4fd, #d0ebf7)',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '32px',
    border: '2px solid #3b82f6',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
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
    color: '#1e40af',
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  
  bannerSubtitle: {
    color: '#3730a3',
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
    color: '#3730a3',
    fontWeight: 'bold',
  },
  
  indicatorIcon: {
    fontSize: '24px',
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
    minHeight: '200px',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box',
  },
  
  controlsSection: {
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  
  actionSelector: {
    marginBottom: '15px',
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
  
  intelligenceToggle: {
    padding: '15px',
    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
    borderRadius: '10px',
    border: '2px solid #0ea5e9',
  },
  
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#0c4a6e',
    cursor: 'pointer',
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
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center',
  },
  
  smashButton: {
    width: '100%',
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
  
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  
  newListButton: {
    padding: '12px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  
  smartButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  
  validateButton: {
    padding: '12px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  
  reviewButton: {
    padding: '12px 20px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
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
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
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
    lineHeight: '1.5',
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

// Add animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
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
  
  .admin-menu-button:hover {
    background-color: #f3f4f6 !important;
  }
`;
document.head.appendChild(styleSheet);

export default App;