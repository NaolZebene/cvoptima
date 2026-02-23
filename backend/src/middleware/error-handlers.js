/**
 * Error handling middleware
 * Comprehensive error handling for Express applications
 */

const { isProduction } = require('../config/env');

/**
 * Global error handler middleware
 * Should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    error: err.message || 'Something went wrong',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace only in non-production environments
  if (!isProduction() && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  // Include validation errors if present
  if (err.details && Array.isArray(err.details)) {
    errorResponse.details = err.details;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 * Catches errors in async route handlers and passes them to errorHandler
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Should be placed after all routes but before the error handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.url}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Validation error handler (for Joi validation errors)
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.isJoi) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.details = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));
    return next(error);
  }
  next(err);
};

/**
 * Database error handler
 * Handles MongoDB and other database errors
 */
const databaseErrorHandler = (err, req, res, next) => {
  // MongoDB duplicate key error
  if (err.name === 'MongoError' && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    const error = new Error(`${field} '${value}' already exists`);
    error.statusCode = 409; // Conflict
    error.field = field;
    error.value = value;
    return next(error);
  }
  
  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const error = new Error('Database validation failed');
    error.statusCode = 400;
    error.details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      type: e.kind
    }));
    return next(error);
  }
  
  // MongoDB connection error
  if (err.name === 'MongoNetworkError') {
    const error = new Error('Database connection failed');
    error.statusCode = 503; // Service Unavailable
    return next(error);
  }
  
  next(err);
};

/**
 * Authentication/Authorization error handler
 */
const authErrorHandler = (err, req, res, next) => {
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const error = new Error('Invalid token');
    error.statusCode = 401;
    return next(error);
  }
  
  if (err.name === 'TokenExpiredError') {
    const error = new Error('Token expired');
    error.statusCode = 401;
    return next(error);
  }
  
  // Custom authentication errors
  if (err.name === 'AuthenticationError') {
    err.statusCode = err.statusCode || 401;
    return next(err);
  }
  
  // Custom authorization errors
  if (err.name === 'AuthorizationError') {
    err.statusCode = err.statusCode || 403;
    return next(err);
  }
  
  next(err);
};

/**
 * Rate limiting error handler
 */
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err.name === 'RateLimitError') {
    const error = new Error('Too many requests');
    error.statusCode = 429; // Too Many Requests
    error.retryAfter = err.retryAfter;
    return next(error);
  }
  next(err);
};

/**
 * File upload error handler
 */
const fileUploadErrorHandler = (err, req, res, next) => {
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const error = new Error('File too large');
    error.statusCode = 413; // Payload Too Large
    return next(error);
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    const error = new Error('Too many files');
    error.statusCode = 413;
    return next(error);
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const error = new Error('Unexpected file field');
    error.statusCode = 400;
    return next(error);
  }
  
  next(err);
};

/**
 * Create a custom error class
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} name - Error name
 * @returns {Error} Custom error instance
 */
const createError = (message, statusCode = 500, name = 'CustomError') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.name = name;
  return error;
};

/**
 * Custom error classes for common error types
 */
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

class ValidationError extends Error {
  constructor(message = 'Validation failed', details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

/**
 * Setup all error handlers in the correct order
 * @param {Object} app - Express application
 */
const setupErrorHandlers = (app) => {
  // Specialized error handlers (order matters)
  app.use(validationErrorHandler);
  app.use(databaseErrorHandler);
  app.use(authErrorHandler);
  app.use(rateLimitErrorHandler);
  app.use(fileUploadErrorHandler);
  
  // 404 handler (after all routes)
  app.use(notFoundHandler);
  
  // Global error handler (last middleware)
  app.use(errorHandler);
  
  console.log('✅ Error handlers configured');
};

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  authErrorHandler,
  rateLimitErrorHandler,
  fileUploadErrorHandler,
  createError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  setupErrorHandlers
};