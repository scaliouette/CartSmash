// client/src/components/MyAccount.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecipeManager from './RecipeManager';

function MyAccount({ savedRecipes, onRecipeSelect }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [shoppingLists, setShoppingLists] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [stats, setStats] = useState({
    totalLists: 0,
    totalMealPlans: 0,
    totalRecipes: 0,
    itemsParsed: 0
  });
  const [showRecipeManager, setShowRecipeManager] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;

    // Load from localStorage first
    const savedLists = JSON.parse(localStorage.getItem('cartsmash-lists') || '[]');
    const savedMealPlans = JSON.parse(localStorage.getItem('cartsmash-mealplans') || '[]');
    const savedRecipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
    
    setShoppingLists(savedLists);
    setMealPlans(savedMealPlans);
    setRecipes(savedRecipes);
    
    // Calculate stats
    const itemCount = savedLists.reduce((sum, list) => sum + (list.items?.length || 0), 0);
    setStats({
      totalLists: savedLists.length,
      totalMealPlans: savedMealPlans.length,
      totalRecipes: savedRecipes.length,
      itemsParsed: itemCount
    });

    // Try to load from server
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/user/data`, {
        headers: { 'user-id': currentUser.uid }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.lists) setShoppingLists(data.lists);
        if (data.mealPlans) setMealPlans(data.mealPlans);
        if (data.recipes) setRecipes(data.recipes);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleDeleteList = (listId) => {
    if (window.confirm('Delete this shopping list?')) {
      const updated = shoppingLists.filter(l => l.id !== listId);
      setShoppingLists(updated);
      localStorage.setItem('cartsmash-lists', JSON.stringify(updated));
      setStats(prev => ({ ...prev, totalLists: updated.length }));
    }
  };

  

  const handleLoadList = (list) => {
    if (onRecipeSelect) {
      // Convert list to recipe format for loading
      const recipeFormat = {
        name: list.name,
        ingredients: list.items.map(item => 
          `${item.quantity || 1} ${item.unit || ''} ${item.productName || item.itemName || item.name}`
        ).join('\n')
      };
      onRecipeSelect(recipeFormat);
    }
    if (!list?.items || list.items.length === 0) {
    alert('This list appears to be empty');
    return;
  }
  };



  const renderOverview = () => (
    <div style={styles.overviewContainer}>
      <div style={styles.welcomeSection}>
        <h2 style={styles.welcomeTitle}>Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}!</h2>
        <p style={styles.welcomeSubtitle}>Manage your shopping lists, meal plans, and recipes all in one place.</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛒</div>
          <div style={styles.statValue}>{stats.totalLists}</div>
          <div style={styles.statLabel}>Shopping Lists</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📅</div>
          <div style={styles.statValue}>{stats.totalMealPlans}</div>
          <div style={styles.statLabel}>Meal Plans</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📖</div>
          <div style={styles.statValue}>{stats.totalRecipes}</div>
          <div style={styles.statLabel}>Recipes</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>{stats.itemsParsed}</div>
          <div style={styles.statLabel}>Items Parsed</div>
        </div>
      </div>

      {shoppingLists.length > 0 && (
        <div style={styles.recentSection}>
          <h3 style={styles.sectionTitle}>Recent Shopping Lists</h3>
          <div style={styles.recentItems}>
            {shoppingLists.slice(0, 3).map(list => (
              <div key={list.id} style={styles.recentItem}>
                <div style={styles.recentItemInfo}>
                  <strong>{list.name || 'Untitled List'}</strong>
                  <span style={styles.itemCount}>{list.items?.length || 0} items</span>
                </div>
                <button 
                  onClick={() => handleLoadList(list)}
                  style={styles.loadButton}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderShoppingLists = () => (
    <div style={styles.listsContainer}>
      <h2 style={styles.pageTitle}>Shopping Lists</h2>
      
      {shoppingLists.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🛒</div>
          <p>No shopping lists saved yet</p>
          <p style={styles.emptyHint}>Create a list from the home page and save it here!</p>
        </div>
      ) : (
        <div style={styles.listGrid}>
          {shoppingLists.map(list => (
            <div key={list.id || list.createdAt} style={styles.listCard}>
              <h3 style={styles.listName}>{list.name || 'Untitled List'}</h3>
              <div style={styles.listMeta}>
                <span>{list.items?.length || 0} items</span>
                <span>•</span>
                <span>{new Date(list.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div style={styles.listPreview}>
                {list.items?.slice(0, 5).map((item, idx) => (
                  <div key={idx} style={styles.previewItem}>
                    • {item.quantity || 1} {item.unit || ''} {item.productName || item.itemName || item.name}
                  </div>
                ))}
                {list.items?.length > 5 && (
                  <div style={styles.moreItems}>...and {list.items.length - 5} more items</div>
                )}
              </div>
              
              <div style={styles.listActions}>
                <button 
                  onClick={() => handleLoadList(list)}
                  style={styles.primaryButton}
                >
                  🛒 Load List
                </button>
                <button 
                  onClick={() => handleDeleteList(list.id || list.createdAt)}
                  style={styles.deleteButton}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecipes = () => (
    <div style={styles.recipesContainer}>
      <div style={styles.recipesHeader}>
        <h2 style={styles.pageTitle}>My Recipes</h2>
        <button 
          onClick={() => setShowRecipeManager(true)}
          style={styles.addRecipeButton}
        >
          ➕ Add Recipe
        </button>
      </div>
      
      {recipes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📖</div>
          <p>No recipes saved yet</p>
          <p style={styles.emptyHint}>Save your favorite recipes to quickly add ingredients to your cart!</p>
        </div>
      ) : (
        <div style={styles.recipeGrid}>
          {recipes.map(recipe => (
            <div key={recipe.id} style={styles.recipeCard}>
              <h3 style={styles.recipeName}>{recipe.name}</h3>
              
              {recipe.category && (
                <span style={styles.recipeCategory}>{recipe.category}</span>
              )}
              
              <div style={styles.recipeIngredients}>
                <strong>Ingredients:</strong>
                <div style={styles.ingredientsList}>
                  {(recipe.ingredients || '').split('\n').slice(0, 4).map((ing, idx) => (
                    <div key={idx} style={styles.ingredient}>• {ing}</div>
                  ))}
                  {(recipe.ingredients || '').split('\n').length > 4 && (
                    <div style={styles.moreItems}>...and more</div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (onRecipeSelect) {
                    onRecipeSelect(recipe);
                  }
                }}
                style={styles.useRecipeButton}
              >
                🛒 Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My CARTSMASH Account</h1>
        <p style={styles.email}>{currentUser?.email}</p>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.tabActive : {})
          }}
        >
          🏠 Overview
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          style={{
            ...styles.tab,
            ...(activeTab === 'lists' ? styles.tabActive : {})
          }}
        >
          🛒 Shopping Lists
        </button>
        <button
          onClick={() => setActiveTab('mealplans')}
          style={{
            ...styles.tab,
            ...(activeTab === 'mealplans' ? styles.tabActive : {})
          }}
        >
          📅 Meal Plans
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          style={{
            ...styles.tab,
            ...(activeTab === 'recipes' ? styles.tabActive : {})
          }}
        >
          📖 Recipes
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'lists' && renderShoppingLists()}
        {activeTab === 'mealplans' && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📅</div>
            <p>Meal planning coming soon!</p>
          </div>
        )}
        {activeTab === 'recipes' && renderRecipes()}
      </div>

      {showRecipeManager && (
        <RecipeManager 
          onClose={() => setShowRecipeManager(false)}
          onRecipeSelect={(recipe) => {
            setShowRecipeManager(false);
            if (onRecipeSelect) {
              onRecipeSelect(recipe);
            }
          }}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },

  header: {
    padding: '32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },

  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold'
  },

  email: {
    margin: '8px 0 0 0',
    opacity: 0.9
  },

  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },

  tab: {
    flex: 1,
    padding: '16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },

  tabActive: {
    backgroundColor: 'white',
    color: '#1f2937',
    borderBottom: '2px solid #667eea',
    marginBottom: '-2px'
  },

  content: {
    padding: '32px',
    minHeight: '400px'
  },

  // Overview styles
  overviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },

  welcomeSection: {
    textAlign: 'center'
  },

  welcomeTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: '#1f2937'
  },

  welcomeSubtitle: {
    margin: 0,
    color: '#6b7280'
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },

  statCard: {
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },

  statIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },

  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },

  recentSection: {
    marginTop: '24px'
  },

  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    color: '#1f2937'
  },

  recentItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  recentItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  itemCount: {
    fontSize: '14px',
    color: '#6b7280'
  },

  loadButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  // Lists styles
  listsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  pageTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#1f2937'
  },

  listGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },

  listCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  listName: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#1f2937'
  },

  listMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },

  listPreview: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '16px'
  },

  previewItem: {
    padding: '2px 0'
  },

  moreItems: {
    fontStyle: 'italic',
    color: '#9ca3af',
    marginTop: '4px'
  },

  listActions: {
    display: 'flex',
    gap: '8px'
  },

  primaryButton: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Recipes styles
  recipesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  recipesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  addRecipeButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },

  recipeCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  recipeName: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#1f2937'
  },

  recipeCategory: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#ddd6fe',
    color: '#6b21a8',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '12px'
  },

  recipeIngredients: {
    marginBottom: '16px'
  },

  ingredientsList: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#4b5563'
  },

  ingredient: {
    padding: '2px 0'
  },

  useRecipeButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  },

  emptyHint: {
    fontSize: '14px',
    marginTop: '8px',
    color: '#9ca3af'
  }
};

export default MyAccount;