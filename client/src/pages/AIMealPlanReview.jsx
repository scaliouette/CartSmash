// Frontend component for reviewing and importing AI-generated meal plans

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { saveRecipeToLibrary } from "../services/RecipeService";
import { assignRecipeToMeal, createMealPlan } from "../services/mealPlanService";

export default function AIMealPlanReview({ aiGeneratedPlan }) {
  const { currentUser } = useAuth();
  const [mealPlan, setMealPlan] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [importStatus, setImportStatus] = useState({});
  const [bulkImporting, setBulkImporting] = useState(false);
  const uid = currentUser?.uid;

  useEffect(() => {
    // Parse AI response when component mounts
    if (aiGeneratedPlan) {
      parseMealPlan(aiGeneratedPlan);
    }
  }, [aiGeneratedPlan]);

  async function parseMealPlan(aiResponse) {
    try {
      const response = await fetch('/api/ai/parse-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiResponse, userId: uid })
      });
      
      const data = await response.json();
      if (data.success) {
        setMealPlan(data.mealPlan);
        // Pre-select all recipes by default
        setSelectedRecipes(new Set(data.mealPlan.recipes.map(r => r.id)));
      }
    } catch (error) {
      console.error('Error parsing meal plan:', error);
    }
  }

  async function handleAddRecipe(recipe) {
    try {
      setImportStatus({ ...importStatus, [recipe.id]: 'importing' });
      
      // Convert to library format
      const libraryRecipe = {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutrition: recipe.nutrition,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        tags: recipe.tags,
        imageUrl: recipe.imageUrl,
        createdAt: new Date().toISOString()
      };
      
      await saveRecipeToLibrary(uid, libraryRecipe);
      setImportStatus({ ...importStatus, [recipe.id]: 'imported' });
      
    } catch (error) {
      setImportStatus({ ...importStatus, [recipe.id]: 'error' });
      console.error('Error saving recipe:', error);
    }
  }

  async function handleAddToMealPlan(recipe) {
    // First save to library if not already saved
    if (importStatus[recipe.id] !== 'imported') {
      await handleAddRecipe(recipe);
    }
    
    // Then open modal for meal plan assignment
    setActiveRecipe(recipe);
    setModalOpen(true);
  }

  async function handleConfirmAdd({ planId, day, slot, servings, recipeId }) {
    await assignRecipeToMeal({ 
      uid, 
      planId: planId || mealPlan.planId, 
      day, 
      slot, 
      servings, 
      recipeId 
    });
    setModalOpen(false);
    setActiveRecipe(null);
  }

  async function handleBulkImport() {
    setBulkImporting(true);
    
    try {
      // Create a new meal plan
      const newPlanId = await createMealPlan({
        uid,
        name: mealPlan.metadata.title,
        startDate: new Date().toISOString(),
        familySize: mealPlan.metadata.familySize
      });
      
      // Import all selected recipes
      for (const recipe of mealPlan.recipes) {
        if (selectedRecipes.has(recipe.id)) {
          // Save to library
          await handleAddRecipe(recipe);
          
          // Assign to meal plan
          await assignRecipeToMeal({
            uid,
            planId: newPlanId,
            day: recipe.dayAssigned,
            slot: recipe.mealType,
            servings: recipe.servings,
            recipeId: recipe.id
          });
        }
      }
      
      alert('Meal plan imported successfully!');
    } catch (error) {
      console.error('Error during bulk import:', error);
      alert('Error importing meal plan. Please try again.');
    } finally {
      setBulkImporting(false);
    }
  }

  function toggleRecipeSelection(recipeId) {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  }

  function toggleDaySelection(day) {
    const dayRecipes = mealPlan.recipes.filter(r => r.dayAssigned === day);
    const allSelected = dayRecipes.every(r => selectedRecipes.has(r.id));
    
    const newSelected = new Set(selectedRecipes);
    dayRecipes.forEach(recipe => {
      if (allSelected) {
        newSelected.delete(recipe.id);
      } else {
        newSelected.add(recipe.id);
      }
    });
    setSelectedRecipes(newSelected);
  }

  if (!mealPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Parsing meal plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{mealPlan.metadata.title}</h1>
        <p className="text-lg opacity-90">
          Family of {mealPlan.metadata.familySize} • {mealPlan.recipes.length} Recipes
        </p>
        <div className="mt-4 flex gap-4">
          <button
            onClick={handleBulkImport}
            disabled={bulkImporting || selectedRecipes.size === 0}
            className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50"
          >
            {bulkImporting ? 'Importing...' : `Import ${selectedRecipes.size} Selected Recipes`}
          </button>
          <button
            onClick={() => setSelectedRecipes(new Set(mealPlan.recipes.map(r => r.id)))}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedRecipes(new Set())}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Daily Recipe Cards */}
      {Object.entries(mealPlan.weekSchedule).map(([day, schedule]) => (
        <div key={day} className="mb-8">
          {/* Day Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold capitalize">
              Day {schedule.dayNumber} - {day}
            </h2>
            <button
              onClick={() => toggleDaySelection(day)}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Toggle Day Selection
            </button>
          </div>

          {/* Recipe Cards for the Day */}
          <div className="grid gap-4">
            {mealPlan.recipes
              .filter(recipe => recipe.dayAssigned === day)
              .map(recipe => (
                <div
                  key={recipe.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                    selectedRecipes.has(recipe.id) 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {/* Recipe Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedRecipes.has(recipe.id)}
                          onChange={() => toggleRecipeSelection(recipe.id)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                        />
                        <h3 className="text-xl font-semibold">{recipe.title}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {recipe.mealType}
                        </span>
                      </div>

                      {/* Ingredients */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          <strong>Ingredients:</strong>{' '}
                          {recipe.ingredients.map(ing => ing.item).join(', ')}
                        </p>
                      </div>

                      {/* Time and Nutrition */}
                      <div className="flex gap-4 text-sm text-gray-500">
                        {recipe.prepTime > 0 && (
                          <span>⏱️ Prep: {recipe.prepTime} min</span>
                        )}
                        {recipe.cookTime > 0 && (
                          <span>🔥 Cook: {recipe.cookTime} min</span>
                        )}
                        <span>🔥 {recipe.nutrition.calories} cal/serving</span>
                      </div>

                      {/* Tags */}
                      <div className="flex gap-2 mt-3">
                        {recipe.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleAddRecipe(recipe)}
                        disabled={importStatus[recipe.id] === 'importing'}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                          importStatus[recipe.id] === 'imported'
                            ? 'bg-green-100 text-green-700'
                            : importStatus[recipe.id] === 'importing'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {importStatus[recipe.id] === 'imported' 
                          ? '✓ In Library'
                          : importStatus[recipe.id] === 'importing'
                          ? 'Adding...'
                          : '📚 Add to Library'}
                      </button>
                      
                      <button
                        onClick={() => handleAddToMealPlan(recipe)}
                        className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition-colors"
                      >
                        📅 Add to Meal Plan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Shopping List Summary */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">📋 Shopping List Summary</h2>
        <p className="text-gray-600 mb-4">
          {mealPlan.shoppingList.length} items across {Object.keys(mealPlan.shoppingList).length} categories
        </p>
        <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">
          View Full Shopping List
        </button>
      </div>

      {/* Add to Meal Plan Modal */}
      {modalOpen && activeRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add to Meal Plan</h3>
            <p className="mb-4">Adding "{activeRecipe.title}" to meal plan...</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirmAdd({
                  planId: mealPlan.planId,
                  day: activeRecipe.dayAssigned,
                  slot: activeRecipe.mealType,
                  servings: activeRecipe.servings,
                  recipeId: activeRecipe.id
                })}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Confirm
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}