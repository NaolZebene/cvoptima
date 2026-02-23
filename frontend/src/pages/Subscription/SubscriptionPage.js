import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Icons
import {
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  RefreshIcon,
  UserGroupIcon,
  ChartBarIcon,
  MicrophoneIcon,
  GlobeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useSelector((state) => state.auth);
  const currentPlan = user?.subscription?.type || 'free';

  // Fetch plans and Stripe configuration
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Fetch available plans
      const plansResponse = await api.get('/stripe/plans');
      const plansData = plansResponse.data.plans || [];
      
      // Fetch Stripe configuration
      const configResponse = await api.get('/stripe/config');
      
      setPlans(plansData);
      setStripeConfig(configResponse.data);
      
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setIsProcessing(true);
      
      const plan = plans.find(p => p.id === planId);
      
      if (!plan || !plan.priceId) {
        toast.error('This plan is not available for subscription');
        return;
      }
      
      if (!stripeConfig?.isConfigured) {
        toast.error('Payment system is not configured. Please contact support.');
        return;
      }
      
      // Create checkout session
      const response = await api.post('/stripe/create-checkout-session', {
        priceId: plan.priceId,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription`
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error.response?.data?.message || 'Failed to start subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsProcessing(true);
      
      const response = await api.post('/stripe/create-portal-session', {
        returnUrl: `${window.location.origin}/subscription`
      });
      
      // Redirect to Stripe customer portal
      window.location.href = response.data.url;
      
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error(error.response?.data?.message || 'Failed to manage subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      await api.post('/stripe/cancel-subscription');
      
      toast.success('Subscription will be canceled at the end of the billing period');
      
      // Refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setIsProcessing(true);
      
      await api.post('/stripe/reactivate-subscription');
      
      toast.success('Subscription reactivated');
      
      // Refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to reactivate subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  // Default plans in case API fails
  const defaultPlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out basic features',
      monthlyPrice: 0,
      features: [
        '1 CV analysis per month',
        'Basic ATS scoring',
        'Limited keyword suggestions',
        'Email support',
        'Watermarked exports'
      ],
      limits: {
        maxCvUploads: 1,
        voiceFeatures: false,
        prioritySupport: false
      },
      isConfigured: true
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Essential CV optimization tools',
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
        voiceFeatures: false,
        prioritySupport: false
      },
      isConfigured: false
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Complete CV optimization suite',
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
        maxCvUploads: 9999,
        voiceFeatures: true,
        prioritySupport: true
      },
      isConfigured: false
    }
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading subscription plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan for your CV optimization needs. All plans include our core ATS scoring technology.
          </p>
          
          {!stripeConfig?.isConfigured && (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-700">
                Payment system is in test mode. Contact support for live payments.
              </span>
            </div>
          )}
        </div>

        {/* Current Subscription Status */}
        {currentPlan !== 'free' && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                <p className="text-gray-600 mt-1">
                  You are currently on the <span className="font-semibold">{currentPlan}</span> plan
                </p>
                {user?.subscription?.status === 'canceled' && (
                  <p className="text-yellow-600 mt-1">
                    Your subscription will end on {new Date(user.subscription.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button
                  onClick={handleManageSubscription}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Manage Subscription
                </button>
                {user?.subscription?.status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                {user?.subscription?.status === 'canceled' && (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Annual (Save 20%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayPlans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isConfigured = plan.isConfigured;
            const price = billingCycle === 'annual' 
              ? plan.monthlyPrice * 12 * 0.8 // 20% discount for annual
              : plan.monthlyPrice;
            
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 ${
                  plan.id === 'premium'
                    ? 'border-blue-500 shadow-xl'
                    : 'border-gray-200'
                } p-8 flex flex-col`}
              >
                {/* Plan Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        ${plan.monthlyPrice.toFixed(2)} per month billed annually
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-8 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div>
                  {isCurrentPlan ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={isProcessing || !isConfigured}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        isConfigured
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessing ? 'Processing...' : 'Manage Subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isProcessing || !isConfigured || plan.id === 'free'}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        plan.id === 'premium'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : plan.id === 'free'
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      } ${(!isConfigured || plan.id === 'free') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? 'Processing...' : 
                       plan.id === 'free' ? 'Current Plan' :
                       !isConfigured ? 'Coming Soon' :
                       `Subscribe to ${plan.name}`}
                    </button>
                  )}
                  
                  {!isConfigured && plan.id !== 'free' && (
                    <p className="text-sm text-gray-500 text-center mt-2">
                      Contact support to enable this plan
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change will take effect at the end of your current billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! The Free plan includes 1 CV analysis per month with no time limit. You can use it indefinitely to test our basic features.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor, Stripe.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Need help choosing a plan?{' '}
            <button
              onClick={() => navigate('/contact')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Contact our support team
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;