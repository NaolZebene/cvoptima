/**
 * Stripe Routes
 * Payment processing and subscription management
 */

const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');
const { authenticate } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');

// Webhook endpoint (no authentication needed - Stripe signs requests)
router.post('/webhook', 
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  stripeController.handleWebhook
);

// Public endpoints
router.get('/config', stripeController.getConfig);
router.get('/plans', stripeController.getPlans);

// Protected endpoints (require authentication)
router.use(authenticate);

// Subscription management
router.get('/subscription', stripeController.getSubscription);
router.post('/create-checkout-session', stripeController.createCheckoutSession);
router.post('/create-portal-session', stripeController.createPortalSession);
router.post('/cancel-subscription', stripeController.cancelSubscription);
router.post('/reactivate-subscription', stripeController.reactivateSubscription);
router.post('/update-subscription', stripeController.updateSubscription);
router.post('/can-perform-action', stripeController.canPerformAction);

module.exports = router;