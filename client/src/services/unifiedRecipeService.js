// client/src/services/unifiedRecipeService.js
// Unified Recipe System Client Service - single interface for all recipe imports

const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

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
      
      if (payload.source === 'url' && payload.data?.url) {
        // Use the existing validate-url endpoint if available
        try {
          const response = await fetch(`${API_URL}/api/recipes/validate-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: payload.data.url })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ URL validation result:', result);
            return result;
          }
        } catch (validationError) {
          console.warn('URL validation endpoint not available, proceeding with basic validation');
        }
      }
      
      // Basic validation for when endpoint is not available
      if (payload.source === 'url') {
        const url = payload.data?.url;
        const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
        return {
          success: isValidUrl,
          valid: isValidUrl,
          details: isValidUrl ? { message: 'URL format is valid' } : { message: 'Invalid URL format' }
        };
      }
      
      if (payload.source === 'ai-text') {
        const text = payload.data?.text;
        const hasContent = text && text.trim().length > 0;
        return {
          success: hasContent,
          valid: hasContent,
          details: hasContent ? { message: 'Text has content' } : { message: 'No text content provided' }
        };
      }
      
      return { success: false, valid: false, details: { message: 'Unsupported source type' } };
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
      
      // Map to correct backend endpoint based on source
      let endpoint;
      let requestBody;
      
      if (payload.source === 'url') {
        endpoint = `${API_URL}/api/recipes/import-url`;
        requestBody = {
          url: payload.data.url,
          userId: payload.userId,
          autoSave: true,
          mealType: payload.data.mealType,
          dayAssigned: payload.data.dayAssigned
        };
      } else if (payload.source === 'ai-text') {
        endpoint = `${API_URL}/api/recipes/parse-text`;
        requestBody = {
          recipeText: payload.data.text,
          userId: payload.userId
        };
      } else {
        throw new Error(`Unsupported source: ${payload.source}`);
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Import successful:', result);
      
      // Transform response to match expected format
      if (result.success && result.recipe) {
        return {
          success: true,
          recipes: [result.recipe]
        };
      }
      
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
      
      const results = [];
      let successCount = 0;
      
      // Process each item individually since we don't have a batch endpoint
      for (const item of items) {
        try {
          let payload;
          if (item.type === 'url' && item.url) {
            payload = {
              source: 'url',
              data: { url: item.url },
              userId
            };
          } else if (item.type === 'ai' && item.text) {
            payload = {
              source: 'ai-text',
              data: { text: item.text },
              userId
            };
          } else {
            console.warn('Skipping invalid item:', item);
            continue;
          }
          
          const result = await unified.importOne(payload);
          if (result.success && result.recipes) {
            results.push(...result.recipes);
            successCount++;
          }
        } catch (itemError) {
          console.error('Error importing item:', item, itemError);
        }
      }
      
      console.log('✅ Batch import completed:', successCount, 'recipes imported');
      return {
        success: true,
        count: successCount,
        recipes: results
      };
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
      
      // For now, return the recipe as-is since backend doesn't have this endpoint
      // TODO: Implement format conversion logic or create backend endpoint
      console.log('✅ Format conversion completed (using original format)');
      return {
        success: true,
        format: targetFormat,
        converted: recipe
      };
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