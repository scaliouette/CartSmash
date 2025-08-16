// client/src/components/MyAccount.js - WITH MEAL PLANS FEATURE
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
  deleteRecipe,
  onMealPlanUpdate 
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState(null);
  const [localMealPlans, setLocalMealPlans] = useState([]);
  
  // Load meal plans from localStorage or props
  useEffect(() => {
    const savedMealPlans = localStorage.getItem('cartsmash-mealplans');
    if (savedMealPlans) {
      setLocalMealPlans(JSON.parse(savedMealPlans));
    } else if (mealPlans) {
      setLocalMealPlans(mealPlans);
    }
  }, [mealPlans]);

  // Calculate stats
  const stats = {
    totalLists: savedLists?.length || 0,
    totalMealPlans: localMealPlans?.length || 0,
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

  const handleDeleteMealPlan = (planId) => {
    const updatedPlans = localMealPlans.filter(p => p.id !== planId);
    setLocalMealPlans(updatedPlans);
    localStorage.setItem('cartsmash-mealplans', JSON.stringify(updatedPlans));
    if (onMealPlanUpdate) {
      onMealPlanUpdate(updatedPlans);
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
      <div style={styles.mealPlansHeader}>
        <h2 style={styles.pageTitle}>Meal Plans</h2>
        <button 
          onClick={() => setShowMealPlanModal(true)}
          style={styles.addMealPlanButton}
        >
          ➕ Create Meal Plan
        </button>
      </div>
      
      {!localMealPlans || localMealPlans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <p>No meal plans yet</p>
          <p style={styles.emptyHint}>Create a meal plan to organize your weekly shopping!</p>
          <button 
            onClick={() => setShowMealPlanModal(true)}
            style={styles.createFirstPlanButton}
          >
            Create Your First Meal Plan
          </button>
        </div>
      ) : (
        <div style={styles.mealPlanGrid}>
          {localMealPlans.map(plan => (
            <div key={plan.id} style={styles.mealPlanCard}>
              <div style={styles.mealPlanHeader}>
                <h3 style={styles.mealPlanName}>{plan.name}</h3>
                <span style={styles.mealPlanDate}>
                  {plan.weekOf ? `Week of ${new Date(plan.weekOf).toLocaleDateString()}` : 
                   new Date(plan.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div style={styles.mealPlanDays}>
                {plan.days && Object.entries(plan.days).map(([day, meals]) => (
                  <div key={day} style={styles.daySection}>
                    <strong style={styles.dayName}>{day}:</strong>
                    <div style={styles.dayMeals}>
                      {meals.breakfast && <span style={styles.mealTag}>🌅 Breakfast</span>}
                      {meals.lunch && <span style={styles.mealTag}>☀️ Lunch</span>}
                      {meals.dinner && <span style={styles.mealTag}>🌙 Dinner</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={styles.mealPlanStats}>
                <span>📦 {plan.totalItems || 0} items</span>
                <span>🍽️ {plan.totalMeals || 0} meals</span>
              </div>
              
              <div style={styles.mealPlanActions}>
                <button 
                  onClick={() => {
                    if (onListSelect && plan.shoppingList) {
                      onListSelect(plan.shoppingList);
                    }
                  }}
                  style={styles.loadMealPlanButton}
                >
                  🛒 Load Shopping List
                </button>
                <button 
                  onClick={() => {
                    setEditingMealPlan(plan);
                    setShowMealPlanModal(true);
                  }}
                  style={styles.editMealPlanButton}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDeleteMealPlan(plan.id)}
                  style={styles.deleteMealPlanButton}
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

      {showMealPlanModal && (
        <MealPlanModal
          isOpen={showMealPlanModal}
          onClose={() => {
            setShowMealPlanModal(false);
            setEditingMealPlan(null);
          }}
          editingPlan={editingMealPlan}
          savedRecipes={savedRecipes}
          onSave={(plan) => {
            const updatedPlans = editingMealPlan 
              ? localMealPlans.map(p => p.id === editingMealPlan.id ? plan : p)
              : [...localMealPlans, plan];
            
            setLocalMealPlans(updatedPlans);
            localStorage.setItem('cartsmash-mealplans', JSON.stringify(updatedPlans));
            if (onMealPlanUpdate) {
              onMealPlanUpdate(updatedPlans);
            }
            setShowMealPlanModal(false);
            setEditingMealPlan(null);
          }}
        />
      )}
    </div>
  );
}

// Meal Plan Modal Component
function MealPlanModal({ isOpen, onClose, editingPlan, savedRecipes, onSave }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  const [planName, setPlanName] = useState(editingPlan?.name || '');
  const [weekOf, setWeekOf] = useState(editingPlan?.weekOf || new Date().toISOString().split('T')[0]);
  const [mealSelections, setMealSelections] = useState(editingPlan?.days || {});
  const [shoppingList, setShoppingList] = useState(editingPlan?.shoppingList || { items: [] });

  const handleMealToggle = (day, mealType, recipe = null) => {
    setMealSelections(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe || (prev[day]?.[mealType] ? null : { name: `${mealType} for ${day}` })
      }
    }));
  };

  const handleSave = () => {
    // Calculate total items and meals
    let totalMeals = 0;
    let allItems = [];
    
    Object.values(mealSelections).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal) {
          totalMeals++;
          if (meal.items) {
            allItems = [...allItems, ...meal.items];
          }
        }
      });
    });

    const plan = {
      id: editingPlan?.id || `mealplan_${Date.now()}`,
      name: planName || `Meal Plan - ${new Date(weekOf).toLocaleDateString()}`,
      weekOf,
      days: mealSelections,
      totalMeals,
      totalItems: allItems.length,
      shoppingList: {
        ...shoppingList,
        items: allItems,
        name: `${planName || 'Meal Plan'} - Shopping List`
      },
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(plan);
  };

  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>
            {editingPlan ? '✏️ Edit Meal Plan' : '📅 Create Meal Plan'}
          </h2>
          <button onClick={onClose} style={modalStyles.closeButton}>×</button>
        </div>

        <div style={modalStyles.content}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Plan Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g., Weekly Family Meals"
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Week Starting</label>
            <input
              type="date"
              value={weekOf}
              onChange={(e) => setWeekOf(e.target.value)}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.weekGrid}>
            {daysOfWeek.map(day => (
              <div key={day} style={modalStyles.dayCard}>
                <h3 style={modalStyles.dayTitle}>{day}</h3>
                <div style={modalStyles.meals}>
                  {mealTypes.map(mealType => (
                    <div key={mealType} style={modalStyles.mealRow}>
                      <label style={modalStyles.mealLabel}>
                        <input
                          type="checkbox"
                          checked={!!mealSelections[day]?.[mealType]}
                          onChange={() => handleMealToggle(day, mealType)}
                          style={modalStyles.checkbox}
                        />
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </label>
                      {mealSelections[day]?.[mealType] && (
                        <select
                          style={modalStyles.recipeSelect}
                          value={mealSelections[day][mealType]?.id || ''}
                          onChange={(e) => {
                            const recipe = savedRecipes?.find(r => r.id === e.target.value);
                            handleMealToggle(day, mealType, recipe);
                          }}
                        >
                          <option value="">Custom meal</option>
                          {savedRecipes?.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={modalStyles.summary}>
            <h3>Summary</h3>
            <p>Total Meals: {Object.values(mealSelections).reduce((sum, day) => 
              sum + Object.values(day || {}).filter(meal => meal).length, 0
            )}</p>
          </div>

          <div style={modalStyles.actions}>
            <button onClick={handleSave} style={modalStyles.saveButton}>
              💾 {editingPlan ? 'Update' : 'Save'} Meal Plan
            </button>
            <button onClick={onClose} style={modalStyles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      </div>
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

  // Meal Plans specific styles
  mealPlansContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  mealPlansHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  addMealPlanButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  createFirstPlanButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '20px'
  },

  mealPlanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },

  mealPlanCard: {
    padding: '20px',
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
  },

  mealPlanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '16px'
  },

  mealPlanName: {
    margin: 0,
    fontSize: '20px',
    color: '#1f2937',
    fontWeight: 'bold'
  },

  mealPlanDate: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: 'white',
    padding: '4px 8px',
    borderRadius: '4px'
  },

  mealPlanDays: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },

  daySection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  dayName: {
    fontSize: '14px',
    color: '#374151',
    minWidth: '80px'
  },

  dayMeals: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap'
  },

  mealTag: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontWeight: '500'
  },

  mealPlanStats: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
    borderTop: '1px solid #e0e7ff',
    borderBottom: '1px solid #e0e7ff',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4b5563'
  },

  mealPlanActions: {
    display: 'flex',
    gap: '8px'
  },

  loadMealPlanButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  editMealPlanButton: {
    padding: '10px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  deleteMealPlanButton: {
    padding: '10px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Other existing styles...
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

// Modal Styles
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },

  header: {
    padding: '24px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    margin: 0,
    fontSize: '24px',
    color: '#1f2937'
  },

  closeButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280'
  },

  content: {
    padding: '24px'
  },

  formGroup: {
    marginBottom: '20px'
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },

  input: {
    width: '100%',
    padding: '10px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px'
  },

  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '24px'
  },

  dayCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  dayTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  meals: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  mealRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  mealLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4b5563'
  },

  checkbox: {
    cursor: 'pointer'
  },

  recipeSelect: {
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    fontSize: '12px',
    marginLeft: '20px'
  },

  summary: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    marginTop: '24px',
    marginBottom: '20px'
  },

  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },

  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default MyAccount;