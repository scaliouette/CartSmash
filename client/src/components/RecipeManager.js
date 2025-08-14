// client/src/components/RecipeManager.js - SIMPLIFIED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function RecipeManager({ onClose, onRecipeSelect }) {
  const [recipes, setRecipes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    ingredients: '',
    instructions: ''
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      // Load from localStorage first
      const saved = localStorage.getItem('cartsmash-recipes');
      if (saved) {
        setRecipes(JSON.parse(saved));
      }

      // Try to load from server
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/recipes`, {
        headers: { 'user-id': currentUser?.uid || 'guest' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  };

  const handleSaveRecipe = async () => {
    if (!newRecipe.name || !newRecipe.ingredients) {
      alert('Please add a recipe name and ingredients');
      return;
    }

    const recipe = {
      id: `recipe_${Date.now()}`,
      ...newRecipe,
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest'
    };

    // Save to localStorage
    const updatedRecipes = [...recipes, recipe];
    setRecipes(updatedRecipes);
    localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));

    // Try to save to server
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await fetch(`${API_URL}/api/recipes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': currentUser?.uid || 'guest'
        },
        body: JSON.stringify(recipe)
      });
    } catch (error) {
      console.error('Failed to save to server:', error);
    }

    // Reset form
    setNewRecipe({ name: '', ingredients: '', instructions: '' });
    setShowAddForm(false);
    alert('✅ Recipe saved!');
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Delete this recipe?')) {
      const updatedRecipes = recipes.filter(r => r.id !== recipeId);
      setRecipes(updatedRecipes);
      localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));
    }
  };

  const handleUseRecipe = (recipe) => {
    if (onRecipeSelect) {
      onRecipeSelect(recipe);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📝 My Recipes</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          {!showAddForm ? (
            <>
              <button 
                onClick={() => setShowAddForm(true)}
                style={styles.addButton}
              >
                ➕ Add New Recipe
              </button>

              <div style={styles.recipesList}>
                {recipes.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No recipes saved yet</p>
                    <p style={styles.emptyHint}>Click "Add New Recipe" to get started!</p>
                  </div>
                ) : (
                  recipes.map(recipe => (
                    <div key={recipe.id} style={styles.recipeCard}>
                      <h3 style={styles.recipeName}>{recipe.name}</h3>
                      
                      <div style={styles.recipeSection}>
                        <strong>Ingredients:</strong>
                        <pre style={styles.recipeText}>{recipe.ingredients}</pre>
                      </div>
                      
                      {recipe.instructions && (
                        <div style={styles.recipeSection}>
                          <strong>Instructions:</strong>
                          <pre style={styles.recipeText}>{recipe.instructions}</pre>
                        </div>
                      )}
                      
                      <div style={styles.recipeActions}>
                        <button 
                          onClick={() => handleUseRecipe(recipe)}
                          style={styles.useButton}
                        >
                          🛒 Add to Cart
                        </button>
                        <button 
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          style={styles.deleteButton}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={styles.addForm}>
              <h3 style={styles.formTitle}>Add New Recipe</h3>
              
              <input
                type="text"
                placeholder="Recipe Name (e.g., Chicken Stir Fry)"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                style={styles.input}
              />
              
              <textarea
                placeholder="Ingredients (one per line):
2 lbs chicken breast
1 cup rice
3 bell peppers
2 tbsp soy sauce"
                value={newRecipe.ingredients}
                onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                style={styles.textarea}
                rows="8"
              />
              
              <textarea
                placeholder="Instructions (optional):
1. Cut chicken into cubes
2. Cook rice according to package
3. Stir fry chicken with peppers"
                value={newRecipe.instructions}
                onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                style={styles.textarea}
                rows="5"
              />
              
              <div style={styles.formActions}>
                <button 
                  onClick={handleSaveRecipe}
                  style={styles.saveButton}
                >
                  💾 Save Recipe
                </button>
                <button 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRecipe({ name: '', ingredients: '', instructions: '' });
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '2px solid #f0f0f0'
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  closeBtn: {
    width: '32px',
    height: '32px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },

  content: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },

  addButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '20px'
  },

  recipesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },

  emptyHint: {
    fontSize: '14px',
    marginTop: '8px'
  },

  recipeCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb'
  },

  recipeName: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  recipeSection: {
    marginBottom: '12px'
  },

  recipeText: {
    margin: '4px 0',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    whiteSpace: 'pre-wrap'
  },

  recipeActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px'
  },

  useButton: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },

  // Add Form Styles
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  formTitle: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937'
  },

  input: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },

  textarea: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none'
  },

  formActions: {
    display: 'flex',
    gap: '12px'
  },

  saveButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default RecipeManager;