/**
 * Subscription Controller
 * Handles subscription management and payment processing
 */

const User = require('../models/User');
const stripeService = require('../services/stripe-service');
const { createError } = require('../middleware/error-handlers');

/**
 * Get subscription plans
 * GET /api/v1/subscriptions/plans
 */
const getSubscriptionPlans = async (req, res, next) => {
  try {
    const plans = stripeService.getSubscriptionPlans();
    
    // Remove price IDs from response (sensitive)
    const safePlans = {};
    
    Object.keys(plans).forEach(planKey => {
      safePlans[planKey] = {
        name: plans[planKey].name,
        description: plans[planKey].description,
        features: plans[planKey].features,
        limits: plans[planKey].limits
      };
    });
    
    res.status(200).json({
      success: true,
      plans: safePlans,
      currency: 'usd',
      billingPeriod: 'monthly'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's subscription
 * GET /api/v1/subscriptions/me
 */
const getMySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    const usageStats = stripeService.getUsageStats(user);
    
    res.status(200).json({
      success: true,
      subscription: {
        plan: user.subscription?.plan || 'free',
        status: user.subscription?.status || 'active',
        stripeCustomerId: user.stripeCustomerId,
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false
      },
      usage: usageStats,
      user: {
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create checkout session for subscription
 * POST /api/v1/subscriptions/checkout
 */
const createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { plan, successUrl, cancelUrl } = req.body;
    
    if (!plan || !['basic', 'premium'].includes(plan)) {
      throw createError('Invalid plan. Choose "basic" or "premium"', 400, 'ValidationError');
    }
    
    if (!successUrl || !cancelUrl) {
      throw createError('successUrl and cancelUrl are required', 400, 'ValidationError');
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Get plan configuration
    const planConfig = stripeService.getPlan(plan);
    
    if (!planConfig.priceId) {
      throw createError('Plan is not available for purchase', 400, 'ValidationError');
    }
    
    // Create or retrieve Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripeService.getCustomer(user.stripeCustomerId);
    } else {
      customer = await stripeService.createOrRetrieveCustomer({
        userId: user._id.toString(),
        email: user.email,
        name: user.name
      });
      
      // Save customer ID to user
      user.stripeCustomerId = customer.id;
      await user.save({ validateBeforeSave: false });
    }
    
    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      customerId: customer.id,
      priceId: planConfig.priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays: 7, // 7-day free trial
      metadata: {
        userId: user._id.toString(),
        plan,
        userEmail: user.email
      }
    });
    
    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      expiresAt: session.expires_at,
      customerId: customer.id,
      plan
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create portal session for subscription management
 * POST /api/v1/subscriptions/portal
 */
const createPortalSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      throw createError('returnUrl is required', 400, 'ValidationError');
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    if (!user.stripeCustomerId) {
      throw createError('No Stripe customer found', 404, 'NotFoundError');
    }
    
    // Create portal session
    const session = await stripeService.createPortalSession(user.stripeCustomerId, returnUrl);
    
    res.status(200).json({
      success: true,
      url: session.url,
      expiresAt: session.expires_at,
      customerId: user.stripeCustomerId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription
 * POST /api/v1/subscriptions/cancel
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cancelImmediately = false } = req.body;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    if (!user.stripeCustomerId) {
      throw createError('No Stripe customer found', 404, 'NotFoundError');
    }
    
    // Get customer's subscriptions
    const subscriptions = await stripeService.getCustomerSubscriptions(user.stripeCustomerId);
    
    // Find active subscription
    const activeSubscription = subscriptions.find(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (!activeSubscription) {
      throw createError('No active subscription found', 404, 'NotFoundError');
    }
    
    // Cancel subscription
    const subscription = await stripeService.cancelSubscription(
      activeSubscription.id,
      cancelImmediately
    );
    
    // Update user subscription status
    if (cancelImmediately) {
      user.subscription = {
        plan: 'free',
        status: 'cancelled',
        cancelledAt: new Date()
      };
    } else {
      user.subscription.cancelAtPeriodEnd = true;
    }
    
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: cancelImmediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will cancel at period end',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end
      },
      user: {
        plan: user.subscription.plan,
        status: user.subscription.status
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate cancelled subscription
 * POST /api/v1/subscriptions/reactivate
 */
const reactivateSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    if (!user.stripeCustomerId) {
      throw createError('No Stripe customer found', 404, 'NotFoundError');
    }
    
    // Get customer's subscriptions
    const subscriptions = await stripeService.getCustomerSubscriptions(user.stripeCustomerId);
    
    // Find subscription scheduled for cancellation
    const cancellingSubscription = subscriptions.find(sub => 
      sub.cancel_at_period_end === true
    );
    
    if (!cancellingSubscription) {
      throw createError('No subscription scheduled for cancellation', 404, 'NotFoundError');
    }
    
    // Reactivate subscription
    const subscription = await stripeService.updateSubscription(cancellingSubscription.id, {
      cancel_at_period_end: false
    });
    
    // Update user subscription
    user.subscription.cancelAtPeriodEnd = false;
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'Subscription reactivated',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription invoices
 * GET /api/v1/subscriptions/invoices
 */
const getInvoices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    if (!user.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        invoices: [],
        count: 0
      });
    }
    
    // Get invoices
    const invoices = await stripeService.getCustomerInvoices(user.stripeCustomerId, {
      limit: parseInt(limit)
    });
    
    // Format invoices for response
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      date: invoice.created,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      pdfUrl: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url
    }));
    
    res.status(200).json({
      success: true,
      invoices: formattedInvoices,
      count: formattedInvoices.length
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment methods
 * GET /api/v1/subscriptions/payment-methods
 */
const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    if (!user.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        paymentMethods: [],
        count: 0
      });
    }
    
    // Get payment methods
    const paymentMethods = await stripeService.getCustomerPaymentMethods(user.stripeCustomerId);
    
    // Format payment methods for response
    const formattedMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      card: method.card ? {
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
        country: method.card.country
      } : null,
      created: method.created
    }));
    
    res.status(200).json({
      success: true,
      paymentMethods: formattedMethods,
      count: formattedMethods.length
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Check feature access
 * POST /api/v1/subscriptions/check-access
 */
const checkFeatureAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { feature } = req.body;
    
    if (!feature) {
      throw createError('Feature name is required', 400, 'ValidationError');
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Check if user can perform action
    const canAccess = stripeService.canPerformAction(user, feature);
    
    // Get usage stats for context
    const usageStats = stripeService.getUsageStats(user);
    
    res.status(200).json({
      success: true,
      canAccess,
      feature,
      reason: canAccess ? 'Allowed' : 'Not allowed by current subscription plan',
      usage: usageStats,
      requiredPlan: getRequiredPlanForFeature(feature)
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get required plan for feature
 * @param {string} feature - Feature name
 * @returns {string} Required plan
 */
const getRequiredPlanForFeature = (feature) => {
  const featureRequirements = {
    'upload_cv': 'free',
    'use_voice_features': 'premium',
    'batch_process': 'premium',
    'export_data': 'premium',
    'priority_support': 'premium',
    'advanced_analytics': 'premium'
  };
  
  return featureRequirements[feature] || 'free';
};

/**
 * Update subscription (downgrade/upgrade)
 * POST /api/v1/subscriptions/update
 */
const updateSubscriptionPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newPlan } = req.body;
    
    if (!newPlan || !['free', 'basic', 'premium'].includes(newPlan)) {
      throw createError('Invalid plan. Choose "free", "basic", or "premium"', 400, 'ValidationError');
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    const currentPlan = user.subscription?.plan || 'free';
    
    // Check if it's actually a change
    if (currentPlan === newPlan) {
      return res.status(200).json({
        success: true,
        message: 'Already on requested plan',
        currentPlan,
        newPlan
      });
    }
    
    // Handle different scenarios
    if (newPlan === 'free') {
      // Downgrade to free - cancel any active subscription
      if (user.stripeCustomerId) {
        const subscriptions = await stripeService.getCustomerSubscriptions(user.stripeCustomerId);
        const activeSubscription = subscriptions.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );
        
        if (activeSubscription) {
          await stripeService.cancelSubscription(activeSubscription.id, true);
        }
      }
      
      user.subscription = {
        plan: 'free',
        status: 'active',
        downgradedAt: new Date()
      };
      
      await user.save({ validateBeforeSave: false });
      
      return res.status(200).json({
        success: true,
        message: 'Downgraded to free plan',
        previousPlan: currentPlan,
        newPlan: 'free',
        effectiveImmediately: true
      });
    }
    
    // For upgrades, redirect to checkout
    const planConfig = stripeService.getPlan(newPlan);
    
    if (!planConfig.priceId) {
      throw createError('Plan is not available for purchase', 400, 'ValidationError');
    }
    
    // Create checkout session for upgrade
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripeService.getCustomer(user.stripeCustomerId);
    } else {
      customer = await stripeService.createOrRetrieveCustomer({
        userId: user._id.toString(),
        email: user.email,
        name: user.name
      });
      
      user.stripeCustomerId = customer.id;
      await user.save({ validateBeforeSave: false });
    }
    
    // Generate success URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/dashboard?subscription=success&plan=${newPlan}`;
    const cancelUrl = `${baseUrl}/dashboard?subscription=cancelled`;
    
    const session = await stripeService.createCheckoutSession({
      customerId: customer.id,
      priceId: planConfig.priceId,
      successUrl,
      cancelUrl,
      metadata: {
        userId: user._id.toString(),
        plan: newPlan,
        previousPlan: currentPlan,
        action: 'upgrade'
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Redirect to checkout for plan upgrade',
      sessionId: session.id,
      url: session.url,
      previousPlan: currentPlan,
      newPlan,
      action: 'upgrade'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription usage analytics
 * GET /api/v1/subscriptions/analytics
 */
const getSubscriptionAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    const usageStats = stripeService.getUsageStats(user);
    
    // Calculate usage percentages
    const cvUploadPercentage = Math.round((usageStats.cvUploads.used / usageStats.cvUploads.limit) * 100);
    const analysesPercentage = Math.round((usageStats.analyses.used / usageStats.analyses.limit) * 100);
    
    // Get subscription history (simplified)
    const subscriptionHistory = [
      {
        date: user.createdAt,
        event: 'account_created',
        plan: 'free'
      }
    ];
    
    if (user.subscription?.upgradedAt) {
      subscriptionHistory.push({
        date: user.subscription.upgradedAt,
        event: 'upgraded',
        plan: user.subscription.plan
      });
    }
    
    if (user.subscription?.downgradedAt) {
      subscriptionHistory.push({
        date: user.subscription.downgradedAt,
        event: 'downgraded',
        plan: user.subscription.plan
      });
    }
    
    if (user.subscription?.cancelledAt) {
      subscriptionHistory.push({
        date: user.subscription.cancelledAt,
        event: 'cancelled',
        plan: user.subscription.plan
      });
    }
    
    // Sort by date
    subscriptionHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      success: true,
      analytics: {
        usage: {
          cvUploads: {
            ...usageStats.cvUploads,
            percentage: cvUploadPercentage,
            status: cvUploadPercentage >= 90 ? 'high' : cvUploadPercentage >= 70 ? 'medium' : 'low'
          },
          analyses: {
            ...usageStats.analyses,
            percentage: analysesPercentage,
            status: analysesPercentage >= 90 ? 'high' : analysesPercentage >= 70 ? 'medium' : 'low'
          }
        },
        subscription: {
          currentPlan: usageStats.plan,
          status: usageStats.subscription.status,
          daysRemaining: user.subscription?.currentPeriodEnd 
            ? Math.ceil((new Date(user.subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
          valueScore: calculateSubscriptionValueScore(user)
        },
        features: usageStats.features,
        history: subscriptionHistory
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate subscription value score
 * @param {Object} user - User object
 * @returns {number} Value score (0-100)
 */
const calculateSubscriptionValueScore = (user) => {
  const plan = user.subscription?.plan || 'free';
  const usage = stripeService.getUsageStats(user);
  
  let score = 0;
  
  // Base score based on plan
  if (plan === 'free') score = 30;
  else if (plan === 'basic') score = 60;
  else if (plan === 'premium') score = 80;
  
  // Adjust based on usage
  const cvUsage = usage.cvUploads.percentage;
  const analysisUsage = usage.analyses.percentage;
  
  if (cvUsage > 80 || analysisUsage > 80) {
    score += 10; // Good usage
  } else if (cvUsage < 20 && analysisUsage < 20) {
    score -= 10; // Underutilized
  }
  
  // Cap score
  return Math.min(Math.max(score, 0), 100);
};

/**
 * Handle Stripe webhook
 * POST /api/v1/subscriptions/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;
    
    if (!signature) {
      throw createError('Missing Stripe signature', 400, 'ValidationError');
    }
    
    // Verify webhook signature
    const event = await stripeService.handleWebhook(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialEnding(event.data.object);
        break;
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Handle subscription events
 * @param {Object} subscription - Stripe subscription
 */
const handleSubscriptionEvent = async (subscription) => {
  try {
    const customerId = subscription.customer;
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.warn('No userId in subscription metadata');
      return;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User ${userId} not found`);
      return;
    }
    
    // Update user subscription
    user.subscription = {
      plan: subscription.metadata?.plan || 'basic',
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    };
    
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      user.subscription.activatedAt = new Date();
    }
    
    if (subscription.status === 'canceled') {
      user.subscription.cancelledAt = new Date();
      user.subscription.plan = 'free';
    }
    
    await user.save({ validateBeforeSave: false });
    
    console.log(`Updated subscription for user ${userId}: ${subscription.status}`);
    
  } catch (error) {
    console.error('Error handling subscription event:', error);
  }
};

/**
 * Handle successful payment
 * @param {Object} invoice - Stripe invoice
 */
const handlePaymentSucceeded = async (invoice) => {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) return;
    
    const subscription = await stripeService.getSubscription(subscriptionId);
    const userId = subscription.metadata?.userId;
    
    if (!userId) return;
    
    const user = await User.findById(userId);
    if (!user) return;
    
    // Update last payment date
    user.subscription.lastPaymentAt = new Date();
    await user.save({ validateBeforeSave: false });
    
    console.log(`Payment succeeded for user ${userId}, invoice ${invoice.id}`);
    
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
};

/**
 * Handle failed payment
 * @param {Object} invoice - Stripe invoice
 */
const handlePaymentFailed = async (invoice) => {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) return;
    
    const subscription = await stripeService.getSubscription(subscriptionId);
    const userId = subscription.metadata?.userId;
    
    if (!userId) return;
    
    const user = await User.findById(userId);
    if (!user) return;
    
    // Update payment failure
    user.subscription.paymentFailed = true;
    user.subscription.lastPaymentFailure = new Date();
    await user.save({ validateBeforeSave: false });
    
    console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`);
    
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

/**
 * Handle trial ending
 * @param {Object} subscription - Stripe subscription
 */
const handleTrialEnding = async (subscription) => {
  try {
    const userId = subscription.metadata?.userId;
    
    if (!userId) return;
    
    const user = await User.findById(userId);
    if (!user) return;
    
    // Send notification (in a real app, you would send an email)
    console.log(`Trial ending for user ${userId} in 3 days`);
    
    // You could queue an email notification here
    
  } catch (error) {
    console.error('Error handling trial ending:', error);
  }
};

module.exports = {
  getSubscriptionPlans,
  getMySubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getPaymentMethods,
  checkFeatureAccess,
  updateSubscriptionPlan,
  getSubscriptionAnalytics,
  handleWebhook
};
