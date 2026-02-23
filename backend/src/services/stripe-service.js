/**
 * Stripe Payment Service - Fixed Implementation
 * Complete payment processing with proper error handling
 */

const Stripe = require('stripe');
const { createError } = require('../middleware/error-handlers');
const User = require('../models/User');

/**
 * Initialize Stripe with API key
 */
const getStripe = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_XXXX')) {
    throw new Error('Stripe secret key is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }
  
  return Stripe(stripeSecretKey);
};

/**
 * Subscription plans configuration
 * You need to create these products and prices in your Stripe dashboard:
 * 1. Go to https://dashboard.stripe.com/test/products
 * 2. Create products: "CVOptima Basic", "CVOptima Premium"
 * 3. Create monthly prices for each product
 * 4. Copy the price IDs and add them to your .env file
 */
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic CV analysis with limited features',
    priceId: null, // Free plan doesn't have a price ID
    monthlyPrice: 0,
    features: [
      '1 CV upload per month',
      'Basic ATS scoring',
      'PDF/DOCX support',
      'Email support',
      'Watermarked exports'
    ],
    limits: {
      maxCvUploads: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxAnalyses: 3,
      voiceFeatures: false,
      batchProcessing: false,
      prioritySupport: false,
      watermarkExports: true
    }
  },
  
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential CV optimization tools',
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    monthlyPrice: 9.99,
    features: [
      '10 CV uploads per month',
      'Advanced ATS scoring',
      'Job description matching',
      'Score history tracking',
      'Light watermark exports',
      'Email support'
    ],
    limits: {
      maxCvUploads: 10,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      maxAnalyses: 50,
      voiceFeatures: false,
      batchProcessing: false,
      prioritySupport: false,
      watermarkExports: true
    }
  },
  
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Complete CV optimization suite',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    monthlyPrice: 19.99,
    features: [
      'Unlimited CV uploads',
      'Premium ATS scoring',
      'Voice-to-CV creation',
      'No watermark exports',
      'Priority email support',
      'Batch processing',
      'Advanced analytics'
    ],
    limits: {
      maxCvUploads: 9999, // Effectively unlimited
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxAnalyses: 9999,
      voiceFeatures: true,
      batchProcessing: true,
      prioritySupport: true,
      watermarkExports: false
    }
  }
};

/**
 * Check if Stripe is properly configured
 */
const isStripeConfigured = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  return stripeSecretKey && !stripeSecretKey.startsWith('sk_test_XXXX');
};

/**
 * Create a Stripe customer for a user
 */
const createCustomer = async (user) => {
  try {
    const stripe = getStripe();
    
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email
      }
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw createError(
      'Failed to create payment account',
      500,
      'PaymentError'
    );
  }
};

/**
 * Create a checkout session for subscription
 */
const createCheckoutSession = async (user, priceId, successUrl, cancelUrl) => {
  try {
    const stripe = getStripe();
    
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await createCustomer(user);
      customerId = customer.id;
      
      // Save customer ID to user
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: customerId
      });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/subscription`,
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email,
        subscriptionType: Object.keys(SUBSCRIPTION_PLANS).find(
          key => SUBSCRIPTION_PLANS[key].priceId === priceId
        ) || 'unknown'
      }
    });
    
    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw createError(
      'Failed to create checkout session',
      500,
      'PaymentError'
    );
  }
};

/**
 * Create a portal session for customer to manage subscription
 */
const createPortalSession = async (user, returnUrl) => {
  try {
    const stripe = getStripe();
    
    if (!user.stripeCustomerId) {
      throw createError('No Stripe customer found', 400, 'ValidationError');
    }
    
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/subscription`
    });
    
    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw createError(
      'Failed to create portal session',
      500,
      'PaymentError'
    );
  }
};

/**
 * Get subscription details for a user
 */
const getSubscription = async (user) => {
  try {
    const stripe = getStripe();
    
    if (!user.stripeCustomerId) {
      return null;
    }
    
    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      return null;
    }
    
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    
    // Find which plan this price ID corresponds to
    const plan = Object.values(SUBSCRIPTION_PLANS).find(
      plan => plan.priceId === priceId
    );
    
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: plan || { id: 'unknown', name: 'Unknown Plan' }
    };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

/**
 * Cancel subscription at period end
 */
const cancelSubscription = async (user) => {
  try {
    const stripe = getStripe();
    
    const subscription = await getSubscription(user);
    if (!subscription) {
      throw createError('No active subscription found', 400, 'ValidationError');
    }
    
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: true
      }
    );
    
    return {
      id: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      canceledAt: new Date(canceledSubscription.canceled_at * 1000),
      currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000)
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw createError(
      'Failed to cancel subscription',
      500,
      'PaymentError'
    );
  }
};

/**
 * Reactivate canceled subscription
 */
const reactivateSubscription = async (user) => {
  try {
    const stripe = getStripe();
    
    const subscription = await getSubscription(user);
    if (!subscription) {
      throw createError('No subscription found', 400, 'ValidationError');
    }
    
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: false
      }
    );
    
    return {
      id: reactivatedSubscription.id,
      status: reactivatedSubscription.status,
      cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end
    };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw createError(
      'Failed to reactivate subscription',
      500,
      'PaymentError'
    );
  }
};

/**
 * Update subscription to a different plan
 */
const updateSubscription = async (user, newPriceId) => {
  try {
    const stripe = getStripe();
    
    const subscription = await getSubscription(user);
    if (!subscription) {
      throw createError('No active subscription found', 400, 'ValidationError');
    }
    
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [{
          id: subscription.items?.data[0]?.id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations'
      }
    );
    
    return {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw createError(
      'Failed to update subscription',
      500,
      'PaymentError'
    );
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhook = async (payload, signature, webhookSecret) => {
  try {
    const stripe = getStripe();
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const subscriptionType = session.metadata.subscriptionType;
        
        // Update user subscription in database
        await User.findByIdAndUpdate(userId, {
          'subscription.type': subscriptionType,
          'subscription.startedAt': new Date(),
          'subscription.expiresAt': null, // Subscription doesn't expire
          'subscription.stripeSubscriptionId': session.subscription,
          'subscription.status': 'active'
        });
        
        console.log(`Subscription activated for user ${userId}: ${subscriptionType}`);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          const priceId = subscription.items.data[0].price.id;
          const plan = Object.values(SUBSCRIPTION_PLANS).find(
            plan => plan.priceId === priceId
          );
          
          await User.findByIdAndUpdate(user._id, {
            'subscription.type': plan?.id || 'unknown',
            'subscription.status': subscription.status,
            'subscription.stripeSubscriptionId': subscription.id
          });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user and downgrade to free
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            'subscription.type': 'free',
            'subscription.status': 'canceled',
            'subscription.stripeSubscriptionId': null
          });
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user and mark subscription as past due
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            'subscription.status': 'past_due'
          });
          
          // TODO: Send payment failure notification
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user and mark subscription as active
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user && user.subscription.status === 'past_due') {
          await User.findByIdAndUpdate(user._id, {
            'subscription.status': 'active'
          });
        }
        break;
      }
    }
    
    return { success: true, event: event.type };
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw createError(
      'Webhook handling failed',
      400,
      'WebhookError'
    );
  }
};

/**
 * Check if user can perform an action based on subscription
 */
const canPerformAction = (user, action) => {
  const plan = SUBSCRIPTION_PLANS[user.subscription?.type || 'free'];
  
  if (!plan) {
    return false;
  }
  
  switch (action) {
    case 'upload_cv':
      const usedUploads = user.usage?.cvUploads?.currentMonth?.count || 0;
      return usedUploads < plan.limits.maxCvUploads;
      
    case 'use_voice_features':
      return plan.limits.voiceFeatures;
      
    case 'batch_process':
      return plan.limits.batchProcessing;
      
    case 'export_without_watermark':
      return !plan.limits.watermarkExports;
      
    case 'priority_support':
      return plan.limits.prioritySupport;
      
    default:
      return true;
  }
};

/**
 * Get available plans
 */
const getAvailablePlans = () => {
  return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    features: plan.features,
    limits: plan.limits,
    priceId: plan.priceId,
    isConfigured: !!plan.priceId || plan.id === 'free'
  }));
};

/**
 * Get plan by ID
 */
const getPlanById = (planId) => {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;
};

module.exports = {
  getStripe,
  isStripeConfigured,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  updateSubscription,
  handleWebhook,
  canPerformAction,
  getAvailablePlans,
  getPlanById,
  SUBSCRIPTION_PLANS
};