// client/src/components/RecipeManager.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function RecipeManager({ onClose, onRecipeSelect, savedRecipes, onRecipeSave, onRecipeDelete }) {
  const [recipes, setRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    ingredients: '',
    instructions: ''
  });
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [savedRecipes]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      // First check localStorage
      const localRecipes = localStorage.getItem('cartsmash-recipes');
      if (localRecipes) {
        const parsed = JSON.parse(localRecipes);
        setRecipes(parsed);
      }

      // Then try to fetch from server
      if (currentUser?.uid) {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/recipes`, {
          headers: { 
            'user-id': currentUser.uid,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.recipes && data.recipes.length > 0) {
            setRecipes(data.recipes);
            // Sync to localStorage
            localStorage.setItem('cartsmash-recipes', JSON.stringify(data.recipes));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe = null) => {
    const recipeToSave = recipe || newRecipe;
    
    if (!recipeToSave.name || !recipeToSave.ingredients) {
      alert('Please add a recipe name and ingredients');
      return;
    }

    const savedRecipe = {
      id: recipeToSave.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: recipeToSave.name,
      ingredients: recipeToSave.ingredients,
      instructions: recipeToSave.instructions || '',
      createdAt: recipeToSave.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest'
    };

    let updatedRecipes;
    if (editingRecipe) {
      updatedRecipes = recipes.map(r => r.id === savedRecipe.id ? savedRecipe : r);
    } else {
      updatedRecipes = [...recipes, savedRecipe];
    }
    
    // Update state and localStorage immediately
    setRecipes(updatedRecipes);
    localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));
    
    // Call parent save function if provided
    if (onRecipeSave) {
      onRecipeSave(savedRecipe);
    }

    // Try to save to server (don't wait for it)
    if (currentUser?.uid) {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        await fetch(`${API_URL}/api/recipes`, {
          method: editingRecipe ? 'PUT' : 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'user-id': currentUser.uid
          },
          body: JSON.stringify(savedRecipe)
        });
      } catch (error) {
        console.error('Failed to save to server, but saved locally:', error);
      }
    }

    // Reset form
    setNewRecipe({ name: '', ingredients: '', instructions: '' });
    setEditingRecipe(null);
    setActiveTab('browse');
    alert(`✅ Recipe ${editingRecipe ? 'updated' : 'saved'}!`);
  };

  const handleQuickAdd = () => {
    if (!quickAddText.trim()) {
      alert('Please paste or type a recipe');
      return;
    }

    const lines = quickAddText.trim().split('\n').filter(line => line.trim());
    const recipeName = lines[0] || 'Quick Recipe';
    const ingredients = lines.slice(1).join('\n');

    const quickRecipe = {
      name: recipeName,
      ingredients: ingredients || quickAddText,
      instructions: ''
    };

    handleSaveRecipe(quickRecipe);
    setQuickAddText('');
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setNewRecipe({
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions || ''
    });
    setActiveTab('edit');
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Delete this recipe?')) {
      const updatedRecipes = recipes.filter(r => r.id !== recipeId);
      setRecipes(updatedRecipes);
      localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));
      
      if (onRecipeDelete) {
        onRecipeDelete(recipeId);
      }

      // Also delete from server
      if (currentUser?.uid) {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        fetch(`${API_URL}/api/recipes/${recipeId}`, {
          method: 'DELETE',
          headers: { 'user-id': currentUser.uid }
        }).catch(err => console.error('Failed to delete from server:', err));
      }
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal recipe-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📖 Recipe Manager</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="recipe-tabs">
          <button
            onClick={() => setActiveTab('browse')}
            className={`recipe-tab ${activeTab === 'browse' ? 'active' : ''}`}
          >
            📚 My Recipes ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`recipe-tab ${activeTab === 'add' ? 'active' : ''}`}
          >
            ➕ Add Recipe
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`recipe-tab ${activeTab === 'quick' ? 'active' : ''}`}
          >
            ⚡ Quick Add
          </button>
          {editingRecipe && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`recipe-tab ${activeTab === 'edit' ? 'active' : ''}`}
            >
              ✏️ Edit Recipe
            </button>
          )}
        </div>

        <div className="modal-content recipe-modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading recipes...</p>
            </div>
          )}

          {/* Browse Tab */}
          {!loading && activeTab === 'browse' && (
            <div className="recipe-browser">
              {recipes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📖</div>
                  <p>No recipes saved yet</p>
                  <button 
                    onClick={() => setActiveTab('quick')}
                    className="btn btn-validate"
                  >
                    Add Your First Recipe
                  </button>
                </div>
              ) : (
                <div className="recipe-grid">
                  {recipes.map(recipe => (
                    <div key={recipe.id} className="recipe-card-enhanced">
                      <div className="recipe-card-header">
                        <h3 className="recipe-name">{recipe.name}</h3>
                        <div className="recipe-actions-inline">
                          <button 
                            onClick={() => handleEditRecipe(recipe)}
                            className="btn-icon"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="btn-icon"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="recipe-preview">
                        <strong>Ingredients:</strong>
                        <div className="ingredients-preview">
                          {(recipe.ingredients || '').split('\n').filter(i => i.trim()).slice(0, 3).map((ing, idx) => (
                            <div key={idx}>• {ing}</div>
                          ))}
                          {(recipe.ingredients || '').split('\n').filter(i => i.trim()).length > 3 && (
                            <div className="more-text">
                              ...and {(recipe.ingredients || '').split('\n').filter(i => i.trim()).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleUseRecipe(recipe)}
                        className="btn btn-primary full-width"
                      >
                        🛒 Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add/Edit Tab */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <div className="recipe-form">
              <h3>{editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}</h3>
              
              <input
                type="text"
                placeholder="Recipe Name"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                className="input"
                autoFocus
              />
              
              <textarea
                placeholder="Ingredients (one per line)"
                value={newRecipe.ingredients}
                onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                className="textarea"
                rows="10"
              />
              
              <textarea
                placeholder="Instructions (optional)"
                value={newRecipe.instructions}
                onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                className="textarea"
                rows="5"
              />
              
              <div className="form-actions">
                <button 
                  onClick={() => handleSaveRecipe()}
                  className="btn btn-primary"
                >
                  💾 {editingRecipe ? 'Update' : 'Save'} Recipe
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('browse');
                    setNewRecipe({ name: '', ingredients: '', instructions: '' });
                    setEditingRecipe(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Quick Add Tab */}
          {activeTab === 'quick' && (
            <div className="quick-add-form">
              <h3>⚡ Quick Add Recipe</h3>
              <p className="help-text">
                Just paste your recipe! First line becomes the name, rest becomes ingredients.
              </p>
              
              <textarea
                placeholder="Example:
Chicken Stir Fry
2 lbs chicken breast
1 cup rice
3 bell peppers
2 tbsp soy sauce
1 tbsp sesame oil"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                className="textarea"
                rows="12"
                autoFocus
              />
              
              <button 
                onClick={handleQuickAdd}
                className="btn btn-primary full-width"
                disabled={!quickAddText.trim()}
              >
                💾 Save Recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeManager;