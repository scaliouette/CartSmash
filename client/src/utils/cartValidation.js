// client/src/utils/cartValidation.js
// Comprehensive cart validation for Instacart integration

export class CartValidationError extends Error {
  constructor(message, code, details = []) {
    super(message);
    this.name = 'CartValidationError';
    this.code = code;
    this.details = details;
  }
}

export const VALIDATION_CODES = {
  EMPTY_CART: 'EMPTY_CART',
  INVALID_ITEM: 'INVALID_ITEM',
  MISSING_PRODUCT_NAME: 'MISSING_PRODUCT_NAME',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  MISSING_ID: 'MISSING_ID',
  DUPLICATE_IDS: 'DUPLICATE_IDS',
  CART_TOO_LARGE: 'CART_TOO_LARGE',
  SERIALIZATION_ISSUE: 'SERIALIZATION_ISSUE'
};

/**
 * Validates cart items for Instacart integration
 * @param {Array} cartItems - Array of cart items to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with success flag and details
 */
export const validateCartForInstacart = (cartItems, options = {}) => {
  const {
    maxItems = 100,
    minProductNameLength = 2,
    strictMode = true
  } = options;

  const issues = [];
  const warnings = [];

  // Basic cart validation
  if (!Array.isArray(cartItems)) {
    throw new CartValidationError('Cart must be an array', VALIDATION_CODES.INVALID_ITEM);
  }

  if (cartItems.length === 0) {
    throw new CartValidationError('Cart is empty', VALIDATION_CODES.EMPTY_CART);
  }

  if (cartItems.length > maxItems) {
    issues.push({
      code: VALIDATION_CODES.CART_TOO_LARGE,
      message: `Cart has ${cartItems.length} items, maximum allowed is ${maxItems}`,
      severity: 'error'
    });
  }

  // Check for duplicate IDs
  const idMap = new Map();
  const duplicateIds = [];

  cartItems.forEach((item, index) => {
    if (item.id) {
      if (idMap.has(item.id)) {
        duplicateIds.push({
          id: item.id,
          indices: [idMap.get(item.id), index]
        });
      } else {
        idMap.set(item.id, index);
      }
    }
  });

  if (duplicateIds.length > 0) {
    issues.push({
      code: VALIDATION_CODES.DUPLICATE_IDS,
      message: `Found ${duplicateIds.length} duplicate item IDs`,
      details: duplicateIds,
      severity: 'error'
    });
  }

  // Individual item validation
  cartItems.forEach((item, index) => {
    const itemIssues = validateSingleItem(item, index, { minProductNameLength, strictMode });
    issues.push(...itemIssues.issues);
    warnings.push(...itemIssues.warnings);
  });

  // Serialization test
  try {
    const serialized = JSON.stringify(cartItems);
    const parsed = JSON.parse(serialized);
    
    if (parsed.length !== cartItems.length) {
      issues.push({
        code: VALIDATION_CODES.SERIALIZATION_ISSUE,
        message: 'Cart items failed serialization test',
        severity: 'error'
      });
    }
  } catch (error) {
    issues.push({
      code: VALIDATION_CODES.SERIALIZATION_ISSUE,
      message: `Serialization error: ${error.message}`,
      severity: 'error'
    });
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = warnings.length;

  return {
    valid: errorCount === 0,
    issues,
    warnings,
    summary: {
      totalItems: cartItems.length,
      errorCount,
      warningCount,
      validItems: cartItems.length - issues.filter(i => i.severity === 'error' && i.itemIndex !== undefined).length
    }
  };
};

/**
 * Validates a single cart item
 * @param {Object} item - Cart item to validate
 * @param {number} index - Item index in cart
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result for single item
 */
export const validateSingleItem = (item, index, options = {}) => {
  const { minProductNameLength = 2, strictMode = true } = options;
  const issues = [];
  const warnings = [];

  // Check if item is an object
  if (typeof item !== 'object' || item === null) {
    issues.push({
      code: VALIDATION_CODES.INVALID_ITEM,
      message: `Item ${index + 1}: Not a valid object`,
      itemIndex: index,
      severity: 'error'
    });
    return { issues, warnings };
  }

  // Check for required fields
  if (!item.id) {
    issues.push({
      code: VALIDATION_CODES.MISSING_ID,
      message: `Item ${index + 1}: Missing required ID`,
      itemIndex: index,
      severity: 'error'
    });
  } else if (typeof item.id !== 'string' && typeof item.id !== 'number') {
    issues.push({
      code: VALIDATION_CODES.MISSING_ID,
      message: `Item ${index + 1}: ID must be string or number`,
      itemIndex: index,
      severity: 'error'
    });
  }

  // Product name validation
  if (!item.productName) {
    issues.push({
      code: VALIDATION_CODES.MISSING_PRODUCT_NAME,
      message: `Item ${index + 1}: Missing product name`,
      itemIndex: index,
      severity: 'error'
    });
  } else if (typeof item.productName !== 'string') {
    issues.push({
      code: VALIDATION_CODES.MISSING_PRODUCT_NAME,
      message: `Item ${index + 1}: Product name must be a string, got ${typeof item.productName}`,
      itemIndex: index,
      severity: 'error'
    });
  } else if (item.productName.trim().length < minProductNameLength) {
    issues.push({
      code: VALIDATION_CODES.MISSING_PRODUCT_NAME,
      message: `Item ${index + 1}: Product name too short (minimum ${minProductNameLength} characters)`,
      itemIndex: index,
      severity: 'error'
    });
  }

  // Quantity validation
  if (item.quantity !== undefined) {
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      issues.push({
        code: VALIDATION_CODES.INVALID_QUANTITY,
        message: `Item ${index + 1}: Quantity must be a positive number`,
        itemIndex: index,
        severity: 'error'
      });
    }
  } else if (strictMode) {
    warnings.push({
      message: `Item ${index + 1}: No quantity specified, will default to 1`,
      itemIndex: index,
      severity: 'warning'
    });
  }

  // Check for [object Object] issue
  if (typeof item.productName === 'string' && item.productName.includes('[object Object]')) {
    issues.push({
      code: VALIDATION_CODES.SERIALIZATION_ISSUE,
      message: `Item ${index + 1}: Product name contains '[object Object]' - serialization issue`,
      itemIndex: index,
      severity: 'error'
    });
  }

  // Check for undefined values in critical fields
  const criticalFields = ['productName', 'quantity', 'unit'];
  criticalFields.forEach(field => {
    if (item[field] === undefined && field !== 'quantity') {
      warnings.push({
        message: `Item ${index + 1}: ${field} is undefined`,
        itemIndex: index,
        field: field,
        severity: 'warning'
      });
    }
  });

  return { issues, warnings };
};

/**
 * Repairs common cart issues
 * @param {Array} cartItems - Cart items to repair
 * @returns {Array} - Repaired cart items
 */
export const repairCartItems = (cartItems) => {
  if (!Array.isArray(cartItems)) {
    console.warn('Cannot repair non-array cart items');
    return [];
  }

  return cartItems
    .filter(item => item !== null && item !== undefined)
    .map((item, index) => {
      const repairedItem = { ...item };

      // Generate ID if missing
      if (!repairedItem.id) {
        repairedItem.id = `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔧 Generated ID for item ${index}: ${repairedItem.id}`);
      }

      // Fix product name issues
      if (!repairedItem.productName || typeof repairedItem.productName !== 'string') {
        repairedItem.productName = `Unknown Item ${index + 1}`;
        console.log(`🔧 Fixed product name for item ${index}`);
      }

      // Fix serialization issues
      if (repairedItem.productName.includes('[object Object]')) {
        repairedItem.productName = `Product ${index + 1}`;
        console.log(`🔧 Fixed [object Object] issue for item ${index}`);
      }

      // Set default quantity
      if (typeof repairedItem.quantity !== 'number' || repairedItem.quantity <= 0) {
        repairedItem.quantity = 1;
      }

      // Set default unit
      if (!repairedItem.unit) {
        repairedItem.unit = 'each';
      }

      // Ensure no undefined values in critical fields
      const cleanedItem = Object.entries(repairedItem).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      return cleanedItem;
    });
};

/**
 * Creates a validation report for debugging
 * @param {Object} validationResult - Result from validateCartForInstacart
 * @returns {string} - Formatted validation report
 */
export const createValidationReport = (validationResult) => {
  const { valid, issues, warnings, summary } = validationResult;
  
  let report = `\n🔍 CART VALIDATION REPORT\n`;
  report += `═══════════════════════════════\n`;
  report += `Status: ${valid ? '✅ VALID' : '❌ INVALID'}\n`;
  report += `Total Items: ${summary.totalItems}\n`;
  report += `Valid Items: ${summary.validItems}\n`;
  report += `Errors: ${summary.errorCount}\n`;
  report += `Warnings: ${summary.warningCount}\n\n`;

  if (issues.length > 0) {
    report += `🚨 ISSUES:\n`;
    issues.forEach((issue, index) => {
      report += `${index + 1}. [${issue.code}] ${issue.message}\n`;
      if (issue.details) {
        report += `   Details: ${JSON.stringify(issue.details)}\n`;
      }
    });
    report += `\n`;
  }

  if (warnings.length > 0) {
    report += `⚠️ WARNINGS:\n`;
    warnings.forEach((warning, index) => {
      report += `${index + 1}. ${warning.message}\n`;
    });
  }

  return report;
};

/**
 * Quick validation for development/debugging
 * @param {Array} cartItems - Cart items to validate
 * @returns {boolean} - Whether cart is valid for Instacart
 */
export const isCartValidForInstacart = (cartItems) => {
  try {
    const result = validateCartForInstacart(cartItems);
    return result.valid;
  } catch (error) {
    console.error('Cart validation failed:', error);
    return false;
  }
};