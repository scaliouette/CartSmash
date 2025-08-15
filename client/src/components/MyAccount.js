// client/src/components/MyAccount.js - CONNECTED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecipeManager from './RecipeManager';

function MyAccount({ 
  savedLists, 
  savedRecipes, 
  mealPlans,
  onRecipeSelect, 
  onListSelect,
  deleteList,
  deleteRecipe 
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  
  // Calculate stats
  const stats = {
    totalLists: savedLists?.length || 0,
    totalMealPlans: mealPlans?.length || 0,
    totalRecipes: savedRecipes?.length || 0,
    itemsParsed: savedLists?.reduce((sum, list) => sum + (list.items?.length || 0), 0) || 0
  };

  const handleLoadList = (list) => {
    if (onListSelect) {
      onListSelect(list);
    }
  };

  const handleLoadRecipe = (recipe) => {
    if (onRecipeSelect) {
      onRecipeSelect(recipe);
    }
  };

  const handleDeleteList = (listId, listName) => {
    if (window.confirm(`Delete list "${listName}"?`)) {
      deleteList(listId);
    }
  };

  const handleDeleteRecipe = (recipeId, recipeName) => {
    if (window.confirm(`Delete recipe "${recipeName}"?`)) {
      deleteRecipe(recipeId);
    }
  };

  const renderOverview = () => (
    <div style={styles.overviewContainer}>
      <div style={styles.welcomeSection}>
        <h2 style={styles.welcomeTitle}>
          Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}!
        </h2>
        <p style={styles.welcomeSubtitle}>
          Manage your shopping lists, meal plans, and recipes all in one place.
        </p>
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

      {savedLists && savedLists.length > 0 && (
        <div style={styles.recentSection}>
          <h3 style={styles.sectionTitle}>Recent Shopping Lists</h3>
          <div style={styles.recentItems}>
            {savedLists.slice(0, 3).map(list => (
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

      {savedRecipes && savedRecipes.length > 0 && (
        <div style={styles.recentSection}>
          <h3 style={styles.sectionTitle}>Recent Recipes</h3>
          <div style={styles.recentItems}>
            {savedRecipes.slice(0, 3).map(recipe => (
              <div key={recipe.id} style={styles.recentItem}>
                <div style={styles.recentItemInfo}>
                  <strong>{recipe.name || 'Untitled Recipe'}</strong>
                  <span style={styles.itemCount}>
                    {recipe.ingredients ? recipe.ingredients.split('\n').filter(l => l.trim()).length : 0} ingredients
                  </span>
                </div>
                <button 
                  onClick={() => handleLoadRecipe(recipe)}
                  style={styles.loadButton}
                >
                  Use
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
      
      {!savedLists || savedLists.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🛒</div>
          <p>No shopping lists saved yet</p>
          <p style={styles.emptyHint}>Create a list from the home page and save it here!</p>
        </div>
      ) : (
        <div style={styles.listGrid}>
          {savedLists.map(list => (
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
                  onClick={() => handleDeleteList(list.id || list.createdAt, list.name)}
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
      
      {!savedRecipes || savedRecipes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📖</div>
          <p>No recipes saved yet</p>
          <p style={styles.emptyHint}>Save your favorite recipes to quickly add ingredients to your cart!</p>
        </div>
      ) : (
        <div style={styles.recipeGrid}>
          {savedRecipes.map(recipe => (
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
              
              <div style={styles.recipeActions}>
                <button 
                  onClick={() => handleLoadRecipe(recipe)}
                  style={styles.useRecipeButton}
                >
                  🛒 Add to Cart
                </button>
                <button 
                  onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                  style={styles.deleteRecipeButton}
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

  const renderMealPlans = () => (
    <div style={styles.mealPlansContainer}>
      <h2 style={styles.pageTitle}>Meal Plans</h2>
      
      {!mealPlans || mealPlans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <p>No meal plans yet</p>
          <p style={styles.emptyHint}>Meal planning feature coming soon!</p>
        </div>
      ) : (
        <div style={styles.mealPlanGrid}>
          {mealPlans.map(plan => (
            <div key={plan.id} style={styles.mealPlanCard}>
              <h3>{plan.name}</h3>
              <p>{plan.items?.length || 0} items</p>
              <button onClick={() => {
                if (onListSelect) {
                  onListSelect(plan);
                }
              }}>
                Load Plan
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
          🛒 Shopping Lists ({stats.totalLists})
        </button>
        <button
          onClick={() => setActiveTab('mealplans')}
          style={{
            ...styles.tab,
            ...(activeTab === 'mealplans' ? styles.tabActive : {})
          }}
        >
          📅 Meal Plans ({stats.totalMealPlans})
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          style={{
            ...styles.tab,
            ...(activeTab === 'recipes' ? styles.tabActive : {})
          }}
        >
          📖 Recipes ({stats.totalRecipes})
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'lists' && renderShoppingLists()}
        {activeTab === 'mealplans' && renderMealPlans()}
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

  recipeActions: {
    display: 'flex',
    gap: '8px'
  },

  useRecipeButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  deleteRecipeButton: {
    padding: '10px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Meal Plans styles
  mealPlansContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  mealPlanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },

  mealPlanCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
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