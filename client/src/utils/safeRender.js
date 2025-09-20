// client/src/utils/safeRender.js - Safe rendering utilities to prevent React Error #31

/**
 * Safely renders any value as a React child, preventing the "Objects are not valid as a React child" error
 * @param {*} value - Any value to render safely
 * @param {string} fallback - Fallback string if value can't be rendered
 * @returns {string} A safe string representation for React rendering
 */
export const safeRender = (value, fallback = 'Unknown') => {
  try {
    // Handle null, undefined, empty
    if (value === null || value === undefined) {
      return fallback;
    }

    // If it's already a string, validate and return
    if (typeof value === 'string') {
      // Prevent excessively long strings that could cause performance issues
      const trimmed = value.trim();
      return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
    }

    // If it's a number, convert to string
    if (typeof value === 'number') {
      return isFinite(value) ? String(value) : fallback;
    }

    // If it's a boolean, convert to string
    if (typeof value === 'boolean') {
      return String(value);
    }

    // If it's an array, safely process each item
    if (Array.isArray(value)) {
      // Prevent excessively large arrays
      if (value.length > 50) {
        return `[Array with ${value.length} items]`;
      }

      try {
        const safeItems = value
          .slice(0, 10) // Limit to first 10 items for performance
          .map(item => safeRender(item, fallback))
          .filter(item => item && item.trim())
          .join(', ');

        if (value.length > 10) {
          return `${safeItems} (+${value.length - 10} more)`;
        }

        return safeItems || fallback;
      } catch (e) {
        console.warn('safeRender: Error processing array:', e);
        return `[Array with ${value.length} items]`;
      }
    }

    // If it's an object, try to extract meaningful content safely
    if (typeof value === 'object') {
      try {
        // Prevent circular references and excessively complex objects
        const keys = Object.keys(value);
        if (keys.length > 20) {
          return `[Complex object with ${keys.length} properties]`;
        }

        // Common ingredient patterns with validation
        if (value.name && value.quantity && value.unit) {
          const quantity = String(value.quantity).trim();
          const unit = String(value.unit).trim();
          const name = String(value.name).trim();
          if (quantity && unit && name) {
            return `${quantity} ${unit} ${name}`;
          }
        }

        if (value.productName) {
          const quantity = value.quantity ? String(value.quantity).trim() : '';
          const unit = value.unit ? String(value.unit).trim() : '';
          const productName = String(value.productName).trim();
          const parts = [quantity, unit, productName].filter(part => part && part.length > 0);
          if (parts.length > 0) {
            return parts.join(' ');
          }
        }

        // Try common string properties in order of preference
        const stringProps = ['original', 'name', 'text', 'label', 'title', 'item', 'description', 'ingredient'];
        for (const prop of stringProps) {
          if (value[prop] && typeof value[prop] === 'string') {
            const result = String(value[prop]).trim();
            if (result.length > 0) {
              return result.length > 200 ? result.substring(0, 200) + '...' : result;
            }
          }
        }

        // If it's a simple object with few keys, show key-value pairs
        if (keys.length <= 3 && keys.length > 0) {
          const pairs = keys
            .map(key => {
              const val = value[key];
              if (val !== null && val !== undefined && val !== '') {
                try {
                  const stringVal = String(val).trim();
                  return stringVal.length > 0 ? `${key}: ${stringVal}` : null;
                } catch (e) {
                  return null;
                }
              }
              return null;
            })
            .filter(Boolean);

          if (pairs.length > 0) {
            return pairs.join(', ');
          }
        }

        // For complex objects, just indicate it's an object
        return `[Object with ${keys.length} properties]`;

      } catch (e) {
        console.warn('safeRender: Error processing object:', e);
        return fallback;
      }
    }

    // For functions or other types, try to convert to string safely
    try {
      const result = String(value);
      return result === '[object Object]' ? fallback : result;
    } catch (e) {
      console.warn('safeRender: Error converting to string:', e);
      return fallback;
    }

  } catch (e) {
    console.error('safeRender: Unexpected error:', e);
    return fallback;
  }
};

/**
 * React component wrapper that safely renders any children
 * Usage: <SafeRender>{potentiallyUnsafeValue}</SafeRender>
 */
export const SafeRender = ({ children, fallback = 'Unknown' }) => {
  return safeRender(children, fallback);
};

export default { safeRender, SafeRender };