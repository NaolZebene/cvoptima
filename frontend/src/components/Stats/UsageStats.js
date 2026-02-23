import React from 'react';
import {
  DocumentTextIcon,
  ChartBarIcon,
  MicrophoneIcon,
  ClockIcon,
} from '@heroicons/react/outline';

const UsageStats = ({ stats, subscription }) => {
  const usageItems = [
    {
      name: 'CV Uploads',
      value: stats?.cvUploads || 0,
      limit: subscription?.type === 'free' ? 1 : subscription?.type === 'basic' ? 10 : 100,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      unit: 'uploads',
    },
    {
      name: 'Analyses',
      value: stats?.analyses || 0,
      limit: subscription?.type === 'free' ? 5 : subscription?.type === 'basic' ? 50 : 'Unlimited',
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      unit: 'analyses',
    },
    {
      name: 'Voice Minutes',
      value: stats?.voiceMinutes || 0,
      limit: subscription?.type === 'premium' ? 120 : subscription?.type === 'enterprise' ? 500 : 0,
      icon: MicrophoneIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      unit: 'minutes',
    },
  ];

  const getUsagePercentage = (value, limit) => {
    if (limit === 'Unlimited' || limit === 0) return 0;
    if (typeof limit === 'string') {
      const numLimit = parseInt(limit);
      return numLimit > 0 ? Math.min((value / numLimit) * 100, 100) : 0;
    }
    return Math.min((value / limit) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRemainingText = (value, limit) => {
    if (limit === 'Unlimited') return 'Unlimited remaining';
    if (limit === 0) return 'Not available';
    
    const remaining = limit - value;
    if (remaining <= 0) return 'None remaining';
    return `${remaining} ${remaining === 1 ? 'left' : 'left'}`;
  };

  return (
    <div className="space-y-4">
      {usageItems.map((item) => {
        const percentage = getUsagePercentage(item.value, item.limit);
        const isUnlimited = item.limit === 'Unlimited';
        const isNotAvailable = item.limit === 0;
        
        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">
                    {isNotAvailable ? 'Not in your plan' : `${item.value} of ${item.limit} ${item.unit}`}
                  </p>
                </div>
              </div>
              {!isNotAvailable && (
                <span className="text-sm font-medium text-gray-900">
                  {getRemainingText(item.value, item.limit)}
                </span>
              )}
            </div>
            
            {!isUnlimited && !isNotAvailable && (
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${percentage}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getProgressColor(
                      percentage
                    )}`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>{item.limit}</span>
                </div>
              </div>
            )}
            
            {isUnlimited && (
              <div className="text-sm text-green-600 font-medium">
                ✓ Unlimited usage
              </div>
            )}
            
            {isNotAvailable && (
              <div className="text-sm text-gray-500">
                Upgrade to {item.name === 'Voice Minutes' ? 'Premium' : 'Basic'} plan to access
              </div>
            )}
          </div>
        );
      })}
      
      {/* Subscription info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Current Plan</h4>
            <p className="text-sm text-gray-500 capitalize">{subscription?.type || 'Free'} Plan</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {subscription?.type === 'free' ? '€0' : subscription?.type === 'basic' ? '€9.99' : '€19.99'}
              <span className="text-gray-500 text-xs">/month</span>
            </p>
            {subscription?.type === 'free' && (
              <a
                href="/subscription"
                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
              >
                Upgrade →
              </a>
            )}
          </div>
        </div>
        
        {/* Billing cycle */}
        {subscription?.type !== 'free' && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Next billing date: {subscription?.nextBillingDate || 'Not set'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {subscription?.status === 'trialing' ? 'Free trial ends soon' : 'Auto-renewal enabled'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Usage tips */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Usage Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            Upload multiple CV versions to track improvements
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            Use voice features for faster CV creation
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            Analyze against specific job descriptions for better scores
          </li>
          {subscription?.type === 'free' && (
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Upgrade to unlock unlimited analyses and voice features
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default UsageStats;