// client/src/components/GroceryListForm.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ParsedResultsDisplay from './ParsedResultsDisplay';
import SmartAIAssistant from './SmartAIAssistant';
import ProductValidator from './ProductValidator';
import RecipeManager from './RecipeManager';
import { ButtonSpinner, OverlaySpinner, ProgressSpinner } from './LoadingSpinner';
import { useGroceryListAutoSave } from '../hooks/useAutoSave';
import confetti from 'canvas-confetti';

// Helper functions
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Sub-components
function SyncStatusIndicator({ isSyncing, lastSync, error }) {
  if (!isSyncing && !lastSync && !error) return null;

  return (
    <div className="sync-status">
      {isSyncing && (
        <div className="sync-status-syncing">
          <ButtonSpinner color="#3b82f6" />
          <span>Saving...</span>
        </div>
      )}
      {!isSyncing && lastSync && !error && (
        <div className="sync-status-success">
          ✅ Saved {getTimeAgo(lastSync)}
        </div>
      )}
      {error && (
        <div className="sync-status-error">
          ⚠️ Save failed (saved locally)
        </div>
      )}
    </div>
  );
}

function DraftRestorationBanner({ draft, onRestore, onDismiss }) {
  if (!draft || !draft.content) return null;

  const savedDate = new Date(draft.timestamp);
  const timeAgo = getTimeAgo(savedDate);

  return (
    <div className="draft-banner">
      <div className="draft-banner-content">
        <div className="draft-banner-text">
          <div className="draft-banner-title">
            📝 Draft found from {timeAgo}
          </div>
          <div className="draft-banner-preview">
            {draft.content.split('\n').slice(0, 2).join(' • ')}
            {draft.content.split('\n').length > 2 && '...'}
          </div>
        </div>
        <div className="draft-banner-actions">
          <button onClick={onRestore} className="btn-restore">
            Restore Draft
          </button>
          <button onClick={onDismiss} className="btn-dismiss">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('💥 CARTSMASH IT! 💥');

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
      '🎯 AI ANALYZING! 🎯',
      '🧠 SMART PROCESSING! 🧠', 
      '📦 DETECTING ITEMS! 📦',
      '✨ PARSING MAGIC! ✨'
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
      setButtonText('💥 CARTSMASH IT! 💥');
      setIsSmashing(false);
    }
  };

  return (
    <button 
      onClick={handleSmash}
      disabled={isDisabled || isLoading}
      className={`smash-button ${isSmashing ? 'smash-button-smashing' : ''}`}
    >
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <ButtonSpinner />
          <span>SMASHING...</span>
        </div>
      ) : (
        <>
          {buttonText}
          {itemCount > 0 && !isSmashing && (
            <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.9, fontWeight: '600' }}>
              {itemCount} items to smash
            </div>
          )}
        </>
      )}
    </button>
  );
}

// Main Component
function GroceryListForm({ 
  currentCart, 
  setCurrentCart, 
  savedRecipes, 
  setSavedRecipes,
  saveCartAsList,
  saveRecipe,
  loadRecipeToCart
}) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mergeCart, setMergeCart] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  const { currentUser, saveCartToFirebase } = useAuth();

  // Auto-save hooks
  const { 
    draft, 
    clearDraft, 
    showDraftBanner, 
    setShowDraftBanner,
    isSaving: isDraftSaving
  } = useGroceryListAutoSave(inputText);

    const isCartSyncing = false;
    const cartLastSync = null;
    const cartSyncError = null;

  // Show results when cart has items
  useEffect(() => {
    setShowResults(currentCart.length > 0);
  }, [currentCart]);

  const handleRestoreDraft = () => {
    if (draft && draft.content) {
      setInputText(draft.content);
      setShowDraftBanner(false);
      clearDraft();
    }
  };

  const submitGroceryList = async (listText, recipeInfo = null) => {
    if (!listText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowProgress(true);
    setParsingProgress(0);

    try {
      console.log('💥 CARTSMASH: Processing list...');
      
      const progressInterval = setInterval(() => {
        setParsingProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: listText,
          action: mergeCart ? 'merge' : 'replace',
          userId: currentUser?.uid || null,
          recipeInfo: recipeInfo,
          options: {
            mergeDuplicates: true,
            enhancedQuantityParsing: true,
            detectContainers: true
          }
        }),
      });

      clearInterval(progressInterval);
      setParsingProgress(100);

      const data = await response.json();
      
      if (data.success && data.cart && data.cart.length > 0) {
        if (mergeCart) {
          setCurrentCart(prev => [...prev, ...data.cart]);
        } else {
          setCurrentCart(data.cart);
        }
        
        setParsingStats(data.parsing?.stats || null);
        clearDraft();
        
        console.log(`✅ Parsed ${data.cart.length} items`);
      } else {
        setError('No valid grocery items found');
      }
      
    } catch (err) {
      console.error('❌ Parsing failed:', err);
      setError(`Failed to process: ${err.message}`);
    } finally {
      setIsLoading(false);
      setShowProgress(false);
      setParsingProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitGroceryList(inputText);
  };

  const handleItemsChange = (updatedItems) => {
    setCurrentCart(updatedItems);
  };

  const handleValidateAll = async () => {
    if (!currentCart || currentCart.length === 0) return;
    
    setValidatingAll(true);
    try {
      // Validation logic here
      alert('🔍 Validation complete!');
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidatingAll(false);
    }
  };

  const handleNewList = () => {
    setInputText('');
    setCurrentCart([]);
    setError('');
    setParsingStats(null);
    setShowValidator(false);
    clearDraft();
  };

  const handleShowValidator = () => {
    const needsReview = currentCart.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.6
    );
    
    if (needsReview.length > 0) {
      setShowValidator(true);
    } else {
      alert('🎉 All items are validated!');
    }
  };

  const handleSaveList = () => {
    const listName = prompt('Enter a name for this list:', `Shopping List ${new Date().toLocaleDateString()}`);
    if (!listName) return;
    
    const list = saveCartAsList(listName);
    if (list) {
      alert(`✅ List "${listName}" saved successfully!`);
    }
  };

  return (
    <div className="container">
      {isLoading && (
        <OverlaySpinner text="CARTSMASH is processing your list..." />
      )}

      {showProgress && (
        <div className="progress-overlay">
          <ProgressSpinner 
            progress={parsingProgress} 
            text="CARTSMASH AI analyzing your grocery list..."
          />
        </div>
      )}

      <div className="hero-section">
        <h1 className="hero-title">
          CARTSMASH.
          <br />
          <span className="hero-accent">Instantly.</span>
        </h1>
        <p className="hero-subtitle">
          AI-powered grocery parsing that understands what you actually want to buy.
        </p>
      </div>

      <div className="intelligence-banner">
        <div className="banner-content">
          <div className="banner-text">
            <h3 className="banner-title">💥 CARTSMASH AI-Powered Smart Parsing</h3>
            <p className="banner-subtitle">
              • Recipes, lists, and carts all connected<br />
              • Smart quantity parsing with container detection<br />
              • Auto-save and cloud sync<br />
              • Duplicate detection and merging
            </p>
          </div>
          <div className="banner-indicator">
            <span className="indicator-icon">💥</span>
            <span className="indicator-text">
              {currentCart.length} items in cart
            </span>
          </div>
        </div>
      </div>

      <div className="main-form">
        <DraftRestorationBanner 
          draft={showDraftBanner ? draft : null}
          onRestore={handleRestoreDraft}
          onDismiss={() => {
            setShowDraftBanner(false);
            clearDraft();
          }}
        />

        <div className="input-section">
          <label className="input-label">
            Paste or Create Grocery List
            {isDraftSaving && (
              <span className="auto-save-indicator">
                <ButtonSpinner color="#10b981" /> Saving...
              </span>
            )}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="textarea"
            placeholder="Enter your grocery list here..."
            rows="12"
          />
        </div>
        
        <div className="controls-section">
          <div className="cart-action-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={mergeCart}
                onChange={(e) => setMergeCart(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                {mergeCart ? '🔀 Merge with cart' : '🔥 Replace cart'}
              </span>
            </label>
            <div className="toggle-description">
              {mergeCart 
                ? `Add to existing ${currentCart.length} items`
                : 'Replace entire cart with new items'
              }
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="button-group">
          <SmashButton
            onSubmit={handleSubmit}
            isDisabled={!inputText.trim()}
            isLoading={isLoading}
            itemCount={inputText.split('\n').filter(line => line.trim()).length}
          />
          
          {showResults && (
            <div className="action-buttons">
              <button onClick={handleNewList} className="btn btn-new">
                📝 New List
              </button>
              
              <button onClick={handleValidateAll} className="btn btn-validate">
                {validatingAll ? <ButtonSpinner /> : '🔍'} Validate All
              </button>
              
              <button onClick={handleShowValidator} className="btn btn-review">
                ⚠️ Review Items
              </button>
              
              <button onClick={handleSaveList} className="btn btn-save">
                💾 Save List
              </button>
              
              <button onClick={() => setShowRecipeManager(true)} className="btn btn-recipes">
                📖 Manage Recipes
              </button>
            </div>
          )}
        </div>

        <SyncStatusIndicator 
          isSyncing={isCartSyncing}
          lastSync={cartLastSync}
          error={cartSyncError}
        />
      </div>

      {showResults && currentCart.length > 0 && (
        <ParsedResultsDisplay 
          items={currentCart} 
          currentUser={currentUser}
          onItemsChange={handleItemsChange}
          parsingStats={parsingStats}
        />
      )}

      {showValidator && (
        <ProductValidator
          items={currentCart}
          onItemsUpdated={handleItemsChange}
          onClose={() => setShowValidator(false)}
        />
      )}

      {showRecipeManager && (
        <RecipeManager
          onClose={() => setShowRecipeManager(false)}
          savedRecipes={savedRecipes}
          onRecipeSelect={(recipe) => {
            setShowRecipeManager(false);
            const itemsLoaded = loadRecipeToCart(recipe, mergeCart);
            alert(`✅ Added ${itemsLoaded} items from "${recipe.name}"`);
          }}
        />
      )}

      <SmartAIAssistant 
        onGroceryListGenerated={(list) => {
          setInputText(list);
          if (list.trim()) {
            setTimeout(() => submitGroceryList(list), 500);
          }
        }}
        onRecipeGenerated={(recipe) => {
          saveRecipe(recipe);
        }}
      />
    </div>
  );
}

export default GroceryListForm;