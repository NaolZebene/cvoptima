/**
 * Subscription routes
 * Routes for subscription management and payment processing
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');
const Joi = require('joi');

/**
 * Validation schemas
 */
const checkoutSessionSchema = Joi.object({
  plan: Joi.string().valid('basic', 'premium').required(),
  successUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required()
});

const portalSessionSchema = Joi.object({
  returnUrl: Joi.string().uri().required()
});

const cancelSubscriptionSchema = Joi.object({
  cancelImmediately: Joi.boolean().default(false)
});

const checkAccessSchema = Joi.object({
  feature: Joi.string().required()
});

const updatePlanSchema = Joi.object({
  newPlan: Joi.string().valid('free', 'basic', 'premium').required()
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10)
});

/**
 * Public routes (no authentication required)
 */

// Get subscription plans (public)
router.get(
  '/plans',
  subscriptionController.getSubscriptionPlans
);

// Stripe webhook (public, but signed)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  subscriptionController.handleWebhook
);

/**
 * Protected routes (authentication required)
 */

// Get current user's subscription
router.get(
  '/me',
  authenticate,
  subscriptionController.getMySubscription
);

// Create checkout session
router.post(
  '/checkout',
  authenticate,
  (req, res, next) => {
    const { error, value } = checkoutSessionSchema.validate(req.body, {
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
  },
  subscriptionController.createCheckoutSession
);

// Create portal session
router.post(
  '/portal',
  authenticate,
  requireSubscription('basic'), // Only paying customers can access portal
  (req, res, next) => {
    const { error, value } = portalSessionSchema.validate(req.body, {
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
  },
  subscriptionController.createPortalSession
);

// Cancel subscription
router.post(
  '/cancel',
  authenticate,
  requireSubscription('basic'), // Only paying customers can cancel
  (req, res, next) => {
    const { error, value } = cancelSubscriptionSchema.validate(req.body, {
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
  },
  subscriptionController.cancelSubscription
);

// Reactivate subscription
router.post(
  '/reactivate',
  authenticate,
  requireSubscription('basic'),
  subscriptionController.reactivateSubscription
);

// Get invoices
router.get(
  '/invoices',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = querySchema.validate(req.query, {
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
  },
  subscriptionController.getInvoices
);

// Get payment methods
router.get(
  '/payment-methods',
  authenticate,
  requireSubscription('basic'),
  subscriptionController.getPaymentMethods
);

// Check feature access
router.post(
  '/check-access',
  authenticate,
  (req, res, next) => {
    const { error, value } = checkAccessSchema.validate(req.body, {
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
  },
  subscriptionController.checkFeatureAccess
);

// Update subscription plan
router.post(
  '/update',
  authenticate,
  (req, res, next) => {
    const { error, value } = updatePlanSchema.validate(req.body, {
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
  },
  subscriptionController.updateSubscriptionPlan
);

// Get subscription analytics
router.get(
  '/analytics',
  authenticate,
  subscriptionController.getSubscriptionAnalytics
);

/**
 * Admin routes (admin role required)
 */

// Get all subscriptions (admin only)
router.get(
  '/admin/all',
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
      const { limit = 50, page = 1, plan, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const query = {
        'subscription.plan': { $ne: 'free' } // Only paid subscriptions
      };
      
      if (plan) {
        query['subscription.plan'] = plan;
      }
      
      if (status) {
        query['subscription.status'] = status;
      }
      
      const users = await User.find(query)
        .select('email name subscription stripeCustomerId createdAt')
        .sort({ 'subscription.activatedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await User.countDocuments(query);
      
      // Get Stripe data for each user
      const subscriptions = await Promise.all(
        users.map(async (user) => {
          let stripeData = null;
          
          if (user.stripeCustomerId) {
            try {
              const stripeService = require('../services/stripe-service');
              const customer = await stripeService.getCustomer(user.stripeCustomerId);
              
              stripeData = {
                customerId: customer.id,
                email: customer.email,
                created: customer.created
              };
            } catch (error) {
              console.error(`Error fetching Stripe data for user ${user._id}:`, error.message);
            }
          }
          
          return {
            user: {
              id: user._id,
              email: user.email,
              name: user.name,
              createdAt: user.createdAt
            },
            subscription: user.subscription,
            stripe: stripeData
          };
        })
      );
      
      res.status(200).json({
        success: true,
        subscriptions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get subscription statistics (admin only)
router.get(
  '/admin/stats',
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
      
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0]
              }
            },
            trialing: {
              $sum: {
                $cond: [{ $eq: ['$subscription.status', 'trialing'] }, 1, 0]
              }
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ['$subscription.status', 'cancelled'] }, 1, 0]
              }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$subscription.plan', 'basic'] },
                  9.99,
                  { $cond: [
                    { $eq: ['$subscription.plan', 'premium'] },
                    19.99,
                    0
                  ]}
                ]
              }
            }
          }
        }
      ]);
      
      // Calculate MRR (Monthly Recurring Revenue)
      let mrr = 0;
      stats.forEach(stat => {
        if (stat._id === 'basic') {
          mrr += stat.active * 9.99;
        } else if (stat._id === 'premium') {
          mrr += stat.active * 19.99;
        }
      });
      
      // Get churn rate (simplified)
      const totalActive = stats.reduce((sum, stat) => sum + stat.active, 0);
      const totalCancelled = stats.reduce((sum, stat) => sum + stat.cancelled, 0);
      const churnRate = totalActive > 0 ? (totalCancelled / (totalActive + totalCancelled)) * 100 : 0;
      
      res.status(200).json({
        success: true,
        stats: {
          byPlan: stats,
          totals: {
            totalUsers: stats.reduce((sum, stat) => sum + stat.count, 0),
            activeSubscriptions: totalActive,
            trialingSubscriptions: stats.reduce((sum, stat) => sum + stat.trialing, 0),
            cancelledSubscriptions: totalCancelled
          },
          revenue: {
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            estimatedMonthly: Math.round(stats.reduce((sum, stat) => sum + stat.totalRevenue, 0) * 100) / 100
          },
          metrics: {
            churnRate: Math.round(churnRate * 100) / 100,
            conversionRate: totalActive > 0 ? Math.round((totalActive / stats.reduce((sum, stat) => sum + stat.count, 0)) * 100) : 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health check for subscription service
 */
router.get('/health', (req, res) => {
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
  
  res.status(200).json({
    success: true,
    service: 'subscription',
    status: stripeConfigured ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    configuration: {
      stripe: stripeConfigured ? 'configured' : 'missing',
      webhook: webhookConfigured ? 'configured' : 'missing',
      plans: {
        basic: !!process.env.STRIPE_BASIC_PRICE_ID,
        premium: !!process.env.STRIPE_PREMIUM_PRICE_ID
      }
    },
    features: {
      checkout: true,
      portal: true,
      webhooks: webhookConfigured,
      analytics: true,
      admin: true
    }
  });
});

/**
 * Error handling middleware for subscription routes
 */
router.use((error, req, res, next) => {
  // Handle specific subscription errors
  if (error.name === 'PaymentError') {
    return res.status(400).json({
      success: false,
      error: 'Payment error',
      message: error.message,
      suggestion: 'Check your payment details and try again'
    });
  }
  
  if (error.name === 'ValidationError' && error.message.includes('Invalid plan')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid plan',
      message: error.message,
      availablePlans: ['free', 'basic', 'premium']
    });
  }
  
  if (error.name === 'NotFoundError' && error.message.includes('No Stripe customer')) {
    return res.status(404).json({
      success: false,
      error: 'No subscription found',
      message: 'You don\'t have an active subscription',
      suggestion: 'Upgrade to a paid plan to access this feature'
    });
  }
  
  if (error.name === 'ValidationError' && error.message.includes('Webhook error')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid webhook signature',
      message: 'The webhook signature could not be verified'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;