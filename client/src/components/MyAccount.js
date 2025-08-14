// client/src/components/MyAccount.js - Fully Integrated with Backend
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';


function MyAccount() {
  const { currentUser, makeAuthenticatedRequest } = useAuth();
 
  // With this:
  const navigate = (path) => {
    window.location.href = path;
  };
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [profile, setProfile] = useState(null);
  const [savedLists, setSavedLists] = useState([]);
  const [savedMeals, setSavedMeals] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [shoppingHistory, setShoppingHistory] = useState([]);
  const [stats, setStats] = useState(null);
  
  // UI states
  const [editMode, setEditMode] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load all data on mount
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Load all user data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadProfile(),
        loadLists(),
        loadMeals(),
        loadRecipes(),
        loadHistory(),
        loadStats()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load some data');
    } finally {
      setLoading(false);
    }
  };

  // API Calls
  const loadProfile = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/profile`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadLists = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists`);
      const data = await response.json();
      
      if (data.success) {
        setSavedLists(data.lists);
      }
    } catch (err) {
      console.error('Error loading lists:', err);
    }
  };

  const loadMeals = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/meals`);
      const data = await response.json();
      
      if (data.success) {
        setSavedMeals(data.meals);
      }
    } catch (err) {
      console.error('Error loading meals:', err);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/recipes`);
      const data = await response.json();
      
      if (data.success) {
        setSavedRecipes(data.recipes);
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/history`);
      const data = await response.json();
      
      if (data.success) {
        setShoppingHistory(data.history);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/account/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Profile Management
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        setEditMode(false);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // List Management
  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists/${listId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSavedLists(savedLists.filter(list => list.id !== listId));
        setSuccess('List deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error deleting list:', err);
      setError('Failed to delete list');
    } finally {
      setLoading(false);
    }
  };

  const handleShareList = async (list) => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists/${list.id}/share`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        navigator.clipboard.writeText(data.shareUrl);
        setSuccess('Share link copied to clipboard!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error sharing list:', err);
      setError('Failed to share list');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadList = async (list) => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists/${list.id}/load`, {
        method: 'POST',
        body: JSON.stringify({ merge: false })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          setSuccess(null);
          navigate('/'); // Navigate to main cart page
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error loading list:', err);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  // Meal Management
  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Delete this meal plan?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/meals/${mealId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSavedMeals(savedMeals.filter(meal => meal.id !== mealId));
        setSuccess('Meal plan deleted');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError('Failed to delete meal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMealToCart = async (meal) => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/meals/${meal.id}/add-to-cart`, {
        method: 'POST',
        body: JSON.stringify({ scaleFactor: 1 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          setSuccess(null);
          navigate('/'); // Navigate to cart
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error adding meal to cart:', err);
      setError('Failed to add meal to cart');
    } finally {
      setLoading(false);
    }
  };

  // Recipe Management
  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Delete this recipe?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSavedRecipes(savedRecipes.filter(recipe => recipe.id !== recipeId));
        setSuccess('Recipe deleted');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError('Failed to delete recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleShopRecipe = async (recipe) => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/recipes/${recipe.id}/shop`, {
        method: 'POST',
        body: JSON.stringify({ scaleFactor: 1 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          setSuccess(null);
          navigate('/'); // Navigate to cart
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error shopping for recipe:', err);
      setError('Failed to add recipe ingredients to cart');
    } finally {
      setLoading(false);
    }
  };

  // History Management
  const handleReorder = async (historyId) => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/history/${historyId}/reorder`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          setSuccess(null);
          navigate('/'); // Navigate to cart
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error reordering:', err);
      setError('Failed to reorder items');
    } finally {
      setLoading(false);
    }
  };

  // Export Data
  const exportData = async () => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/export`);
      const data = await response.json();
      
      if (data.success) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grocery-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        setSuccess('Data exported successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Create new recipe modal
  const [showNewRecipeModal, setShowNewRecipeModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ingredients: '',
    instructions: '',
    prepTime: 30,
    cookTime: 30,
    servings: 4
  });

  const handleCreateRecipe = async () => {
    try {
      setLoading(true);
      
      const recipeData = {
        ...newRecipe,
        ingredients: newRecipe.ingredients.split('\n').filter(i => i.trim()),
        instructions: newRecipe.instructions.split('\n').filter(i => i.trim())
      };
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/recipes`, {
        method: 'POST',
        body: JSON.stringify(recipeData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSavedRecipes([data.recipe, ...savedRecipes]);
        setShowNewRecipeModal(false);
        setNewRecipe({
          name: '',
          description: '',
          ingredients: '',
          instructions: '',
          prepTime: 30,
          cookTime: 30,
          servings: 4
        });
        setSuccess('Recipe created successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error creating recipe:', err);
      setError('Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  // Render functions remain largely the same but use the loaded data from API
  const renderOverview = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>
        👋 Welcome back, {profile?.displayName || currentUser?.email}
      </h2>
      
      {/* Stats Grid */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>
            <div style={styles.statValue}>{stats.totalLists}</div>
            <div style={styles.statLabel}>Saved Lists</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🛒</div>
            <div style={styles.statValue}>{stats.totalItems}</div>
            <div style={styles.statLabel}>Total Items</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statValue}>${stats.totalSaved}</div>
            <div style={styles.statLabel}>Total Saved</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{stats.avgListSize}</div>
            <div style={styles.statLabel}>Avg List Size</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏪</div>
            <div style={styles.statValue}>{stats.favoriteStore}</div>
            <div style={styles.statLabel}>Favorite Store</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📅</div>
            <div style={styles.statValue}>${stats.monthlySpend}</div>
            <div style={styles.statLabel}>This Month</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <h3 style={styles.subsectionTitle}>Quick Actions</h3>
        <div style={styles.actionButtons}>
          <button style={styles.actionButton} onClick={() => setActiveTab('lists')}>
            <span style={styles.actionIcon}>📝</span>
            View Saved Lists
          </button>
          <button style={styles.actionButton} onClick={() => setActiveTab('meals')}>
            <span style={styles.actionIcon}>🍽️</span>
            Meal Plans
          </button>
          <button style={styles.actionButton} onClick={() => setActiveTab('recipes')}>
            <span style={styles.actionIcon}>📖</span>
            My Recipes
          </button>
          <button style={styles.actionButton} onClick={exportData}>
            <span style={styles.actionIcon}>💾</span>
            Export Data
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.recentActivity}>
        <h3 style={styles.subsectionTitle}>Recent Shopping Trips</h3>
        <div style={styles.activityList}>
          {shoppingHistory.slice(0, 5).map((entry) => (
            <div key={entry.id} style={styles.activityItem}>
              <span style={styles.activityDate}>
                {new Date(entry.completedAt).toLocaleDateString()}
              </span>
              <span style={styles.activityText}>
                {entry.storeName} - {entry.itemCount} items
              </span>
              <span style={styles.activityValue}>
                ${entry.total}
              </span>
            </div>
          ))}
          {shoppingHistory.length === 0 && (
            <p style={styles.emptyMessage}>No recent shopping trips</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Profile Settings</h2>
      
      {profile && (
        <div style={styles.profileForm}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              value={profile.displayName || ''}
              onChange={(e) => setProfile({...profile, displayName: e.target.value})}
              style={styles.input}
              disabled={!editMode}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={currentUser?.email || ''}
              style={{...styles.input, ...styles.disabled}}
              disabled
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              style={styles.input}
              placeholder="(555) 123-4567"
              disabled={!editMode}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Default Store</label>
            <select
              value={profile.defaultStore || 'kroger'}
              onChange={(e) => setProfile({...profile, defaultStore: e.target.value})}
              style={styles.select}
              disabled={!editMode}
            >
              <option value="kroger">Kroger</option>
              <option value="safeway">Safeway</option>
              <option value="walmart">Walmart</option>
              <option value="target">Target</option>
              <option value="whole-foods">Whole Foods</option>
              <option value="costco">Costco</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Family Size</label>
            <input
              type="number"
              value={profile.familySize || 4}
              onChange={(e) => setProfile({...profile, familySize: parseInt(e.target.value)})}
              style={styles.input}
              min="1"
              max="10"
              disabled={!editMode}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Weekly Budget</label>
            <input
              type="number"
              value={profile.weeklyBudget || 150}
              onChange={(e) => setProfile({...profile, weeklyBudget: parseFloat(e.target.value)})}
              style={styles.input}
              min="0"
              step="10"
              disabled={!editMode}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dietary Preferences</label>
            <div style={styles.checkboxGroup}>
              {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'].map(diet => (
                <label key={diet} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={profile.dietaryPreferences?.includes(diet) || false}
                    onChange={(e) => {
                      const prefs = profile.dietaryPreferences || [];
                      if (e.target.checked) {
                        setProfile({
                          ...profile,
                          dietaryPreferences: [...prefs, diet]
                        });
                      } else {
                        setProfile({
                          ...profile,
                          dietaryPreferences: prefs.filter(d => d !== diet)
                        });
                      }
                    }}
                    disabled={!editMode}
                    style={styles.checkbox}
                  />
                  {diet}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.buttonGroup}>
            {editMode ? (
              <>
                <button 
                  style={styles.saveButton} 
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  style={styles.cancelButton} 
                  onClick={() => {
                    setEditMode(false);
                    loadProfile(); // Reload original data
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                style={styles.editButton} 
                onClick={() => setEditMode(true)}
                disabled={loading}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSavedLists = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Saved Shopping Lists</h2>
      
      <div style={styles.listGrid}>
        {savedLists.map(list => (
          <div key={list.id} style={styles.listCard}>
            <div style={styles.listHeader}>
              <h4 style={styles.listTitle}>{list.name}</h4>
              <span style={styles.listDate}>
                {new Date(list.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div style={styles.listStats}>
              <span style={styles.listStat}>📦 {list.itemCount} items</span>
              <span style={styles.listStat}>💰 ${list.estimatedTotal || '0.00'}</span>
            </div>
            
            <div style={styles.listPreview}>
              {list.items?.slice(0, 3).map((item, idx) => (
                <div key={idx} style={styles.previewItem}>
                  • {item.productName || item.itemName}
                </div>
              ))}
              {list.items?.length > 3 && (
                <div style={styles.previewMore}>
                  +{list.items.length - 3} more items...
                </div>
              )}
            </div>
            
            <div style={styles.listActions}>
              <button
                style={styles.listActionButton}
                onClick={() => handleLoadList(list)}
                title="Load this list"
                disabled={loading}
              >
                📥 Load
              </button>
              <button
                style={styles.listActionButton}
                onClick={() => handleShareList(list)}
                title="Share this list"
                disabled={loading}
              >
                🔗 Share
              </button>
              <button
                style={{...styles.listActionButton, ...styles.deleteButton}}
                onClick={() => handleDeleteList(list.id)}
                title="Delete this list"
                disabled={loading}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        
        {savedLists.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No saved lists yet</p>
            <p style={styles.emptySubtext}>Save your shopping lists from the main cart page</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMealPlans = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Meal Plans</h2>
      
      <div style={styles.mealGrid}>
        {savedMeals.map(meal => (
          <div key={meal.id} style={styles.mealCard}>
            <div style={styles.mealHeader}>
              <h4 style={styles.mealTitle}>🍽️ {meal.name}</h4>
              <button
                style={styles.mealDeleteButton}
                onClick={() => handleDeleteMeal(meal.id)}
                disabled={loading}
              >
                ×
              </button>
            </div>
            
            <div style={styles.mealInfo}>
              <span>👥 Serves {meal.servings || 4}</span>
              <span>⏱️ {meal.prepTime + meal.cookTime} min total</span>
            </div>
            
            <div style={styles.mealItems}>
              {meal.items?.slice(0, 5).map((item, idx) => (
                <div key={idx} style={styles.mealItem}>
                  <span style={styles.mealItemName}>{item.productName || item.name}</span>
                  <span style={styles.mealItemQty}>{item.quantity} {item.unit}</span>
                </div>
              ))}
              {meal.items?.length > 5 && (
                <div style={styles.mealMore}>+{meal.items.length - 5} more items</div>
              )}
            </div>
            
            <div style={styles.mealActions}>
              <button 
                style={styles.mealActionButton}
                onClick={() => handleAddMealToCart(meal)}
                disabled={loading}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        ))}
        
        {savedMeals.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No meal plans yet</p>
            <p style={styles.emptySubtext}>Create meal plans from your shopping lists</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecipes = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>My Recipes</h2>
      
      <div style={styles.recipeActions}>
        <button
          style={styles.addRecipeButton}
          onClick={() => setShowNewRecipeModal(true)}
        >
          + Add New Recipe
        </button>
      </div>
      
      <div style={styles.recipeGrid}>
        {savedRecipes.map(recipe => (
          <div key={recipe.id} style={styles.recipeCard}>
            <div style={styles.recipeImage}>
              {recipe.image ? (
                <img src={recipe.image} alt={recipe.name} style={styles.recipeImg} />
              ) : (
                <div style={styles.recipePlaceholder}>📖</div>
              )}
            </div>
            
            <div style={styles.recipeContent}>
              <h4 style={styles.recipeTitle}>{recipe.name}</h4>
              <div style={styles.recipeInfo}>
                <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
                <span>👥 Serves {recipe.servings}</span>
              </div>
              <p style={styles.recipeDescription}>{recipe.description}</p>
              
              <div style={styles.recipeButtonGroup}>
                <button 
                  style={styles.recipeButton}
                  onClick={() => handleShopRecipe(recipe)}
                  disabled={loading}
                >
                  🛒 Shop Ingredients
                </button>
                <button
                  style={{...styles.recipeButton, ...styles.deleteRecipeButton}}
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  disabled={loading}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {savedRecipes.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No saved recipes yet</p>
            <p style={styles.emptySubtext}>Save recipes from AI suggestions or add your own</p>
          </div>
        )}
      </div>

      {/* New Recipe Modal */}
      {showNewRecipeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewRecipeModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add New Recipe</h3>
            
            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Recipe Name</label>
                <input
                  type="text"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                  style={styles.input}
                  placeholder="e.g., Chicken Pasta"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={newRecipe.description}
                  onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                  style={styles.textarea}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Ingredients (one per line)</label>
                <textarea
                  value={newRecipe.ingredients}
                  onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                  style={styles.textarea}
                  placeholder="2 lbs chicken breast&#10;1 lb pasta&#10;2 cups tomato sauce"
                  rows={5}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Instructions (one per line)</label>
                <textarea
                  value={newRecipe.instructions}
                  onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                  style={styles.textarea}
                  placeholder="1. Cook pasta according to package&#10;2. Season chicken..."
                  rows={4}
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Prep Time (min)</label>
                  <input
                    type="number"
                    value={newRecipe.prepTime}
                    onChange={(e) => setNewRecipe({...newRecipe, prepTime: parseInt(e.target.value)})}
                    style={styles.input}
                    min="0"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cook Time (min)</label>
                  <input
                    type="number"
                    value={newRecipe.cookTime}
                    onChange={(e) => setNewRecipe({...newRecipe, cookTime: parseInt(e.target.value)})}
                    style={styles.input}
                    min="0"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Servings</label>
                  <input
                    type="number"
                    value={newRecipe.servings}
                    onChange={(e) => setNewRecipe({...newRecipe, servings: parseInt(e.target.value)})}
                    style={styles.input}
                    min="1"
                  />
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button
                  style={styles.saveButton}
                  onClick={handleCreateRecipe}
                  disabled={loading || !newRecipe.name || !newRecipe.ingredients}
                >
                  {loading ? 'Saving...' : 'Save Recipe'}
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowNewRecipeModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Shopping History</h2>
      
      <div style={styles.historyTimeline}>
        {shoppingHistory.map((entry) => (
          <div key={entry.id} style={styles.historyEntry}>
            <div style={styles.historyDate}>
              <div style={styles.historyDateDay}>
                {new Date(entry.completedAt).getDate()}
              </div>
              <div style={styles.historyDateMonth}>
                {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
            
            <div style={styles.historyContent}>
              <div style={styles.historyTitle}>{entry.storeName}</div>
              <div style={styles.historyDetails}>
                <span>📦 {entry.itemCount} items</span>
                <span>💰 ${entry.total}</span>
                {entry.savings > 0 && (
                  <span>💵 Saved ${entry.savings}</span>
                )}
              </div>
            </div>
            
            <div style={styles.historyActions}>
              <button 
                style={styles.historyButton}
                onClick={() => handleReorder(entry.id)}
                disabled={loading}
              >
                Reorder
              </button>
            </div>
          </div>
        ))}
        
        {shoppingHistory.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No shopping history yet</p>
            <p style={styles.emptySubtext}>Your completed shopping trips will appear here</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>My Account</h1>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {(currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>{profile?.displayName || currentUser?.email}</div>
            <div style={styles.userEmail}>{currentUser?.email}</div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={styles.errorMessage}>
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          ✅ {success}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'profile' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'lists' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('lists')}
        >
          📋 Saved Lists
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'meals' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('meals')}
        >
          🍽️ Meal Plans
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'recipes' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('recipes')}
        >
          📖 Recipes
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('history')}
        >
          🕐 History
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner}>Loading...</div>
          </div>
        )}
        
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'lists' && renderSavedLists()}
        {activeTab === 'meals' && renderMealPlans()}
        {activeTab === 'recipes' && renderRecipes()}
        {activeTab === 'history' && renderHistory()}
      </div>
    </div>
  );
}

// Styles (keep existing styles but add these new ones)
const styles = {
  // ... (keep all existing styles from original component)
  
  // Add these new styles
  errorMessage: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  
  successMessage: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  
  spinner: {
    fontSize: '18px',
    color: '#6b7280'
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px'
  },
  
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical'
  },
  
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px'
  },
  
  recipeActions: {
    marginBottom: '20px'
  },
  
  recipeButtonGroup: {
    display: 'flex',
    gap: '8px'
  },
  
  deleteRecipeButton: {
    background: '#ef4444',
    color: 'white',
    flex: '0 0 auto'
  },
  
  mealInfo: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '10px'
  },

  // Keep all other existing styles from the original component...
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e5e7eb'
  },

  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },

  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    overflow: 'hidden'
  },

  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold'
  },

  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },

  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },

  userEmail: {
    fontSize: '14px',
    color: '#6b7280'
  },

  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto'
  },

  tab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },

  activeTab: {
    color: '#10b981',
    borderBottomColor: '#10b981'
  },

  content: {
    minHeight: '400px',
    position: 'relative'
  },

  tabContent: {
    animation: 'fadeIn 0.3s ease-in'
  },

  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px'
  },

  subsectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '15px'
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },

  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },

  statIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },

  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '5px'
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },

  // Quick Actions
  quickActions: {
    marginBottom: '30px'
  },

  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },

  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },

  actionIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },

  // Recent Activity
  recentActivity: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: '#f9fafb',
    borderRadius: '8px'
  },

  activityDate: {
    fontSize: '13px',
    color: '#6b7280',
    minWidth: '80px'
  },

  activityText: {
    flex: 1,
    fontSize: '14px',
    color: '#374151',
    marginLeft: '15px'
  },

  activityValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981'
  },

  // Profile Form
  profileForm: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    maxWidth: '600px'
  },

  formGroup: {
    marginBottom: '20px'
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },

  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px'
  },

  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white'
  },

  disabled: {
    background: '#f9fafb',
    cursor: 'not-allowed'
  },

  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },

  checkbox: {
    marginRight: '8px'
  },

  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px'
  },

  editButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  saveButton: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  cancelButton: {
    padding: '10px 20px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Lists Grid
  listGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },

  listCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    transition: 'box-shadow 0.2s'
  },

  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '12px'
  },

  listTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },

  listDate: {
    fontSize: '12px',
    color: '#9ca3af'
  },

  listStats: {
    display: 'flex',
    gap: '15px',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#6b7280'
  },

  listStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },

  listPreview: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '15px'
  },

  previewItem: {
    padding: '2px 0'
  },

  previewMore: {
    fontStyle: 'italic',
    color: '#9ca3af',
    marginTop: '5px'
  },

  listActions: {
    display: 'flex',
    gap: '8px'
  },

  listActionButton: {
    flex: 1,
    padding: '8px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  deleteButton: {
    background: '#fee2e2',
    borderColor: '#fecaca'
  },

  // Meal Plans
  mealGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },

  mealCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px'
  },

  mealHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },

  mealTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },

  mealDeleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold'
  },

  mealItems: {
    marginBottom: '15px'
  },

  mealItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: '13px',
    color: '#4b5563'
  },

  mealItemName: {
    flex: 1
  },

  mealItemQty: {
    color: '#9ca3af'
  },

  mealMore: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: '5px'
  },

  mealActions: {
    display: 'flex',
    gap: '8px'
  },

  mealActionButton: {
    flex: 1,
    padding: '8px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },

  // Recipes
  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },

  recipeCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },

  recipeImage: {
    width: '100%',
    height: '150px',
    background: '#f3f4f6'
  },

  recipeImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  recipePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px'
  },

  recipeContent: {
    padding: '20px'
  },

  recipeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 10px 0'
  },

  recipeInfo: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '10px'
  },

  recipeDescription: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '15px',
    lineHeight: '1.5'
  },

  recipeButton: {
    flex: 1,
    padding: '8px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },

  addRecipeButton: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // History
  historyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  historyEntry: {
    display: 'flex',
    gap: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },

  historyDate: {
    textAlign: 'center',
    minWidth: '60px'
  },

  historyDateDay: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  historyDateMonth: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase'
  },

  historyContent: {
    flex: 1
  },

  historyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px'
  },

  historyDetails: {
    display: 'flex',
    gap: '15px',
    fontSize: '14px',
    color: '#6b7280'
  },

  historyActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  historyButton: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },

  // Empty States
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    gridColumn: '1 / -1'
  },

  emptyMessage: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '8px'
  },

  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af'
  }
};

export default MyAccount;