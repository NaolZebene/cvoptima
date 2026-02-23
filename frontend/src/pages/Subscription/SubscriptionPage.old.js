import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

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
} from '@heroicons/react/outline';

const SubscriptionPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user } = useSelector((state) => state.auth);

  const currentPlan = user?.subscription?.type || 'free';

  const plans = {
    free: {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for trying out basic features',
      features: [
        { included: true, text: '1 CV analysis per month' },
        { included: true, text: 'Basic ATS scoring' },
        { included: true, text: 'Limited keyword suggestions' },
        { included: true, text: 'Email support' },
        { included: false, text: 'Advanced ATS scoring' },
        { included: false, text: 'Industry keyword packs' },
        { included: false, text: 'Score history tracking' },
        { included: false, text: 'Voice-based CV creation' },
        { included: false, text: 'Priority support' },
        { included: false, text: 'Team collaboration' },
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'outline',
      highlighted: false,
    },
    basic: {
      name: 'Basic',
      price: { monthly: 9.99, annual: 99.99 },
      description: 'For regular job seekers',
      features: [
        { included: true, text: '10 CV analyses per month' },
        { included: true, text: 'Advanced ATS scoring' },
        { included: true, text: 'Industry keyword packs' },
        { included: true, text: 'Priority email support' },
        { included: true, text: 'Score history tracking' },
        { included: false, text: 'Voice-based CV creation' },
        { included: false, text: 'Unlimited analyses' },
        { included: false, text: 'All industry keyword packs' },
        { included: false, text: 'Priority phone support' },
        { included: false, text: 'Team collaboration' },
      ],
      buttonText: currentPlan === 'basic' ? 'Current Plan' : 'Upgrade to Basic',
      buttonVariant: currentPlan === 'basic' ? 'outline' : 'primary',
      highlighted: true,
    },
    premium: {
      name: 'Premium',
      price: { monthly: 19.99, annual: 199.99 },
      description: 'For serious career advancement',
      features: [
        { included: true, text: 'Unlimited CV analyses' },
        { included: true, text: 'Voice-based CV creation' },
        { included: true, text: 'All industry keyword packs' },
        { included: true, text: 'Priority phone support' },
        { included: true, text: 'Advanced analytics dashboard' },
        { included: true, text: 'Team collaboration features' },
        { included: true, text: 'Batch processing' },
        { included: true, text: 'Advanced security features' },
        { included: true, text: 'Custom CV templates' },
        { included: true, text: 'API access' },
      ],
      buttonText: currentPlan === 'premium' ? 'Current Plan' : 'Upgrade to Premium',
      buttonVariant: currentPlan === 'premium' ? 'outline' : 'primary',
      highlighted: false,
    },
  };

  const handleSubscribe = async () => {
    if (selectedPlan === currentPlan) {
      toast.success(`You're already on the ${currentPlan} plan`);
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`Successfully upgraded to ${selectedPlan} plan!`);
      // In a real app, this would redirect to Stripe checkout
    }, 2000);
  };

  const calculateSavings = (plan) => {
    const monthly = plans[plan].price.monthly * 12;
    const annual = plans[plan].price.annual;
    return monthly - annual;
  };

  const getButtonClasses = (variant) => {
    if (variant === 'outline') {
      return 'w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50';
    }
    return 'w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="mt-2 text-gray-600">
          Choose the perfect plan for your CV optimization needs. All plans include our core ATS scoring technology.
        </p>
      </div>

      {/* Current plan status */}
      {currentPlan !== 'free' && (
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </h2>
              <p className="text-gray-600 mt-1">
                {currentPlan === 'basic' ? '€9.99/month' : '€19.99/month'} • Next billing date: {user?.subscription?.nextBillingDate || 'Not set'}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing cycle toggle */}
      <div className="mb-8">
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 text-sm font-medium rounded-md ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 text-sm font-medium rounded-md ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Annual (Save 17%)
            </button>
          </div>
        </div>
        {billingCycle === 'annual' && (
          <p className="text-center text-green-600 font-medium mt-2">
            💰 Save up to €40 per year with annual billing!
          </p>
        )}
      </div>

      {/* Plans comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(plans).map(([key, plan]) => (
          <div
            key={key}
            className={`border rounded-2xl shadow-card overflow-hidden ${
              plan.highlighted
                ? 'border-blue-500 ring-2 ring-blue-500 transform scale-[1.02]'
                : 'border-gray-200'
            }`}
          >
            {/* Plan header */}
            <div className={`p-6 ${
              key === 'free' ? 'bg-gray-50' :
              key === 'basic' ? 'bg-blue-50' :
              'bg-purple-50'
            }`}>
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  €{plan.price[billingCycle].toFixed(2)}
                </span>
                <span className="text-gray-600">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              {billingCycle === 'annual' && key !== 'free' && (
                <div className="mt-2 text-sm text-green-600 font-medium">
                  Save €{calculateSavings(key).toFixed(2)} vs monthly
                </div>
              )}
              <p className="mt-2 text-gray-600">{plan.description}</p>
            </div>

            {/* Plan features */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                What's included
              </h4>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Select plan button */}
              <div className="mt-8">
                <button
                  onClick={() => {
                    setSelectedPlan(key);
                    if (key !== currentPlan) {
                      handleSubscribe();
                    }
                  }}
                  disabled={isProcessing || key === currentPlan}
                  className={getButtonClasses(plan.buttonVariant)}
                >
                  {isProcessing && selectedPlan === key ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div className="mt-12 bg-white rounded-xl shadow-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Detailed Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  Free
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  Basic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { feature: 'CV Analyses per Month', free: '1', basic: '10', premium: 'Unlimited' },
                { feature: 'ATS Scoring', free: 'Basic', basic: 'Advanced', premium: 'Advanced+' },
                { feature: 'Voice CV Creation', free: '❌', basic: '❌', premium: '✅' },
                { feature: 'Industry Keywords', free: 'Limited', basic: '3 Packs', premium: 'All Packs' },
                { feature: 'Score History', free: '❌', basic: '✅', premium: '✅' },
                { feature: 'Analytics Dashboard', free: 'Basic', basic: 'Standard', premium: 'Advanced' },
                { feature: 'Priority Support', free: 'Email', basic: 'Email', premium: 'Phone & Email' },
                { feature: 'Team Collaboration', free: '❌', basic: '❌', premium: '✅' },
                { feature: 'Batch Processing', free: '❌', basic: '❌', premium: '✅' },
                { feature: 'API Access', free: '❌', basic: '❌', premium: '✅' },
              ].map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.feature}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {row.free}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {row.basic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {row.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              question: 'Can I switch plans later?',
              answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
            },
            {
              question: 'Is there a free trial?',
              answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.',
            },
            {
              question: 'What payment methods do you accept?',
              answer: 'We accept all major credit cards (Visa, MasterCard, American Express) via Stripe.',
            },
            {
              question: 'Can I cancel anytime?',
              answer: 'Absolutely. You can cancel your subscription at any time from your account settings.',
            },
            {
              question: 'Do you offer refunds?',
              answer: 'We offer a 30-day money-back guarantee if you\'re not satisfied with our service.',
            },
            {
              question: 'Is my data secure?',
              answer: 'Yes, we use bank-level encryption and never share your data with third parties.',
            },
          ].map((faq, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Ready to optimize your career?</h2>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          Join thousands of professionals who have improved their CVs and landed better jobs with CVOptima.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => {
              setSelectedPlan('basic');
              handleSubscribe();
            }}
            className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50"
          >
            Start 14-Day Free Trial
          </button>
          <button className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10">
            Schedule a Demo
          </button>
        </div>
        <p className="mt-4 text-sm text-blue-200">
          No credit card required • Cancel anytime • 30-day money-back guarantee
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;