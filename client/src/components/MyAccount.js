// client/src/components/MyAccount.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function MyAccount() {
  const { currentUser, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [savedLists, setSavedLists] = useState([]);
  const [savedMeals, setSavedMeals] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [shoppingHistory, setShoppingHistory] = useState([]);
  const [profile, setProfile] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phone: '',
    defaultStore: 'kroger',
    dietaryPreferences: [],
    familySize: 4,
    weeklyBudget: 150,
    notifications: {
      email: true,
      sms: false,
      deals: true,
      mealPlans: true
    }
  });
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState({
    totalLists: 0,
    totalItems: 0,
    totalSaved: 0,
    favoriteStore: '',
    avgListSize: 0,
    monthlySpend: 0
  });

  // Load user data on mount
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      // Load from localStorage for now (replace with API calls)
      const lists = JSON.parse(localStorage.getItem('cartsmash-saved-lists') || '[]');
      const meals = JSON.parse(localStorage.getItem('cartsmash-meal-groups') || '{}');
      const recipes = JSON.parse(localStorage.getItem('cartsmash-recipes') || '[]');
      const history = JSON.parse(localStorage.getItem('cartsmash-history') || '[]');
      
      setSavedLists(lists);
      setSavedMeals(Object.entries(meals));
      setSavedRecipes(recipes);
      setShoppingHistory(history);
      
      // Calculate stats
      const totalItems = lists.reduce((sum, list) => sum + (list.items?.length || 0), 0);
      setStats({
        totalLists: lists.length,
        totalItems: totalItems,
        totalSaved: lists.length * 5.99, // Estimated savings
        favoriteStore: 'Kroger',
        avgListSize: lists.length > 0 ? Math.round(totalItems / lists.length) : 0,
        monthlySpend: calculateMonthlySpend(history)
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const calculateMonthlySpend = (history) => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    return history
      .filter(item => {
        const date = new Date(item.date);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSaveProfile = async () => {
    try {
      // Save to backend (implement API call)
      localStorage.setItem('cartsmash-profile', JSON.stringify(profile));
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  const handleDeleteList = (listId) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      const updated = savedLists.filter(list => list.id !== listId);
      setSavedLists(updated);
      localStorage.setItem('cartsmash-saved-lists', JSON.stringify(updated));
    }
  };

  const handleDeleteMeal = (mealName) => {
    if (window.confirm(`Delete meal plan "${mealName}"?`)) {
      const updated = savedMeals.filter(([name]) => name !== mealName);
      setSavedMeals(updated);
      const mealsObj = Object.fromEntries(updated);
      localStorage.setItem('cartsmash-meal-groups', JSON.stringify(mealsObj));
    }
  };

  const handleShareList = (list) => {
    const shareUrl = `${window.location.origin}/shared/${list.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const handleLoadList = (list) => {
    // Load list into current cart
    localStorage.setItem('cartsmash-current-cart', JSON.stringify(list.items));
    window.location.href = '/'; // Redirect to main page
  };

  const exportData = () => {
    const data = {
      profile,
      savedLists,
      savedMeals: Object.fromEntries(savedMeals),
      savedRecipes,
      shoppingHistory,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartsmash-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderOverview = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>👋 Welcome back, {profile.displayName || currentUser?.email}</h2>
      
      {/* Stats Grid */}
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
          <div style={styles.statValue}>${stats.totalSaved.toFixed(2)}</div>
          <div style={styles.statLabel}>Estimated Savings</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statValue}>{stats.avgListSize}</div>
          <div style={styles.statLabel}>Avg List Size</div>
        </div>
      </div>

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
        <h3 style={styles.subsectionTitle}>Recent Activity</h3>
        <div style={styles.activityList}>
          {shoppingHistory.slice(0, 5).map((item, index) => (
            <div key={index} style={styles.activityItem}>
              <span style={styles.activityDate}>
                {new Date(item.date).toLocaleDateString()}
              </span>
              <span style={styles.activityText}>{item.action}</span>
              <span style={styles.activityValue}>{item.value}</span>
            </div>
          ))}
          {shoppingHistory.length === 0 && (
            <p style={styles.emptyMessage}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Profile Settings</h2>
      
      <div style={styles.profileForm}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Display Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => setProfile({...profile, displayName: e.target.value})}
            style={styles.input}
            disabled={!editMode}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={profile.email}
            style={{...styles.input, ...styles.disabled}}
            disabled
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Phone</label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({...profile, phone: e.target.value})}
            style={styles.input}
            placeholder="(555) 123-4567"
            disabled={!editMode}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Default Store</label>
          <select
            value={profile.defaultStore}
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
            value={profile.familySize}
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
            value={profile.weeklyBudget}
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
                  checked={profile.dietaryPreferences.includes(diet)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({
                        ...profile,
                        dietaryPreferences: [...profile.dietaryPreferences, diet]
                      });
                    } else {
                      setProfile({
                        ...profile,
                        dietaryPreferences: profile.dietaryPreferences.filter(d => d !== diet)
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

        <div style={styles.formGroup}>
          <label style={styles.label}>Notifications</label>
          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={profile.notifications.email}
                onChange={(e) => setProfile({
                  ...profile,
                  notifications: {...profile.notifications, email: e.target.checked}
                })}
                disabled={!editMode}
                style={styles.checkbox}
              />
              Email Notifications
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={profile.notifications.deals}
                onChange={(e) => setProfile({
                  ...profile,
                  notifications: {...profile.notifications, deals: e.target.checked}
                })}
                disabled={!editMode}
                style={styles.checkbox}
              />
              Deal Alerts
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={profile.notifications.mealPlans}
                onChange={(e) => setProfile({
                  ...profile,
                  notifications: {...profile.notifications, mealPlans: e.target.checked}
                })}
                disabled={!editMode}
                style={styles.checkbox}
              />
              Meal Plan Suggestions
            </label>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          {editMode ? (
            <>
              <button style={styles.saveButton} onClick={handleSaveProfile}>
                Save Changes
              </button>
              <button style={styles.cancelButton} onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button style={styles.editButton} onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          )}
        </div>
      </div>
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
              <span style={styles.listStat}>📦 {list.items?.length || 0} items</span>
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
              >
                📥 Load
              </button>
              <button
                style={styles.listActionButton}
                onClick={() => handleShareList(list)}
                title="Share this list"
              >
                🔗 Share
              </button>
              <button
                style={{...styles.listActionButton, ...styles.deleteButton}}
                onClick={() => handleDeleteList(list.id)}
                title="Delete this list"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        
        {savedLists.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No saved lists yet</p>
            <p style={styles.emptySubtext}>Your saved shopping lists will appear here</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMealPlans = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Meal Plans</h2>
      
      <div style={styles.mealGrid}>
        {savedMeals.map(([mealName, items]) => (
          <div key={mealName} style={styles.mealCard}>
            <div style={styles.mealHeader}>
              <h4 style={styles.mealTitle}>🍽️ {mealName}</h4>
              <button
                style={styles.mealDeleteButton}
                onClick={() => handleDeleteMeal(mealName)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.mealItems}>
              {items.slice(0, 5).map((item, idx) => (
                <div key={idx} style={styles.mealItem}>
                  <span style={styles.mealItemName}>{item.name}</span>
                  <span style={styles.mealItemQty}>{item.quantity} {item.unit}</span>
                </div>
              ))}
              {items.length > 5 && (
                <div style={styles.mealMore}>+{items.length - 5} more items</div>
              )}
            </div>
            
            <div style={styles.mealActions}>
              <button style={styles.mealActionButton}>
                🛒 Add to Cart
              </button>
              <button style={styles.mealActionButton}>
                📋 View Details
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
                <span>⏱️ {recipe.prepTime || '30'} min</span>
                <span>👥 Serves {recipe.servings || 4}</span>
              </div>
              <p style={styles.recipeDescription}>{recipe.description}</p>
              
              <div style={styles.recipeActions}>
                <button style={styles.recipeButton}>
                  🛒 Shop Ingredients
                </button>
                <button style={styles.recipeButton}>
                  👁️ View Recipe
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {savedRecipes.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyMessage}>No saved recipes yet</p>
            <p style={styles.emptySubtext}>Save recipes from AI suggestions or add your own</p>
            <button style={styles.addRecipeButton}>
              + Add Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Shopping History</h2>
      
      <div style={styles.historyTimeline}>
        {shoppingHistory.map((entry, index) => (
          <div key={index} style={styles.historyEntry}>
            <div style={styles.historyDate}>
              <div style={styles.historyDateDay}>
                {new Date(entry.date).getDate()}
              </div>
              <div style={styles.historyDateMonth}>
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
            
            <div style={styles.historyContent}>
              <div style={styles.historyTitle}>{entry.storeName || 'Grocery Store'}</div>
              <div style={styles.historyDetails}>
                <span>📦 {entry.itemCount || 0} items</span>
                <span>💰 ${entry.total || '0.00'}</span>
              </div>
              {entry.savings && (
                <div style={styles.historySavings}>
                  💵 Saved ${entry.savings}
                </div>
              )}
            </div>
            
            <div style={styles.historyActions}>
              <button style={styles.historyButton}>Reorder</button>
              <button style={styles.historyButton}>View</button>
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
            <div style={styles.userName}>{profile.displayName || currentUser?.email}</div>
            <div style={styles.userEmail}>{currentUser?.email}</div>
          </div>
        </div>
      </div>

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

      <div style={styles.content}>
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

const styles = {
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
    minHeight: '400px'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

  recipeActions: {
    display: 'flex',
    gap: '8px'
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
    cursor: 'pointer',
    marginTop: '15px'
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

  historySavings: {
    marginTop: '5px',
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '500'
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