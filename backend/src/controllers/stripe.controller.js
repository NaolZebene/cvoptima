/**
 * Stripe Controller
 * Handles payment processing, subscriptions, and webhooks
 */

const stripeService = require('../services/stripe-service');
const { createError } = require('../middleware/error-handlers');

/**
 * Get available subscription plans
 * GET /api/v1/stripe/plans
 */
const getPlans = async (req, res, next) => {
  try {
    const plans = stripeService.getAvailablePlans();
    
    res.status(200).json({
      success: true,
      message: 'Subscription plans retrieved',
      plans,
      stripeConfigured: stripeService.isStripeConfigured()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create checkout session for subscription
 * POST /api/v1/stripe/create-checkout-session
 */
const createCheckoutSession = async (req, res, next) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    const user = req.userObj;
    
    if (!priceId) {
      throw createError('Price ID is required', 400, 'ValidationError');
    }
    
    // Validate price ID belongs to a valid plan
    const plans = stripeService.getAvailablePlans();
    const validPlan = plans.find(plan => plan.priceId === priceId && plan.isConfigured);
    
    if (!validPlan) {
      throw createError('Invalid price ID', 400, 'ValidationError');
    }
    
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      throw createError('Payment system is not configured', 503, 'ServiceError');
    }
    
    const session = await stripeService.createCheckoutSession(
      user,
      priceId,
      successUrl,
      cancelUrl
    );
    
    res.status(200).json({
      success: true,
      message: 'Checkout session created',
      sessionId: session.sessionId,
      url: session.url
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create portal session for subscription management
 * POST /api/v1/stripe/create-portal-session
 */
const createPortalSession = async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const user = req.userObj;
    
    // Check if user has Stripe customer ID
    if (!user.stripeCustomerId) {
      throw createError('No subscription found', 400, 'ValidationError');
    }
    
    const session = await stripeService.createPortalSession(user, returnUrl);
    
    res.status(200).json({
      success: true,
      message: 'Portal session created',
      sessionId: session.sessionId,
      url: session.url
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's current subscription
 * GET /api/v1/stripe/subscription
 */
const getSubscription = async (req, res, next) => {
  try {
    const user = req.userObj;
    
    const subscription = await stripeService.getSubscription(user);
    
    res.status(200).json({
      success: true,
      message: 'Subscription details retrieved',
      subscription,
      currentPlan: stripeService.getPlanById(user.subscription?.type || 'free')
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription (at period end)
 * POST /api/v1/stripe/cancel-subscription
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const user = req.userObj;
    
    const result = await stripeService.cancelSubscription(user);
    
    // Update user's subscription status in database
    const User = require('../models/User');
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': 'canceled',
      'subscription.cancelAtPeriodEnd': true
    });
    
    res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at period end',
      subscription: result
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate subscription
 * POST /api/v1/stripe/reactivate-subscription
 */
const reactivateSubscription = async (req, res, next) => {
  try {
    const user = req.userObj;
    
    const result = await stripeService.reactivateSubscription(user);
    
    // Update user's subscription status in database
    const User = require('../models/User');
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': 'active',
      'subscription.cancelAtPeriodEnd': false
    });
    
    res.status(200).json({
      success: true,
      message: 'Subscription reactivated',
      subscription: result
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update subscription to different plan
 * POST /api/v1/stripe/update-subscription
 */
const updateSubscription = async (req, res, next) => {
  try {
    const { priceId } = req.body;
    const user = req.userObj;
    
    if (!priceId) {
      throw createError('Price ID is required', 400, 'ValidationError');
    }
    
    const result = await stripeService.updateSubscription(user, priceId);
    
    // Find which plan this price ID corresponds to
    const plans = stripeService.getAvailablePlans();
    const newPlan = plans.find(plan => plan.priceId === priceId);
    
    if (newPlan) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(user._id, {
        'subscription.type': newPlan.id,
        'subscription.status': 'active'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Subscription updated',
      subscription: result,
      newPlan: newPlan || { id: 'unknown', name: 'Unknown Plan' }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Stripe webhook events
 * POST /api/v1/stripe/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;
    
    if (!signature) {
      throw createError('Missing Stripe signature', 400, 'ValidationError');
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw createError('Webhook secret not configured', 500, 'ConfigurationError');
    }
    
    const result = await stripeService.handleWebhook(payload, signature, webhookSecret);
    
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      event: result.event
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check if user can perform an action
 * POST /api/v1/stripe/can-perform-action
 */
const canPerformAction = async (req, res, next) => {
  try {
    const { action } = req.body;
    const user = req.userObj;
    
    if (!action) {
      throw createError('Action is required', 400, 'ValidationError');
    }
    
    const canPerform = stripeService.canPerformAction(user, action);
    
    res.status(200).json({
      success: true,
      message: 'Action check completed',
      canPerform,
      action,
      userPlan: user.subscription?.type || 'free'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get Stripe configuration status
 * GET /api/v1/stripe/config
 */
const getConfig = async (req, res, next) => {
  try {
    const isConfigured = stripeService.isStripeConfigured();
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    res.status(200).json({
      success: true,
      message: 'Stripe configuration retrieved',
      isConfigured,
      publishableKey: publishableKey && publishableKey !== 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX' 
        ? publishableKey 
        : null,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  updateSubscription,
  handleWebhook,
  canPerformAction,
  getConfig
};