// client/src/App.js - CLEAN REFACTORED VERSION
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';

// Import styles
import './styles/cartsmash.css';

// Import components
import Header from './components/Header';
import GroceryListForm from './components/GroceryListForm';
import MyAccount from './components/MyAccount';
import RecipeManager from './components/RecipeManager';

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('home');
  
  // CENTRALIZED STATE MANAGEMENT
  const [currentCart, setCurrentCart] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  
  // Load all data on mount
  useEffect(() => {
    loadLocalData();
    loadDataFromServer();
  }, []);
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('cartsmash-current-cart', JSON.stringify(currentCart));
  }, [currentCart]);
  
  useEffect(() => {
    localStorage.setItem('cartsmash-lists', JSON.stringify(savedLists));
  }, [savedLists]);
  
  useEffect(() => {
    localStorage.setItem('cartsmash-recipes', JSON.stringify(savedRecipes));
  }, [savedRecipes]);
  
  useEffect(() => {
    localStorage.setItem('cartsmash-mealplans', JSON.stringify(mealPlans));
  }, [mealPlans]);
  
  const loadLocalData = () => {
    const loadedCart = JSON.parse(localStorage.getItem('cartsmash-current-cart') || '[]');
    const loadedLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
    const loadedRecipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
    const loadedMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    
    setCurrentCart(loadedCart);
    setSavedLists(loadedLists);
    setSavedRecipes(loadedRecipes);
    setMealPlans(loadedMealPlans);
  };
  
  const loadDataFromServer = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/user/data`);
      if (response.ok) {
        const data = await response.json();
        if (data.cart) setCurrentCart(data.cart);
        if (data.lists) setSavedLists(data.lists);
        if (data.recipes) setSavedRecipes(data.recipes);
      }
    } catch (error) {
      console.warn('Could not load from server, using local data');
    }
  };
  
  // CONNECTED FUNCTIONS
  const loadRecipeToCart = (recipe, merge = false) => {
    console.log('📖 Loading recipe to cart:', recipe.name);
    
    const ingredients = recipe.ingredients || '';
    const lines = ingredients.split('\n').filter(line => line.trim());
    
    const newItems = lines.map(line => {
      const match = line.match(/^(\d+(?:\/\d+)?|\d*\.?\d+)?\s*([a-zA-Z]*)\s*(.+)$/);
      let quantity = 1;
      let unit = 'each';
      let productName = line;
      
      if (match) {
        if (match[1]) quantity = parseFloat(match[1]);
        if (match[2]) unit = match[2] || 'each';
        productName = match[3] || line;
      }
      
      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productName,
        quantity,
        unit,
        category: 'other',
        confidence: 0.8,
        fromRecipe: recipe.name
      };
    });
    
    if (merge) {
      setCurrentCart(prev => [...prev, ...newItems]);
    } else {
      setCurrentCart(newItems);
    }
    
    setCurrentView('home');
    return newItems.length;
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
  
  const saveCartAsList = (name) => {
    if (currentCart.length === 0) {
      alert('Cart is empty!');
      return null;
    }
    
    const newList = {
      id: `list_${Date.now()}`,
      name: name || `Shopping List ${new Date().toLocaleDateString()}`,
      items: [...currentCart],
      itemCount: currentCart.length,
      createdAt: new Date().toISOString()
    };
    
    setSavedLists(prev => [...prev, newList]);
    console.log('💾 List saved:', newList.name);
    
    return newList;
  };
  
  const saveRecipe = (recipe) => {
    const newRecipe = {
      ...recipe,
      id: recipe.id || `recipe_${Date.now()}`,
      createdAt: recipe.createdAt || new Date().toISOString()
    };
    
    setSavedRecipes(prev => [...prev, newRecipe]);
    console.log('📝 Recipe saved:', newRecipe.name);
    
    return newRecipe;
  };
  
  const deleteList = (listId) => {
    setSavedLists(prev => prev.filter(l => l.id !== listId));
  };
  
  const deleteRecipe = (recipeId) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
  };
  
  return (
    <AuthProvider>
      <div className="app">
        <Header currentView={currentView} onViewChange={setCurrentView} />

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
            />
          ) : currentView === 'account' ? (
            <MyAccount 
              savedLists={savedLists}
              savedRecipes={savedRecipes}
              mealPlans={mealPlans}
              onRecipeSelect={(recipe) => {
                const itemsLoaded = loadRecipeToCart(recipe, false);
                alert(`✅ Loaded ${itemsLoaded} items from "${recipe.name}"`);
              }}
              onListSelect={(list) => {
                const itemsLoaded = loadListToCart(list, false);
                alert(`✅ Loaded ${itemsLoaded} items from "${list.name}"`);
              }}
              deleteList={deleteList}
              deleteRecipe={deleteRecipe}
            />
          ) : null}
        </main>
        
        {currentView === 'home' && <FeaturesSection />}
      </div>
    </AuthProvider>
  );
}

// Features Section Component
function FeaturesSection() {
  return (
    <section className="features-section">
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔢</div>
          <h3 className="feature-title">Smart Parsing</h3>
          <p className="feature-description">
            Handles fractions and detects containers automatically
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
          <div className="feature-icon">🏪</div>
          <h3 className="feature-title">Multi-Store</h3>
          <p className="feature-description">
            Shop at Kroger, Instacart, or export anywhere
          </p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">💾</div>
          <h3 className="feature-title">Connected</h3>
          <p className="feature-description">
            Everything works together seamlessly
          </p>
        </div>
      </div>
    </section>
  );
}

export default App;