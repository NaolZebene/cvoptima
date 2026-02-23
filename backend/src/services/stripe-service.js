/**
 * Stripe Payment Service
 * Handles payment processing, subscriptions, and customer management
 */

const Stripe = require('stripe');
const { createError } = require('../middleware/error-handlers');

/**
 * Initialize Stripe with API key
 */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Subscription plans configuration
 */
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    description: 'Basic CV analysis with limited features',
    priceId: null, // Free plan doesn't have a price ID
    features: [
      '3 CV uploads per month',
      'Basic ATS scoring',
      'PDF/DOCX support',
      'Email support'
    ],
    limits: {
      maxCvUploads: 3,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxAnalyses: 5,
      voiceFeatures: false,
      batchProcessing: false,
      prioritySupport: false
    }
  },
  
  basic: {
    name: 'Basic',
    description: 'Essential CV optimization tools',
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      '10 CV uploads per month',
      'Advanced ATS scoring',
      'Job description matching',
      'Score history tracking',
      'Email support'
    ],
    limits: {
      maxCvUploads: 10,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      maxAnalyses: 20,
      voiceFeatures: false,
      batchProcessing: false,
      prioritySupport: false
    }
  },
  
  premium: {
    name: 'Premium',
    description: 'Professional CV optimization suite',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Unlimited CV uploads',
      'Advanced ATS scoring with AI suggestions',
      'Voice-based CV creation',
      'Batch processing',
      'Priority email support',
      'Export functionality',
      'Advanced analytics'
    ],
    limits: {
      maxCvUploads: 999, // Effectively unlimited
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxAnalyses: 999,
      voiceFeatures: true,
      batchProcessing: true,
      prioritySupport: true
    }
  }
};

/**
 * Create or retrieve Stripe customer
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Stripe customer object
 */
const createOrRetrieveCustomer = async (userData) => {
  try {
    const { userId, email, name } = userData;
    
    if (!email) {
      throw createError('Email is required to create Stripe customer', 400, 'ValidationError');
    }
    
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    });
    
    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }
    
    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
        source: 'cvoptima'
      }
    });
    
    return customer;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Stripe API error: ${error.message}`, 400, 'PaymentError');
    }
    
    throw createError(`Failed to create customer: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get customer by ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Customer object
 */
const getCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError('Customer not found', 404, 'NotFoundError');
    }
    
    throw createError(`Failed to get customer: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Update customer
 * @param {string} customerId - Stripe customer ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated customer
 */
const updateCustomer = async (customerId, updates) => {
  try {
    const customer = await stripe.customers.update(customerId, updates);
    return customer;
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid update: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to update customer: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Create checkout session for subscription
 * @param {Object} sessionData - Session configuration
 * @returns {Promise<Object>} Checkout session
 */
const createCheckoutSession = async (sessionData) => {
  try {
    const {
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays = 0,
      metadata = {}
    } = sessionData;
    
    if (!priceId) {
      throw createError('Price ID is required', 400, 'ValidationError');
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: trialPeriodDays,
        metadata
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    });
    
    return session;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid checkout session: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to create checkout session: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Create portal session for customer management
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to return after portal session
 * @returns {Promise<Object>} Portal session
 */
const createPortalSession = async (customerId, returnUrl) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    
    return session;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid portal session: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to create portal session: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get subscription by ID
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription object
 */
const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'latest_invoice.payment_intent']
    });
    
    return subscription;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError('Subscription not found', 404, 'NotFoundError');
    }
    
    throw createError(`Failed to get subscription: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} cancelImmediately - Whether to cancel immediately or at period end
 * @returns {Promise<Object>} Cancelled subscription
 */
const cancelSubscription = async (subscriptionId, cancelImmediately = false) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !cancelImmediately
    });
    
    if (cancelImmediately) {
      await stripe.subscriptions.del(subscriptionId);
    }
    
    return subscription;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid subscription: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to cancel subscription: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Update subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated subscription
 */
const updateSubscription = async (subscriptionId, updates) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, updates);
    return subscription;
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid subscription update: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to update subscription: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get customer's subscriptions
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Array>} Array of subscriptions
 */
const getCustomerSubscriptions = async (customerId) => {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method']
    });
    
    return subscriptions.data;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid customer: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to get subscriptions: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get customer's payment methods
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Array>} Array of payment methods
 */
const getCustomerPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    return paymentMethods.data;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid customer: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to get payment methods: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Create payment intent for one-time payment
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Payment intent
 */
const createPaymentIntent = async (paymentData) => {
  try {
    const {
      customerId,
      amount,
      currency = 'usd',
      description,
      metadata = {}
    } = paymentData;
    
    if (!amount || amount < 50) { // Minimum $0.50
      throw createError('Invalid amount', 400, 'ValidationError');
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    return paymentIntent;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid payment intent: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to create payment intent: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get invoice by ID
 * @param {string} invoiceId - Stripe invoice ID
 * @returns {Promise<Object>} Invoice object
 */
const getInvoice = async (invoiceId) => {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice;
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError('Invoice not found', 404, 'NotFoundError');
    }
    
    throw createError(`Failed to get invoice: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get customer's invoices
 * @param {string} customerId - Stripe customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of invoices
 */
const getCustomerInvoices = async (customerId, options = {}) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: options.limit || 10,
      starting_after: options.startingAfter
    });
    
    return invoices.data;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid customer: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to get invoices: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Create usage record for metered billing
 * @param {string} subscriptionItemId - Subscription item ID
 * @param {number} quantity - Usage quantity
 * @param {number} timestamp - Unix timestamp for usage
 * @returns {Promise<Object>} Usage record
 */
const createUsageRecord = async (subscriptionItemId, quantity, timestamp = Math.floor(Date.now() / 1000)) => {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp,
        action: 'increment'
      }
    );
    
    return usageRecord;
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw createError(`Invalid usage record: ${error.message}`, 400, 'ValidationError');
    }
    
    throw createError(`Failed to create usage record: ${error.message}`, 500, 'PaymentError');
  }
};

/**
 * Get subscription plans
 * @returns {Object} Subscription plans configuration
 */
const getSubscriptionPlans = () => {
  return SUBSCRIPTION_PLANS;
};

/**
 * Get plan by name
 * @param {string} planName - Plan name (free, basic, premium)
 * @returns {Object} Plan configuration
 */
const getPlan = (planName) => {
  const plan = SUBSCRIPTION_PLANS[planName.toLowerCase()];
  
  if (!plan) {
    throw createError(`Invalid plan: ${planName}`, 400, 'ValidationError');
  }
  
  return plan;
};

/**
 * Check if user can perform action based on subscription
 * @param {Object} user - User object with subscription info
 * @param {string} action - Action to check
 * @returns {boolean} True if allowed
 */
const canPerformAction = (user, action) => {
  const plan = SUBSCRIPTION_PLANS[user.subscription?.plan || 'free'];
  
  switch (action) {
    case 'upload_cv':
      return (user.stats?.cvCount || 0) < plan.limits.maxCvUploads;
      
    case 'use_voice_features':
      return plan.limits.voiceFeatures;
      
    case 'batch_process':
      return plan.limits.batchProcessing;
      
    case 'export_data':
      return user.subscription?.plan === 'premium';
      
    case 'priority_support':
      return plan.limits.prioritySupport;
      
    default:
      return true;
  }
};

/**
 * Get usage statistics for user
 * @param {Object} user - User object
 * @returns {Object} Usage statistics
 */
const getUsageStats = (user) => {
  const plan = SUBSCRIPTION_PLANS[user.subscription?.plan || 'free'];
  
  return {
    plan: plan.name,
    cvUploads: {
      used: user.stats?.cvCount || 0,
      limit: plan.limits.maxCvUploads,
      remaining: Math.max(0, plan.limits.maxCvUploads - (user.stats?.cvCount || 0))
    },
    analyses: {
      used: user.stats?.analysisCount || 0,
      limit: plan.limits.maxAnalyses,
      remaining: Math.max(0, plan.limits.maxAnalyses - (user.stats?.analysisCount || 0))
    },
    features: {
      voice: plan.limits.voiceFeatures,
      batch: plan.limits.batchProcessing,
      prioritySupport: plan.limits.prioritySupport,
      maxFileSize: plan.limits.maxFileSize
    },
    subscription: user.subscription || {
      plan: 'free',
      status: 'active',
      currentPeriodEnd: null
    }
  };
};

/**
 * Handle Stripe webhook events
 * @param {string} payload - Raw webhook payload
 * @param {string} signature - Stripe signature
 * @param {string} secret - Webhook secret
 * @returns {Promise<Object>} Webhook event
 */
const handleWebhook = async (payload, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    throw createError(`Webhook error: ${error.message}`, 400, 'ValidationError');
  }
};

module.exports = {
  createOrRetrieveCustomer,
  getCustomer,
  updateCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  getCustomerSubscriptions,
  getCustomerPaymentMethods,
  createPaymentIntent,
  getInvoice,
  getCustomerInvoices,
  createUsageRecord,
  getSubscriptionPlans,
  getPlan,
  canPerformAction,
  getUsageStats,
  handleWebhook,
  stripe
};