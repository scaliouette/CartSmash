// client/src/App.js - FIXED STRUCTURE
import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ParsedResultsDisplay from './components/ParsedResultsDisplay';
import InstacartIntegration from './components/InstacartIntegration';
import SmartAIAssistant from './components/SmartAIAssistant';
import ProductValidator from './components/ProductValidator';
import MyAccount from './components/MyAccount';
import FirebaseDebug from './components/FirebaseDebug';


// Import the enhanced components
import ParsingAnalyticsDashboard from './components/ParsingAnalyticsDashboard';
import SmartParsingDemo from './components/SmartParsingDemo';
import AIParsingSettings from './components/AIParsingSettings';
import AdminDashboard from './components/AdminDashboard';

// Import Loading and Auto-Save
import LoadingSpinner, { ButtonSpinner, OverlaySpinner, ProgressSpinner } from './components/LoadingSpinner';
import { useGroceryListAutoSave, useCartAutoSave } from './hooks/useAutoSave';

// Import Kroger integration
import KrogerOrderFlow from './components/KrogerOrderFlow';

import confetti from 'canvas-confetti';

// Import debug component (remove after testing)
// import AuthDebug from './components/AuthDebug';


// Define styles OUTSIDE of components at module level
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
  
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
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
  
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #3b82f6',
  },
  
  userName: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: '14px',
  },
  
  signOutBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  
  nav: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
  },
  
  navButton: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  navButtonActive: {
    backgroundColor: '#f0f9ff',
    color: '#1e40af',
    borderColor: '#3b82f6',
  },
  
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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

  // Hero Section Styles
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

  // Form Styles
  mainForm: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    marginBottom: '48px',
    position: 'relative',
  },
  
  inputSection: {
    marginBottom: '24px',
  },
  
  inputLabel: {
    display: 'flex',
    alignItems: 'center',
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
  
  validateButton: {
    padding: '12px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  
  // Features Section
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

  // Error and Control Styles
  errorMessage: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '24px',
    fontSize: '16px',
  },
  
  controlsSection: {
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  // Intelligence Banner
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

  // Cart Action Toggle
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

  // Auto-save and sync styles
  autoSaveIndicator: {
    marginLeft: '10px',
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 'normal',
    opacity: 0.8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  
  syncStatus: {
    marginTop: '12px',
    textAlign: 'center',
    fontSize: '12px',
  },
  
  syncStatusSyncing: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  
  syncStatusSuccess: {
    color: '#10b981',
    fontWeight: '500',
  },
  
  syncStatusError: {
    color: '#f59e0b',
    fontWeight: '500',
  },

  // Progress overlay
  progressOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Draft banner styles
  draftBanner: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)',
  },

  draftBannerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },

  draftBannerText: {
    flex: 1,
  },

  draftBannerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '4px',
  },

  draftBannerPreview: {
    fontSize: '14px',
    color: '#78350f',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },

  draftBannerActions: {
    display: 'flex',
    gap: '10px',
  },

  restoreButton: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  dismissButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#92400e',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// Helper function for time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}


// Sync Status Indicator Component
function SyncStatusIndicator({ isSyncing, lastSync, error }) {
  if (!isSyncing && !lastSync && !error) return null;

  return (
    <div style={styles.syncStatus}>
      {isSyncing && (
        <div style={styles.syncStatusSyncing}>
          <ButtonSpinner color="#3b82f6" />
          <span>Saving...</span>
        </div>
      )}
      {!isSyncing && lastSync && !error && (
        <div style={styles.syncStatusSuccess}>
          ✅ Saved {getTimeAgo(lastSync)}
        </div>
      )}
      {error && (
        <div style={styles.syncStatusError}>
          ⚠️ Save failed (saved locally)
        </div>
      )}
    </div>
  );
}

// Draft Restoration Banner Component
function DraftRestorationBanner({ draft, onRestore, onDismiss }) {
  if (!draft || !draft.content) return null;

  const savedDate = new Date(draft.timestamp);
  const timeAgo = getTimeAgo(savedDate);

  return (
    <div style={styles.draftBanner}>
      <div style={styles.draftBannerContent}>
        <div style={styles.draftBannerText}>
          <div style={styles.draftBannerTitle}>
            📝 Draft found from {timeAgo}
          </div>
          <div style={styles.draftBannerPreview}>
            {draft.content.split('\n').slice(0, 2).join(' • ')}
            {draft.content.split('\n').length > 2 && '...'}
          </div>
        </div>
        <div style={styles.draftBannerActions}>
          <button
            onClick={onRestore}
            style={styles.restoreButton}
          >
            Restore Draft
          </button>
          <button
            onClick={onDismiss}
            style={styles.dismissButton}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}



// Enhanced SMASH Button Component
function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('🎯 SMART PARSE 🎯');

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
      '🎯 AI ANALYZING! 🎯',
      '🧠 SMART PROCESSING! 🧠', 
      '📦 DETECTING CONTAINERS! 📦',
      '✨ PARSING QUANTITIES! ✨'
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
      setButtonText('🎯 SMART PARSE 🎯');
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
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <ButtonSpinner />
          <span>PARSING...</span>
        </div>
      ) : (
        <>
          {buttonText}
          {itemCount > 0 && !isSmashing && (
            <div style={{ 
              fontSize: '14px', 
              marginTop: '4px',
              opacity: 0.9,
              fontWeight: '600'
            }}>
              {itemCount} items to parse
            </div>
          )}
        </>
      )}
    </button>
  );
}

// Header Component
function Header({ currentView, onViewChange }) {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div 
          style={styles.logoContainer}
          onClick={() => onViewChange('home')}
        >
          <div style={styles.logoIcon}>🎯</div>
          <span style={styles.logoText}>SMART CART</span>
        </div>
        
        {currentUser && (
          <nav style={styles.nav}>
            <button
              onClick={() => onViewChange('home')}
              style={{
                ...styles.navButton,
                ...(currentView === 'home' ? styles.navButtonActive : {})
              }}
            >
              🏠 Home
            </button>
            <button
              onClick={() => onViewChange('account')}
              style={{
                ...styles.navButton,
                ...(currentView === 'account' ? styles.navButtonActive : {})
              }}
            >
              👤 My Account
            </button>
          </nav>
        )}
        
        <div style={styles.headerActions}>
          {isLoading ? (
            <span style={styles.loadingText}>
              <ButtonSpinner color="#6b7280" /> Loading...
            </span>
          ) : currentUser ? (
            <div style={styles.userSection}>
              <span style={styles.userName}>
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </span>
              <button 
                onClick={signOut}
                style={styles.signOutBtn}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={styles.ctaButton}
            >
              🔐 Sign In
            </button>
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

// Main Grocery List Form Component
function GroceryListForm({ savedRecipes, setSavedRecipes }) {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mergeCart, setMergeCart] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  const { currentUser, saveCartToFirebase } = useAuth();

  // Auto-save integration
  const { 
    draft, 
    clearDraft, 
    showDraftBanner, 
    setShowDraftBanner,
    isSaving: isDraftSaving
  } = useGroceryListAutoSave(inputText);

  // Cart auto-save
  const {
    isSyncing: isCartSyncing,
    lastSync: cartLastSync,
    syncError: cartSyncError
  } = useCartAutoSave(parsedItems, currentUser?.uid);

  // Load saved recipes function
  const loadSavedRecipes = async () => {
    try {
      const response = await fetch('/api/cart/recipes');
      if (response.ok) {
        const data = await response.json();
        setSavedRecipes(data.recipes || []);
      }
    } catch (error) {
      console.warn('Failed to load saved recipes:', error);
      const saved = localStorage.getItem('cart-smash-recipes');
      if (saved) {
        try {
          setSavedRecipes(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse saved recipes:', e);
        }
      }
    }
  };

  // Handle draft restoration
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
    setParsedItems([]);
    setShowResults(false);
    setParsingStats(null);
    setShowProgress(true);
    setParsingProgress(0);

    try {
      console.log('🎯 Starting intelligent grocery list processing...');
      
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
            strictMode: true,
            enableValidation: true,
            enhancedQuantityParsing: true,
            detectContainers: true
          }
        }),
      });

      

      clearInterval(progressInterval);
      setParsingProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      

      const data = await response.json();
      
      if (data.success && data.cart && data.cart.length > 0) {
        setParsedItems(data.cart);
        setParsingStats(data.parsing?.stats || null);
        setShowResults(true);
        clearDraft();
        
        console.log(`✅ Intelligent parsing complete:`);
        console.log(`   - Products extracted: ${data.cart.length}`);
        console.log(`   - Quantity parsing accuracy: ${data.quality?.quantityParsingAccuracy || 'N/A'}`);
        console.log(`   - Average confidence: ${(data.parsing?.averageConfidence * 100 || 0).toFixed(1)}%`);
        
        if (data.recipe && data.recipe.saved) {
          console.log(`📝 Recipe saved: "${data.recipe.title}"`);
          loadSavedRecipes();
        }
        
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
      setShowProgress(false);
      setParsingProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitGroceryList(inputText);
  };

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

  const handleValidateAll = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    
    setValidatingAll(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/cart/validate-all`, {
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
      setValidatingAll(false);
    }
  };

  const handleNewList = () => {
    setInputText('');
    setParsedItems([]);
    setShowResults(false);
    setError('');
    setParsingStats(null);
    setShowValidator(false);
    clearDraft();
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
      {isLoading && (
        <OverlaySpinner text="Processing your grocery list..." />
      )}

      {showProgress && (
        <div style={styles.progressOverlay}>
          <ProgressSpinner 
            progress={parsingProgress} 
            text="Analyzing your grocery list..."
          />
        </div>
      )}

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

      <div style={styles.intelligenceBanner}>
        <div style={styles.bannerContent}>
          <div style={styles.bannerText}>
            <h3 style={styles.bannerTitle}>🧠 AI-Powered Smart Parsing</h3>
            <p style={styles.bannerSubtitle}>
              • Advanced quantity parsing (handles fractions like "1/4 cup")<br />
              • Smart container detection (recognizes cans, bottles, bags, etc.)<br />
              • Recipe information preservation for future cooking<br />
              • Confidence scoring for every item<br />
              • Automatic duplicate detection and merging
            </p>
          </div>
          <div style={styles.bannerIndicator}>
            <span style={styles.indicatorIcon}>🎯</span>
            <span style={styles.indicatorText}>Always Active</span>
          </div>
        </div>
      </div>

      <div style={styles.mainForm}>
        {/* Draft Restoration Banner */}
        <DraftRestorationBanner 
          draft={showDraftBanner ? draft : null}
          onRestore={handleRestoreDraft}
          onDismiss={() => {
            setShowDraftBanner(false);
            clearDraft();
          }}
        />

        <div style={styles.inputSection}>
          <label style={styles.inputLabel}>
            Paste or Create Grocery List
            {isDraftSaving && (
              <span style={styles.autoSaveIndicator}>
                <ButtonSpinner color="#10b981" /> Saving...
              </span>
            )}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={styles.textarea}
            placeholder="Paste any grocery list here - our AI will intelligently extract products with correct quantities and containers:

Example:
Monday: Chicken dinner
- 2 lbs chicken breast
- 1/4 cup soy sauce  ✅ (handles fractions)
- 1 bottle of mirin  ✅ (detects containers)
- 1 8oz can tomatoes ✅ (unit: can, not oz)
Tuesday: Pasta night
- 1 box pasta
- 1 jar pasta sauce

The AI will extract: '2 lbs chicken breast', '0.25 cups soy sauce', '1 bottle mirin', etc."
            rows="12"
          />
        </div>
        
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
                onClick={handleValidateAll}
                disabled={isLoading || validatingAll}
                style={styles.validateButton}
              >
                {validatingAll ? <ButtonSpinner /> : '🔍'} Validate All
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

        {/* Sync Status */}
        <SyncStatusIndicator 
          isSyncing={isCartSyncing}
          lastSync={cartLastSync}
          error={cartSyncError}
        />
      </div>

      {/* ParsedResultsDisplay - The key component for showing results */}
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

      {/* Smart AI Assistant */}
      <SmartAIAssistant 
        onGroceryListGenerated={(list) => {
          setInputText(list);
          if (list.trim()) {
            setTimeout(() => submitGroceryList(list), 500);
          }
        }}
        onRecipeGenerated={(recipe) => {
          setSavedRecipes(prev => [...prev, recipe]);
        }}
      />
    </div>
  );
}

// Main App Component - SINGLE DEFINITION
function App() {
  const [currentView, setCurrentView] = useState('home');
  const [savedRecipes, setSavedRecipes] = useState([]);

   useEffect(() => {
    console.log('Environment check:', {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    });
    
    // Check if Firebase is initialized
    import('./firebase').then(module => {
      console.log('📦 Firebase module:', {
        hasAuth: !!module.auth,
        hasApp: !!module.default
      });
      
      if (module.auth) {
        console.log('✅ Auth instance available');
        // Try to get current user
        module.auth.onAuthStateChanged(user => {
          console.log('👤 Current auth state:', user ? user.email : 'No user');
        });
      }
    }).catch(err => {
      console.error('❌ Failed to load Firebase module:', err);
    });
  }, [])
  
  // Load saved recipes on mount
  useEffect(() => {
    const loadSavedRecipes = async () => {
      try {
        const response = await fetch('/api/cart/recipes');
        if (response.ok) {
          const data = await response.json();
          setSavedRecipes(data.recipes || []);
        }
      } catch (error) {
        console.warn('Failed to load saved recipes:', error);
        const saved = localStorage.getItem('cart-smash-recipes');
        if (saved) {
          try {
            setSavedRecipes(JSON.parse(saved));
          } catch (e) {
            console.warn('Failed to parse saved recipes:', e);
          }
        }
      }
    };
    
    loadSavedRecipes();
  }, []);

  return (
    <AuthProvider>
      <div style={styles.app}>
        <Header currentView={currentView} onViewChange={setCurrentView} />
        
        <main style={styles.main}>
          {currentView === 'home' ? (
            <GroceryListForm 
              savedRecipes={savedRecipes}
              setSavedRecipes={setSavedRecipes}
            />
          ) : currentView === 'account' ? (
            <MyAccount 
              savedRecipes={savedRecipes}
              onRecipeSelect={(recipe) => {
                setCurrentView('home');
                // You could also pass this recipe to GroceryListForm via state
              }}
            />
          ) : null}
        </main>
        
        {currentView === 'home' && (
          <section style={styles.featuresSection}>
            <div style={styles.featuresGrid}>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>🔢</div>
                <h3 style={styles.featureTitle}>Smart Quantity & Container Parsing</h3>
                <p style={styles.featureDescription}>
                  Handles fractions like "1/4 cup" and detects containers like "bottle", "can", "bag" automatically
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
                <div style={styles.featureIcon}>💾</div>
                <h3 style={styles.featureTitle}>Auto-Save Everything</h3>
                <p style={styles.featureDescription}>
                  Never lose your work with automatic draft saving and cloud sync for your carts
                </p>
              </div>
            </div>
          </section>
        )}
        
        {/* Debug component - REMOVE AFTER TESTING */}
        {/* {process.env.NODE_ENV === 'development' && <AuthDebug />} */}
        <FirebaseDebug />
      </div>
    </AuthProvider>
  );
}

// Add CSS animations
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