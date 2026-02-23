/**
 * A/B Testing Service
 * Manages A/B tests for optimization and conversion rate improvement
 */

const { createError } = require('../middleware/error-handlers');

/**
 * A/B Test configurations
 */
const AB_TESTS = {
  // Upgrade prompt design test
  UPGRADE_PROMPT_DESIGN: {
    id: 'upgrade_prompt_design',
    name: 'Upgrade Prompt Design',
    description: 'Test different upgrade prompt designs to optimize conversion',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-03-01'),
    status: 'active',
    
    variants: {
      A: {
        name: 'Minimal Design',
        weight: 25, // 25% of traffic
        config: {
          template: 'minimal',
          colorScheme: 'blue',
          placement: 'modal',
          cta: 'Upgrade Now',
          features: ['Unlimited CVs', 'Priority Processing', 'No Watermarks']
        }
      },
      
      B: {
        name: 'Feature Highlight',
        weight: 25,
        config: {
          template: 'feature_highlight',
          colorScheme: 'green',
          placement: 'banner',
          cta: 'Get More Features',
          features: ['Voice CV Creation', 'Advanced Analytics', 'Export Tools']
        }
      },
      
      C: {
        name: 'Urgent Design',
        weight: 25,
        config: {
          template: 'urgent',
          colorScheme: 'red',
          placement: 'fullscreen',
          cta: 'Upgrade Immediately',
          features: ['Limited Time Offer', 'Exclusive Features', 'Priority Support']
        }
      },
      
      control: {
        name: 'Control (Original)',
        weight: 25,
        config: {
          template: 'basic',
          colorScheme: 'gray',
          placement: 'none',
          cta: 'Learn More',
          features: ['Basic Features', 'Standard Support', 'Free Tier']
        }
      }
    },
    
    metrics: {
      primary: 'conversion_rate',
      secondary: ['click_through_rate', 'time_to_conversion', 'revenue_per_user'],
      guardrail: ['bounce_rate', 'session_duration']
    },
    
    targetAudience: {
      minCvCount: 1,
      subscription: 'free',
      activeWithinDays: 30
    },
    
    sampleSize: 1000,
    confidenceLevel: 95,
    minimumDetectableEffect: 10 // 10% improvement
  },
  
  // Pricing display test
  PRICING_DISPLAY: {
    id: 'pricing_display',
    name: 'Pricing Display',
    description: 'Test different pricing display formats',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-15'),
    status: 'active',
    
    variants: {
      monthly: {
        name: 'Monthly Only',
        weight: 33,
        config: {
          showAnnual: false,
          highlightMonthly: true,
          showSavings: false,
          defaultPlan: 'basic'
        }
      },
      
      annual: {
        name: 'Annual Only',
        weight: 33,
        config: {
          showAnnual: true,
          highlightMonthly: false,
          showSavings: true,
          defaultPlan: 'premium'
        }
      },
      
      both: {
        name: 'Both Options',
        weight: 34,
        config: {
          showAnnual: true,
          highlightMonthly: true,
          showSavings: true,
          defaultPlan: 'basic'
        }
      }
    },
    
    metrics: {
      primary: 'checkout_completion',
      secondary: ['plan_selection', 'revenue', 'customer_lifetime_value']
    }
  },
  
  // Feature highlight test
  FEATURE_HIGHLIGHT: {
    id: 'feature_highlight',
    name: 'Feature Highlight',
    description: 'Test which features to highlight in marketing',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-20'),
    status: 'active',
    
    variants: {
      voice: {
        name: 'Voice Features',
        weight: 25,
        config: {
          primaryFeature: 'voice',
          secondaryFeatures: ['ats', 'analytics'],
          heroImage: 'voice_interface',
          testimonials: 'voice_users'
        }
      },
      
      ats: {
        name: 'ATS Scoring',
        weight: 25,
        config: {
          primaryFeature: 'ats',
          secondaryFeatures: ['voice', 'analytics'],
          heroImage: 'score_dashboard',
          testimonials: 'job_seekers'
        }
      },
      
      analytics: {
        name: 'Analytics',
        weight: 25,
        config: {
          primaryFeature: 'analytics',
          secondaryFeatures: ['voice', 'ats'],
          heroImage: 'analytics_dashboard',
          testimonials: 'career_coaches'
        }
      },
      
      all: {
        name: 'All Features',
        weight: 25,
        config: {
          primaryFeature: 'all',
          secondaryFeatures: ['voice', 'ats', 'analytics'],
          heroImage: 'platform_overview',
          testimonials: 'all_users'
        }
      }
    },
    
    metrics: {
      primary: 'signup_conversion',
      secondary: ['feature_engagement', 'upgrade_intent']
    }
  },
  
  // Checkout flow test
  CHECKOUT_FLOW: {
    id: 'checkout_flow',
    name: 'Checkout Flow',
    description: 'Test different checkout flow designs',
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-03-15'),
    status: 'planned',
    
    variants: {
      single_page: {
        name: 'Single Page',
        weight: 50,
        config: {
          steps: 1,
          showProgress: false,
          autoAdvance: true,
          saveProgress: false
        }
      },
      
      multi_page: {
        name: 'Multi Page',
        weight: 50,
        config: {
          steps: 3,
          showProgress: true,
          autoAdvance: false,
          saveProgress: true
        }
      }
    },
    
    metrics: {
      primary: 'checkout_completion_rate',
      secondary: ['time_to_complete', 'form_errors', 'support_requests']
    }
  }
};

/**
 * Get A/B test assignment for user
 * @param {Object} user - User object
 * @param {string} testId - Test ID
 * @returns {string} Variant key
 */
const getTestAssignment = (user, testId) => {
  try {
    const test = AB_TESTS[testId];
    if (!test) {
      throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
    }
    
    // Check if test is active
    if (test.status !== 'active') {
      return 'control';
    }
    
    // Check if user is in target audience
    if (!isInTargetAudience(user, test.targetAudience)) {
      return 'control';
    }
    
    // Check if user already has assignment
    const existingAssignment = user.abTests?.[testId];
    if (existingAssignment) {
      return existingAssignment;
    }
    
    // Assign variant based on weights
    const variant = assignVariant(test.variants);
    
    // Store assignment in user (in real implementation, save to database)
    if (!user.abTests) {
      user.abTests = {};
    }
    user.abTests[testId] = variant;
    
    // Record assignment
    recordTestAssignment(user, testId, variant);
    
    return variant;
    
  } catch (error) {
    console.error('Error getting test assignment:', error);
    return 'control';
  }
};

/**
 * Check if user is in target audience
 * @param {Object} user - User object
 * @param {Object} audience - Target audience criteria
 * @returns {boolean} True if user is in target audience
 */
const isInTargetAudience = (user, audience) => {
  if (!audience) return true;
  
  // Check CV count
  if (audience.minCvCount && user.stats.cvCount < audience.minCvCount) {
    return false;
  }
  
  // Check subscription
  if (audience.subscription && user.subscription.type !== audience.subscription) {
    return false;
  }
  
  // Check activity
  if (audience.activeWithinDays && user.lastLogin) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin > audience.activeWithinDays) {
      return false;
    }
  }
  
  return true;
};

/**
 * Assign variant based on weights
 * @param {Object} variants - Variants with weights
 * @returns {string} Variant key
 */
const assignVariant = (variants) => {
  const totalWeight = Object.values(variants).reduce((sum, variant) => sum + variant.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [key, variant] of Object.entries(variants)) {
    random -= variant.weight;
    if (random <= 0) {
      return key;
    }
  }
  
  // Fallback to control
  return 'control';
};

/**
 * Record test assignment
 * @param {Object} user - User object
 * @param {string} testId - Test ID
 * @param {string} variant - Variant key
 */
const recordTestAssignment = (user, testId, variant) => {
  // In a real implementation, send to analytics service
  const assignmentData = {
    userId: user._id.toString(),
    testId,
    variant,
    timestamp: new Date().toISOString(),
    userProperties: {
      subscription: user.subscription.type,
      cvCount: user.stats.cvCount,
      totalOptimizations: user.stats.totalOptimizations
    }
  };
  
  console.log('A/B test assignment:', assignmentData);
};

/**
 * Record test event
 * @param {Object} user - User object
 * @param {string} testId - Test ID
 * @param {string} event - Event name
 * @param {Object} properties - Event properties
 */
const recordTestEvent = (user, testId, event, properties = {}) => {
  try {
    const test = AB_TESTS[testId];
    if (!test) {
      throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
    }
    
    // Get user's variant
    const variant = user.abTests?.[testId] || 'control';
    
    // Record event
    const eventData = {
      userId: user._id.toString(),
      testId,
      testName: test.name,
      variant,
      event,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        userSubscription: user.subscription.type,
        userCvCount: user.stats.cvCount
      }
    };
    
    console.log('A/B test event:', eventData);
    
    // In a real implementation, send to analytics service
    // analytics.track(`ab_test_${event}`, eventData);
    
  } catch (error) {
    console.error('Error recording test event:', error);
  }
};

/**
 * Get test results
 * @param {string} testId - Test ID
 * @param {Array} events - Array of event data
 * @returns {Object} Test results
 */
const getTestResults = (testId, events = []) => {
  try {
    const test = AB_TESTS[testId];
    if (!test) {
      throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
    }
    
    // Filter events for this test
    const testEvents = events.filter(event => event.testId === testId);
    
    // Group events by variant
    const variantData = {};
    Object.keys(test.variants).forEach(variantKey => {
      variantData[variantKey] = {
        name: test.variants[variantKey].name,
        weight: test.variants[variantKey].weight,
        events: [],
        users: new Set(),
        conversions: 0
      };
    });
    
    // Process events
    testEvents.forEach(event => {
      const variant = event.variant || 'control';
      if (variantData[variant]) {
        variantData[variant].events.push(event);
        variantData[variant].users.add(event.userId);
        
        // Check for conversion events
        if (isConversionEvent(event.event, test.metrics.primary)) {
          variantData[variant].conversions += 1;
        }
      }
    });
    
    // Calculate metrics for each variant
    Object.keys(variantData).forEach(variantKey => {
      const data = variantData[variantKey];
      const uniqueUsers = data.users.size;
      
      // Basic metrics
      data.metrics = {
        uniqueUsers,
        totalEvents: data.events.length,
        eventsPerUser: uniqueUsers > 0 ? data.events.length / uniqueUsers : 0,
        conversionRate: uniqueUsers > 0 ? (data.conversions / uniqueUsers) * 100 : 0
      };
      
      // Calculate statistical significance
      if (variantKey !== 'control' && variantData.control) {
        data.significance = calculateSignificance(
          data.metrics.conversionRate,
          variantData.control.metrics.conversionRate,
          data.metrics.uniqueUsers,
          variantData.control.metrics.uniqueUsers
        );
      }
    });
    
    // Determine winner
    const winner = determineWinner(variantData, test.metrics.primary);
    
    // Calculate overall metrics
    const totalUsers = Object.values(variantData).reduce((sum, data) => sum + data.metrics.uniqueUsers, 0);
    const totalConversions = Object.values(variantData).reduce((sum, data) => sum + data.conversions, 0);
    const overallConversionRate = totalUsers > 0 ? (totalConversions / totalUsers) * 100 : 0;
    
    // Check if test has reached sample size
    const reachedSampleSize = totalUsers >= test.sampleSize;
    
    // Calculate confidence intervals
    const confidenceIntervals = calculateConfidenceIntervals(variantData);
    
    return {
      testId,
      testName: test.name,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      sampleSize: test.sampleSize,
      reachedSampleSize,
      totalUsers,
      totalConversions,
      overallConversionRate,
      variants: variantData,
      winner,
      confidenceIntervals,
      recommendations: generateTestRecommendations(test, variantData, winner),
      metadata: {
        analyzedAt: new Date().toISOString(),
        eventsAnalyzed: testEvents.length,
        confidenceLevel: test.confidenceLevel
      }
    };
    
  } catch (error) {
    console.error('Error getting test results:', error);
    throw error;
  }
};

/**
 * Check if event is a conversion event
 * @param {string} event - Event name
 * @param {string} primaryMetric - Primary metric
 * @returns {boolean} True if conversion event
 */
const isConversionEvent = (event, primaryMetric) => {
  const conversionEvents = {
    conversion_rate: ['checkout_completed', 'subscription_activated'],
    checkout_completion: ['checkout_completed'],
    signup_conversion: ['user_upgraded', 'trial_converted']
  };
  
  return conversionEvents[primaryMetric]?.includes(event) || false;
};

/**
 * Calculate statistical significance
 * @param {number} variantRate - Variant conversion rate
 * @param {number} controlRate - Control conversion rate
 * @param {number} variantUsers - Variant users
 * @param {number} controlUsers - Control users
 * @returns {Object} Significance data
 */
const calculateSignificance = (variantRate, controlRate, variantUsers, controlUsers) => {
  // Convert percentages to proportions
  const p1 = variantRate / 100;
  const p2 = controlRate / 100;
  
  // Pooled proportion
  const pooled = (p1 * variantUsers + p2 * controlUsers) / (variantUsers + controlUsers);
  
  // Standard error
  const se = Math.sqrt(pooled * (1 - pooled) * (1/variantUsers + 1/controlUsers));
  
  // Z-score
  const z = (p1 - p2) / se;
  
  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // Confidence
  const confidence = (1 - pValue) * 100;
  
  // Relative improvement
  const improvement = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
  
  return {
    zScore: z,
    pValue,
    confidence,
    significant: pValue < 0.05, // 95% confidence level
    improvement,
    standardError: se
  };
};

/**
 * Normal cumulative distribution function
 * @param {number} z - Z-score
 * @returns {number} CDF value
 */
const normalCDF = (z) => {
  // Approximation of normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  if (z > 0) {
    probability = 1 - probability;
  }
  
  return probability;
};

/**
 * Determine winning variant
 * @param {Object} variantData - Variant data
 * @param {string} primaryMetric - Primary metric
 * @returns {Object|null} Winner data
 */
const determineWinner = (variantData, primaryMetric) => {
  let winner = null;
  let bestScore = -Infinity;
  
  Object.entries(variantData).forEach(([variantKey, data]) => {
    if (variantKey === 'control') return;
    
    const score = data.metrics.conversionRate;
    const significance = data.significance;
    
    // Check if variant is significantly better than control
    if (significance?.significant && significance.improvement > 0) {
      if (score > bestScore) {
        bestScore = score;
        winner = {
          variant: variantKey,
          name: data.name,
          conversionRate: score,
          improvement: significance.improvement,
          confidence: significance.confidence,
          pValue: significance.pValue
        };
      }
    }
  });
  
  return winner;
};

/**
 * Calculate confidence intervals
 * @param {Object} variantData - Variant data
 * @returns {Object} Confidence intervals
 */
const calculateConfidenceIntervals = (variantData) => {
  const intervals = {};
  const z = 1.96; // 95% confidence
  
  Object.entries(variantData).forEach(([variantKey, data]) => {
    const p = data.metrics.conversionRate / 100;
    const n = data.metrics.uniqueUsers;
    
    if (n > 0) {
      const se = Math.sqrt(p * (1 - p) / n);
      const margin = z * se * 100; // Convert back to percentage
      
      intervals[variantKey] = {
        lower: Math.max(0, data.metrics.conversionRate - margin),
        upper: Math.min(100, data.metrics.conversionRate + margin),
        margin,
        confidenceLevel: 95
      };
    }
  });
  
  return intervals;
};

/**
 * Generate test recommendations
 * @param {Object} test - Test configuration
 * @param {Object} variantData - Variant data
 * @param {Object} winner - Winner data
 * @returns {Array} Recommendations
 */
const generateTestRecommendations = (test, variantData, winner) => {
  const recommendations = [];
  
  // Check if test has reached sample size
  const totalUsers = Object.values(variantData).reduce((sum, data) => sum + data.metrics.uniqueUsers, 0);
  if (totalUsers < test.sampleSize) {
    recommendations.push({
      type: 'sample_size',
      priority: 'medium',
      message: `Test needs more users. Currently at ${totalUsers}/${test.sampleSize} (${Math.round((totalUsers/test.sampleSize)*100)}%).`,
      action: 'Continue running test until sample size is reached.'
    });
  }
  
  // Check for statistical significance
  if (winner) {
    recommendations.push({
      type: 'winner',
      priority: 'high',
      message: `Variant ${winner.variant} (${winner.name}) is winning with ${winner.improvement.toFixed(1)}% improvement.`,
      action: `Implement ${winner.variant} as the new default.`
    });
  } else {
    // No clear winner
    const hasSignificantResults = Object.values(variantData).some(data => 
      data.significance?.significant && data.significance.improvement > 0
    );
    
    if (!hasSignificantResults) {
      recommendations.push({
        type: 'no_winner',
        priority: 'medium',
        message: 'No variant is performing significantly better than control.',
        action: 'Consider testing different variations or ending the test.'
      });
    }
  }
  
  // Check for guardrail violations
  const controlData = variantData.control;
  if (controlData) {
    Object.entries(variantData).forEach(([variantKey, data]) => {
      if (variantKey !== 'control') {
        // Check for negative impact on guardrail metrics
        if (data.metrics.conversionRate < controlData.metrics.conversionRate * 0.8) {
          recommendations.push({
            type: 'negative_impact',
            priority: 'high',
            message: `Variant ${variantKey} is performing worse than control.`,
            action: 'Consider stopping this variant.'
          });
        }
      }
    });
  }
  
  // Check test duration
  const now = new Date();
  const daysRemaining = Math.ceil((test.endDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 7 && totalUsers < test.sampleSize) {
    recommendations.push({
      type: 'time_constraint',
      priority: 'high',
      message: `Test ends in ${daysRemaining} days but hasn't reached sample size.`,
      action: 'Consider extending test duration or increasing traffic.'
    });
  }
  
  return recommendations;
};

/**
 * Get all active tests
 * @returns {Array} Active tests
 */
const getActiveTests = () => {
  return Object.values(AB_TESTS).filter(test => test.status === 'active');
};

/**
 * Get test configuration
 * @param {string} testId - Test ID
 * @returns {Object} Test configuration
 */
const getTestConfig = (testId) => {
  const test = AB_TESTS[testId];
  if (!test) {
    throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
  }
  
  return {
    ...test,
    // Don't include internal data
    variants: Object.entries(test.variants).reduce((acc, [key, variant]) => {
      acc[key] = {
        name: variant.name,
        weight: variant.weight,
        config: variant.config
      };
      return acc;
    }, {})
  };
};

/**
 * Create new A/B test
 * @param {Object} testConfig - Test configuration
 * @returns {Object} Created test
 */
const createTest = (testConfig) => {
  // Validate test configuration
  const requiredFields = ['id', 'name', 'description', 'variants', 'metrics'];
  requiredFields.forEach(field => {
    if (!testConfig[field]) {
      throw createError(`Missing required field: ${field}`, 400, 'ValidationError');
    }
  });
  
  // Validate variants
  const variants = testConfig.variants;
  if (!variants.control) {
    throw createError('Test must include a control variant', 400, 'ValidationError');
  }
  
  const totalWeight = Object.values(variants).reduce((sum, variant) => sum + variant.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw createError('Variant weights must sum to 100%', 400, 'ValidationError');
  }
  
  // Create test
  const test = {
    ...testConfig,
    startDate: new Date(testConfig.startDate || Date.now()),
    endDate: new Date(testConfig.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    status: testConfig.status || 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // In a real implementation, save to database
  console.log('Created A/B test:', test);
  
  return test;
};

/**
 * Update test status
 * @param {string} testId - Test ID
 * @param {string} status - New status
 * @returns {Object} Updated test
 */
const updateTestStatus = (testId, status) => {
  const test = AB_TESTS[testId];
  if (!test) {
    throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
  }
  
  const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    throw createError(`Invalid status: ${status}`, 400, 'ValidationError');
  }
  
  test.status = status;
  test.updatedAt = new Date();
  
  console.log(`Updated test ${testId} status to ${status}`);
  
  return test;
};

/**
 * Get user's test assignments
 * @param {Object} user - User object
 * @returns {Object} Test assignments
 */
const getUserTestAssignments = (user) => {
  const assignments = {};
  
  Object.keys(AB_TESTS).forEach(testId => {
    const test = AB_TESTS[testId];
    if (test.status === 'active') {
      const variant = getTestAssignment(user, testId);
      assignments[testId] = {
        testName: test.name,
        variant,
        variantName: test.variants[variant]?.name || 'Control',
        config: test.variants[variant]?.config || {}
      };
    }
  });
  
  return assignments;
};

/**
 * Simulate test data (for development)
 * @param {string} testId - Test ID
 * @param {number} userCount - Number of users to simulate
 * @returns {Array} Simulated events
 */
const simulateTestData = (testId, userCount = 1000) => {
  const test = AB_TESTS[testId];
  if (!test) {
    throw createError(`A/B test not found: ${testId}`, 404, 'NotFoundError');
  }
  
  const events = [];
  const baseConversionRate = 5; // 5% base conversion rate
  
  // Generate user assignments
  const userAssignments = {};
  for (let i = 0; i < userCount; i++) {
    const userId = `user_${i}`;
    const variant = assignVariant(test.variants);
    userAssignments[userId] = variant;
    
    // Record assignment event
    events.push({
      userId,
      testId,
      testName: test.name,
      variant,
      event: 'test_assigned',
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        userIndex: i
      }
    });
    
    // Simulate conversion based on variant
    const variantConfig = test.variants[variant];
    let conversionRate = baseConversionRate;
    
    // Adjust conversion rate based on variant (for simulation)
    if (variant === 'A') conversionRate *= 1.2; // 20% better
    if (variant === 'B') conversionRate *= 1.1; // 10% better
    if (variant === 'C') conversionRate *= 0.9; // 10% worse
    
    // Determine if user converts
    if (Math.random() * 100 < conversionRate) {
      events.push({
        userId,
        testId,
        testName: test.name,
        variant,
        event: 'checkout_completed',
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        properties: {
          conversionValue: variant === 'premium' ? 19.99 : 9.99
        }
      });
    }
  }
  
  return events;
};

module.exports = {
  AB_TESTS,
  
  getTestAssignment,
  recordTestEvent,
  getTestResults,
  getActiveTests,
  getTestConfig,
  createTest,
  updateTestStatus,
  getUserTestAssignments,
  simulateTestData,
  
  // Helper functions
  isInTargetAudience,
  assignVariant,
  isConversionEvent,
  calculateSignificance,
  determineWinner,
  calculateConfidenceIntervals,
  generateTestRecommendations
};