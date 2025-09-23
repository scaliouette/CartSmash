// client/src/utils/ingredientNormalizer.js - Standardizes ingredient data structures

/**
 * Standard ingredient interface:
 * {
 *   id: string,
 *   name: string,
 *   quantity: number,
 *   unit: string,
 *   originalText: string,
 *   category?: string,
 *   brand?: string,
 *   notes?: string,
 *   metadata: {
 *     source: string,
 *     confidence: number,
 *     enriched: boolean,
 *     lastUpdated: string
 *   }
 * }
 */

/**
 * Normalizes an ingredient from any format to standard format
 * @param {string|object} rawIngredient - Raw ingredient data
 * @param {object} options - Normalization options
 * @returns {object} Normalized ingredient
 */
export const normalizeIngredient = (rawIngredient, options = {}) => {
  const {
    generateId = true,
    defaultQuantity = 1,
    defaultUnit = 'each',
    source = 'unknown'
  } = options;

  try {
    // Handle null/undefined
    if (!rawIngredient) {
      throw new Error('Ingredient is null or undefined');
    }

    // Handle string ingredients
    if (typeof rawIngredient === 'string') {
      const parsed = parseIngredientString(rawIngredient);
      return createStandardIngredient({
        name: parsed.name,
        quantity: parsed.quantity || defaultQuantity,
        unit: parsed.unit || defaultUnit,
        originalText: rawIngredient,
        generateId,
        source
      });
    }

    // Handle object ingredients
    if (typeof rawIngredient === 'object') {
      return normalizeIngredientObject(rawIngredient, { generateId, defaultQuantity, defaultUnit, source });
    }

    // Handle other types
    throw new Error(`Unsupported ingredient type: ${typeof rawIngredient}`);

  } catch (error) {
    console.warn('Failed to normalize ingredient:', error, rawIngredient);

    // Return a fallback ingredient
    return createStandardIngredient({
      name: 'Unknown ingredient',
      quantity: defaultQuantity,
      unit: defaultUnit,
      originalText: String(rawIngredient),
      generateId,
      source: 'error',
      metadata: {
        error: error.message,
        originalType: typeof rawIngredient
      }
    });
  }
};

/**
 * Normalizes an ingredient object to standard format
 */
const normalizeIngredientObject = (obj, options) => {
  const { generateId, defaultQuantity, defaultUnit, source } = options;

  // Extract name from various possible properties
  const name = extractName(obj);

  // Extract quantity and unit
  const quantity = extractQuantity(obj) || defaultQuantity;
  const unit = extractUnit(obj) || defaultUnit;

  // Extract original text
  const originalText = extractOriginalText(obj);

  // Extract optional properties
  const category = extractCategory(obj);
  const brand = extractBrand(obj);
  const notes = extractNotes(obj);

  // Extract existing metadata
  const existingMetadata = obj.metadata || {};

  return createStandardIngredient({
    id: obj.id,
    name,
    quantity,
    unit,
    originalText,
    category,
    brand,
    notes,
    generateId: !obj.id && generateId,
    source,
    metadata: {
      enriched: obj.enriched || existingMetadata.enriched || false,
      confidence: obj.confidence || existingMetadata.confidence || 0,
      ...existingMetadata
    }
  });
};

/**
 * Extracts name from ingredient object using multiple strategies
 */
const extractName = (obj) => {
  const nameProps = [
    'name', 'productName', 'item', 'ingredient', 'food', 'product',
    'title', 'label', 'text', 'description', 'original'
  ];

  for (const prop of nameProps) {
    if (obj[prop] && typeof obj[prop] === 'string') {
      const cleaned = obj[prop].trim();
      if (cleaned.length > 0 && cleaned.length <= 200) {
        return cleaned;
      }
    }
  }

  return 'Unknown ingredient';
};

/**
 * Extracts quantity from ingredient object
 */
const extractQuantity = (obj) => {
  const quantityProps = ['quantity', 'amount', 'count', 'qty'];

  for (const prop of quantityProps) {
    if (obj[prop] !== undefined && obj[prop] !== null) {
      const value = Number(obj[prop]);
      if (isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
};

/**
 * Extracts unit from ingredient object
 */
const extractUnit = (obj) => {
  const unitProps = ['unit', 'measure', 'units', 'measurement'];

  for (const prop of unitProps) {
    if (obj[prop] && typeof obj[prop] === 'string') {
      const cleaned = obj[prop].trim().toLowerCase();
      if (cleaned.length > 0 && cleaned.length <= 20) {
        return normalizeUnit(cleaned);
      }
    }
  }

  return null;
};

/**
 * Extracts original text from ingredient object
 */
const extractOriginalText = (obj) => {
  const textProps = ['original', 'originalText', 'raw', 'input'];

  for (const prop of textProps) {
    if (obj[prop] && typeof obj[prop] === 'string') {
      return obj[prop].trim();
    }
  }

  // If no original text found, try to reconstruct it
  const name = extractName(obj);
  const quantity = extractQuantity(obj);
  const unit = extractUnit(obj);

  if (quantity && unit) {
    return `${quantity} ${unit} ${name}`;
  } else if (quantity) {
    return `${quantity} ${name}`;
  } else {
    return name;
  }
};

/**
 * Extracts category from ingredient object
 */
const extractCategory = (obj) => {
  if (obj.category && typeof obj.category === 'string') {
    const cleaned = obj.category.trim().toLowerCase();
    return cleaned.length > 0 ? cleaned : null;
  }
  return null;
};

/**
 * Extracts brand from ingredient object
 */
const extractBrand = (obj) => {
  if (obj.brand && typeof obj.brand === 'string') {
    const cleaned = obj.brand.trim();
    return cleaned.length > 0 ? cleaned : null;
  }
  return null;
};

/**
 * Extracts notes from ingredient object
 */
const extractNotes = (obj) => {
  const noteProps = ['notes', 'description', 'comments', 'remarks'];

  for (const prop of noteProps) {
    if (obj[prop] && typeof obj[prop] === 'string') {
      const cleaned = obj[prop].trim();
      if (cleaned.length > 0) {
        return cleaned.length > 500 ? cleaned.substring(0, 500) + '...' : cleaned;
      }
    }
  }

  return null;
};

/**
 * Parses a string ingredient into components
 */
const parseIngredientString = (str) => {
  const trimmed = str.trim();

  // Try to parse quantity and unit from the beginning
  const quantityUnitRegex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
  const match = trimmed.match(quantityUnitRegex);

  if (match) {
    const [, quantityStr, unit, name] = match;
    return {
      quantity: parseFloat(quantityStr),
      unit: unit ? normalizeUnit(unit) : null,
      name: name.trim()
    };
  }

  // Try to parse just quantity
  const quantityRegex = /^(\d+(?:\.\d+)?)\s+(.+)$/;
  const quantityMatch = trimmed.match(quantityRegex);

  if (quantityMatch) {
    const [, quantityStr, name] = quantityMatch;
    return {
      quantity: parseFloat(quantityStr),
      unit: null,
      name: name.trim()
    };
  }

  // No quantity found, treat entire string as name
  return {
    quantity: null,
    unit: null,
    name: trimmed
  };
};

/**
 * Normalizes unit names to standard forms
 */
const normalizeUnit = (unit) => {
  const unitMappings = {
    // Volume
    'tsp': 'teaspoon',
    'teaspoons': 'teaspoon',
    'tbsp': 'tablespoon',
    'tablespoons': 'tablespoon',
    'cups': 'cup',
    'fl oz': 'fluid ounce',
    'fluid ounces': 'fluid ounce',
    'pt': 'pint',
    'pints': 'pint',
    'qt': 'quart',
    'quarts': 'quart',
    'gal': 'gallon',
    'gallons': 'gallon',
    'ml': 'milliliter',
    'milliliters': 'milliliter',
    'l': 'liter',
    'liters': 'liter',

    // Weight
    'oz': 'ounce',
    'ounces': 'ounce',
    'lb': 'pound',
    'lbs': 'pound',
    'pounds': 'pound',
    'g': 'gram',
    'grams': 'gram',
    'kg': 'kilogram',
    'kilograms': 'kilogram',

    // Count
    'pcs': 'piece',
    'pieces': 'piece',
    'items': 'item',
    'each': 'each',

    // Common food units
    'cloves': 'clove',
    'slices': 'slice',
    'bunches': 'bunch',
    'heads': 'head',
    'packages': 'package',
    'containers': 'container',
    'jars': 'jar',
    'cans': 'can',
    'bottles': 'bottle',
    'boxes': 'box'
  };

  const normalized = unit.toLowerCase().trim();
  return unitMappings[normalized] || normalized;
};

/**
 * Creates a standard ingredient object
 */
const createStandardIngredient = ({
  id,
  name,
  quantity,
  unit,
  originalText,
  category = null,
  brand = null,
  notes = null,
  generateId = true,
  source = 'unknown',
  metadata = {}
}) => {
  return {
    id: id || (generateId ? generateIngredientId() : null),
    name: name.trim(),
    quantity: Number(quantity),
    unit: unit.toLowerCase(),
    originalText: originalText || `${quantity} ${unit} ${name}`,
    category,
    brand,
    notes,
    metadata: {
      source,
      confidence: 0,
      enriched: false,
      lastUpdated: new Date().toISOString(),
      ...metadata
    }
  };
};

/**
 * Generates a unique ingredient ID
 */
const generateIngredientId = () => {
  return `ingredient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Normalizes an array of ingredients
 */
export const normalizeIngredients = (ingredients, options = {}) => {
  if (!Array.isArray(ingredients)) {
    console.warn('normalizeIngredients: input is not an array');
    return [];
  }

  const {
    maxCount = 100,
    skipInvalid = true,
    source = 'bulk_import'
  } = options;

  if (ingredients.length > maxCount) {
    console.warn(`normalizeIngredients: too many ingredients (${ingredients.length}), truncating to ${maxCount}`);
    ingredients = ingredients.slice(0, maxCount);
  }

  const normalized = [];
  const errors = [];

  ingredients.forEach((ingredient, index) => {
    try {
      const normalized_ingredient = normalizeIngredient(ingredient, { ...options, source: `${source}_${index}` });
      normalized.push(normalized_ingredient);
    } catch (error) {
      const errorInfo = {
        index,
        error: error.message,
        original: ingredient
      };
      errors.push(errorInfo);

      if (!skipInvalid) {
        // Add a fallback ingredient
        normalized.push(createStandardIngredient({
          name: `Invalid ingredient (${index})`,
          quantity: 1,
          unit: 'each',
          originalText: String(ingredient),
          source: 'error',
          metadata: { error: error.message }
        }));
      }
    }
  });

  return {
    ingredients: normalized,
    errors,
    totalProcessed: ingredients.length,
    successCount: normalized.length,
    errorCount: errors.length
  };
};

/**
 * Validates that an ingredient matches the standard format
 */
export const isStandardIngredient = (ingredient) => {
  if (!ingredient || typeof ingredient !== 'object') return false;

  const requiredProps = ['id', 'name', 'quantity', 'unit', 'originalText', 'metadata'];

  return requiredProps.every(prop => ingredient.hasOwnProperty(prop)) &&
         typeof ingredient.name === 'string' &&
         typeof ingredient.quantity === 'number' &&
         typeof ingredient.unit === 'string' &&
         typeof ingredient.originalText === 'string' &&
         typeof ingredient.metadata === 'object';
};

/**
 * Converts a standard ingredient back to a simple format for APIs
 */
export const simplifyIngredient = (ingredient) => {
  if (!isStandardIngredient(ingredient)) {
    throw new Error('Input is not a standard ingredient');
  }

  return {
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    original: ingredient.originalText
  };
};

export default {
  normalizeIngredient,
  normalizeIngredients,
  isStandardIngredient,
  simplifyIngredient,
  parseIngredientString,
  normalizeUnit
};