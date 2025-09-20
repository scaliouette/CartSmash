// client/src/utils/safeRender.js - Safe rendering utilities to prevent React Error #31

/**
 * Safely renders any value as a React child, preventing the "Objects are not valid as a React child" error
 * @param {*} value - Any value to render safely
 * @param {string} fallback - Fallback string if value can't be rendered
 * @returns {string} A safe string representation for React rendering
 */
export const safeRender = (value, fallback = 'Unknown') => {
  // Handle null, undefined, empty
  if (value === null || value === undefined) {
    return fallback;
  }

  // If it's already a string or number, return as-is
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  // If it's a boolean, convert to string
  if (typeof value === 'boolean') {
    return String(value);
  }

  // If it's an array, join with commas
  if (Array.isArray(value)) {
    return value.map(item => safeRender(item, fallback)).join(', ');
  }

  // If it's an object, try to extract meaningful content
  if (typeof value === 'object') {
    try {
      // Common ingredient patterns
      if (value.name && value.quantity && value.unit) {
        return `${value.quantity} ${value.unit} ${value.name}`;
      }

      if (value.productName) {
        const quantity = value.quantity || '';
        const unit = value.unit || '';
        const parts = [quantity, unit, value.productName].filter(Boolean);
        return parts.join(' ');
      }

      // Other common patterns
      if (value.name) return String(value.name);
      if (value.text) return String(value.text);
      if (value.label) return String(value.label);
      if (value.title) return String(value.title);
      if (value.original) return String(value.original);
      if (value.item) return String(value.item);
      if (value.description) return String(value.description);

      // If it's a simple object with few keys, show key-value pairs
      const keys = Object.keys(value);
      if (keys.length <= 3 && keys.length > 0) {
        return keys.map(key => {
          const val = value[key];
          if (val !== null && val !== undefined) {
            return `${key}: ${String(val)}`;
          }
          return null;
        }).filter(Boolean).join(', ');
      }

      // For complex objects, just indicate it's an object
      return `[Object with ${keys.length} properties]`;

    } catch (e) {
      console.warn('safeRender: Error processing object:', e);
      return fallback;
    }
  }

  // For functions or other types, convert to string
  try {
    return String(value);
  } catch (e) {
    console.warn('safeRender: Error converting to string:', e);
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