// client/src/components/MyAccountDashboard.js
// Full Firebase Integration with AuthContext

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import userDataService from '../services/userDataService';
import ParsedResultsDisplay from './ParsedResultsDisplay';

function MyAccountDashboard({ onClose }) {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [savedLists, setSavedLists] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMealPlan, setShowAddMealPlan] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [editingMealPlan, setEditingMealPlan] = useState(null);

  // Load all user data on mount
  useEffect(() => {
    if (currentUser) {
      loadAllUserData();
    }
  }, [currentUser]);

  const loadAllUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await userDataService.init();
      
      const [listsData, plansData, recipesData, statsData] = await Promise.all([
        userDataService.getShoppingLists(),
        userDataService.getMealPlans(),
        userDataService.getRecipes(),
        userDataService.getUserStats()
      ]);
      
      setSavedLists(listsData);
      setMealPlans(plansData);
      setRecipes(recipesData);
      setUserStats(statsData);
      
      console.log('✅ User data loaded successfully');
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load your data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveList = async (listData) => {
    try {
      const result = await userDataService.saveParsedList(listData);
      if (result.success) {
        await loadAllUserData(); // Refresh data
        alert('List saved successfully!');
      }
    } catch (err) {
      console.error('Error saving list:', err);
      alert('Failed to save list. Please try again.');
    }
  };

  const handleDeleteList = async (listId) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      try {
        await userDataService.deleteShoppingList(listId);
        await loadAllUserData();
      } catch (err) {
        console.error('Error deleting list:', err);
        alert('Failed to delete list.');
      }
    }
  };

  const handleDeleteMealPlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this meal plan?')) {
      try {
        await userDataService.deleteMealPlan(planId);
        await loadAllUserData();
      } catch (err) {
        console.error('Error deleting meal plan:', err);
        alert('Failed to delete meal plan.');
      }
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await userDataService.deleteRecipe(recipeId);
        await loadAllUserData();
      } catch (err) {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe.');
      }
    }
  };

  const handleGenerateShoppingList = async (mealPlanId) => {
    try {
      const result = await userDataService.generateShoppingListFromMealPlan(mealPlanId);
      if (result.success) {
        await loadAllUserData();
        alert('Shopping list generated from meal plan!');
      }
    } catch (err) {
      console.error('Error generating shopping list:', err);
      alert('Failed to generate shopping list.');
    }
  };

  const AddMealPlanModal = () => {
    const [planName, setPlanName] = useState('');
    const [meals, setMeals] = useState([
      { day: 'Monday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Tuesday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Wednesday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Thursday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Friday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Saturday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null },
      { day: 'Sunday', breakfast: '', lunch: '', dinner: '', dinnerRecipe: null }
    ]);

    const handleAddRecipeToMeal = (dayIndex, mealType, recipe) => {
      const newMeals = [...meals];
      newMeals[dayIndex][`${mealType}Recipe`] = recipe;
      newMeals[dayIndex][`${mealType}Instructions`] = recipe.instructions || [];
      setMeals(newMeals);
    };

    const handleSaveMealPlan = async () => {
      try {
        const mealPlanData = {
          name: planName,
          meals: meals
        };
        
        await userDataService.saveMealPlan(mealPlanData);
        await loadAllUserData();
        setShowAddMealPlan(false);
        alert('Meal plan saved successfully!');
      } catch (err) {
        console.error('Error saving meal plan:', err);
        alert('Failed to save meal plan.');
      }
    };

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Create Meal Plan</h3>
            <button onClick={() => setShowAddMealPlan(false)} style={styles.closeButton}>×</button>
          </div>
          
          <div style={styles.modalContent}>
            <input
              type="text"
              placeholder="Meal Plan Name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              style={styles.input}
            />
            
            <div style={styles.mealsGrid}>
              {meals.map((meal, dayIndex) => (
                <div key={meal.day} style={styles.mealDay}>
                  <h4 style={styles.dayTitle}>{meal.day}</h4>
                  
                  <div style={styles.mealInputs}>
                    <input
                      type="text"
                      placeholder="Breakfast"
                      value={meal.breakfast}
                      onChange={(e) => {
                        const newMeals = [...meals];
                        newMeals[dayIndex].breakfast = e.target.value;
                        setMeals(newMeals);
                      }}
                      style={styles.mealInput}
                    />
                    
                    <input
                      type="text"
                      placeholder="Lunch"
                      value={meal.lunch}
                      onChange={(e) => {
                        const newMeals = [...meals];
                        newMeals[dayIndex].lunch = e.target.value;
                        setMeals(newMeals);
                      }}
                      style={styles.mealInput}
                    />
                    
                    <div style={styles.dinnerSection}>
                      <input
                        type="text"
                        placeholder="Dinner"
                        value={meal.dinner}
                        onChange={(e) => {
                          const newMeals = [...meals];
                          newMeals[dayIndex].dinner = e.target.value;
                          setMeals(newMeals);
                        }}
                        style={styles.mealInput}
                      />
                      
                      <select
                        onChange={(e) => {
                          const recipe = recipes.find(r => r.id === e.target.value);
                          if (recipe) {
                            handleAddRecipeToMeal(dayIndex, 'dinner', recipe);
                          }
                        }}
                        style={styles.recipeSelect}
                      >
                        <option value="">Add Recipe</option>
                        {recipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {meal.dinnerRecipe && (
                      <div style={styles.attachedRecipe}>
                        📖 {meal.dinnerRecipe.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={styles.modalActions}>
              <button onClick={handleSaveMealPlan} style={styles.saveButton}>
                Save Meal Plan
              </button>
              <button onClick={() => setShowAddMealPlan(false)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AddRecipeModal = () => {
    const [recipe, setRecipe] = useState({
      name: '',
      category: '',
      time: '',
      servings: 4,
      difficulty: 'Medium',
      ingredients: [''],
      instructions: ['']
    });

    const handleSaveRecipe = async () => {
      try {
        await userDataService.saveRecipe(recipe);
        await loadAllUserData();
        setShowAddRecipe(false);
        alert('Recipe saved successfully!');
      } catch (err) {
        console.error('Error saving recipe:', err);
        alert('Failed to save recipe.');
      }
    };

    const addIngredient = () => {
      setRecipe({ ...recipe, ingredients: [...recipe.ingredients, ''] });
    };

    const addInstruction = () => {
      setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] });
    };

    const updateIngredient = (index, value) => {
      const newIngredients = [...recipe.ingredients];
      newIngredients[index] = value;
      setRecipe({ ...recipe, ingredients: newIngredients });
    };

    const updateInstruction = (index, value) => {
      const newInstructions = [...recipe.instructions];
      newInstructions[index] = value;
      setRecipe({ ...recipe, instructions: newInstructions });
    };

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Add Recipe</h3>
            <button onClick={() => setShowAddRecipe(false)} style={styles.closeButton}>×</button>
          </div>
          
          <div style={styles.modalContent}>
            <input
              type="text"
              placeholder="Recipe Name"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              style={styles.input}
            />
            
            <div style={styles.row}>
              <input
                type="text"
                placeholder="Category (e.g., Italian)"
                value={recipe.category}
                onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
                style={styles.halfInput}
              />
              
              <input
                type="text"
                placeholder="Cook Time (e.g., 30 min)"
                value={recipe.time}
                onChange={(e) => setRecipe({ ...recipe, time: e.target.value })}
                style={styles.halfInput}
              />
            </div>
            
            <div style={styles.row}>
              <input
                type="number"
                placeholder="Servings"
                value={recipe.servings}
                onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) })}
                style={styles.halfInput}
              />
              
              <select
                value={recipe.difficulty}
                onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })}
                style={styles.halfInput}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Ingredients</h4>
              {recipe.ingredients.map((ing, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Ingredient ${index + 1}`}
                  value={ing}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  style={styles.input}
                />
              ))}
              <button onClick={addIngredient} style={styles.addButton}>
                + Add Ingredient
              </button>
            </div>
            
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Instructions</h4>
              {recipe.instructions.map((inst, index) => (
                <textarea
                  key={index}
                  placeholder={`Step ${index + 1}`}
                  value={inst}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  style={styles.textarea}
                  rows="2"
                />
              ))}
              <button onClick={addInstruction} style={styles.addButton}>
                + Add Step
              </button>
            </div>
            
            <div style={styles.modalActions}>
              <button onClick={handleSaveRecipe} style={styles.saveButton}>
                Save Recipe
              </button>
              <button onClick={() => setShowAddRecipe(false)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div style={styles.overviewContainer}>
      <div style={styles.welcomeSection}>
        <h2 style={styles.welcomeTitle}>
          Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}!
        </h2>
        <p style={styles.welcomeSubtitle}>
          Manage your shopping lists, meal plans, and recipes all in one place.
        </p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛒</div>
          <div style={styles.statValue}>{userStats?.totalLists || 0}</div>
          <div style={styles.statLabel}>Shopping Lists</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📅</div>
          <div style={styles.statValue}>{userStats?.totalMealPlans || 0}</div>
          <div style={styles.statLabel}>Meal Plans</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📖</div>
          <div style={styles.statValue}>{userStats?.totalRecipes || 0}</div>
          <div style={styles.statLabel}>Recipes</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statValue}>{userStats?.itemsParsed || 0}</div>
          <div style={styles.statLabel}>Items Parsed</div>
        </div>
      </div>

      {userStats?.recentActivity && userStats.recentActivity.length > 0 && (
        <div style={styles.recentActivitySection}>
          <h3 style={styles.sectionHeader}>Recent Activity</h3>
          <div style={styles.activityList}>
            {userStats.recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} style={styles.activityItem}>
                <div style={styles.activityIcon}>
                  {activity.type === 'list' ? '🛒' : 
                   activity.type === 'mealplan' ? '📅' : '📖'}
                </div>
                <div style={styles.activityDetails}>
                  <div style={styles.activityName}>{activity.name}</div>
                  <div style={styles.activityDate}>
                    {new Date(activity.date?.seconds * 1000 || activity.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderShoppingLists = () => (
    <div style={styles.listsContainer}>
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionHeader}>My Shopping Lists</h3>
        <button style={styles.primaryButton}>
          + New List
        </button>
      </div>

      {selectedList ? (
        <div style={styles.selectedListView}>
          <button 
            onClick={() => setSelectedList(null)}
            style={styles.backButton}
          >
            ← Back to Lists
          </button>
          <ParsedResultsDisplay
            items={selectedList.items || []}
            currentUser={currentUser}
            onItemsChange={(updatedItems) => {
              // Update the list with new items
              const updatedList = { ...selectedList, items: updatedItems };
              userDataService.updateShoppingList(selectedList.id, { items: updatedItems });
            }}
          />
        </div>
      ) : (
        <div style={styles.listsGrid}>
          {savedLists.map(list => (
            <div key={list.id} style={styles.listCard}>
              <div style={styles.listHeader}>
                <h4 style={styles.listName}>{list.name || 'Untitled List'}</h4>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  style={styles.deleteButton}
                >
                  🗑️
                </button>
              </div>
              
              <div style={styles.listMeta}>
                <span>📦 {list.items?.length || 0} items</span>
                <span>📅 {new Date(list.createdAt?.seconds * 1000 || list.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div style={styles.listPreview}>
                {list.items?.slice(0, 3).map((item, index) => (
                  <div key={index} style={styles.previewItem}>
                    • {item.productName || item.itemName || item.name}
                  </div>
                ))}
                {list.items?.length > 3 && (
                  <div style={styles.moreItems}>
                    +{list.items.length - 3} more items
                  </div>
                )}
              </div>
              
              <div style={styles.listActions}>
                <button
                  onClick={() => setSelectedList(list)}
                  style={styles.viewButton}
                >
                  View & Edit
                </button>
                <button style={styles.shopButton}>
                  Shop Now
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
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionHeader}>My Meal Plans</h3>
        <button 
          onClick={() => setShowAddMealPlan(true)}
          style={styles.primaryButton}
        >
          + Create Meal Plan
        </button>
      </div>

      <div style={styles.mealPlansGrid}>
        {mealPlans.map(plan => (
          <div key={plan.id} style={styles.mealPlanCard}>
            <div style={styles.mealPlanHeader}>
              <h4 style={styles.mealPlanName}>{plan.name}</h4>
              <div style={styles.mealPlanActions}>
                <button
                  onClick={() => handleGenerateShoppingList(plan.id)}
                  style={styles.generateListButton}
                >
                  🛒
                </button>
                <button
                  onClick={() => handleDeleteMealPlan(plan.id)}
                  style={styles.deleteButton}
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div style={styles.mealPlanDates}>
              📅 {plan.startDate} - {plan.endDate}
            </div>
            
            <div style={styles.mealsPreview}>
              {plan.meals?.slice(0, 3).map((meal, index) => (
                <div key={index} style={styles.mealPreview}>
                  <strong>{meal.day}:</strong>
                  <div style={styles.mealDetails}>
                    {meal.dinner || meal.lunch || meal.breakfast}
                    {meal.dinnerRecipe && (
                      <span style={styles.hasRecipe}> 📖</span>
                    )}
                  </div>
                  {meal.recipes?.dinner?.instructions && (
                    <div style={styles.recipeInstructions}>
                      <small>Instructions available</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setEditingMealPlan(plan)}
              style={styles.viewFullPlanButton}
            >
              View Full Plan
            </button>
          </div>
        ))}
      </div>

      {showAddMealPlan && <AddMealPlanModal />}
    </div>
  );

  const renderRecipes = () => (
    <div style={styles.recipesContainer}>
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionHeader}>My Recipes</h3>
        <button 
          onClick={() => setShowAddRecipe(true)}
          style={styles.primaryButton}
        >
          + Add Recipe
        </button>
      </div>

      <div style={styles.recipesGrid}>
        {recipes.map(recipe => (
          <div key={recipe.id} style={styles.recipeCard}>
            <div style={styles.recipeHeader}>
              <h4 style={styles.recipeName}>{recipe.name}</h4>
              <span style={styles.recipeDifficulty} data-difficulty={recipe.difficulty}>
                {recipe.difficulty}
              </span>
            </div>
            
            <div style={styles.recipeMeta}>
              <span>🏷️ {recipe.category}</span>
              <span>⏱️ {recipe.time}</span>
              <span>🍽️ {recipe.servings} servings</span>
            </div>
            
            <div style={styles.recipeIngredients}>
              <strong>Ingredients:</strong>
              <ul style={styles.ingredientsList}>
                {recipe.ingredients?.slice(0, 3).map((ing, index) => (
                  <li key={index}>{ing}</li>
                ))}
                {recipe.ingredients?.length > 3 && (
                  <li style={styles.moreIngredients}>
                    +{recipe.ingredients.length - 3} more
                  </li>
                )}
              </ul>
            </div>
            
            {recipe.instructions && recipe.instructions.length > 0 && (
              <div style={styles.recipeInstructionsPreview}>
                <strong>Instructions:</strong>
                <ol style={styles.instructionsList}>
                  {recipe.instructions.slice(0, 2).map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                  {recipe.instructions.length > 2 && (
                    <li style={styles.moreInstructions}>
                      +{recipe.instructions.length - 2} more steps
                    </li>
                  )}
                </ol>
              </div>
            )}
            
            <div style={styles.recipeActions}>
              <button style={styles.viewRecipeButton}>
                View Full Recipe
              </button>
              <button
                onClick={() => handleDeleteRecipe(recipe.id)}
                style={styles.deleteRecipeButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddRecipe && <AddRecipeModal />}
    </div>
  );

  if (!currentUser) {
    return (
      <div style={styles.container}>
        <div style={styles.authMessage}>
          <h2>Please sign in to access your account</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My CARTSMASH Account</h1>
        <div style={styles.userInfo}>
          <span>{currentUser.email}</span>
          <button onClick={logout} style={styles.logoutButton}>
            Sign Out
          </button>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton}>
              ×
            </button>
          )}
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.activeTab : {})
          }}
        >
          🏠 Overview
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          style={{
            ...styles.tab,
            ...(activeTab === 'lists' ? styles.activeTab : {})
          }}
        >
          🛒 Shopping Lists
        </button>
        <button
          onClick={() => setActiveTab('mealplans')}
          style={{
            ...styles.tab,
            ...(activeTab === 'mealplans' ? styles.activeTab : {})
          }}
        >
          📅 Meal Plans
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          style={{
            ...styles.tab,
            ...(activeTab === 'recipes' ? styles.activeTab : {})
          }}
        >
          📖 Recipes
        </button>
      </div>

      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}>⏳</div>
            <p>Loading your data...</p>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <p>{error}</p>
            <button onClick={loadAllUserData} style={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'lists' && renderShoppingLists()}
            {activeTab === 'mealplans' && renderMealPlans()}
            {activeTab === 'recipes' && renderRecipes()}
          </>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  
  header: {
    backgroundColor: 'white',
    padding: '20px 30px',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  closeButton: {
    fontSize: '24px',
    background: 'none',
    border: 'none',
    cursor: 'pointer'
  },
  
  tabs: {
    backgroundColor: 'white',
    padding: '0 30px',
    display: 'flex',
    gap: '5px',
    borderBottom: '1px solid #e0e0e0'
  },
  
  tab: {
    padding: '15px 25px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s'
  },
  
  activeTab: {
    color: '#667eea',
    borderBottomColor: '#667eea',
    backgroundColor: '#f8f9ff'
  },
  
  content: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  
  loading: {
    textAlign: 'center',
    padding: '60px'
  },
  
  spinner: {
    fontSize: '48px',
    animation: 'spin 2s linear infinite'
  },
  
  error: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fee',
    borderRadius: '8px',
    color: '#c00'
  },
  
  retryButton: {
    marginTop: '15px',
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Overview styles
  overviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  
  welcomeSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  
  welcomeSubtitle: {
    color: '#666',
    fontSize: '16px'
  },
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  
  statCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  statIcon: {
    fontSize: '36px',
    marginBottom: '10px'
  },
  
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333'
  },
  
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px'
  },
  
  recentActivitySection: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px'
  },
  
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  
  activityIcon: {
    fontSize: '24px'
  },
  
  activityDetails: {
    flex: 1
  },
  
  activityName: {
    fontWeight: '500',
    marginBottom: '4px'
  },
  
  activityDate: {
    fontSize: '12px',
    color: '#666'
  },

  // Lists styles
  listsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  
  sectionHeader: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0
  },
  
  primaryButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  listsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  
  listCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  
  listName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  
  deleteButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer'
  },
  
  listMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px'
  },
  
  listPreview: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '15px'
  },
  
  previewItem: {
    padding: '3px 0'
  },
  
  moreItems: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: '5px'
  },
  
  listActions: {
    display: 'flex',
    gap: '10px'
  },
  
  viewButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  shopButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '20px'
  },

  // Meal Plans styles
  mealPlansContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  mealPlansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  
  mealPlanCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  mealPlanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  
  mealPlanName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  
  mealPlanActions: {
    display: 'flex',
    gap: '10px'
  },
  
  generateListButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer'
  },
  
  mealPlanDates: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px'
  },
  
  mealsPreview: {
    fontSize: '14px',
    marginBottom: '15px'
  },
  
  mealPreview: {
    padding: '5px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  
  mealDetails: {
    color: '#666',
    marginLeft: '10px'
  },
  
  hasRecipe: {
    color: '#667eea'
  },
  
  recipeInstructions: {
    marginLeft: '10px',
    color: '#28a745',
    fontSize: '12px',
    fontStyle: 'italic'
  },
  
  viewFullPlanButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Recipes styles
  recipesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  recipesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  
  recipeCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  
  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  
  recipeName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  
  recipeDifficulty: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0'
  },
  
  recipeMeta: {
    display: 'flex',
    gap: '10px',
    fontSize: '12px',
    color: '#666',
    marginBottom: '15px'
  },
  
  recipeIngredients: {
    marginBottom: '15px'
  },
  
  ingredientsList: {
    marginLeft: '20px',
    marginTop: '5px',
    fontSize: '14px'
  },
  
  moreIngredients: {
    color: '#666',
    fontStyle: 'italic'
  },
  
  recipeInstructionsPreview: {
    marginBottom: '15px'
  },
  
  instructionsList: {
    marginLeft: '20px',
    marginTop: '5px',
    fontSize: '14px'
  },
  
  moreInstructions: {
    color: '#666',
    fontStyle: 'italic'
  },
  
  recipeActions: {
    display: 'flex',
    gap: '10px'
  },
  
  viewRecipeButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  deleteRecipeButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0
  },
  
  modalContent: {
    padding: '20px'
  },
  
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  
  halfInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  
  textarea: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical'
  },
  
  row: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  
  section: {
    marginBottom: '20px'
  },
  
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  saveButton: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  mealsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px'
  },
  
  mealDay: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px'
  },
  
  dayTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  
  mealInputs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  
  mealInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  
  dinnerSection: {
    display: 'flex',
    gap: '10px'
  },
  
  recipeSelect: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  
  attachedRecipe: {
    padding: '8px',
    backgroundColor: '#e8f5e9',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#2e7d32'
  },
  
  selectedListView: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px'
  },
  
  authMessage: {
    textAlign: 'center',
    padding: '60px',
    color: '#666'
  }
};

export default MyAccountDashboard;