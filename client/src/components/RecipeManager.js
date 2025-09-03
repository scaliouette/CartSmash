// client/src/components/RecipeManager.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function RecipeManager({ onClose, onRecipeSelect, savedRecipes, onRecipeSave, onRecipeDelete, editingRecipe: initialEditingRecipe, initialTab = 'browse' }) {
  const [recipes, setRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    ingredients: '',
    instructions: ''
  });
  
  // Import functionality
  const [recipeUrl, setRecipeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [savedRecipes]);

  // Handle initial editing recipe from props
  useEffect(() => {
    if (initialEditingRecipe) {
      setEditingRecipe(initialEditingRecipe);
      setNewRecipe({
        name: initialEditingRecipe.name || '',
        ingredients: initialEditingRecipe.ingredients || '',
        instructions: initialEditingRecipe.instructions || ''
      });
      setActiveTab('edit');
    }
  }, [initialEditingRecipe]);

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
       const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';;
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
       const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';;
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
       const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';;
        fetch(`${API_URL}/api/recipes/${recipeId}`, {
          method: 'DELETE',
          headers: { 'user-id': currentUser.uid }
        }).catch(err => console.error('Failed to delete from server:', err));
      }
    }
  };

  const handleUseRecipe = async (recipe) => {
    try {
      let finalRecipe = { ...recipe };

      // If the recipe doesn't have parsed ingredients, try to parse them now
      if (!recipe.parsedIngredients || recipe.parsedIngredients.length === 0) {
        console.log('🔄 Parsing ingredients for recipe:', recipe.name);
        
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
          const parseResponse = await fetch(`${API_URL}/api/cart/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listText: recipe.ingredients,
              userId: currentUser?.uid,
              useAI: true,
              options: {
                context: 'recipe',
                recipeInfo: {
                  name: recipe.name,
                  servings: recipe.servings || 4
                }
              }
            })
          });

          if (parseResponse.ok) {
            const parseData = await parseResponse.json();
            if (parseData.success && parseData.cart) {
              finalRecipe.parsedIngredients = parseData.cart;
              finalRecipe.items = parseData.cart;
              console.log(`✅ Parsed ${parseData.cart.length} ingredients for recipe`);
              
              // Update the saved recipe with parsed ingredients
              const updatedRecipes = recipes.map(r => 
                r.id === recipe.id ? finalRecipe : r
              );
              setRecipes(updatedRecipes);
              localStorage.setItem('cartsmash-recipes', JSON.stringify(updatedRecipes));
            } else {
              console.warn('AI parsing returned no results');
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse ingredients:', parseError.message);
          // Continue with the original recipe
        }
      }

      if (onRecipeSelect) {
        onRecipeSelect(finalRecipe);
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error using recipe:', error);
      // Fallback: use original recipe
      if (onRecipeSelect) {
        onRecipeSelect(recipe);
      }
      if (onClose) {
        onClose();
      }
    }
  };

  // Import functionality
  const supportedSites = [
    'allrecipes.com', 'foodnetwork.com', 'seriouseats.com', 'bonappetit.com',
    'epicurious.com', 'simplyrecipes.com', 'budgetbytes.com', 'tasty.co'
  ];

  const handleUrlImport = async () => {
    if (!recipeUrl.trim()) {
      setImportError('Please enter a recipe URL');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${API_URL}/api/recipes/import-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: recipeUrl,
          userId: currentUser?.uid
        })
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData(data.recipe);
        setActiveTab('preview');
      } else {
        setImportError('Could not automatically import. Please try the Paste Text method instead.');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportError('Failed to import recipe. Please try the Paste Text method instead.');
    } finally {
      setIsImporting(false);
    }
  };


  const handleSaveImportedRecipe = async () => {
    if (!previewData) return;

    try {
      let parsedIngredients = [];

      // Try to parse ingredients to cart items using AI
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
        const parseResponse = await fetch(`${API_URL}/api/cart/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listText: previewData.ingredients,
            userId: currentUser?.uid,
            useAI: true,
            options: {
              context: 'recipe',
              recipeInfo: {
                name: previewData.name,
                servings: previewData.servings || 4
              }
            }
          })
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          if (parseData.success && parseData.cart) {
            parsedIngredients = parseData.cart;
            console.log(`✅ Successfully parsed ${parsedIngredients.length} ingredients with AI`);
          } else {
            console.warn('AI parsing returned no results, saving recipe without parsed ingredients');
          }
        } else {
          console.warn('AI parsing endpoint failed, saving recipe without parsed ingredients');
        }
      } catch (parseError) {
        console.warn('AI parsing failed, saving recipe without parsed ingredients:', parseError.message);
        // Continue with saving the recipe even if parsing fails
      }

      const finalRecipe = {
        ...previewData,
        id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        userId: currentUser?.uid || 'guest',
        items: parsedIngredients,
        parsedIngredients: parsedIngredients,
        savedWithAI: parsedIngredients.length > 0
      };

      handleSaveRecipe(finalRecipe);
      
      // If we have parsed ingredients, show success message with count
      if (parsedIngredients.length > 0) {
        alert(`✅ Recipe saved with ${parsedIngredients.length} ingredients ready for your cart!`);
      } else {
        alert(`✅ Recipe saved! Use "Add to Cart" to parse ingredients.`);
      }
      
      // Reset import state
      setRecipeUrl('');
      setPreviewData(null);
      setImportError('');
      setActiveTab('browse');
    } catch (error) {
      console.error('Failed to save imported recipe:', error);
      setImportError('Failed to save recipe: ' + error.message);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>📖 Recipe Manager</h2>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>

        <div style={styles.recipeTabs}>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              ...styles.recipeTab,
              ...(activeTab === 'browse' ? styles.recipeTabActive : {})
            }}
          >
            📚 My Recipes ({recipes.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              ...styles.recipeTab,
              ...(activeTab === 'add' ? styles.recipeTabActive : {})
            }}
          >
            ➕ Add Recipe
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              ...styles.recipeTab,
              ...(activeTab === 'import' ? styles.recipeTabActive : {})
            }}
          >
            🔗 Import Recipe
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            style={{
              ...styles.recipeTab,
              ...(activeTab === 'quick' ? styles.recipeTabActive : {})
            }}
          >
            ⚡ Quick Add
          </button>
          {editingRecipe && (
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                ...styles.recipeTab,
                ...(activeTab === 'edit' ? styles.recipeTabActive : {})
              }}
            >
              ✏️ Edit Recipe
            </button>
          )}
        </div>

        <div style={styles.modalContent}>
          {loading && (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Loading recipes...</p>
            </div>
          )}

          {/* Browse Tab */}
          {!loading && activeTab === 'browse' && (
            <div style={styles.recipeBrowser}>
              {recipes.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📖</div>
                  <p>No recipes saved yet</p>
                  <button 
                    onClick={() => setActiveTab('quick')}
                    style={styles.btnPrimary}
                  >
                    Add Your First Recipe
                  </button>
                </div>
              ) : (
                <div style={styles.recipeGrid}>
                  {recipes.map(recipe => (
                    <div key={recipe.id} style={styles.recipeCard}>
                      <div style={styles.recipeCardHeader}>
                        <h3 style={styles.recipeName}>{recipe.name}</h3>
                        <div style={styles.recipeActionsInline}>
                          <button 
                            onClick={() => handleEditRecipe(recipe)}
                            style={styles.btnIcon}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            style={styles.btnIconDelete}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div style={styles.recipePreview}>
                        <strong>Ingredients:</strong>
                        <div style={styles.ingredientsPreview}>
                          {(recipe.ingredients || '').split('\n').filter(i => i.trim()).slice(0, 3).map((ing, idx) => (
                            <div key={idx}>• {ing}</div>
                          ))}
                          {(recipe.ingredients || '').split('\n').filter(i => i.trim()).length > 3 && (
                            <div style={styles.moreText}>
                              ...and {(recipe.ingredients || '').split('\n').filter(i => i.trim()).length - 3} more
                            </div>
                          )}
                        </div>
                        {recipe.parsedIngredients && recipe.parsedIngredients.length > 0 && (
                          <div style={styles.aiParsedBadge}>
                            🤖 AI-Ready ({recipe.parsedIngredients.length} items)
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleUseRecipe(recipe)}
                        style={styles.btnPrimaryFullWidth}
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
            <div style={styles.recipeForm}>
              <h3 style={styles.formTitle}>{editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}</h3>
              
              <input
                type="text"
                placeholder="Recipe Name"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                style={styles.formInput}
                autoFocus
              />
              
              <textarea
                placeholder="Ingredients (one per line)"
                value={newRecipe.ingredients}
                onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                style={styles.formTextarea}
                rows="10"
              />
              
              <textarea
                placeholder="Instructions (optional)"
                value={newRecipe.instructions}
                onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                style={styles.formTextarea}
                rows="5"
              />
              
              <div style={styles.formActions}>
                <button 
                  onClick={() => handleSaveRecipe()}
                  style={styles.btnSave}
                >
                  💾 {editingRecipe ? 'Update' : 'Save'} Recipe
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('browse');
                    setNewRecipe({ name: '', ingredients: '', instructions: '' });
                    setEditingRecipe(null);
                  }}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Import Recipe Tab */}
          {activeTab === 'import' && (
            <div style={styles.importForm}>
              <h3 style={styles.formTitle}>🔗 Import Recipe</h3>
              
              <div style={styles.urlImportSection}>
                <p style={styles.methodDescription}>
                  Import recipes automatically from popular recipe websites
                </p>
                
                <input
                  type="url"
                  placeholder="https://www.allrecipes.com/recipe/..."
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  style={styles.formInput}
                />
                
                <div style={styles.supportedSites}>
                  <p style={styles.supportedTitle}>✓ Supported sites:</p>
                  <div style={styles.sitesList}>
                    {supportedSites.map(site => (
                      <span key={site} style={styles.site}>• {site}</span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleUrlImport}
                  disabled={isImporting || !recipeUrl.trim()}
                  style={{
                    ...styles.btnPrimary,
                    ...(isImporting || !recipeUrl.trim() ? styles.btnDisabled : {})
                  }}
                >
                  {isImporting ? '⏳ Importing...' : '🔍 Import from URL'}
                </button>
              </div>
              
              {importError && (
                <div style={styles.errorMessage}>
                  ⚠️ {importError}
                </div>
              )}
            </div>
          )}

          {/* Import Preview Tab */}
          {activeTab === 'preview' && previewData && (
            <div style={styles.previewContainer}>
              <h3 style={styles.formTitle}>📋 Recipe Preview</h3>
              
              <div style={styles.previewCard}>
                <h4 style={styles.previewRecipeName}>{previewData.name}</h4>
                
                {previewData.source && (
                  <p style={styles.previewSource}>
                    Source: {previewData.source.replace('_', ' ')}
                  </p>
                )}

                <div style={styles.previewSection}>
                  <h5 style={styles.previewSectionTitle}>
                    Ingredients ({(previewData.ingredients || '').split('\n').filter(l => l.trim()).length} items)
                  </h5>
                  <div style={styles.ingredientsList}>
                    {(previewData.ingredients || '').split('\n').filter(l => l.trim()).map((ing, idx) => (
                      <div key={idx} style={styles.ingredientItem}>• {ing}</div>
                    ))}
                  </div>
                </div>

                {previewData.instructions && (
                  <div style={styles.previewSection}>
                    <h5 style={styles.previewSectionTitle}>Instructions</h5>
                    <p style={styles.instructionsText}>{previewData.instructions}</p>
                  </div>
                )}

                <div style={styles.previewActions}>
                  <button onClick={handleSaveImportedRecipe} style={styles.btnSave}>
                    💾 Save Recipe & Add to Cart
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('import');
                      setPreviewData(null);
                    }} 
                    style={styles.btnCancel}
                  >
                    ✏️ Edit
                  </button>
                </div>
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

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 2, 68, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)'
  },
  
  modal: {
    background: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    border: '3px solid #002244'
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    position: 'relative'
  },
  
  modalTitle: {
    color: 'white',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  modalClose: {
    width: '36px',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontWeight: 'bold',
    lineHeight: 1
  },
  
  recipeTabs: {
    display: 'flex',
    backgroundColor: '#f8f9fa',
    borderBottom: '3px solid #FF6B35'
  },
  
  recipeTab: {
    flex: 1,
    padding: '16px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#6b7280',
    transition: 'all 0.3s ease',
    borderBottom: '3px solid transparent'
  },
  
  recipeTabActive: {
    backgroundColor: 'white',
    color: '#FF6B35',
    borderBottom: '3px solid #FF6B35',
    marginBottom: '-3px'
  },
  
  modalContent: {
    padding: '32px',
    maxHeight: 'calc(90vh - 200px)',
    overflowY: 'auto'
  },
  
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    gap: '16px'
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #FF6B35',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  recipeBrowser: {
    minHeight: '300px'
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    gap: '20px'
  },
  
  emptyIcon: {
    fontSize: '64px',
    opacity: 0.6
  },
  
  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px'
  },
  
  recipeCard: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease'
  },
  
  recipeCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  
  recipeName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#002244',
    flex: 1
  },
  
  recipeActionsInline: {
    display: 'flex',
    gap: '8px',
    marginLeft: '12px'
  },
  
  btnIcon: {
    padding: '8px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease'
  },
  
  btnIconDelete: {
    padding: '8px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease'
  },
  
  recipePreview: {
    marginBottom: '20px'
  },
  
  ingredientsPreview: {
    marginTop: '8px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#4b5563'
  },
  
  moreText: {
    fontStyle: 'italic',
    color: '#9ca3af',
    fontSize: '13px'
  },
  
  aiParsedBadge: {
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: '#dcfdf7',
    color: '#059669',
    fontSize: '12px',
    borderRadius: '12px',
    display: 'inline-block',
    border: '1px solid #a7f3d0',
    fontWeight: '500'
  },
  
  btnPrimary: {
    padding: '12px 24px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  btnPrimaryFullWidth: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  
  recipeForm: {
    padding: '24px',
    backgroundColor: '#fafafa',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  formTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#002244',
    textAlign: 'center'
  },
  
  formInput: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  
  formTextarea: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    minHeight: '100px'
  },
  
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  
  btnSave: {
    padding: '12px 24px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  btnCancel: {
    padding: '12px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  
  importForm: {
    padding: '24px'
  },
  
  urlImportSection: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  methodTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#002244'
  },
  
  methodDescription: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#6b7280'
  },
  
  supportedSites: {
    padding: '16px',
    backgroundColor: '#e8f4fd',
    borderRadius: '8px',
    border: '1px solid #3b82f6',
    margin: '16px 0'
  },
  
  supportedTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e40af'
  },
  
  sitesList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
    fontSize: '12px'
  },
  
  site: {
    color: '#3b82f6'
  },
  
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '16px'
  },
  
  previewContainer: {
    padding: '24px'
  },
  
  previewCard: {
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  
  previewRecipeName: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#002244'
  },
  
  previewSource: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  
  previewSection: {
    marginBottom: '24px'
  },
  
  previewSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151'
  },
  
  ingredientsList: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  
  ingredientItem: {
    padding: '4px 0',
    fontSize: '14px',
    color: '#4b5563'
  },
  
  instructionsText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#4b5563',
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  
  previewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px'
  }
};

export default RecipeManager;