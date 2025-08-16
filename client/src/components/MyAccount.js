// client/src/components/MyAccount.js - FIXED WITH MEAL PLAN PERSISTENCE & LIST EDITING
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecipeManager from './RecipeManager';
import userDataService from '../services/userDataService';

function MyAccount({ 
  savedLists, 
  savedRecipes, 
  mealPlans,
  onRecipeSelect, 
  onListSelect,
  deleteList,
  deleteRecipe,
  onMealPlanUpdate,
  onListUpdate // New prop for updating lists
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState(null);
  const [localMealPlans, setLocalMealPlans] = useState([]);
  const [editingList, setEditingList] = useState(null);
  const [showListEditModal, setShowListEditModal] = useState(false);
  
  // Load meal plans from props or localStorage
  useEffect(() => {
    if (mealPlans && mealPlans.length > 0) {
      setLocalMealPlans(mealPlans);
    } else {
      const savedMealPlans = localStorage.getItem('cartsmash-mealplans');
      if (savedMealPlans) {
        setLocalMealPlans(JSON.parse(savedMealPlans));
      }
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

  const handleEditList = (list) => {
    setEditingList(list);
    setShowListEditModal(true);
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

  const handleDeleteMealPlan = async (planId, planName) => {
    if (window.confirm(`Delete meal plan "${planName}"?`)) {
      try {
        // Delete from Firebase if user is authenticated
        if (currentUser) {
          await userDataService.deleteMealPlan(planId);
          console.log('✅ Meal plan deleted from Firebase');
        }
        
        // Update local state
        const updatedPlans = localMealPlans.filter(p => p.id !== planId);
        setLocalMealPlans(updatedPlans);
        localStorage.setItem('cartsmash-mealplans', JSON.stringify(updatedPlans));
        
        if (onMealPlanUpdate) {
          onMealPlanUpdate(updatedPlans);
        }
      } catch (error) {
        console.error('Error deleting meal plan:', error);
        alert('Failed to delete meal plan from cloud');
      }
    }
  };

  const handleGenerateShoppingList = async (mealPlan) => {
    try {
      if (currentUser) {
        const result = await userDataService.generateShoppingListFromMealPlan(mealPlan.id);
        if (result.items) {
          if (onListSelect) {
            onListSelect({ items: result.items, name: `Shopping for ${mealPlan.name}` });
          }
          alert(`✅ Generated shopping list with ${result.items.length} items`);
        }
      } else {
        // Fallback for non-authenticated users
        if (mealPlan.shoppingList && onListSelect) {
          onListSelect(mealPlan.shoppingList);
        }
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list');
    }
  };

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
                  🛒 Load
                </button>
                <button 
                  onClick={() => handleEditList(list)}
                  style={styles.editButton}
                >
                  ✏️ Edit
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
                      {meals.breakfast && <span style={styles.mealTag}>🌅 B</span>}
                      {meals.lunch && <span style={styles.mealTag}>☀️ L</span>}
                      {meals.dinner && <span style={styles.mealTag}>🌙 D</span>}
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
                  onClick={() => handleGenerateShoppingList(plan)}
                  style={styles.loadMealPlanButton}
                >
                  🛒 Generate List
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
                  onClick={() => handleDeleteMealPlan(plan.id, plan.name)}
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

  // Other render methods remain the same...
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
          onSave={async (plan) => {
            try {
              // Save to Firebase if user is authenticated
              if (currentUser) {
                await userDataService.saveMealPlan(plan);
                console.log('✅ Meal plan saved to Firebase');
              }
              
              // Update local state
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
              alert(`✅ Meal plan "${plan.name}" saved successfully!`);
              
            } catch (error) {
              console.error('Error saving meal plan:', error);
              alert('Failed to save meal plan to cloud, but saved locally');
            }
          }}
        />
      )}

      {showListEditModal && editingList && (
        <ListEditModal
          list={editingList}
          onClose={() => {
            setShowListEditModal(false);
            setEditingList(null);
          }}
          onSave={async (updatedList) => {
            try {
              // Update in Firebase if user is authenticated
              if (currentUser) {
                await userDataService.updateShoppingList(updatedList.id, updatedList);
                console.log('✅ List updated in Firebase');
              }
              
              // Update local state via parent
              if (onListUpdate) {
                onListUpdate(updatedList);
              }
              
              setShowListEditModal(false);
              setEditingList(null);
              alert(`✅ List "${updatedList.name}" updated successfully!`);
              
            } catch (error) {
              console.error('Error updating list:', error);
              alert('Failed to update list in cloud');
            }
          }}
        />
      )}
    </div>
  );
}

// List Edit Modal Component
function ListEditModal({ list, onClose, onSave }) {
  const [editedList, setEditedList] = useState({
    ...list,
    items: [...(list.items || [])]
  });
  const [newItemText, setNewItemText] = useState('');

  const handleUpdateItem = (index, field, value) => {
    const updatedItems = [...editedList.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setEditedList({ ...editedList, items: updatedItems });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = editedList.items.filter((_, i) => i !== index);
    setEditedList({ ...editedList, items: updatedItems });
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: `item_${Date.now()}`,
      productName: newItemText,
      quantity: 1,
      unit: 'each',
      category: 'other'
    };
    
    setEditedList({
      ...editedList,
      items: [...editedList.items, newItem]
    });
    setNewItemText('');
  };

  const handleSave = () => {
    onSave(editedList);
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>✏️ Edit Shopping List</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>×</button>
        </div>

        <div style={modalStyles.content}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>List Name</label>
            <input
              type="text"
              value={editedList.name || ''}
              onChange={(e) => setEditedList({ ...editedList, name: e.target.value })}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.itemsSection}>
            <h3 style={modalStyles.sectionTitle}>Items ({editedList.items.length})</h3>
            
            <div style={modalStyles.addItemRow}>
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Add new item..."
                style={modalStyles.addItemInput}
              />
              <button onClick={handleAddItem} style={modalStyles.addItemButton}>
                ➕ Add
              </button>
            </div>

            <div style={modalStyles.itemsList}>
              {editedList.items.map((item, index) => (
                <div key={item.id || index} style={modalStyles.itemRow}>
                  <input
                    type="number"
                    value={item.quantity || 1}
                    onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                    style={modalStyles.quantityInput}
                    min="0"
                    step="0.25"
                  />
                  <select
                    value={item.unit || 'each'}
                    onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                    style={modalStyles.unitSelect}
                  >
                    <option value="each">each</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                    <option value="cup">cup</option>
                    <option value="can">can</option>
                    <option value="bottle">bottle</option>
                    <option value="bag">bag</option>
                    <option value="box">box</option>
                  </select>
                  <input
                    type="text"
                    value={item.productName || item.itemName || ''}
                    onChange={(e) => handleUpdateItem(index, 'productName', e.target.value)}
                    style={modalStyles.nameInput}
                  />
                  <button
                    onClick={() => handleRemoveItem(index)}
                    style={modalStyles.removeItemButton}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={modalStyles.actions}>
            <button onClick={handleSave} style={modalStyles.saveButton}>
              💾 Save Changes
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

// Meal Plan Modal Component (keeping the existing one, just updating the save logic)
function MealPlanModal({ isOpen, onClose, editingPlan, savedRecipes, onSave }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  const [planName, setPlanName] = useState(editingPlan?.name || '');
  const [weekOf, setWeekOf] = useState(editingPlan?.weekOf || new Date().toISOString().split('T')[0]);
  const [mealSelections, setMealSelections] = useState(editingPlan?.days || {});

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
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

// Styles
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

  editButton: {
    padding: '8px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  deleteButton: {
    padding: '8px 12px',
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
    fontWeight: 'bold'
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

  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  itemsSection: {
    marginTop: '24px'
  },

  addItemRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },

  addItemInput: {
    flex: 1,
    padding: '10px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px'
  },

  addItemButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  itemsList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px'
  },

  itemRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },

  quantityInput: {
    width: '60px',
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },

  unitSelect: {
    width: '80px',
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },

  nameInput: {
    flex: 1,
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },

  removeItemButton: {
    padding: '6px 10px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
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

  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px'
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