/**
 * Authentication routes
 * Routes for user registration, login, and authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, rateLimit, validate } = require('../middleware/auth');
const Joi = require('joi');

// Rate limiting for auth endpoints
const authRateLimit = rateLimit(15 * 60 * 1000, 10); // 10 requests per 15 minutes

/**
 * Validation schemas
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50),
  preferences: Joi.object({
    language: Joi.string().valid('en', 'de', 'fr', 'es'),
    theme: Joi.string().valid('light', 'dark', 'auto'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean()
    })
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

/**
 * Public routes (no authentication required)
 */

// Register new user
router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  authController.register
);

// Login user
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  authController.login
);

// Verify token (requires authentication but is a public endpoint)
router.get(
  '/verify',
  authenticate,
  authController.verifyToken
);

/**
 * Protected routes (authentication required)
 */

// Get current user profile
router.get(
  '/me',
  authenticate,
  authController.getProfile
);

// Update user profile
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile
);

// Change password
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

// Logout user (client-side token invalidation)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * Admin routes (admin role required)
 */

// Get all users (admin only)
router.get(
  '/users',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const User = require('../models/User');
      const users = await User.find({}, '-password -verificationToken -resetPasswordToken');
      
      res.status(200).json({
        success: true,
        count: users.length,
        users: users.map(user => user.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user by ID (admin only)
router.get(
  '/users/:id',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.params.id, '-password -verificationToken -resetPasswordToken');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        user: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user status (admin only)
router.put(
  '/users/:id/status',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean'
        });
      }
      
      const User = require('../models/User');
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true, runValidators: true }
      ).select('-password -verificationToken -resetPasswordToken');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health check endpoint for auth service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;