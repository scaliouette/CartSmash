// client/src/App.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SmashCartProvider } from './contexts/SmashCartContext';
import userDataService from './services/userDataService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Import styles
import './styles/cartsmash.css';

// Import components
import Header from './components/Header';
import GroceryListForm from './components/GroceryListForm';
import MyAccount from './components/MyAccount';
import RecipeManager from './components/RecipeManager';
import StoresPage from './components/StoresPage';
import Contact from './components/Contact';
import Terms from './components/Terms';
import Privacy from './components/privacy';

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('home');
  
  // CENTRALIZED STATE MANAGEMENT
  const [currentCart, setCurrentCart] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
  
  // Get auth context inside the provider
  return (
    <AuthProvider>
      <SmashCartProvider>
        <AppContent 
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentCart={currentCart}
          setCurrentCart={setCurrentCart}
          savedLists={savedLists}
          setSavedLists={setSavedLists}
          savedRecipes={savedRecipes}
          setSavedRecipes={setSavedRecipes}
          mealPlans={mealPlans}
          setMealPlans={setMealPlans}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          syncStatus={syncStatus}
          setSyncStatus={setSyncStatus}
        />
      </SmashCartProvider>
    </AuthProvider>
  );
}

function AppContent({
  currentView, setCurrentView,
  currentCart, setCurrentCart,
  savedLists, setSavedLists,
  savedRecipes, setSavedRecipes,
  mealPlans, setMealPlans,
  isLoading, setIsLoading,
  syncStatus, setSyncStatus
}) {
  const { currentUser } = useAuth();
  
  // Expose refresh function globally for components
  useEffect(() => {
    window.refreshAccountData = loadAllData;
    return () => {
      delete window.refreshAccountData;
    };
  }, [currentUser]);
  
  // Load all data on mount and when user changes
  useEffect(() => {
    loadAllData();
  }, [currentUser]);
  
  // Auto-save cart to Firebase when it changes (debounced)
  useEffect(() => {
    if (currentCart.length === 0) return;
    
    const saveTimer = setTimeout(() => {
      saveCartToFirebase();
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(saveTimer);
  }, [currentCart, currentUser]);
  
  // Load all data from localStorage first, then Firebase
  const loadAllData = async () => {
    setIsLoading(true);
    
    try {
      // First load from localStorage for instant display
      loadLocalData();
      
      // Then load from Firebase if user is authenticated
      if (currentUser) {
        await loadFirebaseData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadLocalData = () => {
    try {
      const loadedCart = JSON.parse(localStorage.getItem('cartsmash-current-cart') || '[]');
      const loadedLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
      const loadedRecipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
      const loadedMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
      
      setCurrentCart(loadedCart);
      setSavedLists(loadedLists);
      setSavedRecipes(loadedRecipes);
      setMealPlans(loadedMealPlans);
      
      console.log('✅ Loaded data from localStorage');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };
  
  const loadFirebaseData = async () => {
    if (!currentUser) return;
    
    setSyncStatus('syncing');
    
    try {
      await userDataService.init();
      
      // Load all data from Firebase
      const [firebaseLists, firebaseRecipes, firebaseMealPlans, userPrefs] = await Promise.all([
        userDataService.getShoppingLists().catch(() => []),
        userDataService.getRecipes().catch(() => []),
        userDataService.getMealPlans().catch(() => []),
        userDataService.getUserPreferences().catch(() => ({}))
      ]);
      
      // Load current cart from the most recent list if exists
      if (firebaseLists.length > 0 && firebaseLists[0].items) {
        const mostRecentItems = firebaseLists[0].items;
        if (mostRecentItems.length > 0 && currentCart.length === 0) {
          setCurrentCart(mostRecentItems);
          console.log('✅ Loaded cart from Firebase');
        }
      }
      
      // Update state with Firebase data
      if (firebaseLists.length > 0) {
        setSavedLists(firebaseLists);
        localStorage.setItem('cartsmash-lists', JSON.stringify(firebaseLists));
      }
      
      if (firebaseRecipes.length > 0) {
        setSavedRecipes(firebaseRecipes);
        localStorage.setItem('cartsmash-recipes', JSON.stringify(firebaseRecipes));
      }
      
      if (firebaseMealPlans.length > 0) {
        setMealPlans(firebaseMealPlans);
        localStorage.setItem('cartsmash-mealplans', JSON.stringify(firebaseMealPlans));
      }
      
      setSyncStatus('synced');
      console.log('✅ Synced with Firebase:', {
        lists: firebaseLists.length,
        recipes: firebaseRecipes.length,
        mealPlans: firebaseMealPlans.length
      });
      
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      setSyncStatus('error');
    }
  };
  
  const saveCartToFirebase = async () => {
    if (!currentUser || currentCart.length === 0) return;
    
    try {
      // Auto-save current cart as a list
      const autoSaveList = {
        id: 'auto-save-current',
        name: `Auto-saved Cart ${new Date().toLocaleString()}`,
        items: currentCart,
        autoSaved: true,
        updatedAt: new Date().toISOString()
      };
      
      await userDataService.saveParsedList(autoSaveList);
      console.log('✅ Cart auto-saved to Firebase');
      
      // Also save to localStorage as backup
      localStorage.setItem('cartsmash-current-cart', JSON.stringify(currentCart));
      
    } catch (error) {
      console.error('Error saving cart to Firebase:', error);
      // Fallback to localStorage on error
      try {
        localStorage.setItem('cartsmash-current-cart', JSON.stringify(currentCart));
        console.log('💾 Cart saved locally as fallback');
      } catch (localError) {
        console.error('Local save also failed:', localError);
      }
    }
  };
  
  // CONNECTED FUNCTIONS
  const loadRecipeToCart = async (recipe, merge = false) => {
    console.log('📖 Loading recipe to cart:', recipe.name);
    
    const ingredients = recipe.ingredients || '';
    const lines = typeof ingredients === 'string' 
      ? ingredients.split('\n').filter(line => line.trim())
      : ingredients;
    
    // Use the API to parse with AI
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: lines.join('\n'),
          action: merge ? 'merge' : 'replace',
          userId: currentUser?.uid,
          useAI: true,
          options: {
            mergeDuplicates: true,
            strictMode: true
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentCart(data.cart);
        setCurrentView('home');
        return data.cart.length;
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
    }
    
    return 0;
  };
  
  const loadListToCart = (list, merge = false) => {
    console.log('📋 Loading list to cart:', list.name);
    
    if (!list.items || list.items.length === 0) {
      alert('This list is empty');
      return 0;
    }
    
    if (merge) {
      setCurrentCart(prev => [...prev, ...list.items]);
    } else {
      setCurrentCart(list.items);
    }
    
    setCurrentView('home');
    return list.items.length;
  };
  
  const saveCartAsList = async (name) => {
    if (currentCart.length === 0) {
      alert('Cart is empty!');
      return null;
    }
    
    const newList = {
      name: name || `Shopping List ${new Date().toLocaleDateString()}`,
      items: [...currentCart],
      itemCount: currentCart.length,
      createdAt: new Date().toISOString()
    };
    
    try {
      // Save to Firebase if user is authenticated
      if (currentUser) {
        await userDataService.saveParsedList(newList);
        console.log('✅ List saved to Firebase');
      }
      
      // Also save locally
      const updatedLists = [...savedLists, newList];
      setSavedLists(updatedLists);
      localStorage.setItem('cartsmash-lists', JSON.stringify(updatedLists));
      
      console.log('💾 List saved:', newList.name);
      return newList;
      
    } catch (error) {
      console.error('Error saving list:', error);
      alert('Failed to save list to cloud, but saved locally');
      return newList;
    }
  };
  
  const saveRecipe = async (recipe) => {
    const newRecipe = {
      ...recipe,
      id: recipe.id || `recipe_${Date.now()}`,
      createdAt: recipe.createdAt || new Date().toISOString()
    };
    
    try {
      // Save to Firebase if user is authenticated
      if (currentUser) {
        await userDataService.saveRecipe(newRecipe);
        console.log('✅ Recipe saved to Firebase');
      }
      
      // Also save locally
      const updatedRecipes = [...savedRecipes, newRecipe];
      setSavedRecipes(updatedRecipes);
      localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));
      
      console.log('📝 Recipe saved:', newRecipe.name);
      return newRecipe;
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe to cloud, but saved locally');
      return newRecipe;
    }
  };
  
  const deleteList = async (listId) => {
    try {
      // Delete from Firebase if user is authenticated
      if (currentUser) {
        await userDataService.deleteShoppingList(listId);
      }
      
      // Update local state
      setSavedLists(prev => prev.filter(l => l.id !== listId));
      
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };
  
  const deleteRecipe = async (recipeId) => {
    try {
      // Delete from Firebase if user is authenticated
      if (currentUser) {
        await userDataService.deleteRecipe(recipeId);
      }
      
      // Update local state
      setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
      
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };
  
  const updateList = async (updatedList) => {
    try {
      // Update in Firebase if user is authenticated
      if (currentUser) {
        await userDataService.updateShoppingList(updatedList.id, updatedList);
        console.log('✅ List updated in Firebase');
      }
      
      // Update local state
      const updatedLists = savedLists.map(list => 
        list.id === updatedList.id ? updatedList : list
      );
      setSavedLists(updatedLists);
      localStorage.setItem('cartsmash-lists', JSON.stringify(updatedLists));
      
      console.log('✅ List updated locally');
      return updatedList;
      
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  };
  
  const saveMealPlan = async (mealPlan) => {
    try {
      // Save to Firebase if user is authenticated
      if (currentUser) {
        await userDataService.saveMealPlan(mealPlan);
        console.log('✅ Meal plan saved to Firebase');
      }
      
      // Update local state
      const existingIndex = mealPlans.findIndex(p => p.id === mealPlan.id);
      let updatedPlans;
      
      if (existingIndex >= 0) {
        // Update existing
        updatedPlans = [...mealPlans];
        updatedPlans[existingIndex] = mealPlan;
      } else {
        // Add new
        updatedPlans = [...mealPlans, mealPlan];
      }
      
      setMealPlans(updatedPlans);
      localStorage.setItem('cartsmash-mealplans', JSON.stringify(updatedPlans));
      
      console.log('📅 Meal plan saved:', mealPlan.name);
      return mealPlan;
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Failed to save meal plan to cloud, but saved locally');
      return mealPlan;
    }
  };
  
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading your CARTSMASH data...</p>
      </div>
    );
  }
  
  return (
    <div className="app">
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView}
        syncStatus={syncStatus}
      />

      <main className="main">
        {currentView === 'home' ? (
          <GroceryListForm 
            currentCart={currentCart}
            setCurrentCart={setCurrentCart}
            savedRecipes={savedRecipes}
            setSavedRecipes={setSavedRecipes}
            saveCartAsList={saveCartAsList}
            saveRecipe={saveRecipe}
            loadRecipeToCart={loadRecipeToCart}
            // NOTE: currentUser removed - GroceryListForm gets it from useAuth()
          />
        ) : currentView === 'account' ? (
          <MyAccount 
            savedLists={savedLists}
            savedRecipes={savedRecipes}
            mealPlans={mealPlans}
            onRecipeSelect={(recipe) => {
              const itemsLoaded = loadRecipeToCart(recipe, false);
              if (itemsLoaded > 0) {
                alert(`✅ Loaded ${itemsLoaded} items from "${recipe.name}"`);
              }
            }}
            onListSelect={(list) => {
              const itemsLoaded = loadListToCart(list, false);
              if (itemsLoaded > 0) {
                alert(`✅ Loaded ${itemsLoaded} items from "${list.name}"`);
              }
            }}
            deleteList={deleteList}
            deleteRecipe={deleteRecipe}
            onListUpdate={updateList}
            onMealPlanUpdate={setMealPlans}
          />
        ) : currentView === 'stores' ? (
          <StoresPage 
            onStoreSelect={(store) => {
              console.log('🏪 Store selected in app:', store);
              // Store selection is handled in StoresPage component
              // After selection, user can return to home to start shopping
            }}
            onBackToHome={() => setCurrentView('home')}
          />
        ) : currentView === 'contact' ? (
          <Contact onBack={() => setCurrentView('home')} />
        ) : currentView === 'terms' ? (
          <Terms onBack={() => setCurrentView('home')} />
        ) : currentView === 'privacy' ? (
          <Privacy onBack={() => setCurrentView('home')} />
        ) : null}
      </main>
      
      {currentView === 'home' && <FeaturesSection />}
      {currentView === 'home' && <Footer onViewChange={setCurrentView} />}
      
      {/* Sync Status Indicator */}
      {currentUser && (
        <div className={`sync-indicator sync-${syncStatus}`}>
          {syncStatus === 'syncing' && '🔄 Syncing...'}
          {syncStatus === 'synced' && '✅ Synced'}
          {syncStatus === 'error' && '⚠️ Sync Error'}
        </div>
      )}
    </div>
  );
}

// Features Section Component
function FeaturesSection() {
  return (
    <section className="features-section">
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3 className="feature-title">AI-Powered Parsing</h3>
          <p className="feature-description">
            Intelligent product detection with smart unit recognition
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">☁️</div>
          <h3 className="feature-title">Cloud Sync</h3>
          <p className="feature-description">
            Your data syncs automatically across all devices
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3 className="feature-title">Recipe Manager</h3>
          <p className="feature-description">
            Save and reuse your favorite recipes instantly
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3 className="feature-title">Smart Validation</h3>
          <p className="feature-description">
            Review and validate items with confidence scoring
          </p>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer({ onViewChange }) {
  return (
    <footer className="footer-section">
      <div className="footer-content">
        <div className="footer-brand">
          <h3 className="footer-title">CARTSMASH</h3>
          <p className="footer-description">
            Smart grocery list management with AI-powered parsing
          </p>
        </div>
        
        <div className="footer-links">
          <div className="footer-link-group">
            <h4 className="footer-link-title">Legal</h4>
            <ul className="footer-link-list">
              <li>
                <button 
                  onClick={() => onViewChange('contact')} 
                  className="footer-link"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onViewChange('terms')} 
                  className="footer-link"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onViewChange('privacy')} 
                  className="footer-link"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
          
          <div className="footer-link-group">
            <h4 className="footer-link-title">Support</h4>
            <ul className="footer-link-list">
              <li>
                <a 
                  href="mailto:support@cartsmash.com" 
                  className="footer-link"
                >
                  support@cartsmash.com
                </a>
              </li>
              <li>
                <button 
                  onClick={() => onViewChange('contact')} 
                  className="footer-link"
                >
                  Help Center
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2025 CARTSMASH. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default App;