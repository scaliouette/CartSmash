// client/src/utils/reactSafeRender.js - Comprehensive React-safe rendering utilities

import React from 'react';
import { logger } from './debugLogger';

/**
 * Safely render any value for React components
 * Prevents React Error #31: "Objects are not valid as a React child"
 */
export const safeReactRender = (value, fallback = '') => {
  try {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return fallback;
    }

    // Handle valid React render types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Handle React elements
    if (typeof value === 'object' && value.$$typeof) {
      return value; // This is likely a React element
    }

    // Handle arrays (map to safe values)
    if (Array.isArray(value)) {
      return value.map((item, index) => safeReactRender(item, `Item ${index + 1}`)).join(', ');
    }

    // Handle objects - extract meaningful string representation
    if (typeof value === 'object') {
      // Specific handling for ingredient-like objects
      if (value.name || value.productName || value.ingredient) {
        const name = value.name || value.productName || value.ingredient;
        const quantity = value.quantity || value.amount || '';
        const unit = value.unit || value.units || '';

        if (quantity && unit) {
          return `${quantity} ${unit} ${name}`;
        } else if (quantity) {
          return `${quantity} ${name}`;
        } else {
          return String(name);
        }
      }

      // General object handling
      if (value.toString && value.toString !== Object.prototype.toString) {
        return value.toString();
      }

      // Extract first meaningful property
      const keys = Object.keys(value);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const firstValue = value[firstKey];
        logger.warn('reactSafeRender', 'objectFallback', `Converting object to string using key: ${firstKey}`, { object: value });
        return safeReactRender(firstValue, `${firstKey}: ${firstValue}`);
      }

      // Last resort
      return fallback || '[Object]';
    }

    // Handle functions
    if (typeof value === 'function') {
      return fallback || '[Function]';
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return fallback || '[Symbol]';
    }

    // Fallback to string conversion
    return String(value);

  } catch (error) {
    logger.error('reactSafeRender', 'error', 'Error in safe render', { error: error.message, value });
    return fallback || '[Error]';
  }
};

/**
 * Safely render ingredient objects specifically
 */
export const safeRenderIngredient = (ingredient, fallback = 'Unknown ingredient') => {
  if (!ingredient) return fallback;

  try {
    // If it's already a string, return it
    if (typeof ingredient === 'string') {
      return ingredient.trim() || fallback;
    }

    // If it's an object, extract ingredient information
    if (typeof ingredient === 'object') {
      const name = ingredient.name || ingredient.productName || ingredient.ingredient || ingredient.item;
      const quantity = ingredient.quantity || ingredient.amount;
      const unit = ingredient.unit || ingredient.units;

      if (name) {
        if (quantity && unit) {
          return `${quantity} ${unit} ${name}`;
        } else if (quantity) {
          return `${quantity} ${name}`;
        } else {
          return String(name);
        }
      }

      // If no name found, try other properties
      const props = ['original', 'text', 'description'];
      for (const prop of props) {
        if (ingredient[prop] && typeof ingredient[prop] === 'string') {
          return ingredient[prop];
        }
      }
    }

    return fallback;
  } catch (error) {
    logger.error('safeRenderIngredient', 'error', 'Error rendering ingredient', { error: error.message, ingredient });
    return fallback;
  }
};

/**
 * Safely render arrays of ingredients
 */
export const safeRenderIngredientList = (ingredients, separator = ', ') => {
  if (!Array.isArray(ingredients)) {
    return safeRenderIngredient(ingredients);
  }

  return ingredients
    .map(ingredient => safeRenderIngredient(ingredient))
    .filter(Boolean)
    .join(separator);
};

/**
 * Component wrapper to catch and handle React Error #31
 */
export const withSafeRender = (Component) => {
  return (props) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      if (error.message && error.message.includes('Objects are not valid as a React child')) {
        logger.error('withSafeRender', 'reactError31', 'Caught React Error #31', {
          component: Component.name,
          props: Object.keys(props)
        });
        return <div>Error rendering component: {Component.name}</div>;
      }
      throw error; // Re-throw other errors
    }
  };
};

/**
 * Hook to safely set state with object validation
 */
export const useSafeState = (initialValue) => {
  const [state, setState] = React.useState(initialValue);

  const setSafeState = (newValue) => {
    try {
      // Validate that the new value won't cause React Error #31
      if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue) && !newValue.$$typeof) {
        logger.warn('useSafeState', 'objectState', 'Attempting to set object as state - consider if this will be rendered', { newValue });
      }
      setState(newValue);
    } catch (error) {
      logger.error('useSafeState', 'error', 'Error setting state', { error: error.message, newValue });
    }
  };

  return [state, setSafeState];
};

export default {
  safeReactRender,
  safeRenderIngredient,
  safeRenderIngredientList,
  withSafeRender,
  useSafeState
};