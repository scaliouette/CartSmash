// client/src/components/AIMealPlanReview.js
// Component for reviewing and accepting AI-generated meal plans

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveParsedMealPlan, regenerateMeal } from '../services/aiMealPlanService';
import { assignRecipeToMeal } from '../services/mealPlanService';
import UnifiedRecipeCard from './UnifiedRecipeCard';

export default function AIMealPlanReview({ 
  mealPlan, 
  onAccept, 
  onReject, 
  onModify 
}) {
  const { currentUser } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [modifications, setModifications] = useState({});
  const [regeneratingMeals, setRegeneratingMeals] = useState(new Set());
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());
  const [viewMode, setViewMode] = useState('calendar'); // calendar, recipes, shopping

  const handleAcceptMealPlan = async () => {
    if (!mealPlan || !currentUser?.uid) return;

    setIsAccepting(true);
    try {
      const mealPlanId = await saveParsedMealPlan(currentUser.uid, mealPlan);
      
      if (onAccept) {
        onAccept(mealPlanId, mealPlan);
      }
    } catch (error) {
      console.error('Error accepting meal plan:', error);
      alert('Failed to save meal plan. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRegenerateMeal = async (day, mealType) => {
    const mealKey = `${day}-${mealType}`;
    setRegeneratingMeals(prev => new Set([...prev, mealKey]));

    try {
      const newRecipe = await regenerateMeal(
        currentUser?.uid,
        'temp-meal-plan-id', // This would be the actual meal plan ID
        day,
        mealType,
        {
          dietary: mealPlan.metadata?.dietaryRestrictions || [],
          familySize: mealPlan.metadata?.familySize || 4
        }
      );

      // Update the meal plan with the new recipe
      const updatedMealPlan = { ...mealPlan };
      if (updatedMealPlan.weekSchedule?.[day]?.meals) {
        updatedMealPlan.weekSchedule[day].meals[mealType] = newRecipe.id;
      }

      // Find and replace the recipe in the recipes array
      const recipeIndex = updatedMealPlan.recipes.findIndex(r => 
        r.dayAssigned === day && r.mealType === mealType
      );
      
      if (recipeIndex !== -1) {
        updatedMealPlan.recipes[recipeIndex] = {
          ...newRecipe,
          dayAssigned: day,
          mealType: mealType
        };
      }

      if (onModify) {
        onModify(updatedMealPlan);
      }
    } catch (error) {
      console.error('Error regenerating meal:', error);
      alert('Failed to regenerate meal. Please try again.');
    } finally {
      setRegeneratingMeals(prev => {
        const newSet = new Set(prev);
        newSet.delete(mealKey);
        return newSet;
      });
    }
  };

  const handleRecipeSelection = (recipeId, isSelected) => {
    const newSelection = new Set(selectedRecipes);
    if (isSelected) {
      newSelection.add(recipeId);
    } else {
      newSelection.delete(recipeId);
    }
    setSelectedRecipes(newSelection);
  };

  const getDayName = (dayIndex) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex] || `Day ${dayIndex + 1}`;
  };

  const getMealTypeDisplayName = (mealType) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getRecipeForMeal = (day, mealType) => {
    return mealPlan.recipes?.find(r => 
      r.dayAssigned === day && r.mealType === mealType
    );
  };

  if (!mealPlan) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">No meal plan to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mealPlan.metadata?.title || 'AI Generated Meal Plan'}
            </h2>
            <p className="text-gray-600 mt-1">
              {mealPlan.metadata?.familySize || 4} people • {Object.keys(mealPlan.weekSchedule || {}).length} days
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => onReject && onReject()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ❌ Reject
            </button>
            <button
              onClick={handleAcceptMealPlan}
              disabled={isAccepting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAccepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>✅ Accept & Save</>
              )}
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              viewMode === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Calendar View
          </button>
          <button
            onClick={() => setViewMode('recipes')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              viewMode === 'recipes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📖 All Recipes ({mealPlan.recipes?.length || 0})
          </button>
          <button
            onClick={() => setViewMode('shopping')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              viewMode === 'shopping'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🛒 Shopping List ({mealPlan.shoppingList?.length || 0})
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {Object.entries(mealPlan.weekSchedule || {}).map(([dayIndex, daySchedule]) => (
            <div key={dayIndex} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {getDayName(parseInt(dayIndex))}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(daySchedule.meals || {}).map(([mealType, recipeId]) => {
                  const recipe = getRecipeForMeal(dayIndex, mealType);
                  const mealKey = `${dayIndex}-${mealType}`;
                  const isRegenerating = regeneratingMeals.has(mealKey);
                  
                  return (
                    <div key={mealType} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          {getMealTypeDisplayName(mealType)}
                        </h4>
                        
                        <button
                          onClick={() => handleRegenerateMeal(dayIndex, mealType)}
                          disabled={isRegenerating}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {isRegenerating ? (
                            <>
                              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              Generating...
                            </>
                          ) : (
                            <>🔄 Regenerate</>
                          )}
                        </button>
                      </div>
                      
                      {recipe ? (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">{recipe.title || recipe.name}</h5>
                          <p className="text-xs text-gray-600">
                            {recipe.prepTime && `⏱️ ${recipe.prepTime} min`}
                            {recipe.servings && ` • 🍽️ Serves ${recipe.servings}`}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {recipe.description ||
                             (recipe.ingredients?.slice(0, 3).map(ing => {
                               if (typeof ing === 'string') return ing;
                               const safeString = ing.item || ing.original || ing.name || (ing.quantity && ing.unit && ing.name ? `${ing.quantity} ${ing.unit} ${ing.name}` : '') || '';
                               return typeof safeString === 'string' ? safeString : String(safeString || '');
                             }).filter(Boolean).join(', '))}
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">No recipe assigned</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Recipes View */}
      {viewMode === 'recipes' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">All Meal Plan Recipes</h3>
            <p className="text-sm text-blue-700">
              Review all recipes included in this meal plan. Each recipe will be automatically added to your recipe library when you accept the meal plan.
            </p>
          </div>

          {mealPlan.recipes?.map(recipe => (
            <UnifiedRecipeCard
              key={recipe.id}
              recipe={recipe}
              showSelection={false}
              onAddToLibrary={null} // Will be added when meal plan is accepted
              onAddToMealPlan={null} // Already assigned to meal plan
              importStatus={null} // This is a preview, not imported yet
            />
          )) || (
            <div className="text-center text-gray-500 py-8">
              No recipes found in this meal plan
            </div>
          )}
        </div>
      )}

      {/* Shopping List View */}
      {viewMode === 'shopping' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Shopping List</h3>
          
          {mealPlan.shoppingList && mealPlan.shoppingList.length > 0 ? (
            <div className="space-y-4">
              {/* Group by category */}
              {Object.entries(
                mealPlan.shoppingList.reduce((acc, item) => {
                  const category = item.category || 'Other';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(item);
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">
                    {category} ({items.length} items)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded text-green-600 focus:ring-green-500"
                          readOnly
                        />
                        <span className="text-sm text-gray-700">
                          {typeof item === 'object' ? (item.item || `${item.quantity || ''} ${item.unit || ''} ${item.ingredient || ''}`.trim()) : String(item || '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  💡 This shopping list will be saved with your meal plan and can be accessed from your meal plan dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No shopping list generated for this meal plan
            </div>
          )}
        </div>
      )}
    </div>
  );
}