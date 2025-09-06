// client/src/services/unifiedRecipeService.js
// Unified Recipe System Client Service - single interface for all recipe imports

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Unified Recipe Service
 * Provides a standardized interface for recipe import from any source
 */
export const unified = {
  /**
   * Validate a recipe source before importing
   * @param {Object} payload - { source: 'url'|'ai-text', data: { url: string } | { text: string } }
   * @returns {Promise<Object>} { success: boolean, details: object }
   */
  validate: async (payload) => {
    try {
      console.log('🔍 Validating recipe source:', payload.source);
      const response = await fetch(`${API_URL}/api/unified/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Validation result:', result);
      return result;
    } catch (error) {
      console.error('❌ Validation error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Import a single recipe from any source
   * @param {Object} payload - { source: string, data: object, userId?: string }
   * @returns {Promise<Object>} { success: boolean, recipes: UnifiedRecipe[], mealPlan?: object }
   */
  importOne: async (payload) => {
    try {
      console.log('📥 Importing recipe from:', payload.source);
      const response = await fetch(`${API_URL}/api/unified/import-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Import successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Import error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Import multiple recipes from different sources in batch
   * @param {Array} items - Array of { type: 'url'|'ai', url?: string, text?: string }
   * @param {string} userId - User ID for saving
   * @returns {Promise<Object>} { success: boolean, count: number, recipes: UnifiedRecipe[] }
   */
  importBatch: async (items, userId) => {
    try {
      console.log('📦 Batch importing', items.length, 'items');
      const response = await fetch(`${API_URL}/api/unified/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, userId })
      });
      
      if (!response.ok) {
        throw new Error(`Batch import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Batch import completed:', result.count, 'recipes imported');
      return result;
    } catch (error) {
      console.error('❌ Batch import error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Convert recipe to different format
   * @param {Object} recipe - Recipe to convert
   * @param {string} targetFormat - 'cartsmash'|'schema.org'|'markdown'
   * @returns {Promise<Object>} { success: boolean, format: string, converted: object }
   */
  convertFormat: async (recipe, targetFormat) => {
    try {
      console.log('🔄 Converting recipe to format:', targetFormat);
      const response = await fetch(`${API_URL}/api/unified/convert-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, targetFormat })
      });
      
      if (!response.ok) {
        throw new Error(`Format conversion failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Format conversion completed');
      return result;
    } catch (error) {
      console.error('❌ Format conversion error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Legacy compatibility helpers
 * These methods provide easy migration from existing code
 */
export const legacy = {
  /**
   * Import from URL (compatible with existing URL import flow)
   * @param {string} url - Recipe URL
   * @param {string} userId - User ID
   * @returns {Promise<UnifiedRecipe[]>}
   */
  importFromUrl: async (url, userId) => {
    const result = await unified.importOne({
      source: 'url',
      data: { url },
      userId
    });
    return result.success ? result.recipes : [];
  },

  /**
   * Import from AI text (compatible with existing AI parsing flow)
   * @param {string} text - AI-generated text
   * @param {string} userId - User ID
   * @returns {Promise<UnifiedRecipe[]>}
   */
  importFromAI: async (text, userId) => {
    const result = await unified.importOne({
      source: 'ai-text',
      data: { text },
      userId
    });
    return result.success ? result.recipes : [];
  }
};

/**
 * Unified Recipe Data Structure (TypeScript-style documentation)
 * 
 * interface UnifiedRecipe {
 *   id: string;
 *   title: string;
 *   description?: string;
 *   icon: string;
 *   mealType: string;
 *   ingredients: Array<{
 *     quantity?: number;
 *     unit?: string;
 *     item: string;
 *     original: string;
 *   }>;
 *   instructions: Array<{ instruction: string }>;
 *   prepTime?: number; // minutes
 *   cookTime?: number; // minutes
 *   totalTime?: number; // minutes
 *   servings?: number;
 *   difficulty?: string;
 *   nutrition: object;
 *   tags: string[];
 *   source: string;
 *   sourceUrl?: string;
 *   imageUrl?: string;
 *   dayAssigned?: string;
 *   mealTypePlanning?: string;
 *   createdAt: string; // ISO date
 *   updatedAt: string; // ISO date
 * }
 */

export default unified;