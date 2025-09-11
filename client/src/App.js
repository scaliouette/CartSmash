// client/src/App.js - COMPLETE FIXED VERSION - Emergency Fix 2025-09-02
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SmashCartProvider } from './contexts/SmashCartContext';
import userDataService from './services/userDataService';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import './styles/cartsmash.css';
import Header from './components/Header';
import GroceryListForm from './components/GroceryListForm';
import MyAccount from './components/MyAccount';
import StoresPage from './components/StoresPage';
import Contact from './components/Contact';
import Terms from './components/Terms';
import Privacy from './components/privacy';
import Footer from './components/Footer';

console.log('📦 App.js module loading...');
console.log('✅ Core imports loaded successfully');
console.log('🎨 Loading CSS styles...');
console.log('🧩 Loading components...');
console.log('✅ All components loaded successfully');

// Environment debugging
console.group('🌍 Environment Information');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('Location:', window.location.href);
console.log('User Agent:', navigator.userAgent);
console.log('Platform:', navigator.platform);
console.log('Build timestamp:', new Date().toISOString());
console.groupEnd();

// Main App Component
function App() {
  console.log('🚀 App component initializing...');
  
  const [currentView, setCurrentView] = useState('home');
  
  // CENTRALIZED STATE MANAGEMENT
  const [currentCart, setCurrentCart] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [parsedRecipes, setParsedRecipes] = useState([]); // Parsed recipes from AI (persists across screens)
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
          parsedRecipes={parsedRecipes}
          setParsedRecipes={setParsedRecipes}
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
  parsedRecipes, setParsedRecipes,
  mealPlans, setMealPlans,
  isLoading, setIsLoading,
  syncStatus, setSyncStatus
}) {
  console.log('🔧 AppContent component rendering, currentView:', currentView);
  
  const { currentUser } = useAuth();
  console.log('👤 Current user state:', currentUser ? 'authenticated' : 'not authenticated');
  
  // 🔒 Single Source of Truth for the cart:
  // 'firestore' (default) | 'local' (only use 'local' for offline demos)
  const CART_AUTHORITY = process.env.REACT_APP_CART_AUTHORITY || 'firestore';
  const AUTOSAVE_ENABLED = (process.env.REACT_APP_CART_AUTOSAVE || 'true') !== 'false';
  
  console.log('🔑 Cart Authority:', CART_AUTHORITY);
  console.log('💾 Auto-save Enabled:', AUTOSAVE_ENABLED);
  
  // Enhanced hydration guard refs
  const cartHydratedRef = useRef(false);
  const hydrationInProgress = useRef(false);
  const lastUserActionTimestamp = useRef(Date.now());
  
  // Use ref to access current cart length without dependency issues
  const currentCartRef = useRef(currentCart);
  currentCartRef.current = currentCart;
  
  // Protected cart setter that tracks user actions
  const setCurrentCartWithTracking = useCallback((newCart, isSystemAction = false) => {
    if (typeof newCart === 'function') {
      setCurrentCart(prevCart => {
        const result = newCart(prevCart);
        // Only update timestamp if cart actually changed (deletion/addition) and it's a user action
        if (result.length !== prevCart.length && !isSystemAction) {
          lastUserActionTimestamp.current = Date.now();
          console.log('👤 User action detected - cart size changed:', prevCart.length, '->', result.length);
        }
        return result;
      });
    } else {
      setCurrentCart(newCart);
      if (!isSystemAction) {
        lastUserActionTimestamp.current = Date.now();
        console.log('👤 User action detected - cart set directly');
      } else {
        console.log('🤖 System action - cart set without timestamp update');
      }
    }
  }, [setCurrentCart]);

  const loadLocalData = useCallback(() => {
    try {
      // ✅ REMOVED: All localStorage reads - using session state only for unauthenticated users
      console.log('🔄 App.js - Using session state only (no localStorage persistence):', {
        cartAuthority: CART_AUTHORITY
      });
      
      // No localStorage reads - session state only
      setCurrentCartWithTracking([], true); // System action - initial load
      setSavedLists([]);
      // ✅ REMOVED: No more localStorage for recipes - will be loaded from Firestore for auth users
      console.log('✅ Recipes will be loaded from Firestore for authenticated users');
      
      console.log('✅ Loaded data from localStorage');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, [setCurrentCartWithTracking, setSavedLists, CART_AUTHORITY]);

  const loadFirebaseData = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      
      await userDataService.init();
      
      // Load all data from Firebase
      const [firebaseLists, firebaseRecipes, firebaseMealPlans] = await Promise.all([
        userDataService.getShoppingLists().catch(() => []),
        userDataService.getRecipes().catch(() => []),
        userDataService.getMealPlans().catch(() => [])
      ]);
      
      // 🔒 Do NOT set currentCart here. Cart now hydrates from carts/{uid} only.
      
      setSavedLists(firebaseLists);
      setSavedRecipes(firebaseRecipes);
      setMealPlans(firebaseMealPlans);
      
      setSyncStatus('synced');
      console.log('✅ Successfully synced with Firebase');
    } catch (error) {
      console.error('Firebase sync error:', error);
      setSyncStatus('error');
    }
  }, [setSyncStatus, setSavedLists, setSavedRecipes, setMealPlans]);
  
  // Enhanced cart hydration with race condition protection
  const hydrateCartFromFirestore = useCallback(async () => {
    // Multiple guards to prevent re-hydration
    if (cartHydratedRef.current) {
      console.log('🚫 Hydration already completed, skipping');
      return;
    }
    if (hydrationInProgress.current) {
      console.log('🚫 Hydration in progress, skipping duplicate call');
      return;
    }
    if (CART_AUTHORITY !== 'firestore') return;
    if (!currentUser) return;

    hydrationInProgress.current = true;
    console.log('🔄 Starting cart hydration for user:', currentUser.uid);

    try {
      const ref = doc(db, 'carts', currentUser.uid);
      const snap = await getDoc(ref);
      
      // Check if user performed actions while we were fetching
      const timeSinceLastAction = Date.now() - lastUserActionTimestamp.current;
      if (timeSinceLastAction < 1000) {
        console.log('🚫 User action detected during hydration, aborting to preserve user changes');
        hydrationInProgress.current = false;
        return;
      }
      
      if (snap.exists()) {
        const items = Array.isArray(snap.data()?.items) ? snap.data().items : [];
        setCurrentCartWithTracking(items, true); // Mark as system action
        console.log('🛒 Hydrated cart from carts/{uid}:', items.length, 'items');
      } else {
        // Create empty doc so future saves are clean
        await setDoc(ref, { items: [], updatedAt: serverTimestamp() }, { merge: false });
        setCurrentCartWithTracking([], true); // Mark as system action
        console.log('🆕 Created empty carts/{uid} document');
      }
      cartHydratedRef.current = true;
    } catch (e) {
      console.error('Cart hydration failed:', e);
    } finally {
      hydrationInProgress.current = false;
    }
  }, [CART_AUTHORITY, currentUser, setCurrentCartWithTracking]);
  
  // ✅ NEW: Load recipes from Firestore for authenticated users
  const loadRecipesFromFirestore = useCallback(async () => {
    if (!currentUser) {
      // Only clear recipes if we haven't loaded them yet (prevent data loss on auth state changes)
      if (savedRecipes.length === 0) {
        setSavedRecipes([]);
        console.log('👤 User not authenticated - no recipes to load');
      } else {
        console.log('👤 User not authenticated - keeping existing recipes in memory');
      }
      return;
    }

    try {
      const recipes = await userDataService.getRecipes();
      setSavedRecipes(recipes);
      console.log(`✅ Loaded ${recipes.length} recipes from Firestore for user ${currentUser.uid}`);
    } catch (error) {
      console.error('❌ Failed to load recipes from Firestore:', error);
      // Keep current session recipes on error
      console.log('🔒 Keeping existing recipes in memory due to load error');
    }
  }, [currentUser, setSavedRecipes, savedRecipes.length]);
  
  // Load all data from localStorage first, then Firebase
  const loadAllData = useCallback(async () => {
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
  }, [currentUser, setIsLoading, setSyncStatus, loadLocalData, loadFirebaseData]);
  
  const saveCartToFirebase = useCallback(async (forceImmediate = false) => {
    if (!currentUser) return;
    
    // ⚠️ Only auto-save if explicitly enabled
    if (!AUTOSAVE_ENABLED) {
      console.log('🚫 Auto-save disabled - skipping Firebase save');
      return;
    }
    
    try {
      // Save to carts/{uid} (replace write so deletions stick)
      // ⚡ Skip hydration check for immediate saves (deletions)
      if (!cartHydratedRef.current && !forceImmediate) {
        console.log('⏸️ Skipping save until cart hydration completes');
        return;
      }
      const ref = doc(db, 'carts', currentUser.uid);
      await setDoc(
        ref,
        { items: currentCart, updatedAt: serverTimestamp() },
        { merge: false } // 🔥 replace entire array; no re-merge ghosts
      );
      console.log('✅ Cart saved to carts/{uid}');
      
      // Also save to localStorage as backup ONLY if localStorage is cart authority
      if (CART_AUTHORITY === 'local') {
        console.log('💾 Cart also saved to localStorage (authority)');
      }
      
    } catch (error) {
      console.error('Error saving cart to Firebase:', error);
      // Fallback to localStorage on error ONLY if localStorage is cart authority
      if (CART_AUTHORITY === 'local') {
        try {
          console.log('💾 Cart saved locally as fallback');
        } catch (localError) {
          console.error('Local save also failed:', localError);
        }
      }
    }
  }, [currentUser, currentCart, AUTOSAVE_ENABLED, CART_AUTHORITY]);
  
  // Expose refresh function globally for components
  useEffect(() => {
    window.refreshAccountData = loadAllData;
    
    // Add debug function to clear Firestore cart
    window.debugCart = {
      ...(window.debugCart || {}),
      clearFirestoreCart: async () => {
        if (!currentUser) return;
        await setDoc(doc(db, 'carts', currentUser.uid), { items: [], updatedAt: serverTimestamp() }, { merge: false });
        setCurrentCartWithTracking([], true); // System action - debug clear
        console.log('🧼 carts/{uid} cleared');
      }
    };
    
    return () => {
      delete window.refreshAccountData;
    };
  }, [loadAllData, currentUser, setCurrentCart, setCurrentCartWithTracking]);
  
  // Load all data on mount and when user changes
  useEffect(() => {
    loadAllData();
    // Hydrate the cart once from carts/{uid}
    hydrateCartFromFirestore();
    // Load recipes from Firestore for authenticated users
    loadRecipesFromFirestore();
  }, [loadAllData, hydrateCartFromFirestore, loadRecipesFromFirestore]);

  // ✅ NEW: Ensure data consistency when switching views
  useEffect(() => {
    console.log(`📍 View changed to: ${currentView}`);
    console.log(`📊 Current data state:`, {
      recipes: savedRecipes.length,
      cartItems: currentCart.length,
      user: currentUser?.uid || 'not authenticated'
    });
  }, [currentView, savedRecipes.length, currentCart.length, currentUser?.uid]);
  
  // Auto-save cart to Firebase when it changes (debounced)
  useEffect(() => {
    // ✅ FIXED: Save empty carts too - prevents deleted items from reappearing
    // ⚡ IMMEDIATE save for deletions to prevent hydration race conditions
    const wasLarger = currentCartRef.current && currentCartRef.current.length > currentCart.length;
    
    if (wasLarger) {
      // Immediate save on deletion - don't wait for debounce
      console.log('🚨 Deletion detected - immediate save to prevent hydration race');
      saveCartToFirebase(true); // Pass forceImmediate = true
    } else {
      // Regular debounced save for other changes
      const saveTimer = setTimeout(() => {
        saveCartToFirebase();
      }, 2000); // 2 second debounce
      
      return () => clearTimeout(saveTimer);
    }
  }, [currentCart, currentUser, saveCartToFirebase, setCurrentCartWithTracking]);
  
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
        // Update cart state
        setCurrentCart(data.cart);
        
        // Only save to localStorage if it's the cart authority
        if (CART_AUTHORITY === 'local') {
          try {
            console.log('💾 Recipe cart saved to localStorage (authority)');
          } catch (error) {
            console.error('Failed to save recipe cart to localStorage:', error);
          }
        }
        
        // Navigate to home with small delay
        setTimeout(() => {
          setCurrentView('home');
        }, 50);
        
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
    
    let newCart;
    if (merge) {
      newCart = [...currentCart, ...list.items];
    } else {
      newCart = list.items;
    }
    
    // Update cart state
    setCurrentCart(newCart);
    
    // Only save to localStorage if it's the cart authority
    if (CART_AUTHORITY === 'local') {
      try {
        console.log('💾 Cart saved to localStorage (authority) during list load');
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
    
    // Navigate to home and preserve cart
    setTimeout(() => {
      setCurrentView('home');
    }, 50); // Small delay to ensure state is updated
    
    return list.items.length;
  };
  
  const saveCartAsList = async (name, items = null) => {
    const itemsToSave = items || currentCart;
    
    if (!itemsToSave || itemsToSave.length === 0) {
      alert('No items to save!');
      return null;
    }
    
    const newList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Shopping List ${new Date().toLocaleDateString()}`,
      items: [...itemsToSave],
      itemCount: itemsToSave.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest'
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
      // Check if recipe already exists to prevent duplicates
      const existingRecipeIndex = savedRecipes.findIndex(r => r.id === newRecipe.id);
      
      let updatedRecipes;
      if (existingRecipeIndex >= 0) {
        // Update existing recipe
        updatedRecipes = [...savedRecipes];
        updatedRecipes[existingRecipeIndex] = newRecipe;
        console.log('🔄 Updating existing recipe:', newRecipe.title || newRecipe.name);
      } else {
        // Add new recipe
        updatedRecipes = [...savedRecipes, newRecipe];
        console.log('➕ Adding new recipe:', newRecipe.title || newRecipe.name);
      }
      
      // Update session state
      setSavedRecipes(updatedRecipes);
      
      // Save to Firestore only if user is authenticated
      if (currentUser) {
        await userDataService.saveRecipe(newRecipe);
        console.log('✅ Recipe saved to Firestore');
      } else {
        console.log('👤 User not authenticated - recipe saved to session only');
      }
      
      console.log('📝 Recipe saved successfully:', newRecipe.title || newRecipe.name);
      return newRecipe;
      
    } catch (error) {
      console.error('❌ Error saving recipe:', error);
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
      
      console.log('📅 Meal plan saved:', mealPlan.name);
      return mealPlan;
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Failed to save meal plan to cloud, but saved locally');
      return mealPlan;
    }
  };
  
  
  return (
    <div className="app">
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView}
        syncStatus={syncStatus}
      />

      <main className="main">
        {currentView === 'home' ? (
          <>
            <GroceryListForm 
              currentCart={currentCart}
              setCurrentCart={setCurrentCart}
              savedRecipes={savedRecipes}
              setSavedRecipes={setSavedRecipes}
              parsedRecipes={parsedRecipes}
              setParsedRecipes={setParsedRecipes}
              saveCartAsList={saveCartAsList}
              saveRecipe={saveRecipe}
              loadRecipeToCart={loadRecipeToCart}
              saveMealPlan={saveMealPlan}
              // NOTE: currentUser removed - GroceryListForm gets it from useAuth()
            />
            <FeaturesSection />
          </>
        ) : currentView === 'account' ? (
          <MyAccount 
            savedLists={savedLists}
            savedRecipes={savedRecipes}
            setSavedRecipes={setSavedRecipes}
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
            onNavigateHome={() => setCurrentView('home')}
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
      
      {/* Footer - appears on home page only */}
      <Footer onViewChange={setCurrentView} currentView={currentView} />
      
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


export default App;