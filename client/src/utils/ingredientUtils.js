// client/src/utils/ingredientUtils.js - Utility functions for safely handling ingredient objects

/**
 * Safely extracts a string representation from an ingredient object or string
 * @param {string|object} ingredient - The ingredient to format
 * @returns {string} A safe string representation of the ingredient
 */
export const safeExtractIngredientString = (ingredient) => {
  if (!ingredient) return '';

  // If it's already a string, return it
  if (typeof ingredient === 'string') return ingredient.trim();

  // Helper function to safely convert any value to string
  const safeToString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // If it's an object, try to extract meaningful properties
      if (value.name) return String(value.name);
      if (value.text) return String(value.text);
      if (value.label) return String(value.label);
      // If no meaningful property found, return empty string instead of "[object Object]"
      return '';
    }
    return String(value);
  };

  // If ingredient is an object, try to extract string representation
  if (typeof ingredient === 'object') {
    // First try common ingredient properties
    if (ingredient.original) {
      return safeToString(ingredient.original);
    }

    // Try productName (common in cart items)
    if (ingredient.productName) {
      const productName = safeToString(ingredient.productName);
      const quantity = safeToString(ingredient.quantity);
      const unit = safeToString(ingredient.unit);

      // Build ingredient string from parts
      const parts = [quantity, unit, productName].filter(part => part && part.trim());
      return parts.join(' ').trim();
    }

    if (ingredient.item) {
      const item = safeToString(ingredient.item);
      const quantity = safeToString(ingredient.quantity);
      const unit = safeToString(ingredient.unit);

      // Build ingredient string from parts
      const parts = [quantity, unit, item].filter(part => part && part.trim());
      return parts.join(' ').trim();
    }

    // Try other common property names
    if (ingredient.name) return safeToString(ingredient.name);
    if (ingredient.text) return safeToString(ingredient.text);
    if (ingredient.ingredient) return safeToString(ingredient.ingredient);
    if (ingredient.description) return safeToString(ingredient.description);

    // If none of the above, try to build from quantity + unit + any name-like property
    const quantity = safeToString(ingredient.quantity || ingredient.amount);
    const unit = safeToString(ingredient.unit || ingredient.measure);
    const name = safeToString(ingredient.ingredientName || ingredient.food || ingredient.product);

    const parts = [quantity, unit, name].filter(part => part && part.trim());
    if (parts.length > 0) {
      return parts.join(' ').trim();
    }

    // Last resort: try to extract something meaningful
    try {
      const keys = Object.keys(ingredient);
      if (keys.length <= 3 && keys.length > 0) {
        // For small objects, show key-value pairs
        return keys.map(key => {
          const value = safeToString(ingredient[key]);
          return value ? `${key}: ${value}` : '';
        }).filter(Boolean).join(', ');
      }
    } catch (e) {
      console.warn('Failed to extract ingredient info:', e);
    }

    // Final fallback - return empty string to avoid React errors
    return '';
  }

  // For any other type, convert to string safely
  return String(ingredient);
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