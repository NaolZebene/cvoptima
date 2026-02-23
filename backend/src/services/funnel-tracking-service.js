/**
 * Funnel Tracking Service
 * Tracks user conversion from free to paid and analyzes funnel performance
 */

const { createError } = require('../middleware/error-handlers');
const User = require('../models/User');

/**
 * Funnel stages configuration
 */
const FUNNEL_STAGES = {
  SIGNUP: {
    name: 'Sign Up',
    key: 'signedUp',
    description: 'User creates an account',
    targetConversionRate: 100, // Everyone starts here
    averageTime: 'immediate'
  },
  
  FIRST_CV_UPLOAD: {
    name: 'First CV Upload',
    key: 'firstCvUpload',
    description: 'User uploads their first CV',
    targetConversionRate: 60, // 60% of signups
    averageTime: '1 day'
  },
  
  FIRST_ANALYSIS: {
    name: 'First Analysis',
    key: 'firstAnalysis',
    description: 'User runs first ATS analysis',
    targetConversionRate: 80, // 80% of first uploads
    averageTime: '5 minutes'
  },
  
  FIRST_VOICE_USE: {
    name: 'First Voice Use',
    key: 'firstVoiceUse',
    description: 'User tries voice features',
    targetConversionRate: 20, // 20% of active users
    averageTime: '3 days'
  },
  
  UPGRADE_PROMPT_SHOWN: {
    name: 'Upgrade Prompt Shown',
    key: 'upgradePromptShown',
    description: 'User sees upgrade prompt',
    targetConversionRate: 90, // 90% of eligible users
    averageTime: '2 days'
  },
  
  UPGRADE_CLICKED: {
    name: 'Upgrade Clicked',
    key: 'upgradeClicked',
    description: 'User clicks upgrade prompt',
    targetConversionRate: 15, // 15% of prompts shown
    averageTime: '1 minute'
  },
  
  CHECKOUT_STARTED: {
    name: 'Checkout Started',
    key: 'checkoutStarted',
    description: 'User starts checkout process',
    targetConversionRate: 70, // 70% of clicks
    averageTime: '30 seconds'
  },
  
  CHECKOUT_COMPLETED: {
    name: 'Checkout Completed',
    key: 'checkoutCompleted',
    description: 'User completes purchase',
    targetConversionRate: 40, // 40% of checkouts started
    averageTime: '2 minutes'
  },
  
  TRIAL_STARTED: {
    name: 'Trial Started',
    key: 'trialStarted',
    description: 'User starts free trial',
    targetConversionRate: 25, // 25% of signups
    averageTime: '2 days'
  },
  
  TRIAL_CONVERTED: {
    name: 'Trial Converted',
    key: 'trialConverted',
    description: 'Trial converts to paid',
    targetConversionRate: 30, // 30% of trials
    averageTime: '7 days'
  },
  
  CHURNED: {
    name: 'Churned',
    key: 'churned',
    description: 'User stops using service',
    targetConversionRate: 5, // 5% monthly churn
    averageTime: '30 days'
  }
};

/**
 * Funnel stage order
 */
const FUNNEL_ORDER = [
  'SIGNUP',
  'FIRST_CV_UPLOAD',
  'FIRST_ANALYSIS',
  'FIRST_VOICE_USE',
  'UPGRADE_PROMPT_SHOWN',
  'UPGRADE_CLICKED',
  'CHECKOUT_STARTED',
  'CHECKOUT_COMPLETED',
  'TRIAL_STARTED',
  'TRIAL_CONVERTED',
  'CHURNED'
];

/**
 * Track funnel event
 * @param {Object} user - User object
 * @param {string} event - Funnel event key
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Updated user
 */
const trackFunnelEvent = async (user, event, metadata = {}) => {
  try {
    // Validate event
    const stageConfig = Object.values(FUNNEL_STAGES).find(stage => stage.key === event);
    if (!stageConfig) {
      throw createError(`Invalid funnel event: ${event}`, 400, 'ValidationError');
    }
    
    // Update user funnel
    if (!user.funnel[event]) {
      user.funnel[event] = new Date();
      
      // Save user
      await user.save({ validateBeforeSave: false });
      
      // Log event
      console.log(`Funnel event tracked: ${stageConfig.name} for user ${user._id}`);
      
      // Record event in analytics (in production, send to analytics service)
      recordEventAnalytics(user, event, stageConfig, metadata);
    }
    
    return user;
    
  } catch (error) {
    console.error('Error tracking funnel event:', error);
    return user;
  }
};

/**
 * Record event analytics
 * @param {Object} user - User object
 * @param {string} event - Event key
 * @param {Object} stageConfig - Stage configuration
 * @param {Object} metadata - Additional metadata
 */
const recordEventAnalytics = (user, event, stageConfig, metadata) => {
  // In a real implementation, send to analytics service (Mixpanel, Amplitude, etc.)
  const analyticsData = {
    userId: user._id.toString(),
    event,
    eventName: stageConfig.name,
    timestamp: new Date().toISOString(),
    userProperties: {
      email: user.email,
      subscription: user.subscription.type,
      cvCount: user.stats.cvCount,
      totalOptimizations: user.stats.totalOptimizations,
      lastLogin: user.lastLogin
    },
    eventProperties: {
      ...metadata,
      funnelStage: stageConfig.name,
      stageOrder: FUNNEL_ORDER.indexOf(stageConfig.name.toUpperCase().replace(/ /g, '_'))
    }
  };
  
  console.log('Analytics event:', analyticsData);
  
  // Simulate sending to analytics service
  // In production: analytics.track(event, analyticsData);
};

/**
 * Get user's funnel progress
 * @param {Object} user - User object
 * @returns {Object} Funnel progress
 */
const getUserFunnelProgress = (user) => {
  const progress = {
    currentStage: null,
    completedStages: [],
    pendingStages: [],
    timeInFunnel: 0,
    conversionProbability: 0,
    nextRecommendedAction: null
  };
  
  // Calculate time since signup
  if (user.funnel.signedUp) {
    const signupDate = new Date(user.funnel.signedUp);
    const now = new Date();
    progress.timeInFunnel = Math.floor((now - signupDate) / (1000 * 60 * 60 * 24)); // Days
    
    // Find current stage (last completed stage)
    let lastCompletedIndex = -1;
    
    FUNNEL_ORDER.forEach((stageKey, index) => {
      const stageConfig = FUNNEL_STAGES[stageKey];
      if (user.funnel[stageConfig.key]) {
        progress.completedStages.push({
          stage: stageConfig.name,
          key: stageConfig.key,
          completedAt: user.funnel[stageConfig.key],
          order: index
        });
        lastCompletedIndex = index;
      } else {
        progress.pendingStages.push({
          stage: stageConfig.name,
          key: stageConfig.key,
          order: index,
          targetConversionRate: stageConfig.targetConversionRate,
          averageTime: stageConfig.averageTime
        });
      }
    });
    
    // Set current stage
    if (lastCompletedIndex >= 0 && lastCompletedIndex < FUNNEL_ORDER.length - 1) {
      const nextStageKey = FUNNEL_ORDER[lastCompletedIndex + 1];
      progress.currentStage = FUNNEL_STAGES[nextStageKey].name;
    }
    
    // Calculate conversion probability
    progress.conversionProbability = calculateConversionProbability(user);
    
    // Determine next recommended action
    progress.nextRecommendedAction = getNextRecommendedAction(user, progress);
  }
  
  return progress;
};

/**
 * Calculate conversion probability
 * @param {Object} user - User object
 * @returns {number} Conversion probability (0-100)
 */
const calculateConversionProbability = (user) => {
  let probability = 0;
  
  // Base probability based on engagement
  if (user.stats.cvCount > 0) probability += 20;
  if (user.stats.totalOptimizations > 0) probability += 15;
  if (user.lastLogin && daysSince(user.lastLogin) < 7) probability += 25;
  
  // Increase based on funnel progress
  if (user.funnel.firstCvUpload) probability += 10;
  if (user.funnel.firstAnalysis) probability += 10;
  if (user.funnel.firstVoiceUse) probability += 15;
  if (user.funnel.upgradePromptShown) probability += 5;
  
  // Decrease based on inactivity
  if (user.lastLogin && daysSince(user.lastLogin) > 30) probability -= 30;
  
  // Cap probability
  return Math.max(0, Math.min(100, probability));
};

/**
 * Get next recommended action
 * @param {Object} user - User object
 * @param {Object} progress - Funnel progress
 * @returns {Object|null} Recommended action
 */
const getNextRecommendedAction = (user, progress) => {
  if (!progress.currentStage) return null;
  
  const recommendations = {
    'First CV Upload': {
      action: 'upload_cv',
      message: 'Upload your first CV to get started',
      priority: 'high',
      incentive: 'Free ATS analysis included'
    },
    
    'First Analysis': {
      action: 'analyze_cv',
      message: 'Run ATS analysis on your uploaded CV',
      priority: 'high',
      incentive: 'See how your CV scores'
    },
    
    'First Voice Use': {
      action: 'try_voice',
      message: 'Try voice-based CV creation',
      priority: 'medium',
      incentive: 'Premium feature preview'
    },
    
    'Upgrade Prompt Shown': {
      action: 'show_upgrade_prompt',
      message: 'Show upgrade options',
      priority: 'medium',
      incentive: 'Unlock more features'
    },
    
    'Upgrade Clicked': {
      action: 'navigate_to_checkout',
      message: 'Guide to checkout page',
      priority: 'high',
      incentive: 'Special offer available'
    },
    
    'Checkout Started': {
      action: 'complete_checkout',
      message: 'Complete purchase',
      priority: 'critical',
      incentive: 'Limited time discount'
    },
    
    'Checkout Completed': {
      action: 'onboard_premium',
      message: 'Welcome to Premium!',
      priority: 'low',
      incentive: 'Explore premium features'
    }
  };
  
  return recommendations[progress.currentStage] || null;
};

/**
 * Get funnel analytics
 * @param {Array} users - Array of users
 * @param {Object} options - Query options
 * @returns {Object} Funnel analytics
 */
const getFunnelAnalytics = async (users, options = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate = new Date(),
    segmentBy = 'all'
  } = options;
  
  // Filter users by date range
  const filteredUsers = users.filter(user => {
    const signupDate = new Date(user.funnel.signedUp || user.createdAt);
    return signupDate >= startDate && signupDate <= endDate;
  });
  
  // Calculate funnel metrics
  const funnelMetrics = {};
  let previousCount = filteredUsers.length;
  
  FUNNEL_ORDER.forEach(stageKey => {
    const stageConfig = FUNNEL_STAGES[stageKey];
    const stageUsers = filteredUsers.filter(user => user.funnel[stageConfig.key]);
    const count = stageUsers.length;
    
    funnelMetrics[stageConfig.key] = {
      name: stageConfig.name,
      count,
      percentage: previousCount > 0 ? (count / previousCount) * 100 : 0,
      dropoff: previousCount > 0 ? previousCount - count : 0,
      dropoffPercentage: previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0,
      targetRate: stageConfig.targetConversionRate,
      performance: previousCount > 0 
        ? ((count / previousCount) * 100) - stageConfig.targetConversionRate
        : -stageConfig.targetConversionRate
    };
    
    previousCount = count;
  });
  
  // Calculate overall conversion rate
  const totalSignups = filteredUsers.length;
  const totalPaid = filteredUsers.filter(user => user.subscription.type !== 'free').length;
  const overallConversionRate = totalSignups > 0 ? (totalPaid / totalSignups) * 100 : 0;
  
  // Calculate time between stages
  const stageTimes = calculateStageTimes(filteredUsers);
  
  // Segment analysis
  const segments = segmentFunnelData(filteredUsers, segmentBy);
  
  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(funnelMetrics);
  
  // Generate insights
  const insights = generateFunnelInsights(funnelMetrics, bottlenecks, stageTimes);
  
  return {
    summary: {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      totalUsers: filteredUsers.length,
      totalSignups: totalSignups,
      totalPaid: totalPaid,
      overallConversionRate,
      averageFunnelTime: calculateAverageFunnelTime(filteredUsers),
      monthlyChurnRate: calculateChurnRate(filteredUsers)
    },
    
    funnel: funnelMetrics,
    
    stageTimes,
    
    segments,
    
    bottlenecks,
    
    insights,
    
    recommendations: generateFunnelRecommendations(bottlenecks, insights),
    
    metadata: {
      generatedAt: new Date().toISOString(),
      usersAnalyzed: filteredUsers.length,
      segmentBy
    }
  };
};

/**
 * Calculate time between stages
 * @param {Array} users - Array of users
 * @returns {Object} Stage times
 */
const calculateStageTimes = (users) => {
  const times = {};
  
  // For each consecutive stage pair
  for (let i = 0; i < FUNNEL_ORDER.length - 1; i++) {
    const fromStage = FUNNEL_STAGES[FUNNEL_ORDER[i]];
    const toStage = FUNNEL_STAGES[FUNNEL_ORDER[i + 1]];
    
    const key = `${fromStage.key}_to_${toStage.key}`;
    
    // Get users who completed both stages
    const stageUsers = users.filter(user => 
      user.funnel[fromStage.key] && user.funnel[toStage.key]
    );
    
    if (stageUsers.length > 0) {
      const timeDiffs = stageUsers.map(user => {
        const fromTime = new Date(user.funnel[fromStage.key]);
        const toTime = new Date(user.funnel[toStage.key]);
        return toTime - fromTime; // milliseconds
      });
      
      const avgTime = timeDiffs.reduce((sum, time) => sum + time, 0) / timeDiffs.length;
      const medianTime = calculateMedian(timeDiffs);
      
      times[key] = {
        from: fromStage.name,
        to: toStage.name,
        users: stageUsers.length,
        averageTime: formatTime(avgTime),
        medianTime: formatTime(medianTime),
        minTime: formatTime(Math.min(...timeDiffs)),
        maxTime: formatTime(Math.max(...timeDiffs))
      };
    }
  }
  
  return times;
};

/**
 * Segment funnel data
 * @param {Array} users - Array of users
 * @param {string} segmentBy - Segmentation criteria
 * @returns {Object} Segmented data
 */
const segmentFunnelData = (users, segmentBy) => {
  const segments = {};
  
  switch (segmentBy) {
    case 'subscription':
      // Segment by current subscription
      const subscriptionGroups = ['free', 'basic', 'premium', 'enterprise'];
      subscriptionGroups.forEach(group => {
        const groupUsers = users.filter(user => user.subscription.type === group);
        if (groupUsers.length > 0) {
          segments[group] = {
            count: groupUsers.length,
            conversionRate: group === 'free' ? 0 : 100, // All paid users converted
            funnel: calculateSegmentFunnel(groupUsers)
          };
        }
      });
      break;
      
    case 'cv_count':
      // Segment by CV count
      const cvGroups = [
        { name: '0 CVs', filter: user => user.stats.cvCount === 0 },
        { name: '1-3 CVs', filter: user => user.stats.cvCount >= 1 && user.stats.cvCount <= 3 },
        { name: '4-10 CVs', filter: user => user.stats.cvCount >= 4 && user.stats.cvCount <= 10 },
        { name: '10+ CVs', filter: user => user.stats.cvCount > 10 }
      ];
      
      cvGroups.forEach(group => {
        const groupUsers = users.filter(group.filter);
        if (groupUsers.length > 0) {
          segments[group.name] = {
            count: groupUsers.length,
            conversionRate: calculateSegmentConversionRate(groupUsers),
            funnel: calculateSegmentFunnel(groupUsers)
          };
        }
      });
      break;
      
    case 'signup_date':
      // Segment by signup month
      const monthGroups = {};
      
      users.forEach(user => {
        const signupDate = new Date(user.funnel.signedUp || user.createdAt);
        const monthKey = `${signupDate.getFullYear()}-${signupDate.getMonth() + 1}`;
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(user);
      });
      
      Object.keys(monthGroups).forEach(monthKey => {
        const groupUsers = monthGroups[monthKey];
        segments[monthKey] = {
          count: groupUsers.length,
          conversionRate: calculateSegmentConversionRate(groupUsers),
          funnel: calculateSegmentFunnel(groupUsers)
        };
      });
      break;
      
    default:
      // No segmentation
      segments.all = {
        count: users.length,
        conversionRate: calculateSegmentConversionRate(users),
        funnel: calculateSegmentFunnel(users)
      };
  }
  
  return segments;
};

/**
 * Calculate segment funnel
 * @param {Array} users - Segment users
 * @returns {Object} Segment funnel
 */
const calculateSegmentFunnel = (users) => {
  const funnel = {};
  
  Object.values(FUNNEL_STAGES).forEach(stage => {
    const stageUsers = users.filter(user => user.funnel[stage.key]);
    funnel[stage.key] = {
      count: stageUsers.length,
      percentage: users.length > 0 ? (stageUsers.length / users.length) * 100 : 0
    };
  });
  
  return funnel;
};

/**
 * Calculate segment conversion rate
 * @param {Array} users - Segment users
 * @returns {number} Conversion rate
 */
const calculateSegmentConversionRate = (users) => {
  const paidUsers = users.filter(user => user.subscription.type !== 'free');
  return users.length > 0 ? (paidUsers.length / users.length) * 100 : 0;
};

/**
 * Identify bottlenecks in funnel
 * @param {Object} funnelMetrics - Funnel metrics
 * @returns {Array} Bottlenecks
 */
const identifyBottlenecks = (funnelMetrics) => {
  const bottlenecks = [];
  
  Object.keys(funnelMetrics).forEach(stageKey => {
    const stage = funnelMetrics[stageKey];
    
    // Check if stage has significant dropoff
    if (stage.dropoffPercentage > 50) { // More than 50% dropoff
      bottlenecks.push({
        stage: stage.name,
        key: stageKey,
        dropoff: stage.dropoff,
        dropoffPercentage: stage.dropoffPercentage,
        performance: stage.performance,
        severity: stage.dropoffPercentage > 80 ? 'critical' : 
                 stage.dropoffPercentage > 60 ? 'high' : 'medium',
        description: `${stage.dropoffPercentage.toFixed(1)}% dropoff at ${stage.name} stage`
      });
    }
    
    // Check if stage is underperforming vs target
    if (stage.performance < -10) { // More than 10% below target
      bottlenecks.push({
        stage: stage.name,
        key: stageKey,
        actualRate: stage.percentage,
        targetRate: stage.targetConversionRate,
        gap: Math.abs(stage.performance),
        severity: stage.performance < -20 ? 'critical' : 
                 stage.performance < -15 ? 'high' : 'medium',
        description: `Underperforming by ${Math.abs(stage.performance).toFixed(1)}% vs target`
      });
    }
  });
  
  // Sort by severity
  bottlenecks.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  return bottlenecks;
};

/**
 * Generate funnel insights
 * @param {Object} funnelMetrics - Funnel metrics
 * @param {Array} bottlenecks - Bottlenecks
 * @param {Object} stageTimes - Stage times
 * @returns {Array} Insights
 */
const generateFunnelInsights = (funnelMetrics, bottlenecks, stageTimes) => {
  const insights = [];
  
  // Overall conversion insight
  const overallRate = funnelMetrics.checkoutCompleted?.percentage || 0;
  if (overallRate < 5) {
    insights.push({
      type: 'warning',
      title: 'Low Overall Conversion',
      message: `Only ${overallRate.toFixed(1)}% of users convert to paid. Consider improving value proposition.`,
      priority: 'high'
    });
  } else if (overallRate > 15) {
    insights.push({
      type: 'success',
      title: 'Strong Conversion Rate',
      message: `${overallRate.toFixed(1)}% conversion rate is above industry average.`,
      priority: 'low'
    });
  }
  
  // Bottleneck insights
  bottlenecks.forEach(bottleneck => {
    insights.push({
      type: 'bottleneck',
      title: `Bottleneck: ${bottleneck.stage}`,
      message: bottleneck.description,
      priority: bottleneck.severity,
      recommendation: getBottleneckRecommendation(bottleneck)
    });
  });
  
  // Time-based insights
  Object.keys(stageTimes).forEach(timeKey => {
    const time = stageTimes[timeKey];
    const avgHours = parseTimeToHours(time.averageTime);
    
    if (avgHours > 24 * 7) { // More than a week
      insights.push({
        type: 'timing',
        title: `Slow Progress: ${time.from} to ${time.to}`,
        message: `Users take ${time.averageTime} on average between these stages.`,
        priority: 'medium',
        recommendation: 'Consider nudging users to move faster through this stage.'
      });
    }
  });
  
  // Engagement insights
  const firstCvRate = funnelMetrics.firstCvUpload?.percentage || 0;
  if (firstCvRate < 40) {
    insights.push({
      type: 'engagement',
      title: 'Low First CV Upload Rate',
      message: `Only ${firstCvRate.toFixed(1)}% of users upload their first CV.`,
      priority: 'high',
      recommendation: 'Improve onboarding to encourage first CV upload.'
    });
  }
  
  return insights;
};

/**
 * Get bottleneck recommendation
 * @param {Object} bottleneck - Bottleneck data
 * @returns {string} Recommendation
 */
const getBottleneckRecommendation = (bottleneck) => {
  const recommendations = {
    'firstCvUpload': 'Improve onboarding flow, add tutorial, offer incentives for first upload.',
    'firstAnalysis': 'Make analysis more prominent, show preview results, simplify process.',
    'upgradePromptShown': 'Show prompts earlier, improve timing, personalize based on usage.',
    'upgradeClicked': 'Improve CTA design, highlight value, reduce friction to click.',
    'checkoutStarted': 'Simplify checkout flow, add trust signals, show progress.',
    'checkoutCompleted': 'Offer payment options, add guarantee, reduce form fields.'
  };
  
  return recommendations[bottleneck.key] || 'Analyze user behavior at this stage to identify barriers.';
};

/**
 * Generate funnel recommendations
 * @param {Array} bottlenecks - Bottlenecks
 * @param {Array} insights - Insights
 * @returns {Array} Recommendations
 */
const generateFunnelRecommendations = (bottlenecks, insights) => {
  const recommendations = [];
  
  // Add bottleneck recommendations
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
      recommendations.push({
        action: `Fix ${bottleneck.stage} bottleneck`,
        priority: bottleneck.severity,
        effort: 'medium',
        impact: 'high',
        description: `Address ${bottleneck.dropoffPercentage.toFixed(1)}% dropoff at ${bottleneck.stage}`,
        steps: [
          'Analyze user dropoff reasons',
          'A/B test improvements',
          'Monitor impact on conversion'
        ]
      });
    }
  });
  
  // Add timing recommendations
  const slowStages = insights.filter(insight => insight.type === 'timing' && insight.priority === 'medium');
  slowStages.forEach(insight => {
    recommendations.push({
      action: 'Reduce stage transition time',
      priority: 'medium',
      effort: 'low',
      impact: 'medium',
      description: insight.message,
      steps: [
        'Add progress reminders',
        'Offer time-limited incentives',
        'Simplify stage requirements'
      ]
    });
  });
  
  // Add engagement recommendations
  const engagementIssues = insights.filter(insight => insight.type === 'engagement');
  engagementIssues.forEach(insight => {
    recommendations.push({
      action: 'Improve user engagement',
      priority: insight.priority,
      effort: 'high',
      impact: 'high',
      description: insight.message,
      steps: [
        'Implement re-engagement campaigns',
        'Add gamification elements',
        'Offer personalized recommendations'
      ]
    });
  });
  
  return recommendations;
};

/**
 * Calculate average funnel time
 * @param {Array} users - Array of users
 * @returns {string} Average time
 */
const calculateAverageFunnelTime = (users) => {
  const convertedUsers = users.filter(user => user.subscription.type !== 'free');
  
  if (convertedUsers.length === 0) return 'N/A';
  
  const times = convertedUsers.map(user => {
    const signupDate = new Date(user.funnel.signedUp || user.createdAt);
    const conversionDate = new Date(user.funnel.checkoutCompleted || user.funnel.trialConverted || new Date());
    return conversionDate - signupDate;
  });
  
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  return formatTime(avgTime);
};

/**
 * Calculate churn rate
 * @param {Array} users - Array of users
 * @returns {number} Churn rate
 */
const calculateChurnRate = (users) => {
  const paidUsers = users.filter(user => user.subscription.type !== 'free');
  const churnedUsers = paidUsers.filter(user => user.funnel.churned);
  
  return paidUsers.length > 0 ? (churnedUsers.length / paidUsers.length) * 100 : 0;
};

/**
 * Helper: Calculate median
 * @param {Array} numbers - Array of numbers
 * @returns {number} Median
 */
const calculateMedian = (numbers) => {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
};

/**
 * Helper: Format time
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time
 */
const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

/**
 * Helper: Parse time to hours
 * @param {string} timeString - Formatted time string
 * @returns {number} Hours
 */
const parseTimeToHours = (timeString) => {
  const match = timeString.match(/(\d+)\s+(day|hour|minute|second)/);
  if (!match) return 0;
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  switch (unit) {
    case 'day': return numValue * 24;
    case 'hour': return numValue;
    case 'minute': return numValue / 60;
    case 'second': return numValue / 3600;
    default: return 0;
  }
};

/**
 * Helper: Days since date
 * @param {Date} date - Date to check
 * @returns {number} Days since
 */
const daysSince = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

module.exports = {
  FUNNEL_STAGES,
  FUNNEL_ORDER,
  
  trackFunnelEvent,
  getUserFunnelProgress,
  getFunnelAnalytics,
  
  // Helper functions
  calculateConversionProbability,
  getNextRecommendedAction,
  calculateStageTimes,
  segmentFunnelData,
  identifyBottlenecks,
  generateFunnelInsights,
  generateFunnelRecommendations,
  calculateAverageFunnelTime,
  calculateChurnRate,
  
  // Utility functions
  calculateMedian,
  formatTime,
  parseTimeToHours,
  daysSince
};
