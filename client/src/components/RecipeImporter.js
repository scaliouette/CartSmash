// client/src/components/RecipeImporter.js
import React, { useState } from 'react';
import { ButtonSpinner } from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

function RecipeImporter({ onRecipeImported, onClose }) {
  const [importMethod, setImportMethod] = useState('url'); // url, text, quick
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  
  const { currentUser } = useAuth();

  // Supported recipe sites
  const supportedSites = [
    'allrecipes.com',
    'foodnetwork.com',
    'seriouseats.com',
    'bonappetit.com',
    'epicurious.com',
    'simplyrecipes.com',
    'budgetbytes.com',
    'cookinglight.com',
    'delish.com',
    'tasty.co'
  ];

  const handleUrlImport = async () => {
    if (!recipeUrl.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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
      } else {
        // Fallback to manual parsing
        setError('Could not automatically import. Please paste the recipe text instead.');
        setImportMethod('text');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError('Failed to import recipe. Try pasting the text instead.');
      setImportMethod('text');
    } finally {
      setIsImporting(false);
    }
  };

  const handleTextImport = async () => {
    if (!recipeText.trim()) {
      setError('Please paste recipe text');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      // Parse recipe from text
      const lines = recipeText.split('\n').filter(l => l.trim());
      
      // Detect recipe structure
      let recipeName = 'Imported Recipe';
      let ingredients = [];
      let instructions = [];
      let inIngredients = false;
      let inInstructions = false;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Detect recipe name (usually first line or after "Recipe:")
        if (lines.indexOf(line) === 0 && !lowerLine.includes('ingredient')) {
          recipeName = line.replace(/recipe:?\s*/i, '').trim();
        }
        
        // Detect sections
        if (lowerLine.includes('ingredient')) {
          inIngredients = true;
          inInstructions = false;
          continue;
        }
        if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('method')) {
          inIngredients = false;
          inInstructions = true;
          continue;
        }
        
        // Add to appropriate section
        if (inIngredients && line.trim()) {
          ingredients.push(line.trim());
        } else if (inInstructions && line.trim()) {
          instructions.push(line.trim());
        } else if (!inIngredients && !inInstructions && line.trim()) {
          // Assume ingredients if line contains common measurements
          if (/\d+|cup|tbsp|tsp|oz|lb|can|jar|bottle/i.test(line)) {
            ingredients.push(line.trim());
          }
        }
      }

      const recipe = {
        name: recipeName,
        ingredients: ingredients.join('\n'),
        instructions: instructions.join('\n'),
        source: 'manual_import',
        importedAt: new Date().toISOString()
      };

      setPreviewData(recipe);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!previewData) return;

    setError(''); // Clear any previous errors

    try {
      let parsedIngredients = [];

      // Try to parse ingredients to cart items
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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
        id: `recipe_${Date.now()}`,
        items: parsedIngredients,
        parsedIngredients: parsedIngredients,
        createdAt: new Date().toISOString(),
        savedWithAI: parsedIngredients.length > 0
      };

      if (onRecipeImported) {
        onRecipeImported(finalRecipe);
      }

      // Reset form
      setRecipeUrl('');
      setRecipeText('');
      setPreviewData(null);
      setError('');
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save recipe:', err);
      setError('Failed to save recipe: ' + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📖 Import Recipe</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>×</button>
        )}
      </div>

      {!previewData ? (
        <>
          {/* Import Method Tabs */}
          <div style={styles.tabs}>
            <button
              onClick={() => setImportMethod('url')}
              style={{
                ...styles.tab,
                ...(importMethod === 'url' ? styles.tabActive : {})
              }}
            >
              🔗 From URL
            </button>
            <button
              onClick={() => setImportMethod('text')}
              style={{
                ...styles.tab,
                ...(importMethod === 'text' ? styles.tabActive : {})
              }}
            >
              📝 Paste Text
            </button>
            <button
              onClick={() => setImportMethod('quick')}
              style={{
                ...styles.tab,
                ...(importMethod === 'quick' ? styles.tabActive : {})
              }}
            >
              ⚡ Quick Add
            </button>
          </div>

          <div style={styles.content}>
            {importMethod === 'url' && (
              <div style={styles.urlSection}>
                <label style={styles.label}>Recipe URL</label>
                <input
                  type="url"
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  placeholder="https://www.allrecipes.com/recipe/..."
                  style={styles.input}
                />
                
                <div style={styles.supportedSites}>
                  <p style={styles.supportedTitle}>Supported sites:</p>
                  <div style={styles.sitesList}>
                    {supportedSites.map(site => (
                      <span key={site} style={styles.site}>✓ {site}</span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleUrlImport}
                  disabled={isImporting || !recipeUrl.trim()}
                  style={styles.importButton}
                >
                  {isImporting ? <ButtonSpinner /> : '🔍'} Import Recipe
                </button>
              </div>
            )}

            {importMethod === 'text' && (
              <div style={styles.textSection}>
                <label style={styles.label}>Paste Recipe Text</label>
                <textarea
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder="Paste your recipe here including ingredients and instructions..."
                  style={styles.textarea}
                  rows={12}
                />
                
                <button
                  onClick={handleTextImport}
                  disabled={isImporting || !recipeText.trim()}
                  style={styles.importButton}
                >
                  {isImporting ? <ButtonSpinner /> : '📝'} Parse Recipe
                </button>
              </div>
            )}

            {importMethod === 'quick' && (
              <QuickRecipeForm onRecipeCreated={setPreviewData} />
            )}

            {error && (
              <div style={styles.error}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </>
      ) : (
        <RecipePreview 
          recipe={previewData}
          onSave={handleSaveRecipe}
          onEdit={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}

// Quick Recipe Form Component
function QuickRecipeForm({ onRecipeCreated }) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [servings, setServings] = useState(4);

  const handleQuickAdd = () => {
    if (!name || !ingredients) return;

    onRecipeCreated({
      name,
      ingredients,
      servings,
      source: 'quick_add',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div style={styles.quickForm}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Recipe Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chicken Stir Fry"
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Ingredients (one per line)</label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="2 lbs chicken breast
1 cup rice
2 bell peppers
3 tbsp soy sauce
1 onion, diced
2 cloves garlic"
          style={styles.textarea}
          rows={8}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Servings</label>
        <input
          type="number"
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value) || 4)}
          min="1"
          max="12"
          style={styles.servingsInput}
        />
      </div>

      <button
        onClick={handleQuickAdd}
        disabled={!name || !ingredients}
        style={styles.importButton}
      >
        ⚡ Create Recipe
      </button>
    </div>
  );
}

// Recipe Preview Component
function RecipePreview({ recipe, onSave, onEdit }) {
  const ingredientLines = recipe.ingredients?.split('\n').filter(l => l.trim()) || [];
  
  return (
    <div style={styles.preview}>
      <h3 style={styles.previewTitle}>{recipe.name}</h3>
      
      {recipe.source && (
        <p style={styles.source}>
          Source: {recipe.source.replace('_', ' ')}
        </p>
      )}

      <div style={styles.previewSection}>
        <h4 style={styles.sectionTitle}>
          Ingredients ({ingredientLines.length} items)
        </h4>
        <ul style={styles.ingredientsList}>
          {ingredientLines.map((ing, idx) => (
            <li key={idx} style={styles.ingredient}>
              {ing}
            </li>
          ))}
        </ul>
      </div>

      {recipe.instructions && (
        <div style={styles.previewSection}>
          <h4 style={styles.sectionTitle}>Instructions</h4>
          <p style={styles.instructions}>{recipe.instructions}</p>
        </div>
      )}

      <div style={styles.previewActions}>
        <button onClick={onSave} style={styles.saveButton}>
          💾 Save Recipe & Add to Cart
        </button>
        <button onClick={onEdit} style={styles.editButton}>
          ✏️ Edit
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },

  header: {
    padding: '20px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    margin: 0,
    fontSize: '24px'
  },

  closeButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      background: 'rgba(255,255,255,0.3)'
    }
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
    color: '#FF6B35',
    borderBottom: '2px solid #FF6B35',
    marginBottom: '-2px'
  },

  content: {
    padding: '24px'
  },

  urlSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  textSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },

  input: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#FF6B35'
    }
  },

  textarea: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#FF6B35'
    }
  },

  supportedSites: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #3b82f6'
  },

  supportedTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e40af'
  },

  sitesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },

  site: {
    fontSize: '12px',
    color: '#3b82f6'
  },

  importButton: {
    padding: '14px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#059669'
    },
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    }
  },

  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px'
  },

  quickForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },

  servingsInput: {
    width: '100px',
    padding: '10px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#FF6B35'
    }
  },

  preview: {
    padding: '24px'
  },

  previewTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    color: '#1f2937'
  },

  source: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#6b7280'
  },

  previewSection: {
    marginBottom: '24px'
  },

  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151'
  },

  ingredientsList: {
    margin: 0,
    paddingLeft: '20px'
  },

  ingredient: {
    padding: '4px 0',
    fontSize: '14px',
    color: '#4b5563'
  },

  instructions: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#4b5563'
  },

  previewActions: {
    display: 'flex',
    gap: '12px'
  },

  saveButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#059669'
    }
  },

  editButton: {
    padding: '14px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#4b5563'
    }
  }
};

export default RecipeImporter;