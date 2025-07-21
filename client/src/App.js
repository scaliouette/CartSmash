// client/src/App.js - ENHANCED with Authentication Consolidation + Simplified Cart Action
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

// 🆕 NEW: Import Kroger integration
import KrogerOrderFlow from './components/KrogerOrderFlow';

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

// 🆕 NEW: Kroger Quick Order Button Component
function KrogerQuickOrderButton({ cartItems, currentUser, isVisible = true }) {
  const [showKrogerFlow, setShowKrogerFlow] = useState(false);
  const [krogerAuthStatus, setKrogerAuthStatus] = useState(null);

  useEffect(() => {
    if (isVisible && cartItems.length > 0) {
      checkKrogerAuth();
    }
  }, [isVisible, cartItems.length]);

  const checkKrogerAuth = async () => {
    try {
      const response = await fetch('/api/auth/kroger/status', {
        headers: {
          'User-ID': currentUser?.uid || 'demo-user'
        }
      });
      const data = await response.json();
      setKrogerAuthStatus(data);
    } catch (error) {
      console.warn('Failed to check Kroger auth status:', error);
    }
  };

  if (!isVisible || cartItems.length === 0) {
    return null;
  }

  const handleKrogerOrder = () => {
    setShowKrogerFlow(true);
  };

  return (
    <>
      <div style={styles.krogerOrderSection}>
        <div style={styles.krogerOrderHeader}>
          <h3 style={styles.krogerOrderTitle}>🏪 Order with Kroger</h3>
          <p style={styles.krogerOrderSubtitle}>
            Send your validated cart directly to Kroger for pickup or delivery
          </p>
        </div>

        <div style={styles.krogerOrderContent}>
          <div style={styles.krogerOrderStats}>
            <div style={styles.orderStat}>
              <span style={styles.orderStatNumber}>{cartItems.length}</span>
              <span style={styles.orderStatLabel}>Items Ready</span>
            </div>
            <div style={styles.orderStat}>
              <span style={styles.orderStatNumber}>
                {cartItems.filter(item => item.realPrice).length}
              </span>
              <span style={styles.orderStatLabel}>With Pricing</span>
            </div>
            <div style={styles.orderStat}>
              <span style={styles.orderStatNumber}>
                ${cartItems.reduce((sum, item) => sum + (item.realPrice || 0) * (item.quantity || 1), 0).toFixed(2)}
              </span>
              <span style={styles.orderStatLabel}>Estimated Total</span>
            </div>
          </div>

          <div style={styles.krogerOrderActions}>
            <button 
              onClick={handleKrogerOrder}
              style={styles.krogerOrderButton}
            >
              {krogerAuthStatus?.authenticated ? (
                <>🛒 Send to Kroger Cart</>
              ) : (
                <>🔐 Connect & Order with Kroger</>
              )}
            </button>
            
            {krogerAuthStatus?.authenticated && (
              <div style={styles.authStatus}>
                ✅ Connected to Kroger
              </div>
            )}
          </div>

          <div style={styles.krogerFeatures}>
            <div style={styles.feature}>✅ Real-time pricing</div>
            <div style={styles.feature}>🚗 Pickup or delivery</div>
            <div style={styles.feature}>🔒 Secure checkout</div>
          </div>
        </div>
      </div>

      {/* Kroger Order Flow Modal */}
      {showKrogerFlow && (
        <KrogerOrderFlow
          cartItems={cartItems}
          currentUser={currentUser}
          onClose={() => setShowKrogerFlow(false)}
        />
      )}
    </>
  );
}

// ✅ NEW: Recipe Manager Widget
function RecipeManagerWidget({ savedRecipes, onRecipeSelect, onToggleRecipeManager }) {
  if (savedRecipes.length === 0) {
    return null;
  }

  return (
    <div style={styles.recipeWidget}>
      <div style={styles.recipeWidgetHeader}>
        <h4 style={styles.recipeWidgetTitle}>📝 Saved Recipes ({savedRecipes.length})</h4>
        <button
          onClick={onToggleRecipeManager}
          style={styles.recipeWidgetToggle}
        >
          View All
        </button>
      </div>
      
      <div style={styles.recipeWidgetContent}>
        {savedRecipes.slice(0, 3).map(recipe => (
          <div key={recipe.id} style={styles.recipeWidgetItem}>
            <div style={styles.recipeWidgetItemInfo}>
              <span style={styles.recipeWidgetItemTitle}>{recipe.title}</span>
              <span style={styles.recipeWidgetItemMeta}>
                {recipe.ingredients.length} ingredients • 
                <span style={{
                  color: recipe.ingredientChoice === 'basic' ? '#3b82f6' : '#f59e0b',
                  marginLeft: '4px'
                }}>
                  {recipe.ingredientChoice === 'basic' ? '🏪' : '🏠'}
                </span>
              </span>
            </div>
            <button
              onClick={() => onRecipeSelect(recipe)}
              style={styles.recipeWidgetButton}
            >
              Use
            </button>
          </div>
        ))}
        
        {savedRecipes.length > 3 && (
          <div style={styles.recipeWidgetMore}>
            +{savedRecipes.length - 3} more recipes
          </div>
        )}
      </div>
    </div>
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

// Enhanced Grocery List Form with Intelligence + Recipe Integration
function GroceryListForm() {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ SIMPLIFIED: Single toggle instead of radio buttons
  const [mergeCart, setMergeCart] = useState(true);
  
  const [showResults, setShowResults] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);

  // ✅ NEW: Recipe management state
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showRecipeManager, setShowRecipeManager] = useState(false);

  // Admin component states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const { currentUser, saveCartToFirebase } = useAuth();

  // ✅ NEW: Load saved recipes on component mount
  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = async () => {
    try {
      const response = await fetch('/api/cart/recipes');
      if (response.ok) {
        const data = await response.json();
        setSavedRecipes(data.recipes || []);
      }
    } catch (error) {
      console.warn('Failed to load saved recipes:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('cart-smash-recipes');
      if (saved) {
        try {
          setSavedRecipes(JSON.parse(saved));
        } catch (parseError) {
          console.warn('Failed to parse saved recipes from localStorage:', parseError);
        }
      }
    }
  };

  // ✅ ENHANCED: Enhanced submission logic with recipe preservation
  const submitGroceryList = async (listText, recipeInfo = null) => {
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
          action: mergeCart ? 'merge' : 'replace', // ✅ SIMPLIFIED
          userId: currentUser?.uid || null,
          recipeInfo: recipeInfo, // ✅ NEW: Include recipe information
          options: {
            strictMode: intelligenceEnabled,
            enableValidation: true,
            enhancedQuantityParsing: true // ✅ NEW: Enable enhanced quantity parsing
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
        console.log(`   - Quantity parsing accuracy: ${data.quality?.quantityParsingAccuracy || 'N/A'}`);
        console.log(`   - Average confidence: ${(data.parsing?.averageConfidence * 100 || 0).toFixed(1)}%`);
        
        // ✅ NEW: Handle recipe saving
        if (data.recipe && data.recipe.saved) {
          console.log(`📝 Recipe saved: "${data.recipe.title}"`);
          loadSavedRecipes(); // Refresh the recipes list
        }
        
        // Show intelligence summary
        if (data.parsing) {
          const needsReview = data.quality?.needsReviewItems || 0;
          if (needsReview > 0) {
            setTimeout(() => {
              if (window.confirm(`🎯 Smart parsing complete! ${needsReview} items need review. Would you like to review them now for better accuracy?`)) {
                setShowValidator(true);
              }
            }, 1000);
          } else {
            // Show enhanced parsing success message
            setTimeout(() => {
              const quantityAccuracy = data.quality?.quantityParsingAccuracy || 0;
              if (quantityAccuracy > 0.8) {
                alert(`🎉 Enhanced parsing successful! All quantities parsed correctly. ${data.cart.length} items ready to go!`);
              }
            }, 500);
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

  // ✅ ENHANCED: AI-generated grocery list handler with recipe preservation
  const handleAIGroceryList = async (aiGeneratedList) => {
    setInputText(aiGeneratedList);
    
    if (aiGeneratedList.trim()) {
      setTimeout(async () => {
        await submitGroceryList(aiGeneratedList);
      }, 500);
    }
  };

  // ✅ NEW: Recipe generated handler
  const handleRecipeGenerated = async (recipe) => {
    console.log('📝 Recipe generated from AI:', recipe.title);
    setSavedRecipes(prev => [...prev, recipe]);
    
    // Optionally auto-populate the grocery list with recipe ingredients
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const ingredientsList = recipe.ingredients.join('\n');
      setInputText(ingredientsList);
    }
  };

  // ✅ NEW: Recipe selection handler
  const handleRecipeSelect = (recipe) => {
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const ingredientsList = recipe.ingredients.join('\n');
      setInputText(ingredientsList);
      
      // Auto-submit the recipe ingredients
      setTimeout(async () => {
        await submitGroceryList(ingredientsList, recipe);
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

      {/* ✅ NEW: Recipe Manager Widget */}
      <RecipeManagerWidget
        savedRecipes={savedRecipes}
        onRecipeSelect={handleRecipeSelect}
        onToggleRecipeManager={() => setShowRecipeManager(true)}
      />

      {/* Intelligence Features Banner */}
      <div style={styles.intelligenceBanner}>
        <div style={styles.bannerContent}>
          <div style={styles.bannerText}>
            <h3 style={styles.bannerTitle}>🧠 Powered by Enhanced AI Intelligence</h3>
            <p style={styles.bannerSubtitle}>
              • Advanced quantity parsing (handles fractions like "1 /4 cup")<br />
              • Recipe information preservation for future cooking<br />
              • Smart ingredient choice (basic vs homemade)<br />
              • Confidence scoring for every item<br />
              • Smart duplicate detection and merging
            </p>
          </div>
          <div style={styles.bannerIndicator}>
            <span style={styles.indicatorText}>Enhanced parsing enabled</span>
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
            placeholder="Paste any grocery list here - our enhanced AI will intelligently extract products with correct quantities:

Example with improved parsing:
Monday: Chicken dinner with vegetables
- 2 lbs chicken breast
- 1/4 cup soy sauce  ✅ (now handles fractions correctly)
- 1 1/2 cups rice    ✅ (mixed numbers work too)
- 3 bell peppers
Tuesday: Pasta night
- 1 lb pasta
- pasta sauce

The AI will ignore 'Monday: Chicken dinner' and extract: '2 lbs chicken breast', '0.25 cups soy sauce', etc."
            rows="12"
          />
        </div>
        
        {/* ✅ SIMPLIFIED: Single toggle for cart action */}
        <div style={styles.controlsSection}>
          <div style={styles.cartActionToggle}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={mergeCart}
                onChange={(e) => setMergeCart(e.target.checked)}
                style={styles.toggleCheckbox}
              />
              <span style={styles.toggleSlider}></span>
              <span style={styles.toggleText}>
                {mergeCart ? '🔀 Merge with existing cart' : '🔥 Replace entire cart'}
              </span>
            </label>
            <div style={styles.toggleDescription}>
              {mergeCart 
                ? 'New items will be added to your existing cart, avoiding duplicates'
                : 'Your current cart will be completely replaced with new items'
              }
            </div>
          </div>

          <div style={styles.intelligenceToggle}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={intelligenceEnabled}
                onChange={(e) => setIntelligenceEnabled(e.target.checked)}
              />
              <span>🎯 Enhanced AI parsing with recipe preservation (recommended)</span>
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

      {/* 🆕 NEW: Kroger Integration - Shows when you have parsed items */}
      <KrogerQuickOrderButton 
        cartItems={parsedItems}
        currentUser={currentUser}
        isVisible={showResults && parsedItems.length > 0}
      />

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

      {/* ✅ ENHANCED: Smart AI Assistant with recipe preservation */}
      <SmartAIAssistant 
        onGroceryListGenerated={handleAIGroceryList}
        onRecipeGenerated={handleRecipeGenerated}
      />

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

      {/* ✅ NEW: Recipe Manager Modal */}
      {showRecipeManager && (
        <div style={styles.recipeModalOverlay}>
          <div style={styles.recipeModal}>
            <div style={styles.recipeModalHeader}>
              <h3 style={styles.recipeModalTitle}>
                📝 Recipe Manager ({savedRecipes.length} saved)
              </h3>
              <button
                onClick={() => setShowRecipeManager(false)}
                style={styles.recipeModalClose}
              >
                ×
              </button>
            </div>
            
            <div style={styles.recipeModalContent}>
              {savedRecipes.length === 0 ? (
                <div style={styles.recipeModalEmpty}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <h4>No saved recipes yet</h4>
                  <p>Use the AI assistant to create meal plans and recipes!</p>
                </div>
              ) : (
                <div style={styles.recipesList}>
                  {savedRecipes.map(recipe => (
                    <div key={recipe.id} style={styles.recipeItem}>
                      <div style={styles.recipeItemHeader}>
                        <h4 style={styles.recipeItemTitle}>{recipe.title}</h4>
                        <div style={styles.recipeItemActions}>
                          <button
                            onClick={() => handleRecipeSelect(recipe)}
                            style={styles.recipeUseButton}
                          >
                            🛒 Use Ingredients
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(recipe.fullText);
                              alert('Recipe copied to clipboard!');
                            }}
                            style={styles.recipeCopyButton}
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                      
                      <div style={styles.recipeItemMeta}>
                        {recipe.ingredients.length} ingredients • {recipe.instructions.length} steps •
                        <span style={{
                          color: recipe.ingredientChoice === 'basic' ? '#3b82f6' : '#f59e0b',
                          marginLeft: '4px'
                        }}>
                          {recipe.ingredientChoice === 'basic' ? '🏪 Basic' : '🏠 Homemade'}
                        </span>
                      </div>
                      
                      <div style={styles.recipeItemPreview}>
                        {recipe.fullText.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ CONSOLIDATED: Single Auth Component in Header
function Header() {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🎯</div>
          <span style={styles.logoText}>SMART CART</span>
        </div>
        
        <div style={styles.headerActions}>
          {isLoading ? (
            <span style={styles.loadingText}>Loading...</span>
          ) : currentUser ? (
            <div style={styles.userMenu}>
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
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal(true)}
                style={styles.loginButton}
              >
                Log In
              </button>
              <button 
                onClick={() => setShowAuthModal(true)}
                style={styles.ctaButton}
              >
                🔐 Sign In to Save
              </button>
            </>
          )}
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </header>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div style={styles.app}>
        {/* ✅ CONSOLIDATED: Single auth location in header */}
        <Header />
        
        <main style={styles.main}>
          <GroceryListForm />
        </main>
        
        {/* Enhanced Features Section */}
        <section style={styles.featuresSection}>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔢</div>
              <h3 style={styles.featureTitle}>Enhanced Quantity Parsing</h3>
              <p style={styles.featureDescription}>
                Correctly handles fractions like "1/4 cup" and "2 1/2 lbs" with advanced parsing logic
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📝</div>
              <h3 style={styles.featureTitle}>Recipe Preservation</h3>
              <p style={styles.featureDescription}>
                Saves cooking instructions and recipes for future reference while extracting ingredients
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🏪</div>
              <h3 style={styles.featureTitle}>Basic vs Homemade Choice</h3>
              <p style={styles.featureDescription}>
                Choose between convenient store-bought items or from-scratch cooking ingredients
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>✅</div>
              <h3 style={styles.featureTitle}>Product Validation</h3>
              <p style={styles.featureDescription}>
                Real-time validation against grocery databases with pricing and availability
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
    position: 'sticky',
    top: 0,
    zIndex: 100,
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
  
  // ✅ NEW: User menu styles
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #3b82f6',
  },
  
  userGreeting: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: '14px',
  },
  
  signOutButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  
  loginButton: {
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.2s',
    fontSize: '14px',
  },
  
  ctaButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '14px',
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

  // ✅ NEW: Cart action toggle styles
  cartActionToggle: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    position: 'relative',
  },
  
  toggleCheckbox: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  
  toggleSlider: {
    display: 'inline-block',
    width: '50px',
    height: '28px',
    backgroundColor: '#e5e7eb',
    borderRadius: '14px',
    position: 'relative',
    transition: 'background-color 0.3s',
    flexShrink: 0,
  },
  
  toggleText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  
  toggleDescription: {
    marginTop: '8px',
    marginLeft: '62px',
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },

  // ✅ NEW: Recipe widget styles
  recipeWidget: {
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    border: '2px solid #3b82f6',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)'
  },

  recipeWidgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },

  recipeWidgetTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e40af'
  },

  recipeWidgetToggle: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  recipeWidgetContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  recipeWidgetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #bfdbfe'
  },

  recipeWidgetItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  recipeWidgetItemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },

  recipeWidgetItemMeta: {
    fontSize: '12px',
    color: '#6b7280'
  },

  recipeWidgetButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },

  recipeWidgetMore: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '8px'
  },

  // ✅ NEW: Recipe modal styles
  recipeModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },

  recipeModal: {
    backgroundColor: 'white',
    borderRadius: '15px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 10px 50px rgba(0,0,0,0.3)'
  },

  recipeModalHeader: {
    padding: '20px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },

  recipeModalTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#333'
  },

  recipeModalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666'
  },

  recipeModalContent: {
    padding: '20px',
    maxHeight: '60vh',
    overflowY: 'auto'
  },

  recipeModalEmpty: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },

  recipesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  recipeItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f9fafb'
  },

  recipeItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },

  recipeItemTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },

  recipeItemActions: {
    display: 'flex',
    gap: '8px'
  },

  recipeUseButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },

  recipeCopyButton: {
    padding: '6px 12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  recipeItemMeta: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '12px'
  },

  recipeItemPreview: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.4'
  },

  // Kroger Order Styles
  krogerOrderSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    marginTop: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    border: '2px solid #10b981',
    position: 'relative',
    overflow: 'hidden',
  },

  krogerOrderHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },

  krogerOrderTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
  },

  krogerOrderSubtitle: {
    margin: 0,
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },

  krogerOrderContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  krogerOrderStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
  },

  orderStat: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    border: '1px solid #0ea5e9',
  },

  orderStatNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: '4px',
  },

  orderStatLabel: {
    fontSize: '12px',
    color: '#0369a1',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  krogerOrderActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },

  krogerOrderButton: {
    padding: '16px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
    minWidth: '280px',
  },

  authStatus: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: '500',
  },

  krogerFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },

  feature: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
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
  
  intelligenceToggle: {
    padding: '15px',
    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
    borderRadius: '10px',
    border: '2px solid #0ea5e9',
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
};

// Add animations and enhanced toggle styles
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
  
  .kroger-order-button:hover {
    background-color: #059669 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
  
  /* Enhanced toggle slider styles */
  input[type="checkbox"]:checked + span {
    background-color: #3b82f6 !important;
  }
  
  input[type="checkbox"]:checked + span::after {
    content: '';
    position: absolute;
    left: 24px;
    top: 3px;
    width: 22px;
    height: 22px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  input[type="checkbox"] + span::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 3px;
    width: 22px;
    height: 22px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;
document.head.appendChild(styleSheet);

export default App;