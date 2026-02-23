/**
 * Admin routes
 * Routes for admin dashboard and management
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const Joi = require('joi');

/**
 * Validation schemas
 */
const reportSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  segmentBy: Joi.string().valid('subscription', 'signup_month', 'cv_count'),
  format: Joi.string().valid('json', 'csv').default('json')
});

const exportSchema = Joi.object({
  type: Joi.string().valid('users', 'cvs', 'scores', 'subscriptions').required(),
  format: Joi.string().valid('csv', 'json').default('csv'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

const notificationSchema = Joi.object({
  type: Joi.string().valid('email', 'in_app', 'both').required(),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(1000).required(),
  targetUsers: Joi.array().items(Joi.string()),
  targetCriteria: Joi.object({
    subscription: Joi.string().valid('free', 'basic', 'premium'),
    minCvCount: Joi.number().integer().min(0),
    activeWithinDays: Joi.number().integer().min(1)
  })
}).or('targetUsers', 'targetCriteria');

const maintenanceSchema = Joi.object({
  task: Joi.string().valid(
    'cleanup_old_cvs',
    'update_keyword_database',
    'recalculate_scores',
    'backup_database'
  ).required()
});

const cacheSchema = Joi.object({
  cacheType: Joi.string().valid('all', 'user', 'cv', 'score').default('all')
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  role: Joi.string().valid('user', 'admin'),
  isActive: Joi.boolean(),
  'subscription.type': Joi.string().valid('free', 'basic', 'premium'),
  'subscription.status': Joi.string().valid('active', 'trialing', 'cancelled')
}).min(1);

/**
 * Query validation middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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
    
    req.query = value;
    next();
  };
};

/**
 * Body validation middleware
 */
const validateBody = (schema) => {
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
    
    req.body = value;
    next();
  };
};

/**
 * Admin middleware - requires admin role
 */
// Note: authenticate, requireAdmin was defined as an array, but Express middleware needs to be functions
// We'll use authenticate and requireAdmin directly in routes

/**
 * Dashboard routes
 */

// Get dashboard overview
router.get(
  '/dashboard',
  authenticate, requireAdmin,
  adminController.getDashboardOverview
);

// Get detailed report
router.post(
  '/reports/:type',
  authenticate, requireAdmin,
  validateBody(reportSchema),
  adminController.getDetailedReport
);

/**
 * User management routes
 */

// Get users list
router.get(
  '/users',
  authenticate, requireAdmin,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(100),
    subscription: Joi.string().valid('free', 'basic', 'premium'),
    sortBy: Joi.string().valid('createdAt', 'lastLogin', 'email', 'name').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })),
  adminController.getUsers
);

// Get user details
router.get(
  '/users/:userId',
  authenticate, requireAdmin,
  adminController.getUserDetails
);

// Update user
router.put(
  '/users/:userId',
  authenticate, requireAdmin,
  validateBody(userUpdateSchema),
  adminController.updateUser
);

/**
 * System monitoring routes
 */

// Get system health
router.get(
  '/health',
  authenticate, requireAdmin,
  adminController.getSystemHealth
);

// Get recent activity
router.get(
  '/activity',
  authenticate, requireAdmin,
  adminController.getRecentActivity
);

// Get performance metrics
router.get(
  '/performance',
  authenticate, requireAdmin,
  adminController.getPerformanceMetrics
);

// Get system logs
router.get(
  '/logs',
  authenticate, requireAdmin,
  validateQuery(Joi.object({
    type: Joi.string().valid('auth', 'cv', 'analysis', 'payment', 'system'),
    level: Joi.string().valid('info', 'warn', 'error', 'debug'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  })),
  adminController.getSystemLogs
);

/**
 * Data management routes
 */

// Export data
router.post(
  '/export',
  authenticate, requireAdmin,
  validateBody(exportSchema),
  adminController.exportData
);

// Send notification
router.post(
  '/notifications',
  authenticate, requireAdmin,
  validateBody(notificationSchema),
  adminController.sendNotification
);

// Clear cache
router.post(
  '/cache/clear',
  authenticate, requireAdmin,
  validateBody(cacheSchema),
  adminController.clearCache
);

// Run maintenance task
router.post(
  '/maintenance',
  authenticate, requireAdmin,
  validateBody(maintenanceSchema),
  adminController.runMaintenance
);

/**
 * Admin health check
 */
router.get('/status', authenticate, requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    service: 'admin',
    status: 'operational',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    },
    endpoints: {
      dashboard: '/api/v1/admin/dashboard',
      users: '/api/v1/admin/users',
      health: '/api/v1/admin/health',
      export: '/api/v1/admin/export',
      notifications: '/api/v1/admin/notifications'
    }
  });
});

/**
 * Error handling for admin routes
 */
router.use((error, req, res, next) => {
  // Handle admin-specific errors
  if (error.name === 'AuthorizationError' && error.message.includes('Admin access required')) {
    return res.status(403).json({
      success: false,
      error: 'AdminAccessRequired',
      message: 'Administrator privileges required',
      suggestion: 'Contact system administrator for access'
    });
  }
  
  if (error.name === 'DashboardError') {
    return res.status(500).json({
      success: false,
      error: 'DashboardError',
      message: 'Failed to load dashboard data',
      suggestion: 'Try again later or check system logs'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Invalid request parameters',
      details: error.details,
      suggestion: 'Check the request format and try again'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;