/**
 * Logging middleware configuration
 * Morgan logging setup with environment-specific configurations
 */

const morgan = require('morgan');
const { isProduction, isDevelopment } = require('../config/env');

/**
 * Get the appropriate log format based on environment
 * @param {string} environment - Current environment
 * @returns {string} Morgan format string
 */
const getLogFormat = (environment) => {
  switch (environment) {
    case 'production':
      return 'combined'; // Standard Apache combined log format
    case 'test':
      return 'tiny'; // Minimal output for tests
    case 'development':
    default:
      return 'dev'; // Colored development output
  }
};

/**
 * Create a morgan logger with the given format and options
 * @param {string} format - Morgan format string
 * @param {Object} options - Additional morgan options
 * @returns {Function} Morgan middleware function
 */
const createMorganLogger = (format, options = {}) => {
  const defaultOptions = {
    // Skip logging for health checks in production to reduce noise
    skip: (req, res) => {
      if (isProduction() && req.path === '/health') {
        return true;
      }
      return false;
    },
    
    // Custom stream for production (could be to a file or service)
    stream: isProduction() 
      ? process.stdout // In production, you might want to use a file stream
      : process.stdout
  };
  
  return morgan(format, { ...defaultOptions, ...options });
};

/**
 * Set up logging middleware for the Express app
 * @param {Object} app - Express application instance
 */
const setupLogging = (app) => {
  try {
    const environment = isProduction() ? 'production' : 
                       isDevelopment() ? 'development' : 'test';
    
    const format = getLogFormat(environment);
    const logger = createMorganLogger(format);
    
    app.use(logger);
    
    console.log(`✅ Logging configured: ${format} format (${environment} environment)`);
  } catch (error) {
    console.error('Failed to set up logging:', error);
    // Don't crash the app if logging fails
    app.use((req, res, next) => next()); // No-op middleware as fallback
  }
};

/**
 * Custom morgan token for request ID (if needed)
 * This adds a :request-id token to morgan format
 */
const addCustomTokens = () => {
  // Add a custom token for request ID
  morgan.token('request-id', (req) => {
    return req.id || 'no-request-id';
  });
  
  // Add a custom token for user ID (if authenticated)
  morgan.token('user-id', (req) => {
    return req.user?.id || 'anonymous';
  });
  
  // Add a custom token for response size in human-readable format
  morgan.token('response-size-human', (req, res) => {
    const bytes = res.getHeader('content-length');
    if (!bytes) return '-';
    
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  });
};

/**
 * Custom log format for API requests
 * Includes method, URL, status, response time, and size
 */
const apiLogFormat = ':method :url :status :response-time ms - :response-size-human [:user-id]';

/**
 * Set up API-specific logging (more detailed than general logging)
 * @param {Object} app - Express application instance
 */
const setupApiLogging = (app) => {
  // Add custom tokens first
  addCustomTokens();
  
  // Use custom format for API routes
  const apiLogger = createMorganLogger(apiLogFormat, {
    skip: (req, res) => !req.path.startsWith('/api/')
  });
  
  app.use(apiLogger);
};

/**
 * Error logging middleware
 * Logs errors with additional context
 */
const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode: err.statusCode || 500,
    error: err.message,
    stack: isProduction() ? undefined : err.stack, // Don't log stack in production
    userAgent: req.get('user-agent'),
    ip: req.ip,
    userId: req.user?.id,
    params: req.params,
    query: req.query,
    body: req.body // Be careful with sensitive data in production
  };
  
  console.error('API Error:', errorLog);
  next(err);
};

/**
 * Request logging middleware (for manual logging when needed)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  console.log(`→ ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length')
  });
  
  // Hook into response finish to log completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    const logEntry = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      userAgent: req.get('user-agent'),
      ip: req.ip
    };
    
    console[logLevel](`← ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`, logEntry);
  });
  
  next();
};

module.exports = {
  setupLogging,
  setupApiLogging,
  errorLogger,
  requestLogger,
  getLogFormat,
  createMorganLogger,
  addCustomTokens
};