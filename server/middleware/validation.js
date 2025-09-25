// Input validation middleware
const validator = require('validator');
const xss = require('xss');

// Sanitize and validate input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove XSS attempts
  let sanitized = xss(input);

  // Remove SQL injection attempts
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|WHERE|OR|AND|LIKE|FROM|INTO|VALUES|SET)\b)/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

// Validate request body
const validateRequestBody = (schema) => {
  return (req, res, next) => {
    try {
      // Deep sanitize all string inputs
      const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
          return sanitizeInput(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
          const sanitized = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
      req.query = sanitizeObject(req.query);
      req.params = sanitizeObject(req.params);

      // Validate against schema if provided
      if (schema) {
        const { error } = schema.validate(req.body);
        if (error) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.details.map(d => d.message)
          });
        }
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }
  };
};

// Validate specific input types
const validators = {
  isEmail: (email) => validator.isEmail(email),
  isURL: (url) => validator.isURL(url),
  isPostalCode: (code) => /^\d{5}(-\d{4})?$/.test(code),
  isPhoneNumber: (phone) => validator.isMobilePhone(phone, 'any'),
  isAlphanumeric: (str) => validator.isAlphanumeric(str),
  isNumeric: (str) => validator.isNumeric(str),
  isUUID: (str) => validator.isUUID(str),

  // Custom validators
  isValidRetailerId: (id) => /^[a-z0-9-_]+$/i.test(id),
  isValidProductId: (id) => /^[a-zA-Z0-9-_]+$/.test(id),
  isValidQuantity: (qty) => {
    const num = parseFloat(qty);
    return !isNaN(num) && num > 0 && num <= 1000;
  },
  isValidPrice: (price) => {
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0 && num <= 100000;
  }
};

// Middleware to prevent NoSQL injection
const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          return true;
        }
        if (typeof obj[key] === 'object') {
          if (checkForInjection(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid characters in request'
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateRequestBody,
  validators,
  preventNoSQLInjection
};