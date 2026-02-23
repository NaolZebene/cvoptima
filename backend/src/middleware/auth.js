/**
 * Authentication middleware
 * JWT token verification and user attachment
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getConfig } = require('../config/env');
const { createError } = require('./error-handlers');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401, 'AuthenticationError');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw createError('No token provided', 401, 'AuthenticationError');
    }
    
    // Verify token
    const config = getConfig();
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'cvoptima-api',
      audience: 'cvoptima-users'
    });
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is deactivated', 403, 'AuthorizationError');
    }
    
    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      subscription: user.subscription.type
    };
    
    // Attach full user object for internal use
    req.userObj = user;
    
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      next(createError('Invalid token', 401, 'AuthenticationError'));
    } else if (error.name === 'TokenExpiredError') {
      next(createError('Token expired', 401, 'AuthenticationError'));
    } else {
      next(error);
    }
  }
};

/**
 * Require specific user role
 * @param {...string} roles - Required roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Authentication required', 401, 'AuthenticationError'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403, 'AuthorizationError'));
    }
    
    next();
  };
};

/**
 * Require active subscription
 * @param {string} minSubscription - Minimum subscription level required
 */
const requireSubscription = (minSubscription = 'basic') => {
  const subscriptionLevels = {
    free: 0,
    basic: 1,
    premium: 2,
    enterprise: 3
  };
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401, 'AuthenticationError'));
      }
      
      // Get fresh user data to check subscription
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return next(createError('User not found', 404, 'NotFoundError'));
      }
      
      const userLevel = subscriptionLevels[user.subscription.type] || 0;
      const requiredLevel = subscriptionLevels[minSubscription] || 0;
      
      if (userLevel < requiredLevel) {
        return next(createError(
          `${minSubscription} subscription required`,
          403,
          'AuthorizationError'
        ));
      }
      
      // Check if subscription has expired
      if (user.subscription.expiresAt && user.subscription.expiresAt < new Date()) {
        return next(createError(
          'Subscription has expired',
          403,
          'AuthorizationError'
        ));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication
 * Attaches user if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const config = getConfig();
        const decoded = jwt.verify(token, config.jwtSecret, {
          issuer: 'cvoptima-api',
          audience: 'cvoptima-users'
        });
        
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
          req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            subscription: user.subscription.type
          };
          req.userObj = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Rate limiting middleware (placeholder)
 * In production, use a proper rate limiter like express-rate-limit
 */
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return (req, res, next) => {
    // Simple in-memory rate limiting for development
    // In production, use Redis or another distributed store
    
    // For now, just pass through
    // TODO: Implement proper rate limiting
    next();
  };
};

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi validation schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    // Replace request body with validated values
    req.body = value;
    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
  requireSubscription,
  optionalAuth,
  rateLimit,
  validate
};