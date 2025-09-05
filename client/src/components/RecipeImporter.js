// client/src/components/RecipeImporter.js
// Component for importing recipes from URLs

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateRecipeUrl, previewRecipeFromUrl, importFromUrl } from '../services/RecipeService';
import UnifiedRecipeCard from './UnifiedRecipeCard';

export default function RecipeImporter({ onRecipesImported, showLibraryActions = true }) {
  const { currentUser } = useAuth();
  const [urls, setUrls] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRecipes, setPreviewRecipes] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState(new Set());

  // Handle URL input
  const handleUrlsChange = (e) => {
    setUrls(e.target.value);
    if (previewRecipes.length > 0) {
      setPreviewRecipes([]);
      setSelectedRecipes(new Set());
    }
  };

  // Parse URLs from input
  const parseUrls = () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    return urlList;
  };

  // Validate and preview recipes
  const handlePreviewRecipes = async () => {
    const urlList = parseUrls();
    
    if (urlList.length === 0) {
      alert('Please enter at least one recipe URL');
      return;
    }

    setIsValidating(true);
    const previews = [];
    
    for (const url of urlList) {
      try {
        // First validate the URL
        const validation = await validateRecipeUrl(url);
        
        if (validation.valid) {
          // Preview the recipe
          const recipe = await previewRecipeFromUrl(url);
          previews.push({
            ...recipe,
            id: recipe.id || `preview-${Date.now()}-${Math.random()}`,
            sourceUrl: url,
            validationStatus: 'valid'
          });
        } else {
          previews.push({
            id: `invalid-${Date.now()}-${Math.random()}`,
            title: 'Invalid Recipe URL',
            sourceUrl: url,
            validationStatus: 'invalid',
            validationError: validation.error || 'Could not find recipe data'
          });
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        previews.push({
          id: `error-${Date.now()}-${Math.random()}`,
          title: 'Error Loading Recipe',
          sourceUrl: url,
          validationStatus: 'error',
          validationError: error.message
        });
      }
    }
    
    setPreviewRecipes(previews);
    
    // Auto-select valid recipes
    const validRecipeIds = previews
      .filter(r => r.validationStatus === 'valid')
      .map(r => r.id);
    setSelectedRecipes(new Set(validRecipeIds));
    
    setIsValidating(false);
  };

  // Handle recipe selection
  const handleRecipeSelection = (recipeId, isSelected) => {
    const newSelection = new Set(selectedRecipes);
    if (isSelected) {
      newSelection.add(recipeId);
    } else {
      newSelection.delete(recipeId);
    }
    setSelectedRecipes(newSelection);
  };

  // Import selected recipes
  const handleImportSelected = async () => {
    const selectedPreviewRecipes = previewRecipes.filter(r => 
      selectedRecipes.has(r.id) && r.validationStatus === 'valid'
    );
    
    if (selectedPreviewRecipes.length === 0) {
      alert('Please select at least one valid recipe to import');
      return;
    }

    setIsImporting(true);
    const results = {
      successful: [],
      failed: []
    };

    for (const previewRecipe of selectedPreviewRecipes) {
      try {
        const importedRecipe = await importFromUrl(previewRecipe.sourceUrl, {
          userId: currentUser?.uid
        });
        
        results.successful.push({
          url: previewRecipe.sourceUrl,
          recipe: importedRecipe
        });
      } catch (error) {
        console.error(`Failed to import ${previewRecipe.sourceUrl}:`, error);
        results.failed.push({
          url: previewRecipe.sourceUrl,
          error: error.message
        });
      }
    }

    setImportResults(results);
    setIsImporting(false);

    // Notify parent component
    if (onRecipesImported) {
      onRecipesImported(results);
    }

    // Clear form if all imports were successful
    if (results.failed.length === 0) {
      setUrls('');
      setPreviewRecipes([]);
      setSelectedRecipes(new Set());
    }
  };

  // Clear all
  const handleClear = () => {
    setUrls('');
    setPreviewRecipes([]);
    setSelectedRecipes(new Set());
    setImportResults(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Import Recipes from URLs</h3>
        
        {/* URL Input */}
        <div className="mb-4">
          <label htmlFor="recipe-urls" className="block text-sm font-medium text-gray-700 mb-2">
            Recipe URLs (one per line)
          </label>
          <textarea
            id="recipe-urls"
            value={urls}
            onChange={handleUrlsChange}
            placeholder="https://example.com/recipe1&#10;https://example.com/recipe2&#10;https://example.com/recipe3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            rows="4"
            disabled={isValidating || isImporting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste recipe URLs from popular cooking websites like AllRecipes, Food Network, etc.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePreviewRecipes}
            disabled={!urls.trim() || isValidating || isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Validating...
              </>
            ) : (
              <>👁️ Preview Recipes</>
            )}
          </button>

          {previewRecipes.length > 0 && (
            <button
              onClick={handleImportSelected}
              disabled={selectedRecipes.size === 0 || isImporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Importing...
                </>
              ) : (
                <>📥 Import Selected ({selectedRecipes.size})</>
              )}
            </button>
          )}

          {(previewRecipes.length > 0 || importResults) && (
            <button
              onClick={handleClear}
              disabled={isValidating || isImporting}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* Preview Recipes */}
      {previewRecipes.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recipe Preview</h4>
            <p className="text-sm text-blue-700">
              Review the recipes below and select which ones you'd like to import to your library.
              Invalid URLs will be marked and cannot be selected.
            </p>
          </div>

          {previewRecipes.map(recipe => (
            <div key={recipe.id}>
              {recipe.validationStatus === 'valid' ? (
                <UnifiedRecipeCard
                  recipe={recipe}
                  showSelection={true}
                  isSelected={selectedRecipes.has(recipe.id)}
                  onSelectionChange={handleRecipeSelection}
                  onAddToLibrary={null} // Disable library actions in preview
                  onAddToMealPlan={null} // Disable meal plan actions in preview
                />
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">❌</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-900">{recipe.title}</h3>
                      <p className="text-sm text-red-700 mb-2">
                        <strong>URL:</strong> {recipe.sourceUrl}
                      </p>
                      <p className="text-sm text-red-600">
                        <strong>Error:</strong> {recipe.validationError}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-semibold text-lg mb-4">Import Results</h4>
          
          {importResults.successful.length > 0 && (
            <div className="mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">
                  ✅ Successfully Imported ({importResults.successful.length})
                </h5>
                <ul className="text-sm text-green-700 space-y-1">
                  {importResults.successful.map((result, index) => (
                    <li key={index}>
                      <strong>{result.recipe.title}</strong> from {result.url}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {importResults.failed.length > 0 && (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-900 mb-2">
                  ❌ Failed to Import ({importResults.failed.length})
                </h5>
                <ul className="text-sm text-red-700 space-y-2">
                  {importResults.failed.map((failure, index) => (
                    <li key={index}>
                      <strong>URL:</strong> {failure.url}<br />
                      <strong>Error:</strong> {failure.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

