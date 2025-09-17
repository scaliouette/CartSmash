// client/src/components/UnifiedRecipeCard.js
// Unified component for displaying both AI and URL-imported recipes

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveRecipeToLibrary } from '../services/RecipeService';

export default function UnifiedRecipeCard({ 
  recipe, 
  onAddToLibrary, 
  onAddToMealPlan,
  showSelection = false,
  isSelected = false,
  onSelectionChange,
  importStatus: externalImportStatus = null 
}) {
  const { currentUser } = useAuth();
  const [localImportStatus, setLocalImportStatus] = useState(externalImportStatus);
  const [isExpanded, setIsExpanded] = useState(false);
  const uid = currentUser?.uid;

  // Use external status if provided, otherwise use local
  const importStatus = externalImportStatus !== null ? externalImportStatus : localImportStatus;

  // Determine icon based on meal type or recipe characteristics
  const getRecipeIcon = () => {
    if (recipe.icon) return recipe.icon;
    
    const mealTypeIcons = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snack: '🍎',
      dessert: '🍰',
      default: '🍴'
    };
    
    return mealTypeIcons[recipe.mealType] || mealTypeIcons.default;
  };

  // Format display for ingredients
  const formatIngredientDisplay = () => {
    const ingredients = recipe.ingredients || [];
    const displayCount = 5;
    const displayIngredients = ingredients.slice(0, displayCount);
    
    return displayIngredients
      .map(ing => {
        if (typeof ing === 'string') return `• ${ing}`;
        
        // If it's a structured ingredient, format it with quantity, unit, and item
        if (ing.quantity && ing.unit && ing.item) {
          const quantity = typeof ing.quantity === 'object' ? 
            (ing.quantity.min && ing.quantity.max ? `${ing.quantity.min}-${ing.quantity.max}` : ing.quantity.min || ing.quantity.max || ing.quantity.text) :
            ing.quantity;
          return `• ${quantity} ${ing.unit} ${ing.item}`;
        }
        
        // If it has original text, use that
        if (ing.original) return `• ${ing.original}`;
        if (ing.raw) return `• ${ing.raw}`;
        
        // Fallback to just the item name
        return `• ${ing.item || ''}`;
      })
      .filter(Boolean)
      .join('\n');
  };

  // Handle adding to library
  const handleAddToLibrary = async () => {
    if (importStatus === 'imported' || importStatus === 'importing') return;
    
    setLocalImportStatus('importing');
    
    try {
      if (onAddToLibrary) {
        await onAddToLibrary(recipe);
      } else {
        await saveRecipeToLibrary(uid, recipe);
      }
      setLocalImportStatus('imported');
    } catch (error) {
      console.error('Error adding to library:', error);
      setLocalImportStatus('error');
    }
  };

  // Handle adding to meal plan
  const handleAddToMealPlan = async () => {
    // First ensure it's in library
    if (importStatus !== 'imported') {
      await handleAddToLibrary();
    }
    
    if (onAddToMealPlan) {
      onAddToMealPlan(recipe);
    }
  };

  // Determine source label
  const getSourceLabel = () => {
    if (recipe.source === 'ai-generated') {
      return 'AI Generated';
    } else if (recipe.sourceUrl) {
      try {
        const url = new URL(recipe.sourceUrl);
        return url.hostname.replace('www.', '');
      } catch {
        return 'Imported';
      }
    }
    return null;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 transition-all ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
      style={{
        fontFamily: 'inherit',
        margin: '16px 0'
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px 16px 24px' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {showSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelectionChange && onSelectionChange(recipe.id, e.target.checked)}
                className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
            )}

            <span className="text-2xl flex-shrink-0">{getRecipeIcon()}</span>

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {recipe.title || recipe.name}
              </h3>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                  {recipe.mealType || 'recipe'}
                </span>

                {getSourceLabel() && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {getSourceLabel()}
                  </span>
                )}

                {recipe.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {recipe.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recipe Image */}
          {recipe.imageUrl && recipe.imageUrl !== '/images/recipes/default.jpg' && (
            <div className="ml-4 flex-shrink-0">
              <img
                src={recipe.imageUrl || recipe.image}
                alt={recipe.title}
                className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsExpanded(!isExpanded)}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px' }}>
        {/* Description */}
        {recipe.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>
        )}

        {/* Key Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          {(recipe.prepTime > 0 || recipe.time?.prep_min > 0 || recipe.totalTime > 0 || recipe.time?.total_min > 0) && (
            <span className="flex items-center gap-1">
              ⏱️ {recipe.totalTime || recipe.time?.total_min || recipe.prepTime || recipe.time?.prep_min} min
            </span>
          )}
          {(recipe.servings || recipe.yield?.servings) && (
            <span className="flex items-center gap-1">
              🍽️ {recipe.servings || recipe.yield?.servings}
            </span>
          )}
          {(recipe.nutrition?.calories > 0 || recipe.nutrition_per_serving?.calories_kcal > 0) && (
            <span className="flex items-center gap-1">
              🔥 {recipe.nutrition?.calories || recipe.nutrition_per_serving?.calories_kcal} cal
            </span>
          )}
          <span className="flex items-center gap-1">
            🥘 {recipe.ingredients?.length || 0} ingredients
          </span>
        </div>

        {/* Ingredient Preview */}
        <div className="mb-4">
          <div className="text-sm text-gray-700">
            {recipe.ingredients?.slice(0, 3).map((ing, index) => {
              let ingredientText = '';
              if (typeof ing === 'string') {
                ingredientText = ing;
              } else if (ing.quantity && ing.unit && ing.item) {
                const quantity = typeof ing.quantity === 'object' ?
                  (ing.quantity.min && ing.quantity.max ? `${ing.quantity.min}-${ing.quantity.max}` : ing.quantity.min || ing.quantity.max || ing.quantity.text) :
                  ing.quantity;
                ingredientText = `${quantity} ${ing.unit} ${ing.item}`;
              } else if (ing.original) {
                ingredientText = ing.original;
              } else if (ing.raw) {
                ingredientText = ing.raw;
              } else {
                ingredientText = ing.item || '';
              }

              return (
                <span key={index} className="inline-block mr-2 mb-1">
                  {ingredientText}{index < 2 && index < (recipe.ingredients?.length - 1) ? ',' : ''}
                </span>
              );
            })}
            {recipe.ingredients?.length > 3 && (
              <span className="text-gray-500">
                + {recipe.ingredients.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Simplified Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.slice(0, 4).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                +{recipe.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expandable Instructions Section */}
      {isExpanded && recipe.instructions && (
        <div style={{ padding: '16px 24px 0 24px' }} className="border-t border-gray-200">
          <h4 className="font-semibold text-sm mb-3 text-gray-900">Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
            {recipe.instructions.map((instruction, index) => (
              <li key={index}>
                {typeof instruction === 'string'
                  ? instruction
                  : instruction.instruction || instruction.text}
              </li>
            ))}
          </ol>

          {recipe.sourceUrl && (
            <div className="mb-4">
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
              >
                View Original Recipe
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div style={{ padding: '16px 24px 20px 24px' }} className="border-t border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            {isExpanded ? '👁️ Less' : '👁️ View Recipe'}
          </button>

          <button
            onClick={handleAddToLibrary}
            disabled={importStatus === 'importing'}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              importStatus === 'imported'
                ? 'bg-green-100 text-green-700 cursor-default'
                : importStatus === 'importing'
                ? 'bg-gray-100 text-gray-500 cursor-wait'
                : importStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {importStatus === 'imported' ? (
              <>✓ Saved</>
            ) : importStatus === 'importing' ? (
              <>Saving...</>
            ) : importStatus === 'error' ? (
              <>❌ Retry</>
            ) : (
              <>💾 Save</>
            )}
          </button>

          <button
            onClick={handleAddToMealPlan}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            📅 Plan
          </button>
        </div>
      </div>
    </div>
  );
}