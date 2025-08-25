// client/src/components/NewRecipeForm.js
import React, { useState } from 'react';
import { parseRecipeWithAI, analyzeRecipeNutrition, scaleRecipe } from '../services/RecipeService';
import LoadingSpinner, { InlineSpinner } from './LoadingSpinner';

function NewRecipeForm({ onSave, onCancel, initialRecipe = null }) {
  const [recipe, setRecipe] = useState({
    name: initialRecipe?.name || '',
    description: initialRecipe?.description || '',
    ingredients: initialRecipe?.ingredients || '',
    instructions: initialRecipe?.instructions || '',
    servings: initialRecipe?.servings || 4,
    prepTime: initialRecipe?.prepTime || '30 min',
    cookTime: initialRecipe?.cookTime || '30 min',
    difficulty: initialRecipe?.difficulty || 'intermediate',
    cuisine: initialRecipe?.cuisine || '',
    tags: initialRecipe?.tags || []
  });

  const [activeTab, setActiveTab] = useState('manual');
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [nutritionInfo, setNutritionInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle AI-powered recipe parsing
  const handleAIParse = async () => {
    if (!aiInput.trim()) {
      setErrors({ ai: 'Please enter or paste recipe text' });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      const parsedRecipe = await parseRecipeWithAI(aiInput);
      
      // Update form with AI-parsed data
      setRecipe({
        ...recipe,
        name: parsedRecipe.name || recipe.name,
        description: parsedRecipe.description || recipe.description,
        ingredients: parsedRecipe.ingredients || recipe.ingredients,
        instructions: parsedRecipe.instructions || recipe.instructions,
        servings: parsedRecipe.servings || recipe.servings,
        prepTime: parsedRecipe.prepTime || recipe.prepTime,
        cookTime: parsedRecipe.cookTime || recipe.cookTime,
        cuisine: parsedRecipe.cuisine || recipe.cuisine,
        difficulty: parsedRecipe.difficulty || recipe.difficulty
      });

      setAiSuggestions(parsedRecipe.suggestions || null);
      setActiveTab('manual'); // Switch to manual tab to show parsed results
      
    } catch (error) {
      setErrors({ ai: 'Failed to parse recipe with AI. Please try manual entry.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle nutrition analysis
  const handleNutritionAnalysis = async () => {
    if (!recipe.ingredients) {
      setErrors({ nutrition: 'Please add ingredients first' });
      return;
    }

    setIsProcessing(true);
    try {
      const nutrition = await analyzeRecipeNutrition(recipe);
      setNutritionInfo(nutrition);
    } catch (error) {
      setErrors({ nutrition: 'Failed to analyze nutrition' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle recipe scaling
  const handleScaleRecipe = async (newServings) => {
    if (!recipe.ingredients) return;

    setIsProcessing(true);
    try {
      const scaledRecipe = await scaleRecipe(recipe, newServings);
      setRecipe({
        ...recipe,
        ingredients: scaledRecipe.ingredients,
        servings: newServings
      });
    } catch (error) {
      console.error('Failed to scale recipe:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate recipe before saving
  const validateRecipe = () => {
    const newErrors = {};
    
    if (!recipe.name.trim()) {
      newErrors.name = 'Recipe name is required';
    }
    
    if (!recipe.ingredients.trim()) {
      newErrors.ingredients = 'Ingredients are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateRecipe()) return;

    const finalRecipe = {
      ...recipe,
      id: initialRecipe?.id || `recipe_${Date.now()}`,
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nutrition: nutritionInfo
    };

    onSave(finalRecipe);
  };

  // Handle tag management
  const addTag = (tag) => {
    if (tag && !recipe.tags.includes(tag)) {
      setRecipe({ ...recipe, tags: [...recipe.tags, tag] });
    }
  };

  const removeTag = (tagToRemove) => {
    setRecipe({
      ...recipe,
      tags: recipe.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal new-recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {initialRecipe ? '✏️ Edit Recipe' : '➕ New Recipe'}
          </h2>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>

        {/* Tab Navigation */}
        <div className="recipe-form-tabs">
          <button
            onClick={() => setActiveTab('manual')}
            className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
          >
            ✍️ Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
          >
            🤖 AI Import
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`tab-button ${activeTab === 'quick' ? 'active' : ''}`}
          >
            ⚡ Quick Add
          </button>
        </div>

        <div className="modal-content recipe-form-content">
          {/* AI Import Tab */}
          {activeTab === 'ai' && (
            <div className="ai-import-section">
              <p className="help-text">
                Paste any recipe text, URL, or ingredients list. Our AI will parse and structure it for you!
              </p>
              
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Paste a recipe here...&#10;&#10;It can be:&#10;• A complete recipe with instructions&#10;• Just a list of ingredients&#10;• A recipe URL&#10;• Even a photo description!"
                className="ai-input-textarea"
                rows="12"
              />
              
              {errors.ai && (
                <div className="error-message">{errors.ai}</div>
              )}
              
              <button
                onClick={handleAIParse}
                disabled={isProcessing || !aiInput.trim()}
                className="btn btn-primary full-width"
              >
                {isProcessing ? <InlineSpinner /> : '🤖'} Parse with AI
              </button>
              
              {aiSuggestions && (
                <div className="ai-suggestions">
                  <h4>AI Suggestions:</h4>
                  <ul>
                    {aiSuggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <div className="manual-entry-section">
              {/* Basic Info */}
              <div className="form-section">
                <label className="form-label">
                  Recipe Name *
                  <input
                    type="text"
                    value={recipe.name}
                    onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                    placeholder="e.g., Grandma's Chicken Soup"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </label>

                <label className="form-label">
                  Description
                  <textarea
                    value={recipe.description}
                    onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                    placeholder="A brief description of your recipe..."
                    className="form-textarea"
                    rows="2"
                  />
                </label>
              </div>

              {/* Recipe Details */}
              <div className="form-row">
                <label className="form-label">
                  Servings
                  <div className="servings-control">
                    <input
                      type="number"
                      value={recipe.servings}
                      onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 4 })}
                      min="1"
                      max="20"
                      className="form-input-small"
                    />
                    <button
                      onClick={() => handleScaleRecipe(recipe.servings * 2)}
                      className="btn-scale"
                      title="Double recipe"
                    >
                      2x
                    </button>
                    <button
                      onClick={() => handleScaleRecipe(Math.max(1, Math.floor(recipe.servings / 2)))}
                      className="btn-scale"
                      title="Halve recipe"
                    >
                      ½x
                    </button>
                  </div>
                </label>

                <label className="form-label">
                  Prep Time
                  <input
                    type="text"
                    value={recipe.prepTime}
                    onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
                    placeholder="e.g., 15 min"
                    className="form-input-small"
                  />
                </label>

                <label className="form-label">
                  Cook Time
                  <input
                    type="text"
                    value={recipe.cookTime}
                    onChange={(e) => setRecipe({ ...recipe, cookTime: e.target.value })}
                    placeholder="e.g., 45 min"
                    className="form-input-small"
                  />
                </label>
              </div>

              {/* Ingredients */}
              <div className="form-section">
                <label className="form-label">
                  Ingredients * (one per line)
                  <textarea
                    value={recipe.ingredients}
                    onChange={(e) => setRecipe({ ...recipe, ingredients: e.target.value })}
                    placeholder="2 lbs chicken breast&#10;1 onion, diced&#10;3 cloves garlic, minced&#10;1 cup rice&#10;4 cups chicken broth"
                    className={`form-textarea ${errors.ingredients ? 'error' : ''}`}
                    rows="8"
                  />
                  {errors.ingredients && <span className="error-text">{errors.ingredients}</span>}
                </label>
              </div>

              {/* Instructions */}
              <div className="form-section">
                <label className="form-label">
                  Instructions (optional)
                  <textarea
                    value={recipe.instructions}
                    onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
                    placeholder="1. Heat oil in a large pot&#10;2. Add onions and cook until soft&#10;3. Add garlic and cook 1 minute&#10;4. ..."
                    className="form-textarea"
                    rows="6"
                  />
                </label>
              </div>

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="btn-link"
              >
                {showAdvanced ? '▼' : '▶'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="advanced-section">
                  <div className="form-row">
                    <label className="form-label">
                      Difficulty
                      <select
                        value={recipe.difficulty}
                        onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })}
                        className="form-select"
                      >
                        <option value="easy">Easy</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </label>

                    <label className="form-label">
                      Cuisine
                      <input
                        type="text"
                        value={recipe.cuisine}
                        onChange={(e) => setRecipe({ ...recipe, cuisine: e.target.value })}
                        placeholder="e.g., Italian, Mexican"
                        className="form-input"
                      />
                    </label>
                  </div>

                  {/* Tags */}
                  <div className="tags-section">
                    <label className="form-label">Tags</label>
                    <div className="tags-container">
                      {recipe.tags.map(tag => (
                        <span key={tag} className="tag">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="tag-remove">×</button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add tags (press Enter)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="form-input"
                    />
                  </div>

                  {/* Nutrition Analysis */}
                  <button
                    onClick={handleNutritionAnalysis}
                    disabled={isProcessing || !recipe.ingredients}
                    className="btn btn-secondary"
                  >
                    {isProcessing ? <InlineSpinner /> : '📊'} Analyze Nutrition
                  </button>

                  {nutritionInfo && (
                    <div className="nutrition-info">
                      <h4>Nutrition per serving:</h4>
                      <div className="nutrition-grid">
                        <div>Calories: {nutritionInfo.calories}</div>
                        <div>Protein: {nutritionInfo.protein}g</div>
                        <div>Carbs: {nutritionInfo.carbs}g</div>
                        <div>Fat: {nutritionInfo.fat}g</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Add Tab */}
          {activeTab === 'quick' && (
            <div className="quick-add-section">
              <p className="help-text">
                Just paste ingredients! Perfect for saving shopping lists as recipes.
              </p>
              
              <input
                type="text"
                placeholder="Recipe Name"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                className="form-input"
              />
              
              <textarea
                value={recipe.ingredients}
                onChange={(e) => setRecipe({ ...recipe, ingredients: e.target.value })}
                placeholder="Just paste your ingredients list here...&#10;&#10;2 lbs chicken&#10;1 bag of rice&#10;Mixed vegetables&#10;Soy sauce"
                className="form-textarea"
                rows="10"
              />
              
              <button
                onClick={handleSave}
                disabled={!recipe.name || !recipe.ingredients}
                className="btn btn-primary full-width"
              >
                💾 Quick Save
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab !== 'quick' && (
          <div className="modal-footer">
            <button onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="btn btn-primary"
            >
              {isProcessing ? <InlineSpinner /> : '💾'} {initialRecipe ? 'Update' : 'Save'} Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewRecipeForm;