// Global error handling middleware
const winston = require('winston');

// Configure production logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cartsmash-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

class ExternalAPIError extends Error {
  constructor(service, message) {
    super(`${service} API error: ${message}`);
    this.name = 'ExternalAPIError';
    this.service = service;
    this.statusCode = 502;
  }
}

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error details (but not in test environment)
  if (process.env.NODE_ENV !== 'test') {
    logger.error({
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.uid || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  // Set default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorType = err.name || 'Error';

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation failed';
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(statusCode).json({
      success: false,
      error: message,
      type: errorType,
      details: errors
    });
  }

  if (err.name === 'CastError') {
    // MongoDB cast error
    statusCode = 400;
    message = 'Invalid ID format';
    errorType = 'ValidationError';
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = 'Duplicate entry';
    errorType = 'ConflictError';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorType = 'AuthenticationError';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorType = 'AuthenticationError';
  }

  // Handle axios errors
  if (err.isAxiosError) {
    if (err.response) {
      statusCode = err.response.status;
      message = err.response.data?.error || err.response.data?.message || 'External API error';
    } else if (err.request) {
      statusCode = 503;
      message = 'Service unavailable';
    }
  }

  // Sanitize error message in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An error occurred processing your request';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    type: errorType,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logger,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalAPIError
};