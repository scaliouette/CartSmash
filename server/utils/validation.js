// server/utils/validation.js - Input validation utilities

/**
 * Validate user ID to prevent injection attacks
 */
function validateUserId(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (typeof userId !== 'string') {
    throw new Error('User ID must be a string');
  }
  
  // Allow only alphanumeric characters, hyphens, underscores, and dots
  // Max length 50 characters to prevent abuse
  if (!/^[a-zA-Z0-9._-]{1,50}$/.test(userId)) {
    throw new Error('Invalid user ID format. Only alphanumeric characters, dots, hyphens, and underscores allowed (max 50 chars)');
  }
  
  return userId;
}

/**
 * Validate and sanitize quantity values
 */
function validateQuantity(quantity) {
  if (quantity === null || quantity === undefined) {
    return 1; // Default quantity
  }
  
  const parsed = parseFloat(quantity);
  
  if (isNaN(parsed) || parsed <= 0 || parsed > 9999) {
    throw new Error('Invalid quantity. Must be a number between 0 and 9999');
  }
  
  return parsed;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) {
    throw new Error('Invalid email format');
  }
  
  return email.toLowerCase().trim();
}

/**
 * Sanitize text input to prevent XSS
 */
function sanitizeText(text, maxLength = 1000) {
  if (!text) return '';
  
  if (typeof text !== 'string') {
    throw new Error('Text input must be a string');
  }
  
  // Remove potentially dangerous characters and limit length
  const sanitized = text
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, maxLength);
  
  return sanitized;
}

module.exports = {
  validateUserId,
  validateQuantity,
  validateEmail,
  sanitizeText
};