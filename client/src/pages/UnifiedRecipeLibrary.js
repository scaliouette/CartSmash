// client/src/pages/UnifiedRecipeLibrary.js
// Unified page for managing both AI-generated and URL-imported recipes

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRecipeLibrary } from '../services/RecipeService';
import UnifiedRecipeCard from '../components/UnifiedRecipeCard';
import RecipeImporter from '../components/RecipeImporter';

export default function UnifiedRecipeLibrary() {
  const { currentUser } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // all, ai-generated, url-import
  const [mealTypeFilter, setMealTypeFilter] = useState('all');
  const [showImporter, setShowImporter] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Load recipes on component mount
  useEffect(() => {
    loadRecipes();
  }, [currentUser]);

  // Filter recipes when filters change
  useEffect(() => {
    filterRecipes();
  }, [recipes, searchTerm, sourceFilter, mealTypeFilter]);

  const loadRecipes = async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userRecipes = await getRecipeLibrary(currentUser.uid);
      setRecipes(userRecipes);
      setError('');
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError('Failed to load recipe library');
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = recipes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        if (sourceFilter === 'ai-generated') {
          return recipe.source === 'ai-generated';
        } else if (sourceFilter === 'url-import') {
          return recipe.sourceUrl || recipe.source === 'url-import';
        }
        return true;
      });
    }

    // Meal type filter
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.mealType === mealTypeFilter);
    }

    setFilteredRecipes(filtered);
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

  const handleBulkAction = (action) => {
    if (selectedRecipes.size === 0) {
      alert('Please select at least one recipe');
      return;
    }

    switch (action) {
      case 'add-to-meal-plan':
        // TODO: Implement bulk meal plan assignment
        alert(`Adding ${selectedRecipes.size} recipes to meal plan (feature coming soon)`);
        break;
      case 'delete':
        // TODO: Implement bulk delete
        alert(`Deleting ${selectedRecipes.size} recipes (feature coming soon)`);
        break;
      case 'export':
        // TODO: Implement bulk export
        alert(`Exporting ${selectedRecipes.size} recipes (feature coming soon)`);
        break;
      default:
        break;
    }
  };

  const handleRecipesImported = (importResults) => {
    if (importResults.successful.length > 0) {
      // Refresh the recipe library
      loadRecipes();
      alert(`Successfully imported ${importResults.successful.length} recipes!`);
    }
    
    if (importResults.failed.length > 0) {
      alert(`${importResults.failed.length} recipes failed to import. Check the import results for details.`);
    }
  };

  const getRecipeStats = () => {
    const aiGenerated = recipes.filter(r => r.source === 'ai-generated').length;
    const urlImported = recipes.filter(r => r.sourceUrl || r.source === 'url-import').length;
    
    return {
      total: recipes.length,
      aiGenerated,
      urlImported
    };
  };

  const stats = getRecipeStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg">Loading your recipe library...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recipe Library</h1>
              <p className="text-gray-600 mt-1">
                Manage your AI-generated and imported recipes
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowImporter(!showImporter)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                📥 Import Recipes
              </button>
              
              <button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                {isSelectionMode ? '✓ Done Selecting' : '☑️ Select Multiple'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-sm text-blue-700">Total Recipes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{stats.aiGenerated}</div>
              <div className="text-sm text-green-700">AI Generated</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">{stats.urlImported}</div>
              <div className="text-sm text-purple-700">URL Imported</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{filteredRecipes.length}</div>
              <div className="text-sm text-gray-700">Shown</div>
            </div>
          </div>
        </div>

        {/* Recipe Importer */}
        {showImporter && (
          <div className="mb-6">
            <RecipeImporter
              onRecipesImported={handleRecipesImported}
            />
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Recipes
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or tags..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Source Filter */}
            <div>
              <label htmlFor="source-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Recipe Source
              </label>
              <select
                id="source-filter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="ai-generated">AI Generated</option>
                <option value="url-import">URL Imported</option>
              </select>
            </div>

            {/* Meal Type Filter */}
            <div>
              <label htmlFor="meal-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Meal Type
              </label>
              <select
                id="meal-type-filter"
                value={mealTypeFilter}
                onChange={(e) => setMealTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="dessert">Dessert</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSourceFilter('all');
                  setMealTypeFilter('all');
                }}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Bulk Actions (when in selection mode) */}
          {isSelectionMode && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedRecipes.size} recipe(s) selected
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('add-to-meal-plan')}
                    disabled={selectedRecipes.size === 0}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    Add to Meal Plan
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('export')}
                    disabled={selectedRecipes.size === 0}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    Export
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={selectedRecipes.size === 0}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-900 font-medium">Error Loading Recipes</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Grid */}
        {filteredRecipes.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {recipes.length === 0 ? 'No Recipes Yet' : 'No Recipes Match Your Filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {recipes.length === 0 
                ? 'Start building your recipe library by importing recipes from URLs or generating them with AI.'
                : 'Try adjusting your search terms or filters to find more recipes.'
              }
            </p>
            {recipes.length === 0 && (
              <button
                onClick={() => setShowImporter(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import Your First Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRecipes.map(recipe => (
              <UnifiedRecipeCard
                key={recipe.id}
                recipe={recipe}
                showSelection={isSelectionMode}
                isSelected={selectedRecipes.has(recipe.id)}
                onSelectionChange={handleRecipeSelection}
                onAddToLibrary={null} // Already in library
                importStatus="imported"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}