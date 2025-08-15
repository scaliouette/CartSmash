// client/src/components/RecipeManager.js
import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';

function RecipeManager({ onClose }) {
  const {
    savedRecipes,
    saveRecipe,
    loadRecipeToCart,
    deleteRecipe,
    quickAddRecipe
  } = useCart();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: 'dinner',
    ingredients: '',
    instructions: '',
    servings: 4
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter recipes based on search
  const filteredRecipes = savedRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle saving a new recipe
  const handleSaveRecipe = async () => {
    if (!newRecipe.name || !newRecipe.ingredients) {
      alert('Please provide a recipe name and ingredients');
      return;
    }
    
    const saved = await saveRecipe(newRecipe);
    if (saved) {
      alert(`✅ Recipe "${newRecipe.name}" saved!`);
      setNewRecipe({
        name: '',
        category: 'dinner',
        ingredients: '',
        instructions: '',
        servings: 4
      });
      setActiveTab('browse');
    }
  };
  
  // Handle quick add to cart
  const handleQuickAdd = async (recipe) => {
    const result = await loadRecipeToCart(recipe, true); // Merge with existing cart
    if (result.success) {
      alert(`✅ Added ${result.itemsAdded || result.itemsLoaded} items from "${recipe.name}" to cart`);
      onClose();
    }
  };
  
  // Handle replace cart
  const handleReplaceCart = async (recipe) => {
    if (window.confirm('This will replace your entire cart. Continue?')) {
      const result = await loadRecipeToCart(recipe, false); // Replace cart
      if (result.success) {
        alert(`✅ Cart replaced with ${result.itemsAdded || result.itemsLoaded} items from "${recipe.name}"`);
        onClose();
      }
    }
  };
  
  // Handle delete
  const handleDeleteRecipe = (recipeId, recipeName) => {
    if (window.confirm(`Delete recipe "${recipeName}"?`)) {
      deleteRecipe(recipeId);
      alert(`Recipe "${recipeName}" deleted`);
    }
  };
  
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📖 Recipe Manager</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              ...styles.tab,
              ...(activeTab === 'browse' ? styles.tabActive : {})
            }}
          >
            Browse Recipes ({savedRecipes.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              ...styles.tab,
              ...(activeTab === 'create' ? styles.tabActive : {})
            }}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              ...styles.tab,
              ...(activeTab === 'import' ? styles.tabActive : {})
            }}
          >
            Quick Import
          </button>
        </div>
        
        <div style={styles.content}>
          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              
              {filteredRecipes.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No recipes found</p>
                  <button 
                    onClick={() => setActiveTab('create')}
                    style={styles.createButton}
                  >
                    Create your first recipe
                  </button>
                </div>
              ) : (
                <div style={styles.recipeGrid}>
                  {filteredRecipes.map(recipe => (
                    <div key={recipe.id} style={styles.recipeCard}>
                      <div style={styles.recipeHeader}>
                        <h3 style={styles.recipeName}>{recipe.name}</h3>
                        {recipe.category && (
                          <span style={styles.categoryBadge}>
                            {recipe.category}
                          </span>
                        )}
                      </div>
                      
                      <div style={styles.recipeIngredients}>
                        <strong>Ingredients:</strong>
                        <div style={styles.ingredientPreview}>
                          {recipe.ingredients.split('\n').slice(0, 3).map((ing, i) => (
                            <div key={i}>• {ing}</div>
                          ))}
                          {recipe.ingredients.split('\n').length > 3 && (
                            <div style={styles.moreText}>
                              ...and {recipe.ingredients.split('\n').length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {recipe.parsedItems && (
                        <div style={styles.itemCount}>
                          {recipe.parsedItems.length} items ready to add
                        </div>
                      )}
                      
                      <div style={styles.recipeActions}>
                        <button
                          onClick={() => handleQuickAdd(recipe)}
                          style={styles.addButton}
                        >
                          ➕ Add to Cart
                        </button>
                        <button
                          onClick={() => handleReplaceCart(recipe)}
                          style={styles.replaceButton}
                        >
                          🔄 Replace Cart
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
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
          )}
          
          {/* Create Tab */}
          {activeTab === 'create' && (
            <div style={styles.createForm}>
              <input
                type="text"
                placeholder="Recipe Name"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                style={styles.input}
              />
              
              <select
                value={newRecipe.category}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, category: e.target.value }))}
                style={styles.select}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="dessert">Dessert</option>
              </select>
              
              <textarea
                placeholder="Ingredients (one per line)
Example:
2 lbs chicken breast
1 cup rice
1 can tomatoes"
                value={newRecipe.ingredients}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, ingredients: e.target.value }))}
                style={styles.textarea}
                rows={8}
              />
              
              <textarea
                placeholder="Instructions (optional)"
                value={newRecipe.instructions}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                style={styles.textarea}
                rows={4}
              />
              
              <button
                onClick={handleSaveRecipe}
                style={styles.saveButton}
                disabled={!newRecipe.name || !newRecipe.ingredients}
              >
                💾 Save Recipe
              </button>
            </div>
          )}
          
          {/* Import Tab */}
          {activeTab === 'import' && (
            <div style={styles.importSection}>
              <h3>Quick Import from Text</h3>
              <p style={styles.importHelp}>
                Paste a recipe with ingredients and we'll parse it for you!
              </p>
              
              <textarea
                placeholder="Paste your recipe here. Include the recipe name on the first line."
                style={styles.importTextarea}
                rows={10}
                onBlur={async (e) => {
                  const text = e.target.value;
                  if (!text) return;
                  
                  const lines = text.split('\n');
                  const recipeName = lines[0] || 'Imported Recipe';
                  const ingredients = lines.slice(1).join('\n');
                  
                  if (window.confirm(`Import recipe "${recipeName}"?`)) {
                    const result = await quickAddRecipe(ingredients, recipeName);
                    if (result.success) {
                      alert(`✅ Recipe imported with ${result.itemsAdded} items!`);
                      e.target.value = '';
                      setActiveTab('browse');
                    }
                  }
                }}
              />
              
              <div style={styles.templates}>
                <h4>Sample Templates:</h4>
                <button
                  onClick={async () => {
                    const template = `Classic Spaghetti Carbonara
2 lbs spaghetti
6 eggs
1 cup parmesan cheese
8 oz bacon
4 cloves garlic
Black pepper
Salt`;
                    const result = await quickAddRecipe(
                      template.split('\n').slice(1).join('\n'),
                      'Classic Spaghetti Carbonara'
                    );
                    if (result.success) {
                      alert('✅ Template recipe added!');
                      setActiveTab('browse');
                    }
                  }}
                  style={styles.templateButton}
                >
                  🍝 Spaghetti Carbonara
                </button>
                
                <button
                  onClick={async () => {
                    const template = `Chicken Stir Fry
2 lbs chicken breast
2 cups rice
1 bottle soy sauce
1 bag frozen vegetables
2 tbsp sesame oil
1 inch ginger
3 cloves garlic`;
                    const result = await quickAddRecipe(
                      template.split('\n').slice(1).join('\n'),
                      'Chicken Stir Fry'
                    );
                    if (result.success) {
                      alert('✅ Template recipe added!');
                      setActiveTab('browse');
                    }
                  }}
                  style={styles.templateButton}
                >
                  🥘 Chicken Stir Fry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
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
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '2px solid #e5e7eb'
  },
  
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 8px'
  },
  
  tabs: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    color: '#6b7280',
    fontWeight: '500'
  },
  
  tabActive: {
    backgroundColor: 'white',
    color: '#1f2937',
    borderBottom: '2px solid #3b82f6',
    marginBottom: '-1px'
  },
  
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  
  searchInput: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '20px',
    boxSizing: 'border-box'
  },
  
  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  
  recipeCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb'
  },
  
  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '12px'
  },
  
  recipeName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  
  categoryBadge: {
    padding: '2px 8px',
    backgroundColor: '#ddd6fe',
    color: '#6b21a8',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  
  recipeIngredients: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '12px'
  },
  
  ingredientPreview: {
    marginTop: '4px',
    fontSize: '13px'
  },
  
  moreText: {
    fontStyle: 'italic',
    color: '#9ca3af',
    marginTop: '4px'
  },
  
  itemCount: {
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
    marginBottom: '12px'
  },
  
  recipeActions: {
    display: 'flex',
    gap: '8px'
  },
  
  addButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  
  replaceButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  
  // Create form styles
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px'
  },
  
  select: {
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white'
  },
  
  textarea: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  
  saveButton: {
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  
  // Import section styles
  importSection: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  
  importHelp: {
    color: '#6b7280',
    marginBottom: '16px'
  },
  
  importTextarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  
  templates: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  
  templateButton: {
    padding: '10px 16px',
    margin: '8px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  
  createButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default RecipeManager;