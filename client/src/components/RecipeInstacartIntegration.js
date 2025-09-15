// client/src/components/RecipeInstacartIntegration.js
// Recipe-specific Instacart integration component

import React, { useState, useCallback } from 'react';
import instacartCheckoutService from '../services/instacartCheckoutService';
import instacartShoppingListService from '../services/instacartShoppingListService';
import RetailerSelector from './RetailerSelector';
import './RecipeInstacartIntegration.css';

const RecipeInstacartIntegration = ({
  recipe,
  onSuccess,
  onError,
  onClose,
  mode = 'recipe' // 'recipe' or 'shopping-list'
}) => {
  const [currentStep, setCurrentStep] = useState('recipe-review');
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [location, setLocation] = useState('95670');
  const [recipeData, setRecipeData] = useState({
    title: recipe?.title || recipe?.name || 'My Recipe',
    author: recipe?.author || 'CartSmash User',
    servings: recipe?.servings || 4,
    cookingTime: recipe?.cookingTime || recipe?.cooking_time || null,
    instructions: recipe?.instructions || [],
    ingredients: recipe?.ingredients || [],
    image: recipe?.image || recipe?.imageUrl || null,
    dietaryRestrictions: recipe?.dietaryRestrictions || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // ============ RECIPE DATA PROCESSING ============

  const formatIngredientsForInstacart = useCallback((ingredients) => {
    if (!ingredients || !Array.isArray(ingredients)) {
      console.warn('Invalid ingredients format:', ingredients);
      return [];
    }

    return ingredients.map((ingredient, index) => {
      // Handle different ingredient formats
      let name, quantity = 1, unit = 'each', measurements = [];

      if (typeof ingredient === 'string') {
        // Simple string format: "2 cups flour"
        const match = ingredient.match(/^(\d*\.?\d*)\s*(\w*)\s*(.+)$/);
        if (match) {
          quantity = parseFloat(match[1]) || 1;
          unit = match[2] || 'each';
          name = match[3].trim();
        } else {
          name = ingredient.trim();
        }
      } else if (typeof ingredient === 'object') {
        // Object format with structured data
        name = ingredient.name || ingredient.ingredient || ingredient.item || `Ingredient ${index + 1}`;
        quantity = parseFloat(ingredient.quantity) || parseFloat(ingredient.amount) || 1;
        unit = ingredient.unit || 'each';

        // Handle measurements array
        if (ingredient.measurements && Array.isArray(ingredient.measurements)) {
          measurements = ingredient.measurements.map(m => ({
            quantity: parseFloat(m.quantity) || 1,
            unit: m.unit || 'each'
          }));
        } else if (quantity && unit) {
          measurements = [{ quantity, unit }];
        }
      } else {
        name = `Ingredient ${index + 1}`;
      }

      return {
        name: name.trim(),
        display_text: name.trim(),
        measurements: measurements.length > 0 ? measurements : [{ quantity, unit }],
        // Add filters if available
        ...(ingredient.brandFilters && { filters: { brand_filters: ingredient.brandFilters } }),
        ...(ingredient.healthFilters && { filters: { ...ingredient.filters, health_filters: ingredient.healthFilters } }),
        // Add product IDs or UPCs if available
        ...(ingredient.productIds && { product_ids: ingredient.productIds }),
        ...(ingredient.upcs && { upcs: ingredient.upcs })
      };
    });
  }, []);

  const prepareRecipePayload = useCallback(() => {
    const formattedIngredients = formatIngredientsForInstacart(recipeData.ingredients);

    return {
      title: recipeData.title,
      author: recipeData.author,
      servings: recipeData.servings,
      cooking_time: recipeData.cookingTime,
      image_url: recipeData.image,
      instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [recipeData.instructions || 'Enjoy your meal!'],
      ingredients: formattedIngredients,
      dietaryRestrictions: recipeData.dietaryRestrictions,
      external_reference_id: recipe?.id || `cartsmash_recipe_${Date.now()}`
    };
  }, [recipeData, recipe, formatIngredientsForInstacart]);

  // ============ STEP HANDLERS ============

  const handleRecipeUpdate = useCallback((field, value) => {
    setRecipeData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleProceedToRetailerSelection = useCallback(() => {
    // Validate recipe data
    if (!recipeData.title.trim()) {
      setError('Recipe title is required');
      return;
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      setError('Recipe must have at least one ingredient');
      return;
    }

    setError(null);
    setCurrentStep('retailer-selection');
  }, [recipeData]);

  const handleRetailerSelected = useCallback((retailer) => {
    setSelectedRetailer(retailer);
    setCurrentStep('create-recipe');
  }, []);

  // ============ INSTACART INTEGRATION ============

  const createInstacartRecipe = useCallback(async () => {
    if (!selectedRetailer) {
      setError('Please select a retailer first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🍳 Creating Instacart recipe page...');

      const payload = prepareRecipePayload();
      console.log('📤 Recipe payload:', payload);

      const options = {
        retailerKey: selectedRetailer.id || selectedRetailer.retailer_key,
        partnerUrl: 'https://cartsmash.com',
        enablePantryItems: true
      };

      const result = await instacartCheckoutService.createRecipePage(payload, options);

      if (result.success) {
        setResult(result);
        setCurrentStep('success');
        console.log('✅ Recipe created successfully:', result);

        if (onSuccess) {
          onSuccess({
            type: 'recipe',
            result: result,
            retailer: selectedRetailer,
            recipe: payload
          });
        }
      } else {
        throw new Error(result.error || 'Failed to create recipe page');
      }
    } catch (err) {
      console.error('❌ Error creating recipe:', err);
      setError(err.message);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRetailer, prepareRecipePayload, onSuccess, onError]);

  const createInstacartShoppingList = useCallback(async () => {
    if (!selectedRetailer) {
      setError('Please select a retailer first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📝 Creating Instacart shopping list...');

      const listData = {
        title: `${recipeData.title} - Shopping List`,
        items: formatIngredientsForInstacart(recipeData.ingredients).map(ingredient => ({
          name: ingredient.name,
          quantity: ingredient.measurements[0]?.quantity || 1,
          unit: ingredient.measurements[0]?.unit || 'each',
          display_text: ingredient.display_text,
          line_item_measurements: ingredient.measurements
        })),
        instructions: [`Shopping list for: ${recipeData.title}`, 'Created with CartSmash']
      };

      const options = {
        partnerUrl: 'https://cartsmash.com',
        expiresIn: 30
      };

      // Enhanced shopping list creation with full API features
      const enhancedListData = {
        title: listData.title,
        items: listData.items.map(item => ({
          name: item.name,
          productName: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          category: item.category || 'General',
          // Enhanced features from recipe data
          brand: item.brand || null,
          upc: item.upc || null,
          healthFilters: item.healthFilters || [],
          brandFilters: item.brandFilters || [],
          line_item_measurements: item.line_item_measurements || []
        })),
        instructions: listData.instructions,
        imageUrl: `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop`,
        preferences: {
          preferredBrands: [],
          dietaryRestrictions: [],
          measurementPreferences: 'imperial'
        }
      };

      const result = await instacartShoppingListService.createEnhancedShoppingList(enhancedListData, options);

      if (result.success) {
        setResult(result);
        setCurrentStep('success');
        console.log('✅ Shopping list created successfully:', result);

        if (onSuccess) {
          onSuccess({
            type: 'shopping-list',
            result: result,
            retailer: selectedRetailer,
            recipe: recipeData
          });
        }
      } else {
        throw new Error(result.error || 'Failed to create shopping list');
      }
    } catch (err) {
      console.error('❌ Error creating shopping list:', err);
      setError(err.message);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRetailer, recipeData, formatIngredientsForInstacart, onSuccess, onError]);

  const handleCreateOnInstacart = useCallback(() => {
    if (mode === 'shopping-list') {
      createInstacartShoppingList();
    } else {
      createInstacartRecipe();
    }
  }, [mode, createInstacartRecipe, createInstacartShoppingList]);

  const openInstacartPage = useCallback(() => {
    if (result?.instacartUrl) {
      window.open(result.instacartUrl, '_blank', 'noopener,noreferrer');
    }
  }, [result]);

  // ============ RENDER HELPERS ============

  const renderRecipeReview = () => (
    <div className="recipe-step">
      <h3>Review Your {mode === 'shopping-list' ? 'Shopping List' : 'Recipe'}</h3>

      <div className="recipe-form">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={recipeData.title}
            onChange={(e) => handleRecipeUpdate('title', e.target.value)}
            placeholder="Enter recipe title"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Author</label>
            <input
              type="text"
              value={recipeData.author}
              onChange={(e) => handleRecipeUpdate('author', e.target.value)}
              placeholder="Recipe author"
            />
          </div>
          <div className="form-group">
            <label>Servings</label>
            <input
              type="number"
              value={recipeData.servings}
              onChange={(e) => handleRecipeUpdate('servings', parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>
          {mode === 'recipe' && (
            <div className="form-group">
              <label>Cooking Time (min)</label>
              <input
                type="number"
                value={recipeData.cookingTime || ''}
                onChange={(e) => handleRecipeUpdate('cookingTime', parseInt(e.target.value) || null)}
                placeholder="Optional"
                min="1"
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Ingredients ({recipeData.ingredients.length})</label>
          <div className="ingredients-list">
            {recipeData.ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                <span>{typeof ingredient === 'string' ? ingredient : ingredient.name || ingredient.ingredient || `Ingredient ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>

        {mode === 'recipe' && (
          <div className="form-group">
            <label>Instructions</label>
            <div className="instructions-list">
              {recipeData.instructions.map((instruction, index) => (
                <div key={index} className="instruction-item">
                  <span>{index + 1}. {instruction}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn-primary" onClick={handleProceedToRetailerSelection}>
          Continue to Store Selection
        </button>
      </div>
    </div>
  );

  const renderRetailerSelection = () => (
    <div className="recipe-step">
      <RetailerSelector
        onRetailerSelect={handleRetailerSelected}
        selectedRetailer={selectedRetailer}
        location={location}
        onLocationChange={setLocation}
      />
    </div>
  );

  const renderCreateRecipe = () => (
    <div className="recipe-step create-step">
      <h3>Create {mode === 'shopping-list' ? 'Shopping List' : 'Recipe'} on Instacart</h3>

      <div className="creation-summary">
        <div className="summary-card">
          <h4>{recipeData.title}</h4>
          <div className="summary-details">
            <span>📍 Store: {selectedRetailer.name}</span>
            <span>🍽️ Servings: {recipeData.servings}</span>
            <span>📝 Ingredients: {recipeData.ingredients.length}</span>
            {mode === 'recipe' && recipeData.cookingTime && (
              <span>⏱️ Time: {recipeData.cookingTime} min</span>
            )}
          </div>
        </div>
      </div>

      <div className="creation-info">
        <h5>What happens next?</h5>
        <ul>
          <li>Your {mode === 'shopping-list' ? 'shopping list' : 'recipe'} will be created on Instacart</li>
          <li>You'll get a direct link to view and shop the ingredients</li>
          <li>Customers can select {selectedRetailer.name} or choose another nearby store</li>
          <li>The page will be optimized for ingredient matching and quantities</li>
        </ul>
      </div>

      <div className="step-actions">
        <button
          className="btn-primary create-btn"
          onClick={handleCreateOnInstacart}
          disabled={loading}
        >
          {loading ? 'Creating...' : `Create ${mode === 'shopping-list' ? 'Shopping List' : 'Recipe'} on Instacart`}
        </button>
        <button
          className="btn-secondary"
          onClick={() => setCurrentStep('retailer-selection')}
          disabled={loading}
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="recipe-step success-step">
      <div className="success-icon">🎉</div>
      <h3>{mode === 'shopping-list' ? 'Shopping List' : 'Recipe'} Created Successfully!</h3>

      <div className="success-details">
        <div className="result-info">
          <h4>{recipeData.title}</h4>
          <p>Your {mode === 'shopping-list' ? 'shopping list' : 'recipe'} is now live on Instacart</p>
        </div>

        <div className="result-stats">
          <div className="stat">
            <span className="stat-value">{recipeData.ingredients.length}</span>
            <span className="stat-label">Ingredients</span>
          </div>
          <div className="stat">
            <span className="stat-value">{selectedRetailer.name}</span>
            <span className="stat-label">Default Store</span>
          </div>
          {mode === 'recipe' && (
            <div className="stat">
              <span className="stat-value">{recipeData.servings}</span>
              <span className="stat-label">Servings</span>
            </div>
          )}
        </div>
      </div>

      <div className="success-actions">
        <button className="btn-primary" onClick={openInstacartPage}>
          View on Instacart
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="instacart-url">
        <label>Share this link:</label>
        <div className="url-display">
          <input type="text" value={result?.instacartUrl || ''} readOnly />
          <button
            onClick={() => navigator.clipboard.writeText(result?.instacartUrl || '')}
            title="Copy link"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============

  return (
    <div className="recipe-instacart-integration">
      <div className="integration-header">
        <h2>Export to Instacart</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="integration-progress">
        <div className={`step ${currentStep === 'recipe-review' ? 'active' : 'completed'}`}>
          1. Review {mode === 'shopping-list' ? 'List' : 'Recipe'}
        </div>
        <div className={`step ${currentStep === 'retailer-selection' ? 'active' : currentStep === 'create-recipe' || currentStep === 'success' ? 'completed' : ''}`}>
          2. Select Store
        </div>
        <div className={`step ${currentStep === 'create-recipe' ? 'active' : currentStep === 'success' ? 'completed' : ''}`}>
          3. Create
        </div>
        <div className={`step ${currentStep === 'success' ? 'active' : ''}`}>
          4. Done
        </div>
      </div>

      <div className="integration-body">
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {currentStep === 'recipe-review' && renderRecipeReview()}
        {currentStep === 'retailer-selection' && renderRetailerSelection()}
        {currentStep === 'create-recipe' && renderCreateRecipe()}
        {currentStep === 'success' && renderSuccess()}
      </div>
    </div>
  );
};

export default RecipeInstacartIntegration;