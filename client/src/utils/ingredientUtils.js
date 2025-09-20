// client/src/utils/ingredientUtils.js - Utility functions for safely handling ingredient objects

/**
 * Safely extracts a string representation from an ingredient object or string
 * @param {string|object} ingredient - The ingredient to format
 * @returns {string} A safe string representation of the ingredient
 */
export const safeExtractIngredientString = (ingredient) => {
  try {
    if (!ingredient) return '';

    // If it's already a string, validate and return
    if (typeof ingredient === 'string') {
      const trimmed = ingredient.trim();
      // Prevent excessively long strings
      return trimmed.length > 300 ? trimmed.substring(0, 300) + '...' : trimmed;
    }

    // Helper function to safely convert any value to string with validation
    const safeToString = (value) => {
      try {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
        }
        if (typeof value === 'number') {
          return isFinite(value) ? String(value) : '';
        }
        if (typeof value === 'object') {
          // If it's an object, try to extract meaningful properties
          if (value && typeof value.name === 'string') return String(value.name).trim();
          if (value && typeof value.text === 'string') return String(value.text).trim();
          if (value && typeof value.label === 'string') return String(value.label).trim();
          // If no meaningful property found, return empty string instead of "[object Object]"
          return '';
        }
        const result = String(value);
        return result === '[object Object]' ? '' : result.trim();
      } catch (e) {
        console.warn('safeToString error:', e);
        return '';
      }
    };

    // If ingredient is an object, try to extract string representation
    if (typeof ingredient === 'object' && ingredient !== null) {
      // Prevent circular references by limiting object depth
      try {
        const keys = Object.keys(ingredient);
        if (keys.length > 50) {
          return `[Complex ingredient with ${keys.length} properties]`;
        }

        // First try common ingredient properties in order of preference
        const commonProps = [
          'original', 'productName', 'name', 'item', 'text', 'ingredient',
          'description', 'ingredientName', 'food', 'product', 'label'
        ];

        for (const prop of commonProps) {
          if (ingredient[prop]) {
            const value = safeToString(ingredient[prop]);
            if (value && value.length > 0) {
              // If we have quantity and unit, include them
              const quantity = safeToString(ingredient.quantity || ingredient.amount);
              const unit = safeToString(ingredient.unit || ingredient.measure);

              if (quantity && unit) {
                return `${quantity} ${unit} ${value}`.trim();
              } else if (quantity) {
                return `${quantity} ${value}`.trim();
              } else {
                return value;
              }
            }
          }
        }

        // Try to build from quantity + unit + any name-like property
        const quantity = safeToString(ingredient.quantity || ingredient.amount);
        const unit = safeToString(ingredient.unit || ingredient.measure);

        // Look for any property that might be a name
        const nameProps = ['name', 'productName', 'item', 'ingredient', 'text', 'description'];
        let name = '';
        for (const prop of nameProps) {
          if (ingredient[prop]) {
            name = safeToString(ingredient[prop]);
            if (name && name.length > 0) break;
          }
        }

        const parts = [quantity, unit, name].filter(part => part && part.trim().length > 0);
        if (parts.length > 0) {
          return parts.join(' ').trim();
        }

        // Last resort: try to extract something meaningful from small objects
        if (keys.length <= 3 && keys.length > 0) {
          const pairs = keys
            .map(key => {
              const value = safeToString(ingredient[key]);
              return value && value.length > 0 ? `${key}: ${value}` : '';
            })
            .filter(Boolean);

          if (pairs.length > 0) {
            return pairs.join(', ');
          }
        }

        // Final fallback - return empty string to avoid React errors
        return '';

      } catch (e) {
        console.warn('Failed to extract ingredient info:', e);
        return '';
      }
    }

    // For any other type, convert to string safely
    const result = String(ingredient);
    return result === '[object Object]' ? '' : result.trim();

  } catch (e) {
    console.error('safeExtractIngredientString error:', e);
    return '';
  }
};

/**
 * Format ingredient with quantity if available
 * @param {string|object} ingredient - The ingredient to format
 * @returns {string} Formatted ingredient string
 */
export const formatIngredientWithQuantity = (ingredient) => {
  if (!ingredient) return '';

  if (typeof ingredient === 'string') return ingredient.trim();

  if (typeof ingredient === 'object') {
    const quantity = ingredient.quantity || ingredient.amount || '';
    const unit = ingredient.unit || ingredient.measure || '';
    const name = ingredient.name || ingredient.item || ingredient.productName || ingredient.original || '';

    if (quantity && unit && name) {
      return `${quantity} ${unit} ${name}`.trim();
    } else if (quantity && name) {
      return `${quantity} ${name}`.trim();
    } else if (name) {
      return name.trim();
    }
  }

  return safeExtractIngredientString(ingredient);
};