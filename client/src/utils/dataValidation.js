// client/src/utils/dataValidation.js - Data validation utilities for safe rendering

/**
 * Validates if a value is safe for React rendering
 * @param {*} value - Value to validate
 * @returns {boolean} True if safe to render
 */
export const isSafeForReactRender = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (React?.isValidElement && React.isValidElement(value)) return true;
  return false;
};

/**
 * Validates ingredient data structure
 * @param {*} ingredient - Ingredient to validate
 * @returns {object} Validation result with isValid flag and sanitized data
 */
export const validateIngredient = (ingredient) => {
  if (!ingredient) {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Ingredient is null or undefined']
    };
  }

  const errors = [];
  let sanitized = {};

  // If it's a string, it's valid as-is
  if (typeof ingredient === 'string') {
    const trimmed = ingredient.trim();
    if (trimmed.length === 0) {
      errors.push('Ingredient string is empty');
      return { isValid: false, sanitized: null, errors };
    }
    if (trimmed.length > 500) {
      errors.push('Ingredient string is too long');
      sanitized = trimmed.substring(0, 500) + '...';
    } else {
      sanitized = trimmed;
    }
    return { isValid: true, sanitized, errors };
  }

  // If it's an object, validate structure
  if (typeof ingredient === 'object' && ingredient !== null) {
    try {
      const keys = Object.keys(ingredient);
      if (keys.length === 0) {
        errors.push('Ingredient object is empty');
        return { isValid: false, sanitized: null, errors };
      }

      if (keys.length > 50) {
        errors.push('Ingredient object has too many properties');
        return { isValid: false, sanitized: null, errors };
      }

      // Extract and validate common properties
      const validProps = ['name', 'productName', 'item', 'original', 'text', 'quantity', 'unit', 'description'];

      for (const prop of validProps) {
        if (ingredient.hasOwnProperty(prop)) {
          const value = ingredient[prop];

          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length > 0 && trimmed.length <= 200) {
              sanitized[prop] = trimmed;
            } else if (trimmed.length > 200) {
              sanitized[prop] = trimmed.substring(0, 200) + '...';
              errors.push(`${prop} was truncated due to length`);
            }
          } else if (typeof value === 'number' && isFinite(value)) {
            sanitized[prop] = value;
          } else if (value !== null && value !== undefined) {
            errors.push(`${prop} has invalid type: ${typeof value}`);
          }
        }
      }

      if (Object.keys(sanitized).length === 0) {
        errors.push('No valid properties found in ingredient object');
        return { isValid: false, sanitized: null, errors };
      }

      return { isValid: true, sanitized, errors };

    } catch (e) {
      errors.push(`Error processing ingredient object: ${e.message}`);
      return { isValid: false, sanitized: null, errors };
    }
  }

  // If it's neither string nor object, it's invalid
  errors.push(`Invalid ingredient type: ${typeof ingredient}`);
  return { isValid: false, sanitized: null, errors };
};

/**
 * Validates and sanitizes an array of ingredients
 * @param {Array} ingredients - Array of ingredients to validate
 * @param {number} maxCount - Maximum number of ingredients to allow
 * @returns {object} Validation result with valid and invalid ingredients
 */
export const validateIngredients = (ingredients, maxCount = 100) => {
  if (!Array.isArray(ingredients)) {
    return {
      isValid: false,
      validIngredients: [],
      invalidIngredients: [],
      errors: ['Ingredients is not an array']
    };
  }

  if (ingredients.length === 0) {
    return {
      isValid: true,
      validIngredients: [],
      invalidIngredients: [],
      errors: []
    };
  }

  if (ingredients.length > maxCount) {
    return {
      isValid: false,
      validIngredients: [],
      invalidIngredients: ingredients,
      errors: [`Too many ingredients: ${ingredients.length} (max ${maxCount})`]
    };
  }

  const validIngredients = [];
  const invalidIngredients = [];
  const errors = [];

  ingredients.forEach((ingredient, index) => {
    const validation = validateIngredient(ingredient);

    if (validation.isValid) {
      validIngredients.push({
        index,
        original: ingredient,
        sanitized: validation.sanitized,
        warnings: validation.errors
      });
    } else {
      invalidIngredients.push({
        index,
        original: ingredient,
        errors: validation.errors
      });
      errors.push(`Ingredient ${index}: ${validation.errors.join(', ')}`);
    }
  });

  return {
    isValid: invalidIngredients.length === 0,
    validIngredients,
    invalidIngredients,
    errors
  };
};

/**
 * Validates recipe data structure
 * @param {object} recipe - Recipe to validate
 * @returns {object} Validation result
 */
export const validateRecipe = (recipe) => {
  if (!recipe || typeof recipe !== 'object') {
    return {
      isValid: false,
      sanitized: null,
      errors: ['Recipe is not an object']
    };
  }

  const errors = [];
  const sanitized = {};

  // Validate required string fields
  const requiredStringFields = ['name', 'title'];
  const optionalStringFields = ['description', 'author', 'source'];

  let hasValidName = false;
  for (const field of requiredStringFields) {
    if (recipe[field] && typeof recipe[field] === 'string') {
      const trimmed = recipe[field].trim();
      if (trimmed.length > 0) {
        sanitized[field] = trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
        hasValidName = true;
        break;
      }
    }
  }

  if (!hasValidName) {
    errors.push('Recipe must have a valid name or title');
  }

  // Validate optional string fields
  for (const field of optionalStringFields) {
    if (recipe[field] && typeof recipe[field] === 'string') {
      const trimmed = recipe[field].trim();
      if (trimmed.length > 0) {
        sanitized[field] = trimmed.length > 500 ? trimmed.substring(0, 500) + '...' : trimmed;
      }
    }
  }

  // Validate numeric fields
  const numericFields = ['servings', 'cookTime', 'prepTime', 'totalTime'];
  for (const field of numericFields) {
    if (recipe[field] !== undefined) {
      const value = Number(recipe[field]);
      if (isFinite(value) && value >= 0) {
        sanitized[field] = value;
      } else if (recipe[field] !== null) {
        errors.push(`${field} must be a positive number`);
      }
    }
  }

  // Validate ingredients
  if (recipe.ingredients) {
    const ingredientValidation = validateIngredients(recipe.ingredients);
    if (ingredientValidation.isValid) {
      sanitized.ingredients = ingredientValidation.validIngredients.map(item => item.sanitized);
    } else {
      errors.push(...ingredientValidation.errors);
    }
  }

  // Validate instructions
  if (recipe.instructions) {
    if (Array.isArray(recipe.instructions)) {
      const validInstructions = recipe.instructions
        .filter(instruction => typeof instruction === 'string' && instruction.trim().length > 0)
        .map(instruction => instruction.trim().length > 1000 ? instruction.substring(0, 1000) + '...' : instruction.trim());

      if (validInstructions.length > 0) {
        sanitized.instructions = validInstructions;
      }
    } else if (typeof recipe.instructions === 'string') {
      const trimmed = recipe.instructions.trim();
      if (trimmed.length > 0) {
        sanitized.instructions = [trimmed.length > 2000 ? trimmed.substring(0, 2000) + '...' : trimmed];
      }
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
};

/**
 * Validates and sanitizes user input for potential XSS
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

/**
 * Validates localStorage data before using it
 * @param {string} key - localStorage key
 * @param {function} validator - Custom validator function
 * @returns {object} Parsed and validated data or null
 */
export const validateLocalStorageData = (key, validator = null) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);

    if (validator && typeof validator === 'function') {
      return validator(parsed) ? parsed : null;
    }

    return parsed;
  } catch (e) {
    console.warn(`Invalid localStorage data for key ${key}:`, e);
    // Clear corrupted data
    try {
      localStorage.removeItem(key);
    } catch (clearError) {
      console.warn(`Failed to clear corrupted localStorage key ${key}:`, clearError);
    }
    return null;
  }
};

/**
 * Creates a validator function for arrays with specific item validation
 * @param {function} itemValidator - Validator for array items
 * @param {number} maxLength - Maximum array length
 * @returns {function} Array validator function
 */
export const createArrayValidator = (itemValidator, maxLength = 1000) => {
  return (array) => {
    if (!Array.isArray(array)) return false;
    if (array.length > maxLength) return false;

    return array.every(item => {
      try {
        return itemValidator(item);
      } catch (e) {
        return false;
      }
    });
  };
};

export default {
  isSafeForReactRender,
  validateIngredient,
  validateIngredients,
  validateRecipe,
  sanitizeUserInput,
  validateLocalStorageData,
  createArrayValidator
};