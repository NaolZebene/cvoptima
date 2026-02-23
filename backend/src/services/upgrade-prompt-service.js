/**
 * Upgrade Prompt Service
 * Manages upgrade prompts and conversion funnel optimization
 */

const { createError } = require('../middleware/error-handlers');

/**
 * Upgrade prompt configurations
 */
const UPGRADE_PROMPTS = {
  // Prompt designs for A/B testing
  designs: {
    A: {
      name: 'Minimal',
      template: 'minimal',
      colorScheme: 'blue',
      placement: 'modal',
      frequency: 'once_per_session',
      dismissible: true,
      maxShows: 3
    },
    
    B: {
      name: 'Feature Highlight',
      template: 'feature_highlight',
      colorScheme: 'green',
      placement: 'banner',
      frequency: 'on_limit_reach',
      dismissible: true,
      maxShows: 5
    },
    
    C: {
      name: 'Urgent',
      template: 'urgent',
      colorScheme: 'red',
      placement: 'fullscreen',
      frequency: 'immediate',
      dismissible: false,
      maxShows: 1
    },
    
    control: {
      name: 'Control',
      template: 'basic',
      colorScheme: 'gray',
      placement: 'none',
      frequency: 'never',
      dismissible: true,
      maxShows: 0
    }
  },
  
  // Trigger conditions
  triggers: {
    cv_limit_reached: {
      name: 'CV Limit Reached',
      condition: (user) => {
        const usage = user.getUsageStats();
        return usage.cvUploads.remaining === 0;
      },
      priority: 'high',
      cooldown: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    analysis_limit_reached: {
      name: 'Analysis Limit Reached',
      condition: (user) => {
        const usage = user.getUsageStats();
        return usage.analyses.remaining === 0;
      },
      priority: 'medium',
      cooldown: 12 * 60 * 60 * 1000 // 12 hours
    },
    
    voice_feature_attempt: {
      name: 'Voice Feature Attempt',
      condition: (user, context) => {
        return context?.action === 'voice_transcription' && !user.canUseVoiceFeatures();
      },
      priority: 'high',
      cooldown: 6 * 60 * 60 * 1000 // 6 hours
    },
    
    export_attempt: {
      name: 'Export Attempt',
      condition: (user, context) => {
        return context?.action === 'export' && !user.canExportData();
      },
      priority: 'medium',
      cooldown: 12 * 60 * 60 * 1000 // 12 hours
    },
    
    first_cv_upload: {
      name: 'First CV Upload',
      condition: (user) => {
        return user.stats.cvCount === 1;
      },
      priority: 'low',
      cooldown: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    
    third_cv_upload: {
      name: 'Third CV Upload',
      condition: (user) => {
        return user.stats.cvCount === 3;
      },
      priority: 'medium',
      cooldown: 3 * 24 * 60 * 60 * 1000 // 3 days
    },
    
    weekly_active: {
      name: 'Weekly Active User',
      condition: (user, context) => {
        // User has been active for a week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return user.lastLogin && user.lastLogin > oneWeekAgo;
      },
      priority: 'low',
      cooldown: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  },
  
  // Messaging templates
  messages: {
    cv_limit_reached: {
      title: 'CV Upload Limit Reached',
      description: 'You\'ve used all your free CV uploads for this month. Upgrade to upload more CVs.',
      cta: 'Upgrade Now',
      features: ['Unlimited CV uploads', 'Priority processing', 'No watermarks']
    },
    
    analysis_limit_reached: {
      title: 'Analysis Limit Reached',
      description: 'You\'ve used all your free analyses for this month. Upgrade for unlimited analyses.',
      cta: 'Get More Analyses',
      features: ['Unlimited analyses', 'Advanced scoring', 'Detailed insights']
    },
    
    voice_feature_attempt: {
      title: 'Voice Features Unlocked',
      description: 'Voice-based CV creation is a Premium feature. Upgrade to create CVs by speaking.',
      cta: 'Unlock Voice Features',
      features: ['Voice transcription', 'Multi-language support', 'Real-time editing']
    },
    
    export_attempt: {
      title: 'Export Features Available',
      description: 'Export your CVs and analysis reports. Available with Basic and Premium plans.',
      cta: 'Enable Exports',
      features: ['PDF export', 'CSV reports', 'Shareable links']
    },
    
    general_upgrade: {
      title: 'Upgrade Your Experience',
      description: 'Get more features, higher limits, and better results with our paid plans.',
      cta: 'View Plans',
      features: ['Higher limits', 'More features', 'Priority support']
    }
  },
  
  // Pricing display options
  pricingDisplays: {
    monthly: {
      name: 'Monthly Pricing',
      showAnnual: false,
      highlightMonthly: true,
      showSavings: false
    },
    
    annual: {
      name: 'Annual Pricing',
      showAnnual: true,
      highlightMonthly: false,
      showSavings: true
    },
    
    both: {
      name: 'Both Options',
      showAnnual: true,
      highlightMonthly: true,
      showSavings: true
    }
  }
};

/**
 * Check if upgrade prompt should be shown
 * @param {Object} user - User object
 * @param {string} trigger - Trigger name
 * @param {Object} context - Additional context
 * @returns {boolean} True if prompt should be shown
 */
const shouldShowUpgradePrompt = (user, trigger, context = {}) => {
  try {
    // Get trigger configuration
    const triggerConfig = UPGRADE_PROMPTS.triggers[trigger];
    if (!triggerConfig) {
      return false;
    }
    
    // Check trigger condition
    if (!triggerConfig.condition(user, context)) {
      return false;
    }
    
    // Check cooldown
    const lastPrompt = user.funnel.upgradePromptShown;
    if (lastPrompt) {
      const timeSinceLastPrompt = Date.now() - new Date(lastPrompt).getTime();
      if (timeSinceLastPrompt < triggerConfig.cooldown) {
        return false;
      }
    }
    
    // Check if user has already upgraded
    if (user.subscription.type !== 'free') {
      return false;
    }
    
    // Check A/B test group
    const testGroup = user.getABTestGroup('upgradePromptDesign');
    const designConfig = UPGRADE_PROMPTS.designs[testGroup];
    
    // Check if design allows prompts
    if (designConfig.maxShows === 0) {
      return false;
    }
    
    // Check prompt count
    const promptCount = getPromptCount(user, trigger);
    if (promptCount >= designConfig.maxShows) {
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error checking upgrade prompt:', error);
    return false;
  }
};

/**
 * Get prompt count for user and trigger
 * @param {Object} user - User object
 * @param {string} trigger - Trigger name
 * @returns {number} Prompt count
 */
const getPromptCount = (user, trigger) => {
  // In a real implementation, this would query a database
  // For now, return a simulated count
  return user.funnel.upgradePromptShown ? 1 : 0;
};

/**
 * Generate upgrade prompt
 * @param {Object} user - User object
 * @param {string} trigger - Trigger name
 * @param {Object} context - Additional context
 * @returns {Object|null} Prompt data or null
 */
const generateUpgradePrompt = (user, trigger, context = {}) => {
  try {
    // Check if prompt should be shown
    if (!shouldShowUpgradePrompt(user, trigger, context)) {
      return null;
    }
    
    // Get trigger configuration
    const triggerConfig = UPGRADE_PROMPTS.triggers[trigger];
    const messageConfig = UPGRADE_PROMPTS.messages[trigger] || UPGRADE_PROMPTS.messages.general_upgrade;
    
    // Get A/B test group
    const testGroup = user.getABTestGroup('upgradePromptDesign');
    const designConfig = UPGRADE_PROMPTS.designs[testGroup];
    
    // Get pricing display preference
    const pricingDisplay = user.getABTestGroup('pricingDisplay');
    const pricingConfig = UPGRADE_PROMPTS.pricingDisplays[pricingDisplay] || UPGRADE_PROMPTS.pricingDisplays.monthly;
    
    // Get feature highlight preference
    const featureHighlight = user.getABTestGroup('featureHighlight');
    
    // Generate prompt ID
    const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Build prompt data
    const prompt = {
      id: promptId,
      trigger,
      design: testGroup,
      priority: triggerConfig.priority,
      
      // Content
      title: messageConfig.title,
      description: messageConfig.description,
      cta: messageConfig.cta,
      
      // Design
      template: designConfig.template,
      colorScheme: designConfig.colorScheme,
      placement: designConfig.placement,
      dismissible: designConfig.dismissible,
      
      // Features to highlight
      features: getFeaturesToHighlight(messageConfig.features, featureHighlight),
      
      // Pricing
      pricing: {
        display: pricingDisplay,
        showAnnual: pricingConfig.showAnnual,
        highlightMonthly: pricingConfig.highlightMonthly,
        showSavings: pricingConfig.showSavings,
        plans: generatePricingData(pricingConfig)
      },
      
      // Analytics
      tracking: {
        userId: user._id.toString(),
        sessionId: context.sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        context: {
          cvCount: user.stats.cvCount,
          analysisCount: user.stats.totalOptimizations,
          subscription: user.subscription.type,
          usage: user.getUsageStats()
        }
      },
      
      // Actions
      actions: {
        upgrade: generateUpgradeUrl(user, trigger),
        learnMore: generateLearnMoreUrl(),
        dismiss: generateDismissUrl(promptId)
      },
      
      // Metadata
      metadata: {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };
    
    return prompt;
    
  } catch (error) {
    console.error('Error generating upgrade prompt:', error);
    return null;
  }
};

/**
 * Get features to highlight based on user preference
 * @param {Array} allFeatures - All available features
 * @param {string} highlightPreference - Highlight preference
 * @returns {Array} Features to highlight
 */
const getFeaturesToHighlight = (allFeatures, highlightPreference) => {
  if (highlightPreference === 'all') {
    return allFeatures;
  }
  
  // Filter features based on preference
  const featureMap = {
    voice: ['Voice transcription', 'Multi-language support', 'Real-time editing'],
    ats: ['Advanced ATS scoring', 'Keyword optimization', 'Industry matching'],
    analytics: ['Detailed insights', 'Progress tracking', 'Export reports']
  };
  
  return featureMap[highlightPreference] || allFeatures.slice(0, 3);
};

/**
 * Generate pricing data
 * @param {Object} pricingConfig - Pricing display configuration
 * @returns {Array} Pricing plans
 */
const generatePricingData = (pricingConfig) => {
  const plans = [
    {
      name: 'Basic',
      monthlyPrice: 9.99,
      annualPrice: 99.99, // €8.33/month equivalent
      currency: 'EUR',
      features: [
        '10 CVs/month',
        '20 analyses/month',
        'Basic exports',
        'Email support'
      ],
      highlighted: pricingConfig.highlightMonthly
    },
    
    {
      name: 'Premium',
      monthlyPrice: 19.99,
      annualPrice: 199.99, // €16.67/month equivalent
      currency: 'EUR',
      features: [
        '100 CVs/month',
        '200 analyses/month',
        'Voice features',
        'Priority support',
        'No watermarks'
      ],
      highlighted: !pricingConfig.highlightMonthly
    }
  ];
  
  // Add savings information if enabled
  if (pricingConfig.showSavings) {
    plans.forEach(plan => {
      if (plan.annualPrice) {
        const monthlyEquivalent = plan.annualPrice / 12;
        const savings = plan.monthlyPrice - monthlyEquivalent;
        plan.savings = {
          percentage: Math.round((savings / plan.monthlyPrice) * 100),
          amount: savings.toFixed(2),
          monthlyEquivalent: monthlyEquivalent.toFixed(2)
        };
      }
    });
  }
  
  return plans;
};

/**
 * Generate upgrade URL
 * @param {Object} user - User object
 * @param {string} trigger - Trigger name
 * @returns {string} Upgrade URL
 */
const generateUpgradeUrl = (user, trigger) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    userId: user._id.toString(),
    trigger,
    source: 'upgrade_prompt',
    timestamp: Date.now().toString()
  });
  
  return `${baseUrl}/upgrade?${params.toString()}`;
};

/**
 * Generate learn more URL
 * @returns {string} Learn more URL
 */
const generateLearnMoreUrl = () => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/pricing`;
};

/**
 * Generate dismiss URL
 * @param {string} promptId - Prompt ID
 * @returns {string} Dismiss URL
 */
const generateDismissUrl = (promptId) => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  return `${baseUrl}/api/v1/upgrade-prompts/${promptId}/dismiss`;
};

/**
 * Record prompt shown
 * @param {Object} user - User object
 * @param {Object} prompt - Prompt data
 * @returns {Promise<Object>} Updated user
 */
const recordPromptShown = async (user, prompt) => {
  try {
    // Record funnel event
    await user.recordFunnelEvent('upgradePromptShown');
    
    // In a real implementation, store prompt analytics
    console.log(`Upgrade prompt shown to user ${user._id}: ${prompt.trigger}`);
    
    return user;
    
  } catch (error) {
    console.error('Error recording prompt shown:', error);
    return user;
  }
};

/**
 * Record prompt action
 * @param {Object} user - User object
 * @param {string} promptId - Prompt ID
 * @param {string} action - Action taken
 * @returns {Promise<Object>} Updated user
 */
const recordPromptAction = async (user, promptId, action) => {
  try {
    // Record appropriate funnel event
    switch (action) {
      case 'upgrade_clicked':
        await user.recordFunnelEvent('upgradeClicked');
        break;
        
      case 'learn_more_clicked':
        // No specific funnel event for learn more
        break;
        
      case 'dismissed':
        // Record dismissal
        console.log(`Prompt ${promptId} dismissed by user ${user._id}`);
        break;
    }
    
    // In a real implementation, store action analytics
    console.log(`Prompt action recorded: ${action} for prompt ${promptId}`);
    
    return user;
    
  } catch (error) {
    console.error('Error recording prompt action:', error);
    return user;
  }
};

/**
 * Get conversion statistics
 * @param {Array} users - Array of users
 * @returns {Object} Conversion statistics
 */
const getConversionStats = (users) => {
  const stats = {
    totalUsers: users.length,
    freeUsers: users.filter(u => u.subscription.type === 'free').length,
    convertedUsers: users.filter(u => u.subscription.type !== 'free').length,
    
    funnel: {
      signedUp: users.filter(u => u.funnel.signedUp).length,
      firstCvUpload: users.filter(u => u.funnel.firstCvUpload).length,
      upgradePromptShown: users.filter(u => u.funnel.upgradePromptShown).length,
      upgradeClicked: users.filter(u => u.funnel.upgradeClicked).length,
      checkoutStarted: users.filter(u => u.funnel.checkoutStarted).length,
      checkoutCompleted: users.filter(u => u.funnel.checkoutCompleted).length
    },
    
    conversionRates: {
      signupToFirstCv: 0,
      firstCvToPrompt: 0,
      promptToClick: 0,
      clickToCheckout: 0,
      checkoutToConversion: 0,
      overall: 0
    },
    
    aBTests: {
      upgradePromptDesign: {},
      pricingDisplay: {},
      featureHighlight: {}
    }
  };
  
  // Calculate conversion rates
  if (stats.funnel.signedUp > 0) {
    stats.conversionRates.signupToFirstCv = (stats.funnel.firstCvUpload / stats.funnel.signedUp) * 100;
  }
  
  if (stats.funnel.firstCvUpload > 0) {
    stats.conversionRates.firstCvToPrompt = (stats.funnel.upgradePromptShown / stats.funnel.firstCvUpload) * 100;
  }
  
  if (stats.funnel.upgradePromptShown > 0) {
    stats.conversionRates.promptToClick = (stats.funnel.upgradeClicked / stats.funnel.upgradePromptShown) * 100;
  }
  
  if (stats.funnel.upgradeClicked > 0) {
    stats.conversionRates.clickToCheckout = (stats.funnel.checkoutStarted / stats.funnel.upgradeClicked) * 100;
  }
  
  if (stats.funnel.checkoutStarted > 0) {
    stats.conversionRates.checkoutToConversion = (stats.funnel.checkoutCompleted / stats.funnel.checkoutStarted) * 100;
  }
  
  if (stats.totalUsers > 0) {
    stats.conversionRates.overall = (stats.convertedUsers / stats.totalUsers) * 100;
  }
  
  // Calculate A/B test performance
  users.forEach(user => {
    // Upgrade prompt design
    const designGroup = user.getABTestGroup('upgradePromptDesign');
    if (!stats.aBTests.upgradePromptDesign[designGroup]) {
      stats.aBTests.upgradePromptDesign[designGroup] = {
        users: 0,
        converted: 0,
        conversionRate: 0
      };
    }
    
    stats.aBTests.upgradePromptDesign[designGroup].users += 1;
    if (user.subscription.type !== 'free') {
      stats.aBTests.upgradePromptDesign[designGroup].converted += 1;
    }
    
    // Pricing display
    const pricingGroup = user.getABTestGroup('pricingDisplay');
    if (!stats.aBTests.pricingDisplay[pricingGroup]) {
      stats.aBTests.pricingDisplay[pricingGroup] = {
        users: 0,
        converted: 0,
        conversionRate: 0
      };
    }
    
    stats.aBTests.pricingDisplay[pricingGroup].users += 1;
    if (user.subscription.type !== 'free') {
      stats.aBTests.pricingDisplay[pricingGroup].converted += 1;
    }
    
    // Feature highlight
    const featureGroup = user.getABTestGroup('featureHighlight');
    if (!stats.aBTests.featureHighlight[featureGroup]) {
      stats.aBTests.featureHighlight[featureGroup] = {
        users: 0,
        converted: 0,
        conversionRate: 0
      };
    }
    
    stats.aBTests.featureHighlight[featureGroup].users += 1;
    if (user.subscription.type !== 'free') {
      stats.aBTests.featureHighlight[featureGroup].converted += 1;
    }
  });
  
  // Calculate conversion rates for A/B tests
  Object.keys(stats.aBTests.upgradePromptDesign).forEach(group => {
    const groupStats = stats.aBTests.upgradePromptDesign[group];
    if (groupStats.users > 0) {
      groupStats.conversionRate = (groupStats.converted / groupStats.users) * 100;
    }
  });
  
  Object.keys(stats.aBTests.pricingDisplay).forEach(group => {
    const groupStats = stats.aBTests.pricingDisplay[group];
    if (groupStats.users > 0) {
      groupStats.conversionRate = (groupStats.converted / groupStats.users) * 100;
    }
  });
  
  Object.keys(stats.aBTests.featureHighlight).forEach(group => {
    const groupStats = stats.aBTests.featureHighlight[group];
    if (groupStats.users > 0) {
      groupStats.conversionRate = (groupStats.converted / groupStats.users) * 100;
    }
  });
  
  return stats;
};

/**
 * Get optimal upgrade prompt strategy
 * @param {Array} users - Array of users
 * @returns {Object} Optimal strategy
 */
const getOptimalStrategy = (users) => {
  const stats = getConversionStats(users);
  
  // Find best performing A/B test groups
  const bestDesign = Object.entries(stats.aBTests.upgradePromptDesign)
    .reduce((best, [group, groupStats]) => {
      if (!best || groupStats.conversionRate > best.conversionRate) {
        return { group, ...groupStats };
      }
      return best;
    }, null);
  
  const bestPricing = Object.entries(stats.aBTests.pricingDisplay)
    .reduce((best, [group, groupStats]) => {
      if (!best || groupStats.conversionRate > best.conversionRate) {
        return { group, ...groupStats };
      }
      return best;
    }, null);
  
  const bestFeature = Object.entries(stats.aBTests.featureHighlight)
    .reduce((best, [group, groupStats]) => {
      if (!best || groupStats.conversionRate > best.conversionRate) {
        return { group, ...groupStats };
      }
      return best;
    }, null);
  
  // Identify weakest funnel stage
  const funnelStages = [
    { stage: 'signupToFirstCv', rate: stats.conversionRates.signupToFirstCv },
    { stage: 'firstCvToPrompt', rate: stats.conversionRates.firstCvToPrompt },
    { stage: 'promptToClick', rate: stats.conversionRates.promptToClick },
    { stage: 'clickToCheckout', rate: stats.conversionRates.clickToCheckout },
    { stage: 'checkoutToConversion', rate: stats.conversionRates.checkoutToConversion }
  ];
  
  const weakestStage = funnelStages.reduce((weakest, stage) => {
    if (!weakest || stage.rate < weakest.rate) {
      return stage;
    }
    return weakest;
  });
  
  return {
    bestDesign: bestDesign?.group || 'control',
    bestPricing: bestPricing?.group || 'monthly',
    bestFeature: bestFeature?.group || 'all',
    weakestFunnelStage: weakestStage.stage,
    weakestStageRate: weakestStage.rate,
    overallConversionRate: stats.conversionRates.overall,
    recommendations: generateRecommendations(stats, weakestStage.stage)
  };
};

/**
 * Generate recommendations based on funnel analysis
 * @param {Object} stats - Conversion statistics
 * @param {string} weakestStage - Weakest funnel stage
 * @returns {Array} Recommendations
 */
const generateRecommendations = (stats, weakestStage) => {
  const recommendations = [];
  
  switch (weakestStage) {
    case 'signupToFirstCv':
      recommendations.push(
        'Improve onboarding flow to encourage first CV upload',
        'Add tutorial or guided tour for new users',
        'Offer incentives for first CV upload (e.g., free analysis)'
      );
      break;
      
    case 'firstCvToPrompt':
      recommendations.push(
        'Show upgrade prompts earlier in user journey',
        'Trigger prompts based on user engagement metrics',
        'Personalize prompt timing based on user behavior'
      );
      break;
      
    case 'promptToClick':
      recommendations.push(
        `Use design group "${stats.aBTests.upgradePromptDesign.best?.group}" for prompts`,
        'Improve call-to-action messaging',
        'Highlight value proposition more clearly'
      );
      break;
      
    case 'clickToCheckout':
      recommendations.push(
        'Simplify checkout process',
        'Reduce number of steps to complete purchase',
        'Add trust signals (security badges, testimonials)'
      );
      break;
      
    case 'checkoutToConversion':
      recommendations.push(
        'Offer payment plan options',
        'Provide money-back guarantee',
        'Show social proof during checkout'
      );
      break;
  }
  
  // General recommendations
  if (stats.conversionRates.overall < 5) {
    recommendations.push('Consider offering a free trial period');
  }
  
  if (stats.funnel.upgradePromptShown < stats.funnel.firstCvUpload * 0.5) {
    recommendations.push('Increase frequency of upgrade prompts');
  }
  
  return recommendations;
};

/**
 * Check all triggers and return applicable prompts
 * @param {Object} user - User object
 * @param {Object} context - Additional context
 * @returns {Array} Array of applicable prompts
 */
const checkAllTriggers = (user, context = {}) => {
  const prompts = [];
  
  Object.keys(UPGRADE_PROMPTS.triggers).forEach(trigger => {
    const prompt = generateUpgradePrompt(user, trigger, context);
    if (prompt) {
      prompts.push(prompt);
    }
  });
  
  // Sort by priority (high to low)
  prompts.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return prompts;
};

/**
 * Get user's upgrade prompt history
 * @param {Object} user - User object
 * @returns {Array} Prompt history
 */
const getUserPromptHistory = (user) => {
  // In a real implementation, this would query a database
  // For now, return simulated history
  const history = [];
  
  if (user.funnel.upgradePromptShown) {
    history.push({
      timestamp: user.funnel.upgradePromptShown,
      trigger: 'first_cv_upload',
      action: 'shown',
      design: user.getABTestGroup('upgradePromptDesign')
    });
  }
  
  if (user.funnel.upgradeClicked) {
    history.push({
      timestamp: user.funnel.upgradeClicked,
      trigger: 'first_cv_upload',
      action: 'clicked',
      design: user.getABTestGroup('upgradePromptDesign')
    });
  }
  
  return history;
};

module.exports = {
  UPGRADE_PROMPTS,
  
  shouldShowUpgradePrompt,
  generateUpgradePrompt,
  recordPromptShown,
  recordPromptAction,
  getConversionStats,
  getOptimalStrategy,
  checkAllTriggers,
  getUserPromptHistory,
  
  // Helper functions
  getPromptCount,
  getFeaturesToHighlight,
  generatePricingData,
  generateUpgradeUrl,
  generateLearnMoreUrl,
  generateDismissUrl,
  generateRecommendations
};